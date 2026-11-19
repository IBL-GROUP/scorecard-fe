// Sales Pulse 2.0's breakdown bars (dsr-fe BreakdownBars), for any number of series: one row per
// item, its name and "target · %" (or a note) on top, then one thin bar per series on the same
// scale — the first one solid and tall, the others lighter — with each value listed on the right
// and the target as a tick through the bars. Legend in the card header. Every "by …" view of
// Supply Chain Pulse 2.0 draws with this, exactly as Sales Pulse's Business breakdown does
// (user, 19 Nov 2026: one pattern, Sales Pulse's).

import { Box, Flex, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { colors, fmt1 } from '@/v2/constants/theme';
import { useCardLegend, type LegendItem } from '@/v2/ui/chart-card/legend';
import { ACTIVE_ROW, useOpenedRow } from '@/v2/features/detail';

/** One series of a row: its value and colour, and its name for the tooltip. */
export interface RowBarPart {
  value: number;
  color: string;
  label: string;
}

export interface RowBar {
  key: string;
  name: string;
  parts: RowBarPart[];
  /** A target or threshold: a tick through the bars, and "target · %" (first series ÷ target) on top. */
  target?: number;
  /** Shown on top, right, in place of "target · %" ("153 orders"; a KPI's own target and status). */
  note?: ReactNode;
}

const statusInk = (pct: number) => (pct >= 100 ? colors.good : pct >= 80 ? colors.warn : colors.bad);

export function RowBars({
  rows,
  legend,
  fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  targetLabel = 'target',
  status = statusInk,
  onPick,
}: {
  rows: RowBar[];
  legend: LegendItem[];
  /** How a value prints (default: whole numbers with separators). */
  fmt?: (n: number) => string;
  /** The target's name in the row header ("target", "ordered", "threshold"). */
  targetLabel?: string;
  /** The colour of the "%" on top, by its value (Sales Pulse: green ≥ 100%, amber ≥ 80%). */
  status?: (pct: number) => string;
  onPick?: (key: string) => void;
}) {
  useCardLegend(legend);
  const opened = useOpenedRow();
  // One scale for every row and series, the target included (as Sales Pulse's).
  const max = Math.max(1, ...rows.flatMap((r) => [...r.parts.map((p) => Math.max(0, p.value)), r.target ?? 0]));
  return (
    <Flex direction="column" h="100%" minH={0}>
      <Box flex={1} minH={0} overflowY="auto" pr={1} className="sp-stagger">
        {rows.map((r) => {
          const pct = r.target && r.target > 0 && r.parts[0] ? (r.parts[0].value / r.target) * 100 : null;
          return (
            <Box
              key={r.key}
              as="button"
              display="block"
              w="100%"
              textAlign="left"
              px={1}
              py="3px"
              mb="6px"
              borderRadius="3px"
              cursor={onPick ? 'pointer' : 'default'}
              onClick={() => onPick && opened.open(r.key, () => onPick(r.key))}
              bg={opened.isActive(r.key) ? ACTIVE_ROW.bg : undefined}
              aria-current={opened.isActive(r.key) || undefined}
              _hover={{ bg: opened.isActive(r.key) ? ACTIVE_ROW.bg : colors.hoverBg }}
            >
              <Flex justify="space-between" fontSize="12px" mb="3px" gap={2}>
                <Text color={colors.darkText} fontWeight={500} truncate title={r.name}>
                  {r.name}
                </Text>
                <Text color={colors.mutedText} whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                  {r.note == null && r.target != null ? (
                    <>
                      {r.target > 0 ? `${fmt(r.target)} ${targetLabel}` : `no ${targetLabel}`}
                      {pct != null && (
                        <>
                          {' · '}
                          <Box as="span" color={status(pct)} fontWeight={700}>
                            {pct > 999 ? '>999%' : `${fmt1(pct)}%`}
                          </Box>
                        </>
                      )}
                    </>
                  ) : (
                    r.note
                  )}
                </Text>
              </Flex>
              <Flex gap="8px" align="flex-start">
                <Box position="relative" flex={1} minW={0}>
                  {r.parts.map((p, i) => (
                    <Box key={p.label} h={i === 0 ? '11px' : '9px'} mt={i === 0 ? 0 : '3px'} title={`${p.label} ${fmt(p.value)}`}>
                      <Box h="100%" w="100%" bg={p.color} borderRadius="2px" className="sp-grow" style={{ transform: `scaleX(${Math.max(0, p.value) / max})` }} />
                    </Box>
                  ))}
                  {r.target != null && r.target > 0 && (
                    <Box position="absolute" top="-3px" bottom="-3px" w="2px" bg={colors.target} left={`calc(${(r.target / max) * 100}% - 1px)`} title={`${targetLabel} ${fmt(r.target)}`} />
                  )}
                </Box>
                <Flex direction="column" w="56px" flexShrink={0} fontSize="11px" textAlign="right" fontVariantNumeric="tabular-nums">
                  {r.parts.map((p, i) => (
                    <Text key={p.label} lineHeight={i === 0 ? '11px' : '9px'} mt={i === 0 ? 0 : '3px'} color={i === 0 ? colors.darkText : colors.mutedText} fontWeight={i === 0 ? 600 : 400}>
                      {p.value ? fmt(p.value) : '—'}
                    </Text>
                  ))}
                </Flex>
              </Flex>
            </Box>
          );
        })}
      </Box>
    </Flex>
  );
}
