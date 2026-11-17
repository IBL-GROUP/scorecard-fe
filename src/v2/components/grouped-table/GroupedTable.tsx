// Group-wise table in the Sales Pulse 2.0 style (National table, FR-EXEC-046):
// rows fold into groups, level by level (a "Group by" switch picks the order),
// each group row shows its subtotals and how many rows it holds, and a chevron
// unfolds it. Search, Expand all / Collapse all and Excel export (ungrouped,
// ending with the Total row) sit in the toolbar. The Total row is the last row,
// pinned to the bottom (FR-EXEC-026); groups and rows are listed ascending
// (FR-EXEC-027). Group figures add up quantities and values; a figure that is
// not a sum shows on a group only when the table states its existing rule
// (e.g. delivered ÷ ordered), otherwise it is blank. No new formula.

import { Box, Button, Flex, HStack, Input, Table, Text } from '@chakra-ui/react';
import { useContext, useMemo, useState, type ReactNode } from 'react';
import { FiChevronDown, FiChevronRight, FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { Segmented } from '@/v2/components/segmented';
import { ExportNameContext } from '@/v2/components/data-table/DataTable';
import { EmptyChart } from '@/v2/components/charts/EmptyChart';
import { colors } from '@/v2/constants/theme';
import { recordExport } from '@/v2/features/usage';

export interface GroupLevel<R> {
  key: string;
  label: string;
  /** What rows group by at this level. */
  of: (r: R) => string;
  /** The group's name, when not the key itself. */
  name?: (r: R) => string;
  /** Ascending order of groups at this level (default: by name, numbers numerically). */
  order?: (a: string, b: string) => number;
}

export interface GroupPreset<R> {
  value: string;
  label: string;
  /** Level keys, outermost first; the rows themselves come after. */
  levels: string[];
  /** What the rows are called and show under this grouping, when not the table's default leaf. */
  leaf?: { label: string; name: (r: R) => string; code?: (r: R) => string | undefined };
}

export interface GroupFigure<R> {
  header: string;
  value: (r: R) => number | null;
  fmt: (n: number | null) => string;
  /**
   * How a group and the Total show this column: 'sum' (default), 'none'
   * (blank), or the table's existing rule over the group's rows.
   */
  group?: 'sum' | 'none' | ((rows: R[], level: string | null, key: string | null) => number | null);
  /** Colour of a row's cell. */
  color?: (r: R) => string | undefined;
  /** Colour of a group's (or the Total's, level null) cell. */
  groupColor?: (v: number | null, level: string | null, key: string | null) => string | undefined;
}

export interface GroupText<R> {
  header: string;
  value: (r: R) => string;
  color?: (r: R) => string | undefined;
}

interface Node<R> {
  id: string;
  level: string;
  key: string;
  name: string;
  depth: number;
  rows: R[];
  children: Node<R>[];
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export function GroupedTable<R>({
  title,
  rows,
  levels,
  presets,
  leaf,
  texts = [],
  figures,
  onLeaf,
  isLoading = false,
  toolbar,
  expandDepth = 1,
  searchPlaceholder = 'Find in this list…',
}: {
  title?: string;
  rows: R[];
  levels: GroupLevel<R>[];
  presets: GroupPreset<R>[];
  /** The rows under the last level. */
  leaf: { label: string; key: (r: R) => string; name: (r: R) => string; code?: (r: R) => string | undefined };
  /** Text columns, shown on rows only. */
  texts?: GroupText<R>[];
  figures: GroupFigure<R>[];
  onLeaf?: (r: R) => void;
  isLoading?: boolean;
  toolbar?: ReactNode;
  /** How many levels open by default (1 = the first level's groups are unfolded). */
  expandDepth?: number;
  searchPlaceholder?: string;
}) {
  const sectionName = useContext(ExportNameContext);
  const exportName = title ?? sectionName;
  const [preset, setPreset] = useState(presets[0]?.value ?? '');
  const [query, setQuery] = useState('');
  const active = presets.find((p) => p.value === preset) ?? presets[0];
  const shown = active.levels.map((k) => levels.find((l) => l.key === k)!).filter(Boolean);
  const lf = { ...leaf, ...active.leaf };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      !q
        ? rows
        : rows.filter((r) => [lf.name(r), lf.code?.(r) ?? '', ...shown.map((l) => (l.name ?? l.of)(r)), ...texts.map((t) => t.value(r))].some((v) => v.toLowerCase().includes(q))),
    [rows, q, shown, lf, texts],
  );

  const tree = useMemo(() => {
    const build = (items: R[], depth: number, parent: string): Node<R>[] => {
      const level = shown[depth];
      if (!level) return [];
      const groups = new Map<string, R[]>();
      for (const r of items) {
        const k = level.of(r) || '—';
        groups.set(k, [...(groups.get(k) ?? []), r]);
      }
      const order = level.order ?? byName;
      return [...groups.entries()]
        .map(([k, list]) => {
          const name = (level.name ?? level.of)(list[0]) || 'Other / unmapped';
          const id = `${parent}/${level.key}:${k}`;
          return { id, level: level.key, key: k, name, depth, rows: list, children: build(list, depth + 1, id) };
        })
        .sort((a, b) => order(a.key, b.key) || byName(a.name, b.name));
    };
    return build(filtered, 0, '');
  }, [filtered, shown]);

  const idsTo = (d: number) => {
    const out = new Set<string>();
    const walk = (ns: Node<R>[]) => ns.forEach((n) => (n.depth < d && (out.add(n.id), walk(n.children))));
    walk(tree);
    return out;
  };
  const [open, setOpen] = useState<Set<string> | null>(null);
  const openSet = q ? idsTo(shown.length) : open ?? idsTo(expandDepth);
  const toggle = (id: string) => {
    const next = new Set(openSet);
    next.has(id) ? next.delete(id) : next.add(id);
    setOpen(next);
  };

  // The figure a group (or the Total, level null) shows in a column.
  const groupValue = (f: GroupFigure<R>, list: R[], level: string | null, key: string | null) => {
    if (f.group === 'none') return null;
    if (typeof f.group === 'function') return f.group(list, level, key);
    let s = 0;
    for (const r of list) s += f.value(r) ?? 0;
    return s;
  };

  // Rows on screen: each group, then (open) its children or its rows.
  // Rows are keyed by their group and position: two source rows can share a leaf key.
  type Line = { kind: 'group'; node: Node<R> } | { kind: 'row'; row: R; depth: number; id: string };
  const lines: Line[] = [];
  const walk = (ns: Node<R>[]) => {
    for (const n of ns) {
      lines.push({ kind: 'group', node: n });
      if (!openSet.has(n.id)) continue;
      if (n.children.length) walk(n.children);
      else [...n.rows].sort((a, b) => byName(lf.name(a), lf.name(b))).forEach((r, i) => lines.push({ kind: 'row', row: r, depth: n.depth + 1, id: `${n.id}#${i}:${leaf.key(r)}` }));
    }
  };
  walk(tree);

  const headers = [shown.map((l) => l.label).concat(lf.label).join(' › '), ...texts.map((t) => t.header), ...figures.map((f) => f.header)];
  const total = figures.map((f) => groupValue(f, filtered, null, null));

  const handleExport = () => {
    const cols = [...shown.map((l) => l.label), lf.label, ...texts.map((t) => t.header), ...figures.map((f) => f.header)];
    const data = [...filtered]
      .sort((a, b) => shown.reduce((c, l) => c || (l.order ?? byName)(l.of(a), l.of(b)), 0) || byName(lf.name(a), lf.name(b)))
      .map((r) => Object.fromEntries(cols.map((c, i) => {
        const nL = shown.length;
        const v = i < nL ? (shown[i].name ?? shown[i].of)(r) : i === nL ? lf.name(r) : i < nL + 1 + texts.length ? texts[i - nL - 1].value(r) : figures[i - nL - 1 - texts.length].value(r);
        return [c, v ?? ''];
      })));
    // The Total row the table shows is exported too (FR-EXEC-022).
    data.push(Object.fromEntries(cols.map((c, i) => {
      const fi = i - shown.length - 1 - texts.length;
      return [c, i === 0 ? 'Total' : fi >= 0 ? total[fi] ?? '' : ''];
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Sheet1');
    XLSX.writeFile(wb, `${exportName ?? 'export'}.xlsx`);
    recordExport(exportName);
  };

  const cell = { py: '7px', px: 3, fontSize: '13px', fontVariantNumeric: 'tabular-nums' as const, borderColor: colors.sunkBg };
  const indent = (d: number) => `${d * 18}px`;

  return (
    <Flex data-table-root data-grouped direction="column" h="100%" minH={0} bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderRadius="4px" overflow="hidden">
      <Flex align="center" gap={3} wrap="wrap" px={3} py={2} borderBottom="1px solid" borderColor={colors.border} flexShrink={0}>
        {title && (
          <Text fontSize="14.5px" fontWeight={600} color={colors.darkText}>
            {title}
          </Text>
        )}
        {toolbar}
        {presets.length > 1 && (
          <HStack gap={2}>
            <Text fontSize="13px" color={colors.mutedText}>
              Group by
            </Text>
            <Segmented size="xs" ariaLabel="Group by" options={presets.map((p) => ({ value: p.value, label: p.label }))} value={preset} onChange={(v) => (setPreset(v), setOpen(null))} />
          </HStack>
        )}
        <HStack gap={2} ml="auto">
          <Box as="button" fontSize="12.5px" color={colors.bodyText} cursor="pointer" whiteSpace="nowrap" onClick={() => setOpen(idsTo(shown.length))} _hover={{ color: colors.brand }}>
            Expand all
          </Box>
          <Box as="button" fontSize="12.5px" color={colors.bodyText} cursor="pointer" whiteSpace="nowrap" onClick={() => setOpen(new Set())} _hover={{ color: colors.brand }}>
            Collapse all
          </Box>
          <Input size="sm" h="30px" placeholder={searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} maxW="220px" borderRadius="4px" fontSize="13px" />
          <Button size="sm" h="30px" bg={colors.sunkBg} color={colors.darkText} _hover={{ bg: colors.border }} borderRadius="4px" onClick={handleExport} title="Export every row, ungrouped, with the Total row">
            <FiDownload /> Export
          </Button>
        </HStack>
      </Flex>
      <Box flex={1} minH={{ base: '320px', lg: 0 }} maxH={{ base: '70vh', lg: 'none' }} overflow="auto" tabIndex={0} role="region" aria-label={exportName ?? 'Table'} _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: '-2px' }}>
        <Table.Root size="sm" w="full" stickyHeader>
          <Table.Header position="sticky" top={0} zIndex={2} bg={colors.cardBg} css={{ '& tr': { position: 'static' } }}>
            <Table.Row style={{ background: colors.tableHeaderBg }}>
              {headers.map((h, i) => (
                <Table.ColumnHeader key={h + i} textAlign={i > texts.length ? 'end' : 'start'} fontSize="12.5px" whiteSpace="nowrap">
                  {h}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? null : lines.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={headers.length} border="none">
                  {q ? (
                    <Text p={6} textAlign="center" fontSize="13.5px" color={colors.mutedText}>
                      Nothing matches “{query}”.
                    </Text>
                  ) : (
                    <EmptyChart height={200} />
                  )}
                </Table.Cell>
              </Table.Row>
            ) : (
              lines.map((ln) => {
                if (ln.kind === 'group') {
                  const n = ln.node;
                  const isOpen = openSet.has(n.id);
                  const count = n.children.length || n.rows.length;
                  return (
                    <Table.Row key={n.id} data-group-row={n.level} bg={n.depth === 0 ? colors.sunkBg : undefined} _hover={{ bg: colors.hoverBg }} cursor="pointer" onClick={() => toggle(n.id)}>
                      <Table.Cell {...cell} fontWeight={600}>
                        <Flex align="center" gap="6px" pl={indent(n.depth)} minW={0}>
                          <Box
                            as="button"
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? 'Fold' : 'Unfold'} ${n.name}`}
                            color={colors.mutedText}
                            display="flex"
                            onClick={(e: React.MouseEvent) => (e.stopPropagation(), toggle(n.id))}
                          >
                            {isOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                          </Box>
                          <Text truncate title={n.name} color={colors.darkText}>
                            {n.name}
                          </Text>
                          <Text fontSize="11.5px" color={colors.mutedText} fontWeight={400} flexShrink={0}>
                            {count}
                          </Text>
                        </Flex>
                      </Table.Cell>
                      {texts.map((t) => (
                        <Table.Cell key={t.header} {...cell} />
                      ))}
                      {figures.map((f) => {
                        const v = groupValue(f, n.rows, n.level, n.key);
                        return (
                          <Table.Cell key={f.header} {...cell} textAlign="end" fontWeight={600} color={f.groupColor?.(v, n.level, n.key) ?? colors.darkText}>
                            {f.group === 'none' ? '' : f.fmt(v)}
                          </Table.Cell>
                        );
                      })}
                    </Table.Row>
                  );
                }
                const r = ln.row;
                const code = lf.code?.(r);
                return (
                  <Table.Row
                    key={ln.id}
                    cursor={onLeaf ? 'pointer' : undefined}
                    onClick={onLeaf ? () => onLeaf(r) : undefined}
                    tabIndex={onLeaf ? 0 : undefined}
                    onKeyDown={onLeaf ? (e: React.KeyboardEvent) => e.key === 'Enter' && onLeaf(r) : undefined}
                    _hover={{ bg: colors.hoverBg }}
                  >
                    <Table.Cell {...cell}>
                      <Flex align="center" gap="6px" pl={`calc(${indent(ln.depth)} + 20px)`} minW={0}>
                        <Text truncate title={lf.name(r)} color={colors.darkText}>
                          {lf.name(r)}
                        </Text>
                        {code && (
                          <Text fontSize="11.5px" color={colors.mutedText} flexShrink={0}>
                            {code}
                          </Text>
                        )}
                      </Flex>
                    </Table.Cell>
                    {texts.map((t) => (
                      <Table.Cell key={t.header} {...cell} color={t.color?.(r) ?? colors.bodyText} whiteSpace="nowrap">
                        {t.value(r)}
                      </Table.Cell>
                    ))}
                    {figures.map((f) => (
                      <Table.Cell key={f.header} {...cell} textAlign="end" color={f.color?.(r) ?? colors.bodyText}>
                        {f.fmt(f.value(r))}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
          {!isLoading && filtered.length > 0 && (
            <Table.Footer position="sticky" bottom={0} zIndex={2} bg={colors.cardBg} css={{ '& tr': { position: 'static' } }}>
              <Table.Row data-total-row bg={colors.pageBg} fontWeight="bold">
                <Table.Cell {...cell} fontWeight={700} color={colors.darkText}>
                  Total
                </Table.Cell>
                {texts.map((t) => (
                  <Table.Cell key={t.header} {...cell} />
                ))}
                {figures.map((f, i) => (
                  <Table.Cell key={f.header} {...cell} textAlign="end" fontWeight={700} color={f.groupColor?.(total[i], null, null) ?? colors.darkText}>
                    {f.group === 'none' ? '' : f.fmt(total[i])}
                  </Table.Cell>
                ))}
              </Table.Row>
            </Table.Footer>
          )}
        </Table.Root>
      </Box>
    </Flex>
  );
}
