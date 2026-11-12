import { useRef, useEffect, useState } from 'react';
import { Box, Flex, HStack, Text } from '@chakra-ui/react';
import { EmptyChart } from './EmptyChart';
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
import { colors, formatCompact as formatCompactShared } from '@/v2/constants/theme';
import { useExpanded } from '@/v2/components/overlay';

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
  showOthers?: boolean;
  showTotal?: boolean;
  legendAlign?: 'flex-start' | 'center' | 'flex-end';
  /** Vertical offset of the legend row (negative pulls it up into the header). */
  legendTop?: string;
  /** Symmetric axis around zero, for growth-style charts. */
  isNegitive?: boolean;
  tooltipOrder?: string[];
  /**
   * 'auto' (default) draws ranked horizontal bars once there are more than
   * AUTO_HORIZONTAL_AT categories, so long names stay readable.
   */
  orientation?: 'auto' | 'vertical' | 'horizontal';
  /** Horizontal mode only: how many rows to show before "Showing N of M". */
  topN?: number;
  /** Which series get value labels. Defaults to the last (current-period) series. */
  labelKeys?: string[];
  /** Draws a dashed Midnight benchmark line at this value (e.g. 100% of target). */
  referenceValue?: number;
  referenceLabel?: string;
  /** Click a bar (or its category) to open its drill-down. */
  onBarClick?: (name: string) => void;
}

const AUTO_HORIZONTAL_AT = 6;

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

function renderXTick(tickWidth: number, tickMargin = 6) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const { x, y, payload } = props;
    const val = payload?.value;
    if (val === undefined || val === null) return null;
    const full = String(val);
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
            fill={colors.bodyText}
            style={TICK_STYLE}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };
}

let tickCtx: CanvasRenderingContext2D | null = null;
/** Width of a tick label in px at the tick font. */
function measureTick(t: string) {
  tickCtx ??= document.createElement('canvas').getContext('2d');
  if (!tickCtx) return t.length * 7;
  tickCtx.font = `${TICK_STYLE.fontWeight} ${parseFloat(TICK_STYLE.fontSize)}px ${getComputedStyle(document.body).fontFamily}`;
  return tickCtx.measureText(t).width;
}

