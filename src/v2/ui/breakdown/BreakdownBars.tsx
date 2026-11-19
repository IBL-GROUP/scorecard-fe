import { Box, Flex, Text } from '@chakra-ui/react';
import { colors, fmt1 } from '@/v2/constants/theme';
import { byName } from '@/v2/ui/byName';
import { useCardLegend } from '@/v2/ui/chart-card/legend';
import { ACTIVE_ROW, useOpenedRow } from '@/v2/features/detail';
import type { BreakdownRow } from './BreakdownTable';

const isJunk = (n: string) => !n || n === 'Others' || n === 'null' || n === '—';
const statusInk = (pct: number) => (pct >= 100 ? colors.good : pct >= 80 ? colors.warn : colors.bad);

/**
 * The Business breakdown's rows as bars, drawn like Achievement by category:
 * each row's sales as a bar, its target (or budget) as a line through it, and
 * with a comparison on, the earlier period as a lighter bar beneath. Every row
 * is listed A→Z and scrolls; unmapped sales come last.
 * Click a row to open it.
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
  const max = Math.max(1, ...list.map((r) => Math.max(r.sale, showTarget ? r.target : 0, showPrior ? r.prior : 0, showLy ? r.ly ?? 0 : 0)));
  const aName = periods?.a || 'This period';
  const bName = periods?.b || 'B period';
  const lyName = periods?.ly || 'Last year';
  const rowH = 38 + (showPrior ? 12 : 0) + (showLy ? 12 : 0);
  // In a chart card the legend sits under the card's title, as on every other chart; elsewhere it stays under the bars.
  const opened = useOpenedRow();
  const legendInCard = useCardLegend([
    { label: aName, color: colors.sales },
    ...(showPrior ? [{ label: bName, color: colors.prior }] : []),
    ...(showLy ? [{ label: lyName, color: colors.lastYear }] : []),
    ...(showTarget ? [{ label: targetLabel, color: colors.target, shape: 'tick' as const }] : []),
  ]);

  if (!list.length) {
    return (
      <Flex h="100%" align="center" justify="center">
        <Text fontSize="13px" color={colors.mutedText}>
          No sales for this selection
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" h="100%" minH={0}>
      <Box flex={1} minH={0} overflowY="auto" pr={1} className="sp-stagger">
        {list.map((r) => {
          const junk = isJunk(r.name);
          const name = junk ? 'Other / unmapped' : r.name;
          const pct = showTarget && r.target > 0 ? (r.sale / r.target) * 100 : null;
          return (
            <Box
              key={r.name || '—'}
              as="button"
              display="block"
              w="100%"
              textAlign="left"
              h={`${rowH}px`}
              px={1}
              py="3px"
              borderRadius="3px"
              cursor={onPick && !junk ? 'pointer' : 'default'}
              onClick={() => !junk && onPick && opened.open(r.name, () => onPick(r.name))}
              bg={opened.isActive(r.name) ? ACTIVE_ROW.bg : undefined}
              aria-current={opened.isActive(r.name) || undefined}
              _hover={{ bg: opened.isActive(r.name) ? ACTIVE_ROW.bg : colors.hoverBg }}
            >
              <Flex justify="space-between" fontSize="12px" mb="3px" gap={2}>
                <Text color={junk ? colors.mutedText : colors.darkText} fontStyle={junk ? 'italic' : undefined} fontWeight={500} truncate title={name}>
                  {name}
                </Text>
                {showTarget && (
                  <Text color={colors.mutedText} whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                    {r.target > 0 ? `${fmt(r.target)} ${targetLabel.toLowerCase()}` : `no ${targetLabel.toLowerCase()}`}
                    {pct != null && (
                      <>
                        {' · '}
                        <Box as="span" color={statusInk(pct)} fontWeight={700}>
                          {pct > 999 ? '>999%' : `${fmt1(pct)}%`}
                        </Box>
                      </>
                    )}
                  </Text>
                )}
              </Flex>
              <Flex gap="8px" align="flex-start">
                <Box position="relative" flex={1} minW={0}>
                  <Box h="11px" title={`${aName} ${fmt(r.sale)}`}>
                    <Box
                      h="100%"
                      w="100%"
                      bg={colors.sales}
                      borderRadius="2px"
                      className="sp-grow"
                      style={{ transform: `scaleX(${Math.max(0, r.sale) / max})` }}
                    />
                  </Box>
                  {showPrior && (
                    <Box h="9px" mt="3px" title={`${bName} ${fmt(r.prior)}`}>
                      <Box
                        h="100%"
                        w="100%"
                        bg={colors.prior}
                        borderRadius="2px"
                        className="sp-grow"
                        style={{ transform: `scaleX(${Math.max(0, r.prior) / max})` }}
                      />
                    </Box>
                  )}
                  {showLy && (
                    <Box h="9px" mt="3px" title={`${lyName} ${fmt(r.ly ?? 0)}`}>
                      <Box
                        h="100%"
                        w="100%"
                        bg={colors.lastYear}
                        borderRadius="2px"
                        className="sp-grow"
                        style={{ transform: `scaleX(${Math.max(0, r.ly ?? 0) / max})` }}
                      />
                    </Box>
                  )}
                  {showTarget && r.target > 0 && (
                    <Box
                      position="absolute"
                      top="-3px"
                      bottom="-3px"
                      w="2px"
                      bg={colors.target}
                      left={`calc(${(r.target / max) * 100}% - 1px)`}
                      title={`${targetLabel} ${fmt(r.target)}`}
                    />
                  )}
                </Box>
                <Flex direction="column" w="56px" flexShrink={0} fontSize="11px" textAlign="right" fontVariantNumeric="tabular-nums">
                  <Text lineHeight="11px" color={colors.darkText} fontWeight={600}>
                    {fmt(r.sale)}
                  </Text>
                  {showPrior && (
                    <Text lineHeight="9px" mt="3px" color={colors.mutedText}>
                      {r.prior > 0 ? fmt(r.prior) : '—'}
                    </Text>
                  )}
                  {showLy && (
                    <Text lineHeight="9px" mt="3px" color={colors.mutedText}>
                      {r.ly ? fmt(r.ly) : '—'}
                    </Text>
                  )}
                </Flex>
              </Flex>
            </Box>
          );
        })}
      </Box>
      {!legendInCard && (
      <Flex gap={3} fontSize="11px" color={colors.mutedText} pt={2} wrap="wrap" flexShrink={0}>
        <Flex align="center" gap="5px">
          <Box w="14px" h="8px" bg={colors.sales} borderRadius="1px" />
          {aName}
        </Flex>
        {showPrior && (
          <Flex align="center" gap="5px">
            <Box w="14px" h="6px" bg={colors.prior} borderRadius="1px" />
            {bName}
          </Flex>
        )}
        {showLy && (
          <Flex align="center" gap="5px">
            <Box w="14px" h="6px" bg={colors.lastYear} borderRadius="1px" />
            {lyName}
          </Flex>
        )}
        {showTarget && (
          <Flex align="center" gap="5px">
            <Box w="2px" h="12px" bg={colors.target} />
            {targetLabel}
          </Flex>
        )}
      </Flex>
      )}
    </Flex>
  );
}
