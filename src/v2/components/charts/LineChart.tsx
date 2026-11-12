import { useRef, useEffect, useState } from 'react';
import { Box, Flex, HStack } from '@chakra-ui/react';
import {
  LineChart as RechartsLineChart,
  AreaChart as RechartsAreaChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { colors, formatCompact as formatCompactShared } from '@/v2/constants/theme';
import { useExpanded } from '@/v2/components/overlay';
import { EmptyChart } from './EmptyChart';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LineConfig {
  key: string;
  label?: string;
  color: string;
  dashed?: boolean;
  gradient?: boolean;
}

export interface LineChartProps {
  data: Record<string, unknown>[];
  lines: LineConfig[];
  xKey: string;
  height?: number | string;
  labelFormatter?: (value: number) => string;
  variant?: 'line' | 'filled';
  legendAlign?: 'flex-start' | 'center' | 'flex-end';
  /** Vertical offset of the legend row (negative pulls it up into the header). */
  legendTop?: string;
}

// ─── Formatters ──────────────────────────────────────────────────────────────

const formatCompact = (value: number) => formatCompactShared(value);

// ─── Custom Ticks ────────────────────────────────────────────────────────────

function renderXTick(tickWidth: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const { x, y, payload } = props;
    const val = payload?.value;
    if (val === undefined || val === null) return null;
    const charsPerLine = Math.max(1, Math.floor(tickWidth / 7));
    const full = String(val);
    let line1 = full.slice(0, charsPerLine);
    const rest = full.slice(charsPerLine);
    let line2 = rest
      ? rest.length > charsPerLine
        ? rest.slice(0, charsPerLine - 1) + '…'
        : rest
      : '';
    // if line1 itself is longer than charsPerLine (no room for 2 chars), truncate with ellipsis
    if (full.length > charsPerLine * 2) {
      line1 = full.slice(0, charsPerLine);
      line2 = full.slice(charsPerLine, charsPerLine * 2 - 1) + '…';
    }
    const textLines = line2 ? [line1, line2] : [line1];
    return (
      <g transform={`translate(${x},${y + 20})`}>
        {textLines.map((t, i) => (
          <text
            key={i}
            x={0}
            y={i * 13}
            textAnchor="middle"
            fill={colors.bodyText}
            style={{ fontSize: '11.5px', fontWeight: 500 }}
          >
            {t}
          </text>
        ))}
      </g>
    );
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderYTick(
  props: any,
  formatter: (v: number) => string = formatCompact
) {
  const { x, y, payload } = props;
  const val = payload?.value;
  if (val === undefined || val === null) return null;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill={colors.axisText}
      style={{ fontSize: '11px', fontWeight: 500 }}
    >
      {formatter(Number(val))}
    </text>
  );
}

export function LineChart({
  data,
  lines,
  xKey,
  height = 250,
  labelFormatter = formatCompact,
  variant = 'line',
  legendAlign = 'flex-end',
  legendTop = '-33px',
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);
  if (useExpanded()) height = typeof height === 'number' ? Math.round(height * 1.8) : 520;
  const showLegend = lines.length > 1;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setChartWidth(el.offsetWidth);
    const ro = new ResizeObserver(() => setChartWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasNonZeroValue = data.some((row) =>
    lines.some((line) => Number(row[line.key] ?? 0) !== 0)
  );

  if (data.length === 0 || !hasNonZeroValue) {
    return <EmptyChart height={height} />;
  }

  const tickWidth =
    chartWidth && data.length ? chartWidth / data.length - 10 : 50;

  const lastIndexFor = (key: string) => {
    for (let i = data.length - 1; i >= 0; i--) {
      const v = data[i]?.[key];
      if (v != null && Number(v) !== 0) return i;
    }
    return data.length - 1;
  };

  const sharedChildren = (
    <>
      <defs>
        {lines.map((line) => (
          <linearGradient
            key={line.key}
            id={`fill-${line.key}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="5%" stopColor={line.color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={line.color} stopOpacity={0.03} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid
        stroke={colors.gridStroke}
        vertical={false}
        horizontal={true}
      />
      <XAxis
        dataKey={xKey}
        tickLine={false}
        axisLine={false}
        tick={renderXTick(tickWidth)}
        interval={0}
        height={60}
      />
      <YAxis
        tick={(props) => renderYTick(props, labelFormatter)}
        tickLine={false}
        axisLine={false}
        width={48}
      />
      <Tooltip
        cursor={{ stroke: colors.borderStrong, strokeWidth: 1 }}
        contentStyle={{
          background: colors.cardBg,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 4px 14px rgba(20,26,42,.10)',
          padding: '8px 12px',
          fontSize: 13,
        }}
        formatter={(value) => formatCompact(Number(value))}
        labelStyle={{ fontSize: 13, fontWeight: 600, color: colors.darkText }}
      />
    </>
  );

  return (
    <Flex w="100%" h={height} direction="column" position="relative">
      {showLegend && (
        <HStack
          justify={legendAlign}
          gap={3}
          flexShrink={0}
          pos="relative"
          zIndex={1}
          top={legendTop}
          right={0}
          h={0}
        >
          {lines.map((line) => (
            <HStack key={line.key} gap="6px" fontSize="12px" fontWeight={500} color={colors.bodyText}>
              <Box
                w="14px"
                h={line.dashed ? '0' : '2px'}
                borderTop={line.dashed ? `2px dashed ${line.color}` : undefined}
                bg={line.dashed ? undefined : line.color}
                flexShrink={0}
              />
              {line.label}
            </HStack>
          ))}
        </HStack>
      )}
      <Box ref={containerRef} flex={1}>
        <ResponsiveContainer width="100%" height="100%">
          {variant === 'filled' ? (
            <RechartsAreaChart
              data={data}
              margin={{ top: 24, right: 10, left: 10, bottom: 10 }}
            >
              {sharedChildren}
              {lines.map((line) => (
                <Area
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={2}
                  strokeDasharray={line.dashed ? '5 5' : undefined}
                  fill={`url(#fill-${line.key})`}
                  dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                >
                  <LabelList
                    dataKey={line.key}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    content={(props: any) => {
                      const { x, y, value, index } = props;
                      if (value === undefined || value === null) return null;
                      // rank all lines at this index by value (descending)
                      const vals = lines.map((l) =>
                        Number(data[index]?.[l.key] ?? 0)
                      );
                      const sorted = [...vals].sort((a, b) => b - a);
                      const myVal = Number(value);
                      const rank = sorted.indexOf(myVal); // 0=top, 1=mid, 2=bot
                      let yOffset: number;
                      if (rank === 0) {
                        yOffset = -8; // highest → above
                      } else if (rank === sorted.length - 1) {
                        yOffset = 14; // lowest → below
                      } else {
                        // middle → go toward the side with more space
                        const topVal = sorted[0];
                        const botVal = sorted[sorted.length - 1];
                        yOffset = myVal - botVal < topVal - myVal ? -8 : 14;
                      }
                      return (
                        <text
                          x={x}
                          y={y + yOffset}
                          textAnchor="middle"
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            fill: line.color,
                          }}
                        >
                          {labelFormatter(Math.round(Number(value)))}
                        </text>
                      );
                    }}
                  />
                </Area>
              ))}
            </RechartsAreaChart>
          ) : (
            <RechartsLineChart
              data={data}
              margin={{ top: 24, right: 10, left: 10, bottom: 0 }}
            >
              {sharedChildren}
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={2}
                  strokeDasharray={line.dashed ? '5 5' : undefined}
                  fill={line.gradient ? `url(#fill-${line.key})` : undefined}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  dot={(props: any) => {
                    const { cx, cy, index, value } = props;
                    if (index !== lastIndexFor(line.key) || value == null) {
                      return <g key={`d-${index}`} />;
                    }
                    return (
                      <circle
                        key={`d-${index}`}
                        cx={cx}
                        cy={cy}
                        r={4.5}
                        fill={line.color}
                        stroke={colors.cardBg}
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 5, stroke: colors.cardBg, strokeWidth: 2 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={line.key}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    content={(props: any) => {
                      const { x, y, value, index } = props;
                      if (value === undefined || value === null) return null;
                      // Label the latest point only; the tooltip covers the rest.
                      if (index !== lastIndexFor(line.key)) return null;
                      let yOffset: number;
                      if (lines.length > 1) {
                        // Multiple lines: rank this point's value against the
                        // other lines at the same x so the higher one sits above
                        // and the lower one below — prevents the labels colliding.
                        const vals = lines.map((l) =>
                          Number(data[index]?.[l.key] ?? 0)
                        );
                        const sorted = [...vals].sort((a, b) => b - a);
                        const myVal = Number(value);
                        const rank = sorted.indexOf(myVal); // 0 = highest
                        if (rank === 0) {
                          yOffset = -8; // highest → above
                        } else if (rank === sorted.length - 1) {
                          yOffset = 16; // lowest → below
                        } else {
                          const topVal = sorted[0];
                          const botVal = sorted[sorted.length - 1];
                          yOffset = myVal - botVal < topVal - myVal ? -8 : 16;
                        }
                      } else {
                        yOffset = -10;
                      }
                      return (
                        <text
                          x={x}
                          y={y + yOffset}
                          textAnchor="end"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            fill: colors.darkText,
                          }}
                        >
                          {labelFormatter(Number(value))}
                        </text>
                      );
                    }}
                  />
                </Line>
              ))}
            </RechartsLineChart>
          )}
        </ResponsiveContainer>
      </Box>
    </Flex>
  );
}
