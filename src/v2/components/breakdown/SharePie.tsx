import { Box, Flex, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { colors } from '@/v2/constants/theme';
import type { BreakdownRow } from './BreakdownTable';

// Fixed categorical order (validated for colour-blind separation; the legend
// beside the pie names every slice, so identity is never colour alone).
const HUES = ['#3B5BDB', '#12A594', '#E8590C', '#8B5CF6', '#D69E2E', '#1C7ED6', '#D6336C', '#5C940D'];
const OTHER = '#9CA3AF';
const isJunk = (n: string) => !n || n === 'Others' || n === 'null' || n === '—';

/**
 * Share of sales for the rows of the Business breakdown, as a donut. The 8
 * biggest get their own slice; the rest (and unmapped sales) fold into
 * "Everything else". Click a slice or a legend row to open it.
 */
export function SharePie({
  rows,
  fmt,
  onPick,
}: {
  rows: BreakdownRow[];
  fmt: (n: number) => string;
  onPick?: (name: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const real = rows.filter((r) => r.sale > 0 && !isJunk(r.name)).sort((a, b) => b.sale - a.sale);
  const total = rows.reduce((a, r) => a + Math.max(0, r.sale), 0);
  const top = real.slice(0, HUES.length);
  const rest = total - top.reduce((a, r) => a + r.sale, 0);
  const data = [
    ...top.map((r, i) => ({ name: r.name, value: r.sale, color: HUES[i], pickable: true })),
    ...(rest > total * 0.0005 ? [{ name: 'Everything else', value: rest, color: OTHER, pickable: false }] : []),
  ];
  const share = (v: number) => (total ? `${((v / total) * 100).toFixed(1)}%` : '—');

  return (
    <Flex h="100%" minH={0} gap={4} align="center" wrap={{ base: 'wrap', md: 'nowrap' }}>
      <Box flex="1 1 50%" h="100%" minH="220px" position="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={1}
              stroke="var(--sp-card-bg)"
              strokeWidth={2}
              animationDuration={300}
              onMouseEnter={(d: { name?: string }) => setHover(d.name ?? null)}
              onMouseLeave={() => setHover(null)}
              onClick={(d: { name?: string; payload?: { pickable?: boolean } }) => d.payload?.pickable && d.name && onPick?.(d.name)}
            >
              {data.map((d) => (
                <Cell
                  key={d.name}
                  fill={d.color}
                  cursor={d.pickable && onPick ? 'pointer' : 'default'}
                  opacity={hover && hover !== d.name ? 0.45 : 1}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: unknown, n?: string) => [`${fmt(Number(v))} · ${share(Number(v))}`, n ?? '']}
              contentStyle={{ background: 'var(--sp-card-bg)', border: '1px solid var(--sp-border)', borderRadius: 4, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre: the total, or the hovered slice. */}
        <Flex position="absolute" inset={0} direction="column" align="center" justify="center" pointerEvents="none">
          <Text fontSize="11.5px" color={colors.mutedText} textAlign="center" maxW="45%" truncate>
            {hover ?? 'Total sales'}
          </Text>
          <Text fontSize="20px" fontWeight={700} color={colors.darkText} fontVariantNumeric="tabular-nums">
            {fmt(hover ? data.find((d) => d.name === hover)?.value ?? 0 : total)}
          </Text>
          {hover && (
            <Text fontSize="12px" color={colors.mutedText}>
              {share(data.find((d) => d.name === hover)?.value ?? 0)}
            </Text>
          )}
        </Flex>
      </Box>
      <Flex direction="column" flex="1 1 50%" minW={0} gap="2px" overflowY="auto" maxH="100%">
        {data.map((d) => (
          <Flex
            key={d.name}
            as={d.pickable && onPick ? 'button' : 'div'}
            align="center"
            gap={2}
            px={2}
            py="6px"
            borderRadius="4px"
            textAlign="left"
            cursor={d.pickable && onPick ? 'pointer' : 'default'}
            bg={hover === d.name ? colors.hoverBg : undefined}
            _hover={{ bg: colors.hoverBg }}
            onMouseEnter={() => setHover(d.name)}
            onMouseLeave={() => setHover(null)}
            onClick={() => d.pickable && onPick?.(d.name)}
            title={d.pickable ? `Open ${d.name}` : `${rows.length - top.length} more, and unmapped sales`}
          >
            <Box w="10px" h="10px" borderRadius="2px" bg={d.color} flexShrink={0} />
            <Text flex={1} fontSize="13px" color={d.pickable ? colors.darkText : colors.mutedText} truncate>
              {d.name}
            </Text>
            <Text fontSize="13px" fontWeight={600} color={colors.darkText} fontVariantNumeric="tabular-nums">
              {fmt(d.value)}
            </Text>
            <Text w="48px" textAlign="right" fontSize="12.5px" color={colors.mutedText} fontVariantNumeric="tabular-nums">
              {share(d.value)}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
