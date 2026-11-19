import { Box, Flex, Text } from '@chakra-ui/react';
import { Bar, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useExpanded } from '@/v2/ui/overlay';
import { useCardLegend } from '@/v2/ui/chart-card/legend';
import { colors, formatCompact } from '@/v2/constants/theme';

// Value on top of each column. It has to fit a whole month (30+ columns), so it
// steps down as the columns get narrower:
//   wide   → "109.3M" across the top
//   medium → "109M" (no decimal) across the top
//   narrow → "109.3M" turned upright, inside the top of the column, or just
//            above it when the column is too short to hold it
const CHAR_W = 7; // px per character at 11.5px bold tabular numerals
/** Bar labels: the dashboard's millions rule (formatCompact), e.g. 0.82M · 5.0M · 26,154. */
const shortCompact = (v: number) => formatCompact(v);
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
  // Bold and a step larger than axis text, so the day's figure reads at a glance.
  const style = { fontSize: '11.5px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const };
  // Labels may spill a little past the column into the gap between columns.
  const room = w * 1.3;
  if (full.length * CHAR_W <= room || short.length * CHAR_W <= room) {
    const text = full.length * CHAR_W <= room ? full : short;
    return (
      // A halo in the card colour keeps the number readable where the dashed
      // target line runs through it.
      <text x={cx} y={y - 5} textAnchor="middle" fill="var(--sp-dark-text)" stroke="var(--sp-card-bg)" strokeWidth={3} paintOrder="stroke" style={style}>
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
      fill={inside ? 'var(--sp-on-brand)' : 'var(--sp-dark-text)'}
      {...(inside ? {} : { stroke: 'var(--sp-card-bg)', strokeWidth: 3, paintOrder: 'stroke' })}
      style={style}
    >
      {full}
    </text>
  );
}

/** One column per real day of sales, with the daily target as a stepped line.
 *  Columns don't invent a shape between days the way a smooth curve does.
 *  With `priorLabel` / `lyLabel`, each day also gets a column for the same
 *  day last month (`prior`) and last year (`ly`), in that order. */
export function DailyColumns({
  data,
  withTarget,
  salesLabel = 'Sales',
  targetLabel = 'Daily target',
  priorLabel,
  lyLabel,
}: {
  data: { day: string | number; sales?: number; target?: number; prior?: number; ly?: number }[];
  withTarget: boolean;
  salesLabel?: string;
  targetLabel?: string;
  priorLabel?: string;
  lyLabel?: string;
}) {
  const expanded = useExpanded();
  const rows = data.filter((d) => d.sales != null || d.target != null);
  const names: Record<string, string> = { sales: salesLabel, target: targetLabel, prior: priorLabel ?? '', ly: lyLabel ?? '' };
  const grouped = !!priorLabel || !!lyLabel;
  // In a ChartCard the legend sits under the card's title, not in the chart.
  const legendInCard = useCardLegend([
    { label: salesLabel, color: colors.sales },
    ...(priorLabel ? [{ label: priorLabel, color: colors.prior }] : []),
    ...(lyLabel ? [{ label: lyLabel, color: colors.lastYear }] : []),
    ...(withTarget ? [{ label: targetLabel, color: colors.target, shape: 'dash' as const }] : []),
  ]);
  return (
    <Flex direction="column" h={expanded ? '520px' : '100%'} minH={0}>
      {!legendInCard && (
      <Flex gap={4} fontSize="12px" color={colors.mutedText} mb={1} flexShrink={0}>
        <Flex align="center" gap="6px">
          <Box w="10px" h="10px" bg={colors.sales} borderRadius="2px" />
          {salesLabel}
        </Flex>
        {priorLabel && (
          <Flex align="center" gap="6px">
            <Box w="10px" h="10px" bg={colors.prior} borderRadius="2px" />
            {priorLabel}
          </Flex>
        )}
        {lyLabel && (
          <Flex align="center" gap="6px">
            <Box w="10px" h="10px" bg={colors.lastYear} borderRadius="2px" />
            {lyLabel}
          </Flex>
        )}
        {withTarget && (
          <Flex align="center" gap="6px">
            <Box w="14px" h="0" borderTop="2px dashed" borderColor={colors.target} />
            {targetLabel}
          </Flex>
        )}
      </Flex>
      )}
      <Box flex={1} minH={0}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 22, right: 8, left: 0, bottom: 0 }} barCategoryGap={grouped ? '16%' : '22%'} barGap={1}>
            <CartesianGrid vertical={false} stroke="var(--sp-grid-stroke)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--sp-axis-text)' }} />
            <YAxis tickLine={false} axisLine={false} width={64} tick={{ fontSize: 11, fill: 'var(--sp-axis-text)' }} tickFormatter={(v: number) => formatCompact(v)} />
            <Tooltip
              cursor={{ fill: 'var(--sp-hover-bg)' }}
              contentStyle={{ background: 'var(--sp-card-bg)', border: '1px solid var(--sp-border)', borderRadius: 4, fontSize: 12 }}
              formatter={(v?: number, name?: string) => [formatCompact(Number(v) || 0), names[name ?? 'sales'] ?? salesLabel]}
              labelFormatter={(l) => `Day ${l}`}
            />
            <Bar dataKey="sales" fill="var(--sp-sales)" radius={[4, 4, 0, 0]} maxBarSize={44} animationDuration={300}>
              {/* Side by side with the comparison columns there is no room for numbers; the tooltip has them. */}
              {!grouped && <LabelList dataKey="sales" content={ValueLabel} />}
            </Bar>
            {priorLabel && <Bar dataKey="prior" fill={colors.prior} radius={[3, 3, 0, 0]} maxBarSize={30} animationDuration={300} />}
            {lyLabel && <Bar dataKey="ly" fill={colors.lastYear} radius={[3, 3, 0, 0]} maxBarSize={30} animationDuration={300} />}
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
