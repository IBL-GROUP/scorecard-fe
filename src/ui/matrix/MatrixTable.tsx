// A small cross table (branch × class, class × setting…) in Sales Pulse 2.0's table style
// (dsr-fe BreakdownTable): header and Total pinned, rows scroll inside the card, figures
// coloured by their status, and a row opening its detail when `onRow` is given.

import { Box, Flex, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { colors } from '@/constants/theme';
import { ACTIVE_ROW, useOpenedRow } from '@/features/detail';
import { useRowWindow } from '@/features/rowWindow';

export interface MatrixRow {
  name: string;
  /** Shown instead of the name (the name stays the row's key and what onRow gets). */
  label?: ReactNode;
  /** Drawn before the label: a class badge… */
  mark?: ReactNode;
  /** A cell's text, its status colour and, for a heatmap, a soft status fill. */
  cells: { text: string; color?: string; bg?: string }[];
  /** False when this row has nothing further to open (no sheet would add to what the row shows). */
  opens?: boolean;
}

export function MatrixTable({
  cols,
  rows,
  total,
  nameHeader = 'Branch',
  onRow,
}: {
  cols: { key: string; label: ReactNode }[];
  rows: MatrixRow[];
  /** The Total row's cells; none when absent. */
  total?: string[];
  nameHeader?: string;
  onRow?: (name: string) => void;
}) {
  const opened = useOpenedRow();
  // Callers build rows afresh each render: back to 50 only when the list itself changes.
  const win = useRowWindow(rows, `${rows.length}|${rows[0]?.name}|${rows[rows.length - 1]?.name}`);
  const th = { position: 'sticky' as const, top: 0, zIndex: 2, bg: colors.pageBg, px: 3, py: '7px', fontSize: '13px', fontWeight: 700, color: colors.darkText, borderBottom: '1px solid', borderColor: colors.border, whiteSpace: 'nowrap' as const };
  const tot = { position: 'sticky' as const, top: '33px', zIndex: 1, bg: colors.tableTotalStart, px: 3, py: '7px', fontSize: '13px', fontWeight: 700, color: colors.darkText, borderBottom: '1px solid', borderColor: colors.border };
  return (
    <Box h="100%" overflow="auto" border="1px solid" borderColor={colors.border} borderRadius="4px">
      <Box as="table" w="100%" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead className="sp-th">
          <tr>
            <Box as="th" {...th} textAlign="left">
              {nameHeader}
            </Box>
            {cols.map((c) => (
              <Box as="th" key={c.key} {...th} textAlign="center">
                {/* Centred over its figures, whether text or a block like a class badge. */}
                <Flex justify="center">{c.label}</Flex>
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {total && (
            <tr>
              <Box as="td" {...tot}>
                Total
              </Box>
              {total.map((t, i) => (
                <Box as="td" key={i} {...tot} textAlign="center" fontVariantNumeric="tabular-nums">
                  {t}
                </Box>
              ))}
            </tr>
          )}
          {win.rows.map((r) => (
            <Box
              as="tr"
              key={r.name}
              cursor={onRow && r.opens !== false ? 'pointer' : undefined}
              _hover={onRow && r.opens !== false ? { '& td': { bg: opened.isActive(r.name) ? ACTIVE_ROW.bg : colors.hoverBg } } : undefined}
              onClick={onRow && r.opens !== false ? () => opened.open(r.name, () => onRow(r.name)) : undefined}
              css={opened.isActive(r.name) ? { '& td': { background: ACTIVE_ROW.bg }, '& td:first-of-type': { boxShadow: ACTIVE_ROW.boxShadow } } : undefined}
              aria-current={opened.isActive(r.name) || undefined}
            >
              <Box as="td" px={3} py="7px" fontSize="13px" borderBottom="1px solid" borderColor={colors.sunkBg} color={onRow && r.opens !== false ? colors.brand : colors.darkText} fontWeight={opened.isActive(r.name) ? 600 : undefined} maxW="280px">
                <Flex align="center" gap={2} minW={0}>
                  {r.mark}
                  <Text as="span" truncate title={r.name}>
                    {r.label ?? r.name}
                  </Text>
                </Flex>
              </Box>
              {r.cells.map((c, i) => (
                <Box as="td" key={i} px={3} py="7px" fontSize="13px" textAlign="center" fontVariantNumeric="tabular-nums" fontWeight={c.color ? 600 : 400} color={c.color ?? colors.bodyText} bg={c.bg} borderBottom="1px solid" borderColor={colors.sunkBg} whiteSpace="nowrap">
                  {c.text}
                </Box>
              ))}
            </Box>
          ))}
          {win.markerRow(cols.length + 1)}
        </tbody>
      </Box>
    </Box>
  );
}
