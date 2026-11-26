import { useRef, useEffect, useState } from 'react';
import { Box, Flex, HStack } from '@chakra-ui/react';
import { EmptyChart } from './EmptyChart';
import { useCardLegend } from '@/ui/chart-card/legend';
import { DivergingBars } from './DivergingBars';
import {
  BarChart as RechartsBarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { colors, formatCompact as formatCompactShared } from '@/constants/theme';
import { ClassMarkSvg, classFromLabel } from '@/ui/class-badge';
import { useExpanded } from '@/ui/overlay';

export interface BarConfig {
  key: string;
  label: string;
  color: string;
  cellColor?: (entry: Record<string, unknown>) => string;
}

export interface BarChartProps {
  data: Record<string, unknown>[];
  bars: BarConfig[];
  legendBars?: BarConfig[];
  xKey: string;
  barSize?: number;
  height?: number | string;
  yTickFormatter?: (value: number) => string;
  labelFormatter?: (value: number) => string;
  showLabels?: boolean;
  verticalXLabels?: boolean;
  variant?: 'grouped' | 'stacked-bar';
  xTickMargin?: number;
  xLabelColors?: Record<string, string>;
  barCategoryGap?: number | string;
  compact?: boolean;
  showTotal?: boolean;
  legendAlign?: 'flex-start' | 'center' | 'flex-end';
  /** Vertical offset of the legend row (negative pulls it up into the header). */
  legendTop?: string;
  /** A single +/− series (growth %): drawn as DivergingBars, around zero. */
  isNegitive?: boolean;
  tooltipOrder?: string[];
  /** 'vertical' keeps the data's order; 'auto' / 'horizontal' rank the columns (largest first, Others last). */
  orientation?: 'auto' | 'vertical' | 'horizontal';
  /** Ranked charts: rank lowest first (a service ranking shows its worst branches first). */
  rankAscending?: boolean;
  /** Ranked charts: keep the data's own order (buckets, ages) instead of ranking by value. */
  keepOrder?: boolean;
  /** Ranked charts: the series columns are ranked by (default the last). Every series gets value labels. */
  labelKeys?: string[];
  /** Draws a dashed Midnight benchmark line at this value (e.g. 100% of target). */
  referenceValue?: number;
  referenceLabel?: string;
  /** Click a bar (or its category) to open its drill-down. */
  onBarClick?: (name: string) => void;
}


const formatCompact = (value: number) => formatCompactShared(value);

const TICK_STYLE = { fontSize: '12px', fontWeight: 500 } as const;
const LABEL_STYLE = { fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums' } as const;
/** A thin ring in the card colour keeps a label readable where it crosses a line. */
const LABEL_HALO = {
  paintOrder: 'stroke',
  stroke: colors.cardBg,
  strokeWidth: 3,
  strokeLinejoin: 'round',
} as const;

/** px per character of a value label (11px bold tabular numerals). */
const CHAR_W = 7;

/** Dark or white text, whichever reads on a bar's fill (a theme var or a hex). */
function inkOn(fill: string) {
  let c = fill;
  const m = /^var\((--[^),\s]+)/.exec(c);
  if (m && typeof document !== 'undefined') c = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(c)?.[1];
  if (!hex) return '#FFFFFF';
  const n = parseInt(hex, 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#141A2A' : '#FFFFFF';
}

// xLabelColors colours a category's label (Sales Pulse 2.0 declared the prop but never drew it).
function renderXTick(tickWidth: number, tickMargin = 6, labelColors?: Record<string, string>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const { x, y, payload } = props;
    const val = payload?.value;
    if (val === undefined || val === null) return null;
    const full = String(val);
    const cls = classFromLabel(full);
    if (cls)
      return (
        <g transform={`translate(${x},${y + tickMargin})`}>
          {/* The badge alone, Other included: the axis has no room for a word under it
              (it was cut off); the badge's tooltip names it. */}
          <ClassMarkSvg cls={cls} />
        </g>
      );
    const charsPerLine = Math.max(1, Math.floor(tickWidth / 7));
    // Break on a space where possible so words aren't split mid-way.
    let line1 = full;
    let line2 = '';
    if (full.length > charsPerLine) {
      const hyphen = full.lastIndexOf('-', charsPerLine);
      const cut = Math.max(
        full.lastIndexOf(' ', charsPerLine),
        hyphen > 0 ? hyphen + 1 : -1
      );
      if (cut > 0) {
        line1 = full.slice(0, cut).trim();
        const rest = full.slice(cut).trim();
        line2 =
          rest.length > charsPerLine ? rest.slice(0, charsPerLine - 1) + '…' : rest;
      } else {
        // One long word: keep it on one line and shorten it.
        line1 = full.slice(0, charsPerLine - 1) + '…';
      }
    }
    const lines = line2 ? [line1, line2] : [line1];
    return (
      <g transform={`translate(${x},${y + tickMargin})`}>
        <title>{full}</title>
        {lines.map((line, i) => (
          <text
            key={i}
            x={0}
            y={i * 14}
            textAnchor="middle"
            fill={labelColors?.[full] ?? colors.bodyText}
            fontWeight={labelColors?.[full] ? 700 : undefined}
            style={TICK_STYLE}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };
}

function makeValueTick(formatter: (v: number) => string, anchor: 'end' | 'middle') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const { x, y, payload } = props;
    const val = payload?.value;
    if (val === undefined || val === null) return null;
    return (
      <text
        x={x}
        y={y}
        dy={anchor === 'end' ? 4 : 14}
        textAnchor={anchor}
        fill={colors.axisText}
        style={{ fontSize: '11px', fontWeight: 500 }}
      >
        {formatter(Number(val))}
      </text>
    );
  };
}

// Nice ticks, from zero, or around it when a value is negative.
function computeTicks(
  data: Record<string, unknown>[],
  bars: BarConfig[],
  stacked = false
): { ticks: number[]; domain: [number, number] } {
  let minValue = 0;
  let maxValue = 0;
  for (const item of data) {
    if (stacked) {
      const sum = bars.reduce((s, b) => s + (Number(item[b.key]) || 0), 0);
      minValue = Math.min(minValue, sum);
      maxValue = Math.max(maxValue, sum);
    } else {
      for (const b of bars) {
        const v = Number(item[b.key]) || 0;
        minValue = Math.min(minValue, v);
        maxValue = Math.max(maxValue, v);
      }
    }
  }
  if (minValue === 0 && maxValue === 0) return { ticks: [0], domain: [0, 0] };
  const TICK_COUNT = 4;
  const niceStep = (raw: number) => {
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / magnitude;
    const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return nice * magnitude;
  };
  if (minValue < 0) {
    const step = niceStep((maxValue - minValue) / TICK_COUNT);
    const start = Math.floor(minValue / step) * step;
    const end = Math.ceil(maxValue / step) * step;
    const ticks: number[] = [];
    for (let t = start; t <= end + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
    return { ticks, domain: [start, end] };
  }
  const step = niceStep(maxValue / TICK_COUNT);
  const end = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= end + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
  return { ticks, domain: [0, end] };
}

const tooltipContentStyle = {
  background: colors.cardBg,
  borderRadius: '8px',
  border: `1px solid ${colors.border}`,
  boxShadow: '0 4px 14px rgba(20,26,42,.10)',
  padding: '8px 12px',
  fontSize: 13,
};

export function BarChart({
  data,
  bars,
  legendBars,
  xKey,
  barSize,
  height = 200,
  yTickFormatter = formatCompact,
  labelFormatter = formatCompact,
  showLabels = false,
  verticalXLabels = false,
  variant = 'grouped',
  xTickMargin = 10,
  barCategoryGap = '24%',
  showTotal = false,
  legendAlign = 'flex-start',
  legendTop = '0px',
  isNegitive = false,
  tooltipOrder,
  orientation = 'auto',
  rankAscending = false,
  keepOrder = false,
  xLabelColors,
  labelKeys,
  referenceValue,
  referenceLabel,
  onBarClick,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const expanded = useExpanded();
  if (expanded) {
    // Full-size view: every row, taller columns.
    height = typeof height === 'number' ? Math.round(height * 1.7) : 520;
  }
  // height="100%": fill the card and, for ranked bars, show as many rows as fit.
  const fill = typeof height === 'string' && height.endsWith('%');
  const isStacked = variant === 'stacked-bar';
  const filteredData = data
    .filter((d) => showTotal || String(d[xKey]) !== 'Total');
  const showLegend = bars.length > 1;
  const legendItems = legendBars ?? bars;
  // In a ChartCard the legend sits under the card's title, not in the chart.
  // The reference line (e.g. 100%) is named in the same legend row, not on a line of its own.
  const refItem = referenceValue != null && referenceLabel ? [{ label: referenceLabel, color: colors.benchmark, shape: 'dash' as const }] : [];
  const legendInCard = useCardLegend(
    showLegend || refItem.length ? [...(showLegend ? legendItems.map((b) => ({ label: b.label, color: b.color })) : []), ...refItem] : null
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      setContainerWidth(el.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // Re-attach when the chart appears after an empty state (the ref was null).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length === 0]);

  const hasNonZeroValue = filteredData.some((row) =>
    bars.some((bar) => Number(row[bar.key] ?? 0) !== 0)
  );

  if (filteredData.length === 0 || !hasNonZeroValue) {
    return <EmptyChart height={height} />;
  }

  // A single +/− series (growth %) draws as the dashboard's diverging bars —
  // the same view as Teams short of / ahead of target — so every positive /
  // negative chart in Sales Pulse reads the same way.
  if (isNegitive && bars.length === 1) {
    const key = bars[0].key;
    return (
      <Box h={fill ? '100%' : height} minH={0}>
        <DivergingBars
          items={filteredData
            .filter((d) => d[key] != null && d[key] !== '')
            .map((d) => ({ name: String(d[xKey]), value: Number(d[key]) }))}
          fmt={(abs) => labelFormatter(abs)}
          note="◂ Down · Up ▸ (Growth %)"
          onPick={onBarClick}
        />
      </Box>
    );
  }

  // Every bar chart draws as columns (user, 24 Nov 2026: no horizontal bars). A chart that
  // ranked its rows keeps that order, left to right; Others is never ranked or cut, and comes last.
  const isOthers = (r: Record<string, unknown>) => /^others?\b/i.test(String(r[xKey] ?? '').trim());
  const plotData = (() => {
    if (orientation === 'vertical' || isStacked || verticalXLabels) return filteredData;
    const sortKey = labelKeys?.[0] ?? bars[bars.length - 1].key;
    const kept = filteredData.filter((r) => !isOthers(r));
    const ranked = keepOrder
      ? kept
      : [...kept].sort((a, b) => ((Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0)) * (rankAscending ? -1 : 1));
    return [...ranked, ...filteredData.filter(isOthers)];
  })();

  const legend = showLegend && !legendInCard && (
    <HStack
      justify={legendAlign}
      gap={3}
      flexShrink={0}
      pos="relative"
      zIndex={1}
      top={legendTop === '0px' ? undefined : legendTop}
      h={legendTop === '0px' ? 'auto' : 0}
      mb={legendTop === '0px' ? 1 : 0}
    >
      {legendItems.map((bar) => (
        <HStack
          key={bar.key}
          gap="6px"
          fontSize="12px"
          fontWeight={500}
          color={colors.bodyText}
        >
          <Box w="10px" h="10px" borderRadius="2px" bg={bar.color} flexShrink={0} />
          {bar.label}
        </HStack>
      ))}
    </HStack>
  );
  const referenceNote = referenceValue != null && referenceLabel && !legendInCard && (
    <HStack gap="6px" fontSize="12px" color={colors.bodyText} mb={2}>
      <Box w="14px" borderTop={`2px dashed ${colors.benchmark}`} />
      {referenceLabel}
    </HStack>
  );


  // Every bar shows its own value (user, 23 Nov 2026), the way the daily columns do:
  // columns upright inside their top (above a short one), rows at their end.
  const fillOf = (bar: BarConfig, row: Record<string, unknown> | undefined) => (bar.cellColor && row ? bar.cellColor(row) : bar.color);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columnLabel = (bar: BarConfig, data: Record<string, unknown>[]) => (props: any) => {
    const { x, y, width, height: h, value, index } = props;
    const v = Number(value);
    const w = Number(width);
    if (!v || w <= 0) return null;
    const top = Math.min(Number(y), Number(y) + Number(h));
    const bottom = Math.max(Number(y), Number(y) + Number(h));
    const neg = v < 0;
    const text = labelFormatter(v);
    const inside = bottom - top >= text.length * CHAR_W + 8;
    if (isStacked && !inside) return null;
    const cx = Number(x) + w / 2;
    // Turned upright: from the bar's end inward when it fits, else outward from it.
    const ay = neg ? (inside ? bottom - 6 : bottom + 4) : inside ? top + 6 : top - 4;
    const anchor = neg === inside ? 'start' : 'end';
    return (
      <text
        x={cx}
        y={ay}
        transform={`rotate(-90 ${cx} ${ay})`}
        textAnchor={anchor}
        dominantBaseline="central"
        fill={inside ? inkOn(fillOf(bar, data[index])) : colors.darkText}
        style={{ ...LABEL_STYLE, fontSize: w < 14 ? 10 : 11, ...(inside ? {} : LABEL_HALO) }}
      >
        {text}
      </text>
    );
  };

  const tooltip = (
    <Tooltip
      offset={12}
      cursor={{ fill: colors.sunkBg, opacity: 0.6 }}
      wrapperStyle={{ zIndex: 20, pointerEvents: 'none' }}
      contentStyle={tooltipContentStyle}
      formatter={(value) => labelFormatter(Number(value))}
      labelStyle={{ fontSize: 13, fontWeight: 600, color: colors.darkText }}
      itemSorter={(item) => {
        if (tooltipOrder?.length) {
          const idx = tooltipOrder.indexOf(String(item.dataKey ?? ''));
          if (idx !== -1) return idx;
        }
        return bars.findIndex((b) => b.label === item.name);
      }}
    />
  );

  // ── Columns ──────────────────────────────────────
  const size = barSize ?? (bars.length > 1 ? 18 : 28);
  const itemSlotWidth = size * bars.length + 22;
  const yAxisWidth = 48;
  const neededWidth = plotData.length * itemSlotWidth + yAxisWidth;
  const innerWidth = Math.max(containerWidth, neededWidth);
  const tickWidth =
    innerWidth && plotData.length
      ? (innerWidth - yAxisWidth) / plotData.length - 8
      : 50;
  const { ticks, domain: yDomain } = computeTicks(
    referenceValue != null
      ? [...plotData, { [bars[0].key]: referenceValue }]
      : plotData,
    bars,
    isStacked
  );

  return (
    <Flex w="100%" h={height} direction="column" position="relative">
      {legend}
      {referenceNote}
      <Box
        ref={containerRef}
        flex={1}
        overflowX="auto"
        overflowY="hidden"
        style={{ scrollbarGutter: 'stable' }}
      >
        <Box style={{ width: innerWidth }} h="100%" minW="100%">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={plotData}
              margin={{ top: showLabels ? 24 : 4, right: 4, left: 0, bottom: 0 }}
              barCategoryGap={barCategoryGap}
              barGap={2}
              barSize={size}
            >
              <CartesianGrid stroke={colors.gridStroke} vertical={false} />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={{ stroke: colors.border }}
                interval={0}
                tick={renderXTick(tickWidth, xTickMargin, xLabelColors)}
                height={verticalXLabels ? 100 : 44}
              />
              <YAxis
                domain={yDomain}
                ticks={ticks}
                tick={makeValueTick(yTickFormatter, 'end')}
                tickLine={false}
                axisLine={false}
                width={yAxisWidth}
              />
              {yDomain[0] < 0 && <ReferenceLine y={0} stroke={colors.borderStrong} />}
              {referenceValue != null && (
                <ReferenceLine
                  y={referenceValue}
                  stroke={colors.benchmark}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  ifOverflow="extendDomain"
                />
              )}
              {tooltip}
              {bars.map((bar, barIdx) => {
                const isTopBar = isStacked && barIdx === bars.length - 1;
                const radius: [number, number, number, number] = isStacked
                  ? isTopBar
                    ? [3, 3, 0, 0]
                    : [0, 0, 0, 0]
                  : [3, 3, 0, 0];
                return (
                  <Bar
                    key={bar.key}
                    dataKey={bar.key}
                    name={bar.label}
                    fill={bar.color}
                    radius={radius}
                    stackId={isStacked ? 'stack' : undefined}
                    isAnimationActive={false}
                    cursor={onBarClick ? 'pointer' : undefined}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={onBarClick ? (d: any) => onBarClick(String(d?.payload?.[xKey] ?? d?.[xKey] ?? '')) : undefined}
                  >
                    {bar.cellColor &&
                      plotData.map((entry, index) => (
                        <Cell key={index} fill={bar.cellColor!(entry)} />
                      ))}
                    {showLabels && <LabelList dataKey={bar.key} content={columnLabel(bar, plotData)} />}
                  </Bar>
                );
              })}
            </RechartsBarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Flex>
  );
}
