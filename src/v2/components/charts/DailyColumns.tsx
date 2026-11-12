import { Box, Flex, Text } from '@chakra-ui/react';
import { Bar, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useExpanded } from '@/v2/components/overlay';
import { colors, formatCompact } from '@/v2/constants/theme';

// Value on top of each column. It has to fit a whole month (30+ columns), so it
// steps down as the columns get narrower:
//   wide   → "109.3M" across the top
//   medium → "109M" (no decimal) across the top
//   narrow → "109.3M" turned upright, inside the top of the column, or just
//            above it when the column is too short to hold it
const CHAR_W = 6; // px per character at 10.5px tabular numerals
function shortCompact(v: number) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${Math.round(v / 1e8) / 10}B`;
  if (a >= 1e6) return `${Math.round(v / 1e6)}M`;
  if (a >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(Math.round(v));
}
type LabelProps = { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown };
function ValueLabel(props: LabelProps) {
  const x = Number(props.x) || 0;
  const y = Number(props.y) || 0;
  const w = Number(props.width) || 0;
  const h = Number(props.height) || 0;
  const v = Number(props.value);
  if (!Number.isFinite(v) || v === 0 || w <= 0) return null;
  const full = formatCompact(v);
  const short = shortCompact(v);
  const cx = x + w / 2;
  const style = { fontSize: '10.5px', fontVariantNumeric: 'tabular-nums' as const };
  // Labels may spill a little past the column into the gap between columns.
  const room = w * 1.3;
  if (full.length * CHAR_W <= room || short.length * CHAR_W <= room) {
    const text = full.length * CHAR_W <= room ? full : short;
    return (
      // A halo in the card colour keeps the number readable where the dashed
      // target line runs through it.
      <text x={cx} y={y - 5} textAnchor="middle" fill="var(--sp-body-text)" stroke="var(--sp-card-bg)" strokeWidth={3} paintOrder="stroke" style={style}>
        {text}
      </text>
    );
  }
  const len = full.length * CHAR_W + 8;
  const inside = h >= len;
  return (
    <text
      x={cx}
      y={inside ? y + 6 : y - 4}
      transform={`rotate(-90 ${cx} ${inside ? y + 6 : y - 4})`}
      textAnchor={inside ? 'end' : 'start'}
      dominantBaseline="central"
      fill={inside ? 'var(--sp-on-brand)' : 'var(--sp-body-text)'}
      {...(inside ? {} : { stroke: 'var(--sp-card-bg)', strokeWidth: 3, paintOrder: 'stroke' })}
      style={style}
    >
      {full}
    </text>
  );
}

/** One column per real day of sales, with the daily target as a stepped line.
 *  Columns don't invent a shape between days the way a smooth curve does. */
export function DailyColumns({
  data,
  withTarget,
  salesLabel = 'Sales',
  targetLabel = 'Daily target',
}: {
  data: { day: string | number; sales?: number; target?: number }[];
  withTarget: boolean;
  salesLabel?: string;
  targetLabel?: string;
}) {
  const expanded = useExpanded();
  const rows = data.filter((d) => d.sales != null || d.target != null);
  return (
    <Flex direction="column" h={expanded ? '520px' : '100%'} minH={0}>
      <Flex gap={4} fontSize="12px" color={colors.mutedText} mb={1} flexShrink={0}>
        <Flex align="center" gap="6px">
          <Box w="10px" h="10px" bg={colors.sales} borderRadius="2px" />
          {salesLabel}
        </Flex>
        {withTarget && (
          <Flex align="center" gap="6px">
            <Box w="14px" h="0" borderTop="2px dashed" borderColor={colors.target} />
            {targetLabel}
          </Flex>
        )}
      </Flex>
      <Box flex={1} minH={0}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 22, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--sp-grid-stroke)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--sp-axis-text)' }} />
            <YAxis tickLine={false} axisLine={false} width={64} tick={{ fontSize: 11, fill: 'var(--sp-axis-text)' }} tickFormatter={(v: number) => formatCompact(v)} />
            <Tooltip
              cursor={{ fill: 'var(--sp-hover-bg)' }}
              contentStyle={{ background: 'var(--sp-card-bg)', border: '1px solid var(--sp-border)', borderRadius: 4, fontSize: 12 }}
              formatter={(v?: number, name?: string) => [formatCompact(Number(v) || 0), name === 'target' ? targetLabel : salesLabel]}
              labelFormatter={(l) => `Day ${l}`}
            />
            <Bar dataKey="sales" fill="var(--sp-sales)" radius={[4, 4, 0, 0]} maxBarSize={44} animationDuration={300}>
              <LabelList dataKey="sales" content={ValueLabel} />
            </Bar>
            {withTarget && (
              <Line dataKey="target" type="step" stroke="var(--sp-target)" strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={300} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
      {rows.length > 0 && rows.length <= 3 && (
        <Text fontSize="11px" color={colors.mutedText} flexShrink={0}>
          Only {rows.length} day{rows.length > 1 ? 's' : ''} of data so far.
        </Text>
      )}
    </Flex>
  );
}
