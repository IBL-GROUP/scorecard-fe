import { Box, Flex, Text } from '@chakra-ui/react';
import { colors, fmt1 } from '@/constants/theme';
import { byName } from '@/ui/byName';
import { useCardLegend } from '@/ui/chart-card/legend';
import { useOpenedRow } from '@/features/detail';
import { ColumnGroups } from '@/ui/charts/ColumnGroups';
import type { BreakdownRow } from './BreakdownTable';

const isJunk = (n: string) => !n || n === 'Others' || n === 'null' || n === '—';
const statusInk = (pct: number) => (pct >= 100 ? colors.good : pct >= 80 ? colors.warn : colors.bad);

/**
 * The Business breakdown's rows as columns: one group per row (oldest period first),
 * its target as a dashed line across the group, its name and "target · %" beneath.
 * Every row is drawn A→Z (the chart scrolls sideways when they do not fit); unmapped
 * sales come last. Click a group to open it.
 */
export function BreakdownBars({
  rows,
  fmt,
  showTarget,
  showPrior,
  showLy = false,
  targetLabel = 'Target',
  periods,
  onPick,
}: {
  rows: BreakdownRow[];
  fmt: (n: number) => string;
  showTarget: boolean;
  showPrior: boolean;
  /** Also draw the same days last year, under the B bar. */
  showLy?: boolean;
  targetLabel?: 'Target' | 'Budget';
  /** Names for the bars, e.g. { a: "Oct '26", b: "Sep '26", ly: "Oct '25" }. */
  periods?: { a: string; b: string; ly?: string };
  onPick?: (name: string) => void;
}) {
  const list = rows
    .filter((r) => r.sale || r.target || r.prior || r.ly)
    .sort((a, b) => Number(isJunk(a.name)) - Number(isJunk(b.name)) || byName(a.name, b.name));
  const aName = periods?.a || 'This period';
  const bName = periods?.b || 'B period';
  const lyName = periods?.ly || 'Last year';
  // Oldest period first, as columns (user, 24 Nov 2026: no horizontal bars).
  const series = [
    ...(showLy ? [{ key: 'ly', name: lyName, color: colors.lastYear }] : []),
    ...(showPrior ? [{ key: 'prior', name: bName, color: colors.prior }] : []),
    { key: 'sale', name: aName, color: colors.sales },
  ];
  const opened = useOpenedRow();
  const legendInCard = useCardLegend([
    ...series.map((c) => ({ label: c.name, color: c.color })),
    ...(showTarget ? [{ label: targetLabel, color: colors.target, shape: 'dash' as const }] : []),
  ]);

  if (!list.length) {
    return (
      <Flex h="100%" align="center" justify="center">
        <Text fontSize="13px" color={colors.mutedText}>
          No Sales For This Selection
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" h="100%" minH={0}>
      <Box flex={1} minH={0}>
        <ColumnGroups
          groups={list.map((r) => {
            const junk = isJunk(r.name);
            const pct = showTarget && r.target > 0 ? (r.sale / r.target) * 100 : null;
            return {
              key: r.name || '—',
              name: junk ? 'Other / Unmapped' : r.name,
              values: { ly: r.ly ?? 0, prior: r.prior, sale: r.sale },
              target: showTarget ? r.target : undefined,
              foot: showTarget ? (
                r.target > 0 ? (
                  <>
                    {fmt(r.target)}
                    {pct != null && (
                      <>
                        {' · '}
                        <Box as="span" color={statusInk(pct)} fontWeight={700}>
                          {`${fmt1(pct)}%`}
                        </Box>
                      </>
                    )}
                  </>
                ) : (
                  `No ${targetLabel}`
                )
              ) : undefined,
            };
          })}
          series={series}
          fmt={fmt}
          targetName={targetLabel}
          isActive={opened.isActive}
          onPick={onPick ? (name) => !isJunk(name) && opened.open(name, () => onPick(name)) : undefined}
        />
      </Box>
      {!legendInCard && (
        <Flex gap={3} fontSize="11px" color={colors.mutedText} pt={2} wrap="wrap" flexShrink={0}>
          {series.map((c) => (
            <Flex key={c.key} align="center" gap="5px">
              <Box w="10px" h="10px" bg={c.color} borderRadius="2px" />
              {c.name}
            </Flex>
          ))}
          {showTarget && (
            <Flex align="center" gap="5px">
              <Box w="14px" h="0" borderTop="2px dashed" borderColor={colors.target} />
              {targetLabel}
            </Flex>
          )}
        </Flex>
      )}
    </Flex>
  );
}
