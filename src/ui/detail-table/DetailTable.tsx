// A flat details list in Sales Pulse 2.0's table style, for 1.0's "View details" dialogs
// (WIP Details, RMPM Details): the filters in the toolbar, Find and Export on the right,
// the header and the Total row pinned while the rows scroll, every column sortable.

import { Box, Button, Flex, Input, Text } from '@chakra-ui/react';
import { useMemo, useState, type ReactNode } from 'react';
import { FiArrowDown, FiArrowUp, FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { colors } from '@/constants/theme';
import { byName } from '@/ui/byName';
import { ACTIVE_ROW, useOpenedRow } from '@/features/detail';

export interface DetailColumn<R> {
  key: string;
  header: string;
  /** Text columns sit left and are searched; figures sit right and add up in the Total row. */
  kind: 'text' | 'number';
  value: (r: R) => string | number;
  fmt?: (v: number) => string;
  /** A figure's colour, by its value and row. */
  color?: (v: number, r: R) => string | undefined;
  /** Leave the Total row empty for this figure (a share, a date…). */
  noTotal?: boolean;
}

const full = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });

export function DetailTable<R>({
  rows,
  columns,
  toolbar,
  exportName,
  searchPlaceholder = 'Find…',
  onRow,
  rowOpens,
  total: allRows,
}: {
  rows: R[];
  /** Rows before the caller's filters, for "x of y rows" (default: rows). */
  total?: number;
  columns: DetailColumn<R>[];
  toolbar?: ReactNode;
  exportName: string;
  searchPlaceholder?: string;
  onRow?: (r: R) => void;
  /** False for a row with nothing further to open (default: every row opens when onRow is given). */
  rowOpens?: (r: R) => boolean;
}) {
  const [query, setQuery] = useState('');
  const opened = useOpenedRow();
  const rowKey = (r: R) => columns.map((c) => String(c.value(r))).join('|');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const q = query.trim().toLowerCase();
  const texts = columns.filter((c) => c.kind === 'text');

  const shown = useMemo(() => {
    const list = q ? rows.filter((r) => texts.some((c) => String(c.value(r)).toLowerCase().includes(q))) : rows;
    if (!sort) return list;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return list;
    return [...list].sort((a, b) => {
      const x = col.value(a);
      const y = col.value(b);
      return (col.kind === 'number' ? Number(x) - Number(y) : byName(String(x), String(y))) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, sort]);
  const totals = columns.map((c) => (c.kind === 'number' && !c.noTotal ? shown.reduce((t, r) => t + (Number(c.value(r)) || 0), 0) : null));

  const exportRows = () => {
    const ws = XLSX.utils.json_to_sheet(shown.map((r) => Object.fromEntries(columns.map((c) => [c.header, c.value(r)]))));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exportName.slice(0, 31));
    XLSX.writeFile(wb, `${exportName}.xlsx`);
  };
  const toggleSort = (key: string, kind: DetailColumn<R>['kind']) =>
    setSort((s) => (s?.key === key ? (s.dir === (kind === 'number' ? -1 : 1) ? { key, dir: s.dir === 1 ? -1 : 1 } : null) : { key, dir: kind === 'number' ? -1 : 1 }));

  const th = { position: 'sticky' as const, top: 0, zIndex: 2, bg: colors.pageBg, px: 3, py: '8px', fontSize: '13px', fontWeight: 700, color: colors.darkText, borderBottom: '1px solid', borderColor: colors.border, whiteSpace: 'nowrap' as const, cursor: 'pointer', userSelect: 'none' as const };
  const tot = { position: 'sticky' as const, top: '35px', zIndex: 1, bg: colors.tableTotalStart, px: 3, py: '7px', fontSize: '13px', fontWeight: 700, color: colors.darkText, borderBottom: '1px solid', borderColor: colors.border, whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums' };

  return (
    <Flex direction="column" h="100%" minH={0} gap={3}>
      <Flex align="flex-end" gap={3} wrap="wrap" flexShrink={0}>
        {toolbar}
        <Flex align="center" gap={2} ml="auto">
          <Text fontSize="13px" color={colors.mutedText} whiteSpace="nowrap">
            {full(shown.length)} of {full(allRows ?? rows.length)} rows
          </Text>
          {!toolbar && (
          <Input size="sm" h="32px" w="200px" placeholder={searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} borderRadius="4px" fontSize="13px" />
          )}
          <Button size="sm" h="32px" bg={colors.sunkBg} color={colors.darkText} _hover={{ bg: colors.border }} borderRadius="4px" onClick={exportRows} title="Export the rows shown">
            <FiDownload /> Export
          </Button>
        </Flex>
      </Flex>
      <Box flex={1} minH={0} overflow="auto" border="1px solid" borderColor={colors.border} borderRadius="4px">
        <Box as="table" w="100%" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead className="sp-th">
            <tr>
              {columns.map((c) => (
                <Box as="th" key={c.key} {...th} textAlign={c.kind === 'number' ? 'right' : 'left'} onClick={() => toggleSort(c.key, c.kind)} title="Sort">
                  <Flex align="center" gap="4px" justify={c.kind === 'number' ? 'flex-end' : 'flex-start'}>
                    {c.header}
                    {sort?.key === c.key && (sort.dir === 1 ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                  </Flex>
                </Box>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {columns.map((c, i) => (
                <Box as="td" key={c.key} {...tot} textAlign={c.kind === 'number' ? 'right' : 'left'}>
                  {i === 0 ? 'Total' : totals[i] == null ? '' : (c.fmt ?? full)(totals[i] as number)}
                </Box>
              ))}
            </tr>
            {!shown.length && (
              <tr>
                <Box as="td" {...{ colSpan: columns.length }} p={8} textAlign="center" fontSize="13px" color={colors.mutedText}>
                  No row matches these filters.
                </Box>
              </tr>
            )}
            {shown.map((r, ri) => {
              const opens = !!onRow && (rowOpens?.(r) ?? true);
              return (
              <Box
                as="tr"
                key={ri}
                cursor={opens ? 'pointer' : undefined}
                _hover={{ '& td': { bg: opened.isActive(rowKey(r)) ? ACTIVE_ROW.bg : colors.hoverBg } }}
                onClick={opens ? () => opened.open(rowKey(r), () => onRow!(r)) : undefined}
                css={opened.isActive(rowKey(r)) ? { '& td': { background: ACTIVE_ROW.bg }, '& td:first-of-type': { boxShadow: ACTIVE_ROW.boxShadow } } : undefined}
                aria-current={opened.isActive(rowKey(r)) || undefined}
              >
                {columns.map((c, i) => {
                  const v = c.value(r);
                  const num = c.kind === 'number';
                  return (
                    <Box
                      as="td"
                      key={c.key}
                      px={3}
                      py="7px"
                      fontSize="13px"
                      textAlign={num ? 'right' : 'left'}
                      fontVariantNumeric="tabular-nums"
                      whiteSpace="nowrap"
                      borderBottom="1px solid"
                      borderColor={colors.sunkBg}
                      color={num ? c.color?.(Number(v), r) ?? colors.bodyText : i === 0 && opens ? colors.brand : colors.darkText}
                      fontWeight={i === 0 ? 500 : num && c.color?.(Number(v), r) ? 600 : 400}
                      maxW={i === 0 ? '360px' : undefined}
                      overflow="hidden"
                      textOverflow="ellipsis"
                      title={i === 0 ? String(v) : undefined}
                    >
                      {num ? (c.fmt ?? full)(Number(v) || 0) : String(v ?? '') || '—'}
                    </Box>
                  );
                })}
              </Box>
              );
            })}
          </tbody>
        </Box>
      </Box>
    </Flex>
  );
}
