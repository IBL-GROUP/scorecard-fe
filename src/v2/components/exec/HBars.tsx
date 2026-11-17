// Horizontal bars in the Sales Pulse 2.0 style (BreakdownBars, FR-EXEC-045):
// each row is a name, a thick bar for its value, a thin line for its target
// where it has one, and with a comparison on, the B period as a lighter bar
// underneath; the figures sit on the right and the % against target is coloured
// by the row's own status. Rows are listed A→Z (unless the caller keeps a
// ranking) and scroll. Click a row to open it.

import { Box, Flex, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { colors } from '@/v2/constants/theme';
import { Legend, type LegendItem } from './charts';

export interface HBarRow {
  key: string;
  label: string;
  value: number | null;
  /** The B period's value, drawn as a lighter bar under the value. */
  prior?: number | null;
  /** The target, drawn as a thin line through the bar. */
  target?: number | null;
  /** Bar colour (status, class or highlight). Default: sales. */
  color?: string;
  /** Text on the right of the name line, e.g. "95% target · 91.2%". */
  note?: ReactNode;
  /** Value text on the right of the bar (default: fmt(value)). */
  valueText?: string;
  priorText?: string;
  /**
   * Several bars per row instead of value / prior, e.g. one per month (oldest
   * first; the last is drawn strongest). Each has its own colour and text.
   */
  series?: { value: number | null; color: string; text: string }[];
  /** Fades the row (another row is the chip). */
  dim?: boolean;
  title?: string;
  onClick?: () => void;
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export function HBars({
  rows,
  fmt,
  max,
  legend,
  sort = 'name',
  emptyText = 'Nothing to show for this selection',
}: {
  rows: HBarRow[];
  fmt: (n: number) => string;
  /** Scale end; default the largest value, prior or target. */
  max?: number;
  legend?: LegendItem[];
  /** 'name' lists A→Z (Sales Pulse); 'keep' keeps the caller's order (a ranking). */
  sort?: 'name' | 'keep';
  emptyText?: string;
}) {
  const list = sort === 'name' ? [...rows].sort((a, b) => byName(a.label, b.label)) : rows;
  const showPrior = list.some((r) => r.prior != null);
  // Every row as a list of bars: the value (thick) and the B period (lighter), or its series.
  type Bar = { value: number | null; color: string; text: string; h: number; strong: boolean };
  const barsOf = (r: HBarRow): Bar[] =>
    r.series
      ? r.series.map((b, i, a) => ({ ...b, h: i === a.length - 1 ? 11 : 8, strong: i === a.length - 1 }))
      : [
          { value: r.value, color: r.color ?? colors.sales, text: r.valueText ?? (r.value == null ? '—' : fmt(r.value)), h: 11, strong: true },
          ...(showPrior ? [{ value: r.prior ?? null, color: colors.prior, text: r.priorText ?? (r.prior == null ? '—' : fmt(r.prior)), h: 9, strong: false }] : []),
        ];
  const top = max ?? Math.max(1, ...list.flatMap((r) => [...barsOf(r).map((b) => b.value ?? 0), r.target ?? 0]));
  const w = (v: number | null | undefined) => Math.max(0, Math.min(1, (v ?? 0) / top));
  const rowHOf = (r: HBarRow) => 25 + barsOf(r).reduce((t, b, i) => t + b.h + (i ? 3 : 0), 0);

  if (!list.length)
    return (
      <Flex h="100%" align="center" justify="center">
        <Text fontSize="13px" color={colors.mutedText}>
          {emptyText}
        </Text>
      </Flex>
    );

  return (
    <Flex direction="column" h="100%" minH={0} data-hbars>
      <Box flex={1} minH={0} overflowY="auto" pr={1} tabIndex={0} role="list" aria-label="Bars" _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: '-2px' }}>
        {list.map((r) => (
          <Box
            key={r.key}
            role="listitem"
            as={r.onClick ? 'button' : 'div'}
            display="block"
            w="100%"
            textAlign="left"
            h={`${rowHOf(r)}px`}
            px={1}
            py="3px"
            borderRadius="3px"
            cursor={r.onClick ? 'pointer' : 'default'}
            onClick={r.onClick}
            opacity={r.dim ? 0.35 : 1}
            title={r.title}
            _hover={r.onClick ? { bg: colors.hoverBg } : undefined}
            data-hbar={r.key}
          >
            <Flex justify="space-between" fontSize="12px" mb="3px" gap={2}>
              <Text color={colors.darkText} fontWeight={500} truncate title={r.label}>
                {r.label}
              </Text>
              {r.note && (
                <Text as="span" color={colors.mutedText} whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                  {r.note}
                </Text>
              )}
            </Flex>
            <Flex gap="8px" align="flex-start">
              <Box position="relative" flex={1} minW={0}>
                {barsOf(r).map((b, i) => (
                  <Box key={i} h={`${b.h}px`} mt={i ? '3px' : 0}>
                    <Box h="100%" w="100%" bg={b.color} borderRadius="2px" className="sp-grow" style={{ transform: `scaleX(${w(b.value)})`, transformOrigin: 'left' }} />
                  </Box>
                ))}
                {r.target != null && r.target > 0 && (
                  <Box position="absolute" top="-3px" bottom="-3px" w="2px" bg={colors.target} left={`calc(${w(r.target) * 100}% - 1px)`} />
                )}
              </Box>
              <Flex direction="column" w="56px" flexShrink={0} fontSize="11px" textAlign="right" fontVariantNumeric="tabular-nums">
                {barsOf(r).map((b, i) => (
                  <Text key={i} lineHeight={`${b.h}px`} mt={i ? '3px' : 0} color={b.strong ? colors.darkText : colors.mutedText} fontWeight={b.strong ? 600 : 400}>
                    {b.text}
                  </Text>
                ))}
              </Flex>
            </Flex>
          </Box>
        ))}
      </Box>
      {legend && legend.length > 0 && <Legend items={legend} />}
    </Flex>
  );
}