function renderCategoryTick(maxChars: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const { x, y, payload } = props;
    const full = String(payload?.value ?? '');
    const text =
      full.length > maxChars ? full.slice(0, maxChars - 1) + '…' : full;
    return (
      <g transform={`translate(${x},${y})`}>
        <title>{full}</title>
        <text
          x={-8}
          y={0}
          dy={4}
          textAnchor="end"
          fill={colors.bodyText}
          style={TICK_STYLE}
        >
          {text}
        </text>
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

// Nice ticks. Positive-only by default; symmetric around zero for growth.
function computeTicks(
  data: Record<string, unknown>[],
  bars: BarConfig[],
  stacked = false,
  symmetric = false
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
  if (symmetric || minValue < 0) {
    const lo = symmetric ? -Math.max(Math.abs(minValue), maxValue) : minValue;
    const hi = symmetric ? Math.max(Math.abs(minValue), maxValue) : maxValue;
    const step = niceStep((hi - lo) / TICK_COUNT);
    const start = Math.floor(lo / step) * step;
    const end = Math.ceil(hi / step) * step;
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
  showOthers = false,
  showTotal = false,
  legendAlign = 'flex-start',
  legendTop = '0px',
  isNegitive = false,
  tooltipOrder,
  orientation = 'auto',
  topN = 10,
  labelKeys,
  referenceValue,
  referenceLabel,
  onBarClick,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const expanded = useExpanded();
  if (expanded) {
    // Full-size view: every row, taller columns.
    topN = Number.POSITIVE_INFINITY;
    height = typeof height === 'number' ? Math.round(height * 1.7) : 520;
  }
  // height="100%": fill the card and, for ranked bars, show as many rows as fit.
  const fill = typeof height === 'string' && height.endsWith('%');
  const isStacked = variant === 'stacked-bar';
  const filteredData = data
    .filter((d) => showOthers || String(d[xKey]) !== 'Others')
    .filter((d) => showTotal || String(d[xKey]) !== 'Total');
  const showLegend = bars.length > 1;
  const legendItems = legendBars ?? bars;
  const labelled = new Set(labelKeys ?? [bars[bars.length - 1]?.key]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      setContainerWidth(el.offsetWidth);
      setContainerHeight(el.offsetHeight);
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

  const horizontal =
    !isStacked &&
    !verticalXLabels &&
    (orientation === 'horizontal' ||
      (orientation === 'auto' && filteredData.length > AUTO_HORIZONTAL_AT));

  const legend = showLegend && (
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
  const referenceNote = referenceValue != null && referenceLabel && (
    <HStack gap="6px" fontSize="12px" color={colors.bodyText} mb={2}>
      <Box w="14px" borderTop={`2px dashed ${colors.benchmark}`} />
      {referenceLabel}
    </HStack>
  );

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

  // ── Horizontal, ranked ────────────────────────────────────────────────────
  if (horizontal) {
    const sortKey = bars[bars.length - 1].key;
    const ranked = [...filteredData].sort(
      (a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0)
    );
    // Growth-style charts keep both extremes: best half on top, worst below.
    let rows = ranked;
    if (ranked.length > topN) {
      if (isNegitive) {
        const half = Math.ceil(topN / 2);
        rows = [...ranked.slice(0, half), ...ranked.slice(-(topN - half))];
      } else {
        rows = ranked.slice(0, topN);
      }
    }
    const thickness = bars.length > 1 ? 9 : 14;
    const rowH = thickness * bars.length + (bars.length > 1 ? 14 : 12);
    if (fill && !expanded && containerHeight > 0) {
      // Room left after the axis (28), footnote (18) and reference note (22).
      const room =
        containerHeight - 28 - 24 - (referenceValue != null && referenceLabel ? 26 : 0) - (showLegend ? 26 : 0);
      topN = Math.max(3, Math.min(topN, Math.floor(room / rowH)));
    }
    const chartH = rows.length * rowH + 28;
    const { ticks, domain } = computeTicks(
      referenceValue != null ? [...rows, { [bars[0].key]: referenceValue }] : rows,
      bars,
      false,
      false
    );
    const labelChars = containerWidth && containerWidth < 380 ? 14 : 20;
    // Size the label column to the longest label as it will actually draw,
    // so names are never clipped at the left edge.
    const catWidth = Math.ceil(
      Math.max(
        40,
        ...rows.map((r) => {
          const full = String((r as Record<string, unknown>)[xKey] ?? '');
          return measureTick(full.length > labelChars ? full.slice(0, labelChars - 1) + '…' : full);
        })
      ) + 14
    );

    return (
      <Flex
        w="100%"
        h={fill && !expanded ? '100%' : undefined}
        direction="column"
        position="relative"
        ref={containerRef}
        overflow="hidden"
      >
        {legend}
        {referenceNote}
        {/* Fixed height: rows are dropped to fit, never squashed. */}
        <Box h={`${chartH}px`} flexShrink={0}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={rows}
              layout="vertical"
              margin={{ top: 0, right: showLabels ? 52 : 12, left: 0, bottom: 0 }}
              barCategoryGap={4}
              barGap={2}
            >
              <CartesianGrid stroke={colors.gridStroke} horizontal={false} />
              <XAxis
                type="number"
                domain={domain}
                ticks={ticks}
                tick={makeValueTick(yTickFormatter, 'middle')}
                tickLine={false}
                axisLine={false}
                height={20}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                width={catWidth}
                tick={renderCategoryTick(labelChars)}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              {domain[0] < 0 && <ReferenceLine x={0} stroke={colors.borderStrong} />}
              {referenceValue != null && (
                <ReferenceLine
                  x={referenceValue}
                  stroke={colors.benchmark}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  ifOverflow="extendDomain"
                />
              )}
              {tooltip}
              {bars.map((bar) => (
                <Bar
                  key={bar.key}
                  dataKey={bar.key}
                  name={bar.label}
                  fill={bar.color}
                  barSize={thickness}
                  radius={[0, 3, 3, 0]}
                  isAnimationActive={false}
                  cursor={onBarClick ? 'pointer' : undefined}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={onBarClick ? (d: any) => onBarClick(String(d?.payload?.[xKey] ?? d?.[xKey] ?? '')) : undefined}
                >
                  {bar.cellColor &&
                    rows.map((entry, index) => (
                      <Cell key={index} fill={bar.cellColor!(entry)} />
                    ))}
                  {showLabels && labelled.has(bar.key) && (
                    <LabelList
                      dataKey={bar.key}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      content={(props: any) => {
                        const { x, y, width, height: h, value, index } = props;
                        const v = Number(value);
                        if (!v) return null;
                        const w = Number(width);
                        const left = Math.min(Number(x), Number(x) + w);
                        const right = Math.max(Number(x), Number(x) + w);
                        const neg = v < 0;
                        // Long negative bars run into the category labels, so
                        // their value goes inside the bar instead.
                        const inside = neg && right - left > 48;
                        // In a pair, start the label after the longer bar, so it
                        // never sits on top of the comparison bar.
                        const row = rows[index] ?? {};
                        const maxV = Math.max(...bars.map((b) => Number(row[b.key]) || 0));
                        const end = !neg && maxV > v ? left + (right - left) * (maxV / v) : right;
                        return (
                          <text
                            x={inside ? left + 5 : neg ? left - 4 : end + 4}
                            y={Number(y) + Number(h) / 2}
                            dy={4}
                            textAnchor={inside ? 'start' : neg ? 'end' : 'start'}
                            fill={inside ? '#FFFFFF' : colors.darkText}
                            style={inside ? LABEL_STYLE : { ...LABEL_STYLE, ...LABEL_HALO }}
                          >
                            {labelFormatter(v)}
                          </text>
                        );
                      }}
                    />
                  )}
                </Bar>
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </Box>
        {ranked.length > rows.length && (
          <Text fontSize="11.5px" color={colors.mutedText} mt={1}>
            {isNegitive
              ? `Top and bottom ${rows.length} of ${ranked.length}`
              : `Top ${rows.length} of ${ranked.length}`}
            {' · hover a bar for detail'}
          </Text>
        )}
      </Flex>
    );
  }

  // ── Vertical columns (few categories) ──────────────────────────────────────
  const size = barSize ?? (bars.length > 1 ? 18 : 28);
  const itemSlotWidth = size * bars.length + 22;
  const yAxisWidth = 48;
  const neededWidth = filteredData.length * itemSlotWidth + yAxisWidth;
  const innerWidth = Math.max(containerWidth, neededWidth);
  const tickWidth =
    innerWidth && filteredData.length
      ? (innerWidth - yAxisWidth) / filteredData.length - 8
      : 50;
  const { ticks, domain: yDomain } = computeTicks(
    referenceValue != null
      ? [...filteredData, { [bars[0].key]: referenceValue }]
      : filteredData,
    bars,
    isStacked,
    isNegitive
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
              data={filteredData}
              margin={{ top: showLabels ? 20 : 4, right: 4, left: 0, bottom: 0 }}
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
                tick={renderXTick(tickWidth, xTickMargin)}
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
                      filteredData.map((entry, index) => (
                        <Cell key={index} fill={bar.cellColor!(entry)} />
                      ))}
                    {showLabels && labelled.has(bar.key) && (
                      <LabelList
                        dataKey={bar.key}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        content={(props: any) => {
                          const { x, y, width, height: h, value, index } = props;
                          const v = Number(value);
                          if (!v) return null;
                          const w = Number(width);
                          const top = Math.min(Number(y), Number(y) + Number(h));
                          const bottom = Math.max(Number(y), Number(y) + Number(h));
                          const neg = v < 0;
                          // One label per group, centred over the whole group and
                          // above its tallest bar, so every label sits clear of
                          // both bars at the same distance.
                          const n = bars.length;
                          const idx = bars.findIndex((b) => b.key === bar.key);
                          const groupLeft = Number(x) - idx * (w + 2);
                          const cx = groupLeft + (n * w + (n - 1) * 2) / 2;
                          const row = filteredData[index] ?? {};
                          const maxV = Math.max(...bars.map((b) => Number(row[b.key]) || 0));
                          const topOfMax = !neg && maxV > v ? bottom - (bottom - top) * (maxV / v) : top;
                          return (
                            <text
                              x={cx}
                              y={neg ? bottom + 13 : topOfMax - 6}
                              textAnchor="middle"
                              fill={colors.darkText}
                              style={{ ...LABEL_STYLE, ...LABEL_HALO }}
                            >
                              {labelFormatter(v)}
                            </text>
                          );
                        }}
                      />
                    )}
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
