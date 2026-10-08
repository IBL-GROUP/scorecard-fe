import { useRef, useEffect, useState } from 'react';
import { Box, Flex, HStack } from '@chakra-ui/react';
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
} from 'recharts';
import { colors } from '@/constants/theme';

export interface BarConfig {
  key: string;
  label: string;
  color: string;
  cellColor?: (entry: Record<string, unknown>) => string;
}

export interface BarChartProps {
  data: Record<string, unknown>[];
  bars: BarConfig[];
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
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function renderXTick(
  tickWidth: number,
  tickMargin = 6,
  xLabelColors?: Record<string, string>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const { x, y, payload } = props;
    const val = payload?.value;
    if (val === undefined || val === null) return null;
    const full = String(val);
    const color = xLabelColors?.[full];

    if (color) {
      const bw = 24;
      const bh = 24;
      return (
        <g transform={`translate(${x},${y + tickMargin})`}>
          <rect
            x={-bw / 2}
            y={0}
            width={bw}
            height={bh}
            rx={4}
            ry={4}
            fill={color}
          />
          <text
            x={0}
            y={bh / 2 + 4}
            textAnchor="middle"
            fill="#fff"
            style={{ fontSize: '12px', fontWeight: 700 }}
          >
            {full}
          </text>
        </g>
      );
    }

    const charsPerLine = Math.max(1, Math.floor(tickWidth / 7.2));
    const line1 = full.slice(0, charsPerLine);
    const rest = full.slice(charsPerLine);
    const line2 =
      rest.length > charsPerLine ? rest.slice(0, charsPerLine - 1) + '…' : rest;
    const lines = line2 ? [line1, line2] : [line1];
    // when badge mode is active, align plain text to badge vertical center (bh/2 + 4 = 16)
    const textBaseY = xLabelColors ? 16 : 0;
    return (
      <g transform={`translate(${x},${y + tickMargin})`}>
        {lines.map((line, i) => (
          <text
            key={i}
            x={0}
            y={textBaseY + i * 13}
            textAnchor="middle"
            fill="#000"
            style={{ fontSize: '12px', fontWeight: 600 }}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };
}

const VERT_AXIS_HEIGHT = 100;
const VERT_CHAR_PX = 7;

function renderXTickVertical() {
  const maxChars = Math.floor((VERT_AXIS_HEIGHT - 4) / VERT_CHAR_PX); // ~13 chars fit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const { x, y, payload } = props;
    const val = payload?.value;
    if (val === undefined || val === null) return null;
    const full = String(val);
    const text =
      full.length > maxChars ? full.slice(0, maxChars - 1) + '…' : full;
    return (
      // translate to tick position, offset 4px below axis line
      <g transform={`translate(${x},${y + 4})`}>
        <text
          x={0}
          y={0}
          textAnchor="end" // "end" = top of rotated text sits at y=0 (near bar)
          transform="rotate(-90)" // text extends downward into the 100px axis area
          fill="#000"
          style={{ fontSize: '12px', fontWeight: 600 }}
        >
          {text}
        </text>
      </g>
    );
  };
}

function makeYTick(formatter: (v: number) => string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any) => {
    const { x, y, payload } = props;
    const val = payload?.value;
    if (val === undefined || val === null) return null;
    return (
      <text
        x={x}
        y={y}
        dy={4}
        textAnchor="end"
        fill="#0E1C29B2"
        style={{ fontSize: '12px', fontWeight: 500 }}
      >
        {formatter(Number(val))}
      </text>
    );
  };
}

function computeYTicks(
  data: Record<string, unknown>[],
  bars: BarConfig[],
  stacked = false
) {
  const maxValue = stacked
    ? Math.max(
        ...data.map((item) =>
          bars.reduce((sum, b) => sum + (Number(item[b.key]) || 0), 0)
        )
      )
    : Math.max(
        ...data.flatMap((item) =>
          bars.map((b) => Math.abs(Number(item[b.key]) || 0))
        )
      );
  if (maxValue === 0) return [0];
  const TICK_COUNT = 5;
  const rawStep = maxValue / TICK_COUNT;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.ceil(rawStep / magnitude) * magnitude;
  return Array.from(
    { length: Math.ceil(maxValue / step) + 1 },
    (_, i) => Math.round(i * step * 10) / 10
  );
}

export function BarChart({
  data,
  bars,
  xKey,
  barSize = 40,
  height = 250,
  yTickFormatter = formatCompact,
  labelFormatter = formatCompact,
  showLabels = false,
  verticalXLabels = false,
  variant = 'grouped',
  xTickMargin = 6,
  xLabelColors,
  barCategoryGap = '20%',
  compact = false,
  showOthers = false,
  showTotal = false,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const isStacked = variant === 'stacked-bar';
  const filteredData = data
    .filter((d) => showOthers || String(d[xKey]) !== 'Others')
    .filter((d) => showTotal || String(d[xKey]) !== 'Total');
  const showLegend = bars.length > 1;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      setContainerWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    measure();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  const itemSlotWidth = barSize * bars.length + (compact ? 10 : 40);
  const yAxisWidth = 50;
  const neededWidth = Math.ceil(filteredData.length * itemSlotWidth + yAxisWidth);
  // 4px tolerance so a 1–3px sub-pixel jitter at fractional zoom does not
  // toggle the horizontal scrollbar on/off repeatedly.
  const innerWidth =
    neededWidth > containerWidth + 4 ? neededWidth : containerWidth;

  const tickWidth =
    innerWidth && filteredData.length ? innerWidth / filteredData.length - 10 : 50;
  const ticks = computeYTicks(filteredData, bars, isStacked);

  const xAxisHeight = verticalXLabels
    ? VERT_AXIS_HEIGHT
    : xLabelColors
      ? 44
      : undefined;

  return (
    <Flex w="100%" h={height} direction="column" position={'relative'}>
      {showLegend && (
        <HStack
          justify="flex-end"
          gap={3}
          flexShrink={0}
          pos="relative"
          zIndex={1}
          top={'-43px'}
          right={0}
        >
          {bars.map((bar) => (
            <HStack key={bar.key} gap={1} fontSize="13px" fontWeight={500}>
              <Box
                w={2}
                h={2}
                borderRadius="sm"
                bg={bar.color}
                flexShrink={0}
              />
              {bar.label}
            </HStack>
          ))}
        </HStack>
      )}
      <Box
        ref={containerRef}
        flex={1}
        overflowX={innerWidth > containerWidth ? 'auto' : 'hidden'}
        overflowY="hidden"
      >
        <Box style={{ width: innerWidth }} h="100%" minW="100%">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={filteredData}
              margin={{
                top: showLabels ? 18 : 0,
                right: 0,
                left: 0,
                bottom: 0,
              }}
              barCategoryGap={barCategoryGap}
              barSize={barSize}
            >
              <CartesianGrid
                stroke={colors.gridStroke}
                strokeDasharray="4 4"
                vertical={false}
                horizontal={true}
              />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={
                  verticalXLabels
                    ? renderXTickVertical()
                    : renderXTick(tickWidth, xTickMargin, xLabelColors)
                }
                height={xAxisHeight}
              />
              <YAxis
                ticks={ticks}
                tick={makeYTick(yTickFormatter)}
                tickLine={false}
                axisLine={false}
                // width={50}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  padding: '8px 12px',
                  fontSize: 13,
                }}
                formatter={(value) => formatCompact(Number(value))}
                labelStyle={{ fontSize: 13, fontWeight: 500 }}
                itemSorter={(item) =>
                  bars.findIndex((b) => b.label === item.name)
                }
              />
              {bars.map((bar, barIdx) => {
                const isTopBar = isStacked && barIdx === bars.length - 1;
                const radius: [number, number, number, number] = isStacked
                  ? isTopBar
                    ? [4, 4, 0, 0]
                    : [0, 0, 0, 0]
                  : [4, 4, 0, 0];
                return (
                  <Bar
                    key={bar.key}
                    dataKey={bar.key}
                    name={bar.label}
                    fill={bar.color}
                    radius={radius}
                    stackId={isStacked ? 'stack' : undefined}
                  >
                    {bar.cellColor &&
                      filteredData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={bar.cellColor!(
                            entry as Record<string, unknown>
                          )}
                        />
                      ))}
                    {showLabels && (
                      <LabelList
                        dataKey={bar.key}
                        position={isStacked ? 'inside' : 'top'}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        content={(props: any) => {
                          const { x, y, width, value, index } = props;
                          // Recharts keeps rendering the previous data's labels
                          // while it animates to new data, so when the new set is
                          // shorter (e.g. a SKU filter reapplied) `index` can point
                          // past the end of filteredData. Skip those stale labels.
                          const entry =
                            index !== undefined ? filteredData[index] : undefined;
                          if (index !== undefined && !entry) return null;
                          const color = isStacked
                            ? '#fff'
                            : bar.cellColor && entry
                              ? bar.cellColor(entry as Record<string, unknown>)
                              : bar.color;
                          return (
                            <text
                              x={Number(x) + Number(width) / 2}
                              y={Number(y) - 4}
                              textAnchor="middle"
                              fill={color}
                              style={{ fontSize: 11, fontWeight: 700 }}
                            >
                              {labelFormatter(Number(value))}
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
