// Ported from Sales Pulse 2.0 (dsr-fe src/components/national/NationalTable.tsx), 19 Nov 2026:
// the generic grouped table, unchanged but for import paths. The sales-only
// NationalTable wrapper stays in dsr-fe.
import { Box, Button, Flex, HStack, Input, Skeleton, Text } from '@chakra-ui/react';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FiArrowUpRight, FiChevronDown, FiChevronRight, FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { Segmented } from '@/ui/segmented';
import { colors } from '@/constants/theme';
import { InfoTip } from '@/ui/overlay';
import type { HelpText } from '@/ui/help';
import { byName } from '@/ui/byName';
import { GroupSheets } from './GroupSheets';
/** A drill dimension and one step of a drill path (Sales Pulse 2.0's features/salesDashboard/drill). */
export type DrillDim = string;
export interface DrillStep {
  dim: DrillDim;
  value: string;
  next?: DrillDim;
}

/** What a row is grouped by. Any of these may be missing; it then groups as "Other / unmapped". */
export interface GroupRow {
  division?: string;
  bu?: string;
  team?: string;
  brands?: string;
  category?: string;
  sku_code: number | string;
  sku: string;
  /** Set on the Branch tab's rows (the hub branch the sale is booked to), with its zone and region. */
  zone?: string;
  region?: string;
  branch?: string;
  /** Set on the RD tab's rows: the distributor and its code. */
  distributor?: string;
  distribution_code?: string;
}

/** A level of the hierarchy, by name: one of LEVELS or a caller's own (see GroupedTable levels). */
export type Level = string;

/** How rows group at one level. */
export interface LevelDef<R> {
  label: string;
  /** What rows group by at this level. */
  key: (r: R) => string;
  /** The group's name; the key itself when absent. */
  name?: (r: R) => string;
  /** Show the key beside the name, as a code (SKU code, distributor code…). */
  showCode?: boolean;
}

/** The sales tables' levels, read off GroupRow. */
const LEVELS: Record<string, LevelDef<GroupRow>> = {
  zone: { label: 'Zone', key: (r) => clean(r.zone) },
  region: { label: 'Region', key: (r) => clean(r.region) },
  branch: { label: 'Branch', key: (r) => clean(r.branch) },
  distributor: {
    label: 'Distributor',
    key: (r) => String(r.distribution_code ?? '') || clean(r.distributor),
    name: (r) => clean(r.distributor),
    showCode: true,
  },
  division: { label: 'Division', key: (r) => clean(r.division) },
  bu: { label: 'BU', key: (r) => clean(r.bu) },
  team: { label: 'Team', key: (r) => clean(r.team) },
  category: { label: 'Business line', key: (r) => clean(r.category) },
  brands: { label: 'Brand', key: (r) => clean(r.brands) },
  sku: { label: 'SKU', key: (r) => String(r.sku_code), name: (r) => clean(r.sku), showCode: true },
};

/** A group-by preset, outermost first. SKU is always the last level. */
export interface GroupPreset {
  value: string;
  label: string;
  levels: Level[];
}

/**
 * Levels the right-hand sheet cannot filter by (it has no branch or
 * distributor dimension), so no row at or below one opens a sheet: it would
 * show everyone's figures under one name.
 */
const NO_SHEET: Level[] = ['zone', 'region', 'branch', 'distributor'];

/** The figures a row adds up the tree, by name. */
export type Sums = Record<string, number>;

/** One figure column: its header and how a row's sums show in it. */
export interface FigureColumn {
  key: string;
  header: ReactNode;
  help?: HelpText;
  /** Its grid track, e.g. 'minmax(84px, 1fr)'. */
  width: string;
  /**
   * `t` is this row's sums, `all` what its share is of (the Total row, or
   * the sheet's group); `bold` on a Total row, which has no `node`.
   */
  render: (t: Sums, all: Sums, bold: boolean, node?: GroupNode) => ReactNode;
  /**
   * The levels whose rows this column describes (a code, a date of one row). Shown only where
   * such rows are on screen: a table or sheet of zones does not carry an RD's code column.
   */
  levels?: Level[];
}

/** One group (or SKU) of the table, with everything under it. */
export interface GroupNode {
  id: string;
  /** The group it sits in; null at the top. */
  parentId: string | null;
  level: Level;
  name: string;
  code?: string;
  depth: number;
  sums: Sums;
  children: GroupNode[];
}
type Node = GroupNode;

/** A headline figure at the top of a group's sheet. */
export interface GroupKpi {
  label: string;
  value: string;
  note?: string;
}

/**
 * How many levels unfold in the table itself. A row on the last of them opens
 * a sheet with the levels below (GroupSheets), as Sales Details does.
 */
const INLINE_LEVELS = 2;

const clean = (v: unknown) => {
  const t = String(v ?? '').trim();
  return !t || t === 'Others' || t === 'null' ? 'Other / unmapped' : t;
};
const addInto = (a: Sums, b: Sums) => {
  for (const k in b) a[k] = (a[k] ?? 0) + b[k];
  return a;
};

/** A right-aligned figure, as every figure column draws it. */
export function FigureCell({
  children,
  color = colors.bodyText,
  weight,
  bold,
}: {
  children: ReactNode;
  color?: string;
  weight?: number;
  bold?: boolean;
}) {
  return (
    <Text
      fontSize="13px"
      textAlign="center"
      fontVariantNumeric="tabular-nums"
      whiteSpace="nowrap"
      color={color}
      fontWeight={weight ?? (bold ? 700 : 400)}
    >
      {children}
    </Text>
  );
}

export interface GroupedTableProps<R> {
  rows: R[];
  isLoading?: boolean;
  /** The figures each row adds to its groups and to the Total. */
  sums: (r: R) => Sums;
  columns: FigureColumn[];
  /** One spreadsheet row per data row, for Export. */
  exportRow: (r: R) => Record<string, string | number>;
  /** The groupings offered. */
  presets: GroupPreset[];
  /** Workbook / sheet name for Export. */
  exportName: string;
  /** Names the top of the drill sheets (the toolbar shows no title). */
  title?: string;
  /** Extra controls first in the toolbar (a view switch…). */
  toolbar?: ReactNode;
  onDrill?: (dim: DrillDim, value: string, next?: DrillDim) => void;
  /** Open a sheet with the whole path unfolded so far (Division › Team › …). */
  onOpenPath?: (path: DrillStep[]) => void;
  /** The headline figures of a group's sheet: its sums, its parent's, the parent's name. */
  kpis?: (t: Sums, parent: Sums, parentName: string) => GroupKpi[];
  /**
   * What clicking a last-level row (a SKU) does, given it and the groups above
   * it — in place of the detail sheet. Sales Details opens its own sheets here.
   */
  onLeaf?: (leaf: GroupNode, ancestors: GroupNode[]) => void;
  /** The daily-chart query for a group, given it and the groups above it (see GroupSheets dailyFor). */
  dailyFor?: (chain: GroupNode[]) => Record<string, string> | null;
  /**
   * The row whose sheet the caller has open, as `<level>:<name>` (see
   * nodeKey) — marked so it is clear which one is open. The table marks the
   * rows of its own group sheets itself.
   */
  activeKey?: string | null;
  /** Levels of the caller's own (a field-force ladder, an MIE…), by name, for its presets. */
  levels?: Record<string, LevelDef<R>>;
  /** What the search box offers to find. */
  searchPlaceholder?: string;
  /**
   * Many figure columns (one per day…): the name keeps a fixed width and the
   * table scrolls sideways, instead of giving the name half the width.
   */
  wide?: boolean;
}

/** A row's key for activeKey: its level and name. */
export const nodeKey = (nd: GroupNode) => `${nd.level}:${nd.name}`;

/**
 * A list grouped Odoo-style: pick a hierarchy (Division → Team → Brand → SKU).
 * The first two levels unfold in place; a row on the second opens the levels
 * below it in stacked sheets from the right (GroupSheets), as Sales Details
 * does. With `onDrill`, a SKU — and ↗ on a group, or Details in its sheet —
 * opens the full detail sheet. Open groups pin under the header while
 * scrolling. While searching, the matching SKUs are listed flat. A SKU is
 * keyed by its code, so all its figures land on one row even when the mapping
 * puts them under different categories.
 */
export function GroupedTable<R>({
  rows,
  isLoading,
  sums,
  columns,
  exportRow,
  presets,
  exportName,
  title,
  toolbar,
  onDrill,
  onOpenPath,
  kpis,
  onLeaf,
  dailyFor,
  activeKey,
  levels: ownLevels,
  searchPlaceholder = 'Find SKU, brand, team…',
  wide = false,
}: GroupedTableProps<R>) {
  const [preset, setPreset] = useState(presets[0].value);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [query, setQuery] = useState('');
  const levels = (presets.find((p) => p.value === preset) ?? presets[0]).levels;
  // The sales levels serve rows shaped like GroupRow; a caller's own add to them.
  const defs = { ...(LEVELS as unknown as Record<string, LevelDef<R>>), ...ownLevels };
  const labelOf = (level: Level) => defs[level]?.label ?? level;

  // The box shows each keystroke at once; the table is regrouped for it a
  // moment after typing stops, not on every key — with 143k rows (Chemist
  // Sales for head office) each regroup takes most of a second.
  const [searched, setSearched] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearched(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const q = searched.trim().toLowerCase();
  // The shallowest level the search names. A distributor's name or code keeps
  // the hierarchy below it (distributor › division › …); a match only on the
  // last level lists those rows flat.
  const matchFrom = useMemo(() => {
    if (!q) return 0;
    let best = levels.length - 1;
    for (const r of rows) {
      for (let i = 0; i < best; i++) {
        const d = defs[levels[i]];
        if (d && `${d.key(r)} ${d.name?.(r) ?? ''}`.toLowerCase().includes(q)) {
          best = i;
          break;
        }
      }
      if (best === 0) break;
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, preset, q]);
  // The hierarchy that unfolds; while searching, from the level the search matched.
  const shown: Level[] = q ? levels.slice(matchFrom) : levels;
  const shownLevel: Level = shown[0];

  const { tree, total, hidden } = useMemo(() => {
    let hidden = 0;
    const source: { r: R; s: Sums }[] = [];
    for (const r of rows) {
      const s = sums(r);
      if (hideEmpty && Object.values(s).every((v) => !v)) {
        hidden++;
        continue;
      }
      if (q) {
        // Every name and code on the row's path, at the levels of this grouping.
        const hay = levels
          .map((l) => (defs[l] ? `${defs[l].key(r)} ${defs[l].name?.(r) ?? ''}` : ''))
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) continue;
      }
      source.push({ r, s });
    }

    // Every level A→Z (numbers in order), Others / Unassigned last.
    const order = (a: Node, b: Node) => byName(a.name, b.name);
    const build = (items: typeof source, depth: number, parentId: string | null): Node[] => {
      const level = shown[depth];
      const def = defs[level];
      const groups = new Map<string, typeof source>();
      for (const it of items) {
        const k = def.key(it.r);
        const list = groups.get(k) ?? [];
        list.push(it);
        groups.set(k, list);
      }
      return [...groups.entries()]
        .map(([k, list]) => {
          const id = `${parentId ?? ''}/${level}:${k}`;
          const first = list[0].r;
          const node = {
            id,
            parentId,
            level,
            name: def.name ? def.name(first) : k,
            code: def.showCode ? k : undefined,
            depth,
          } as Node;
          // A group's sub-groups and sums are worked out the first time they
          // are read, then kept. The page shows the top levels and opens the
          // rest one row at a time, so a table of 143k rows (Chemist Sales for
          // head office) no longer groups and sums all nine levels up front —
          // that froze the page for seconds. What a group holds is unchanged.
          let children: Node[] | undefined;
          let sums: Sums | undefined;
          Object.defineProperty(node, 'children', {
            enumerable: true,
            get: () => (children ??= depth + 1 < shown.length ? build(list, depth + 1, id) : []),
          });
          Object.defineProperty(node, 'sums', {
            enumerable: true,
            get: () => (sums ??= list.reduce((a, it) => addInto(a, it.s), {} as Sums)),
          });
          return node;
        })
        .sort(order);
    };

    const tree = build(source, 0, null);
    const total = tree.reduce((a, n) => addInto(a, n.sums), {} as Sums);
    return { tree, total, hidden };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, preset, hideEmpty, q, matchFrom]);

  // Open groups. By default the table opens one level down (each division
  // with its teams), so it fills the page. Only the first INLINE_LEVELS unfold
  // here; below them a row opens its sheet.
  const inline = shown.slice(0, INLINE_LEVELS);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const idsTo = (depth: number) => {
    const ids = new Set<string>();
    const walk = (nodes: Node[]) => {
      for (const nd of nodes)
        if (nd.depth < Math.min(depth, INLINE_LEVELS - 1) && nd.children.length) {
          ids.add(nd.id);
          walk(nd.children);
        }
    };
    walk(tree);
    return ids;
  };

  // A node by id, to rebuild the open sheets from the current tree. Found by
  // walking down its path — an id is its parent's id plus its own step — so
  // only the groups on that path are built (see build).
  const byId = useMemo(() => {
    const found = new Map<string, Node | undefined>();
    const find = (id: string): Node | undefined => {
      if (found.has(id)) return found.get(id);
      let nodes = tree;
      let hit: Node | undefined;
      for (;;) {
        const next: Node | undefined = nodes.find((nd) => id === nd.id || id.startsWith(`${nd.id}/`));
        if (!next) break;
        if (next.id === id) {
          hit = next;
          break;
        }
        nodes = next.children;
      }
      found.set(id, hit);
      return hit;
    };
    return { get: find, has: (id: string) => !!find(id) };
  }, [tree]);
  const [sheetIds, setSheetIds] = useState<string[]>([]);
  const sheetPath = sheetIds.map((id) => byId.get(id)).filter((nd): nd is Node => !!nd);
  // New data or a new grouping: sheets for groups that no longer exist close.
  useEffect(() => {
    if (sheetIds.some((id) => !byId.has(id))) setSheetIds([]);
  }, [byId, sheetIds]);
  const ancestorsOf = (nd: Node) => {
    const out: Node[] = [];
    for (let p = nd.parentId ? byId.get(nd.parentId) : undefined; p; p = p.parentId ? byId.get(p.parentId) : undefined) {
      out.unshift(p);
    }
    return out;
  };

  /**
   * The full detail sheet of a group (daily sales, breakdowns, diagnosis), or
   * undefined where there is none: no onDrill, an unmapped name, or a branch /
   * distributor on its path (the sheet cannot filter by those, see NO_SHEET).
   */
  /**
   * What a last-level row opens: only the caller's onLeaf (Sales Details' own
   * deeper data). Otherwise a last-level row has nothing below it and is not
   * clickable.
   */
  const openLeaf = (nd: Node): (() => void) | undefined => (onLeaf ? () => onLeaf(nd, ancestorsOf(nd)) : undefined);

  const detailsFor = (nd: Node): (() => void) | undefined => {
    const chain = [...ancestorsOf(nd), nd];
    if (!onDrill || nd.name === 'Other / unmapped' || chain.some((c) => NO_SHEET.includes(c.level))) return undefined;
    // The drill data names unmapped rows 'Others'.
    const path: DrillStep[] = chain.flatMap((c) => {
      const dim = DRILL_DIM[c.level];
      return dim ? [{ dim, value: c.name === 'Other / unmapped' ? 'Others' : c.name }] : [];
    });
    const next = shown[nd.depth + 1];
    // Opens on top of any group sheets, which stay where they are: closing
    // the detail sheet comes back to them.
    return () => {
      if (onOpenPath && path.length > 1) {
        if (next) path[path.length - 1] = { ...path[path.length - 1], next: DRILL_DIM[next] };
        onOpenPath(path);
      } else onDrill(DRILL_DIM[nd.level]!, nd.name, next ? DRILL_DIM[next] : undefined);
    };
  };
  const [expandDepth, setExpandDepth] = useState(1);
  useEffect(() => {
    setOpen(idsTo(expandDepth));
    // Re-open to the chosen level when the grouping or the data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, expandDepth]);
  useEffect(() => setExpandDepth(1), [preset]);
  const toggle = (id: string) =>
    setOpen((s0) => {
      const s1 = new Set(s0);
      if (s1.has(id)) s1.delete(id);
      else s1.add(id);
      return s1;
    });

  const visible: Node[] = [];
  const walk = (nodes: Node[]) => {
    for (const nd of nodes) {
      visible.push(nd);
      if (nd.children.length && nd.depth < INLINE_LEVELS - 1 && open.has(nd.id)) walk(nd.children);
    }
  };
  walk(tree);

  // Open groups pin under the header + total; measure that block's height.
  const headRef = useRef<HTMLDivElement>(null);
  const [headH, setHeadH] = useState(72);
  useLayoutEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeadH(Math.ceil(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const exportRows = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map(exportRow));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exportName.slice(0, 31));
    XLSX.writeFile(wb, `${exportName}.xlsx`);
  };

  // Half the width for the name; the figures share the other half. Wide
  // tables keep the name fixed and scroll sideways instead.
  // The columns that mean something for the rows unfolded here.
  const cols = columns.filter((c) => !c.levels || c.levels.some((l) => inline.includes(l)));
  const template = `${wide ? '280px' : 'minmax(240px, 50%)'} ${cols.map((c) => c.width).join(' ')} 28px`;

  return (
    <Flex
      direction="column"
      h="100%"
      minH={0}
      className="sp-card sp-tint"
      border="1px solid"
      borderColor={colors.border}
      borderRadius="4px"
      overflow="hidden"
    >
      {/* Toolbar */}
      {/* One line: when it runs short, the Group by switch gives way first and
          moves the groupings that do not fit behind its ⌄. */}
      <Flex align="center" gap={3} px={3} py={2} borderBottom="1px solid" borderColor={colors.border} flexShrink={0} minW={0}>
        {toolbar && <Box flexShrink={0}>{toolbar}</Box>}
        <HStack gap={2} flex="0 1 auto" minW="120px">
          <Text fontSize="13px" color={colors.mutedText} whiteSpace="nowrap" flexShrink={0}>
            Group by
          </Text>
          <Segmented
            size="xs"
            ariaLabel="Group by"
            options={presets.map((p) => ({ value: p.value, label: p.label }))}
            value={preset}
            onChange={setPreset}
          />
        </HStack>
        {!q && inline.length > 1 && (
          <HStack gap={2} flexShrink={0}>
            <Text fontSize="13px" color={colors.mutedText} whiteSpace="nowrap">
              Expand to
            </Text>
            <Segmented
              size="xs"
              ariaLabel="Expand to level"
              options={inline.map((l, i) => ({ value: String(i), label: labelOf(l) }))}
              value={String(expandDepth)}
              onChange={(v) => {
                const d = Number(v);
                setExpandDepth(d);
                setOpen(idsTo(d));
              }}
            />
          </HStack>
        )}
        <HStack gap={2} ml="auto" flexShrink={0}>
          <Box
            as="button"
            fontSize="13px"
            color={colors.bodyText}
            cursor="pointer"
            onClick={() => setHideEmpty((v) => !v)}
            title="Rows where every figure is zero"
            whiteSpace="nowrap"
          >
            {hideEmpty ? `Show ${hidden} empty rows` : 'Hide empty rows'}
          </Box>
          <Input
            size="sm"
            h="30px"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            w="180px"
            borderRadius="4px"
            fontSize="13px"
          />
          <Button
            size="sm"
            h="30px"
            bg={colors.sunkBg}
            color={colors.darkText}
            _hover={{ bg: colors.border }}
            borderRadius="4px"
            onClick={exportRows}
            title="Export every row, ungrouped"
          >
            <FiDownload /> Export
          </Button>
        </HStack>
      </Flex>

      {/* List */}
      <Box flex={1} minH={0} overflow="auto">
        <Box minW={wide ? 'max-content' : undefined}>
        {/* Header + Total pinned together at the top, like every table here. */}
        <Box ref={headRef} position="sticky" top={0} zIndex={10}>
          <Header template={template} columns={cols} label={labelOf(shownLevel)} />
          {visible.length > 0 && (
            <Box
              className="sp-pin"
              display="grid"
              gridTemplateColumns={template}
              columnGap={5}
              rowGap={2}
              px={3}
              py="8px"
              bg={colors.tableTotalStart}
              borderBottom="1px solid"
              borderColor={colors.border}
              fontWeight={700}
              fontSize="13px"
            >
              <Text color={colors.darkText}>Total</Text>
              <Values t={total} all={total} columns={cols} bold />
              <span />
            </Box>
          )}
        </Box>
        {isLoading && !rows.length ? (
          <Flex direction="column" gap={2} p={3}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} h="22px" borderRadius="3px" opacity={1 - i * 0.06} />
            ))}
          </Flex>
        ) : visible.length === 0 ? (
          <Text p={6} textAlign="center" fontSize="13px" color={colors.mutedText}>
            {q ? `Nothing matches “${query}”.` : 'No rows for this selection.'}
          </Text>
        ) : (
          visible.map((n) => {
            // A group on the last inline level opens its levels in sheets
            // (GroupSheets) instead of unfolding here.
            const toSheets = n.children.length > 0 && n.depth >= INLINE_LEVELS - 1;
            const isGroup = n.children.length > 0 && !toSheets;
            const details = detailsFor(n);
            const isOpen = isGroup && open.has(n.id);
            return (
              <Line
                key={n.id}
                node={n}
                template={template}
                columns={cols}
                all={total}
                isGroup={isGroup}
                isOpen={isOpen}
                opensSheets={toSheets}
                active={sheetIds[0] === n.id || (!!activeKey && nodeKey(n) === activeKey)}
                // A group unfolds; below the inline levels a row opens its
                // sheets; a last-level row has nothing below it (Sales Details' onLeaf aside).
                onClick={isGroup ? () => toggle(n.id) : toSheets ? () => setSheetIds([n.id]) : openLeaf(n)}
                onOpenSheet={isGroup ? details : undefined}
                stickyTop={isOpen ? headH - 1 + n.depth * (ROW_H - 1) : undefined}
              />
            );
          })
        )}
        </Box>
      </Box>

      {sheetPath.length > 0 && (
        <GroupSheets
          path={sheetPath}
          levelLabel={(nd) => labelOf(nd.level)}
          rootLabel={title ?? exportName}
          ancestors={ancestorsOf(sheetPath[0])}
          columns={columns}
          kpis={kpis}
          rootSums={total}
          onPush={(nd) => setSheetIds((ids) => [...ids.slice(0, ids.indexOf(nd.parentId ?? '') + 1), nd.id])}
          onPopTo={(depth) => setSheetIds((ids) => ids.slice(0, depth + 1))}
          onClose={() => setSheetIds([])}
          detailsFor={detailsFor}
          openLeaf={openLeaf}
          activeKey={activeKey}
          dailyFor={dailyFor ? (nd) => dailyFor([...ancestorsOf(nd), nd]) : undefined}
        />
      )}
    </Flex>
  );
}

function Header({ template, columns, label }: { template: string; columns: FigureColumn[]; label: string }) {
  const h = (key: string, label: ReactNode, align: 'start' | 'center' = 'center', help?: HelpText) => (
    <Text
      key={key}
      fontSize="13px"
      fontWeight={700}
      color={colors.darkText}
      textAlign={align}
      whiteSpace="nowrap"
      display="inline-flex"
      alignItems="center"
      justifyContent={align === 'center' ? 'center' : 'flex-start'}
      gap="4px"
    >
      {label}
      {help && <InfoTip help={help} size={12} />}
    </Text>
  );
  return (
    <Box
      className="sp-pin sp-th"
      display="grid"
      gridTemplateColumns={template}
      columnGap={5}
      rowGap={2}
      px={3}
      py="8px"
      position="sticky"
      top={0}
      zIndex={1}
      bg={colors.cardBg}
      borderBottom="1px solid"
      borderColor={colors.border}
    >
      {h('level', label, 'start')}
      {columns.map((c) => h(c.key, c.header, 'center', c.help))}
      <span />
    </Box>
  );
}

function Values({
  t,
  all,
  columns,
  bold = false,
  node,
}: {
  t: Sums;
  all: Sums;
  columns: FigureColumn[];
  bold?: boolean;
  node?: GroupNode;
}) {
  return (
    <>
      {columns.map((c) => (
        <Fragment key={c.key}>{c.render(t, all, bold, node)}</Fragment>
      ))}
    </>
  );
}

const DRILL_DIM: Partial<Record<Level, DrillDim>> = {
  division: 'division',
  bu: 'bu',
  team: 'team',
  category: 'category',
  brands: 'brands',
  sku: 'sku',
};

const ROW_H = 32;

function Line({
  node,
  template,
  columns,
  all,
  isGroup,
  isOpen,
  opensSheets = false,
  active = false,
  onClick,
  onOpenSheet,
  stickyTop,
}: {
  node: Node;
  template: string;
  columns: FigureColumn[];
  all: Sums;
  isGroup: boolean;
  isOpen: boolean;
  /** A group whose levels open in sheets rather than unfolding here. */
  opensSheets?: boolean;
  /** Its sheet is open: marked in the brand colour. */
  active?: boolean;
  onClick?: () => void;
  /** ↗ on a group: open its sheet without unfolding to the last level. */
  onOpenSheet?: () => void;
  /** Open groups pin here (px from the top of the scroll area). */
  stickyTop?: number;
}) {
  const unmapped = node.name === 'Other / unmapped';
  const pinned = stickyTop != null;
  return (
    <Box
      role="button"
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick && (e.preventDefault(), onClick())}
      w="100%"
      h={`${ROW_H}px`}
      textAlign="left"
      display="grid"
      gridTemplateColumns={template}
      columnGap={5}
      rowGap={2}
      px={3}
      alignItems="center"
      borderBottom="1px solid"
      borderColor={colors.sunkBg}
      cursor={onClick ? 'pointer' : 'default'}
      position={pinned ? 'sticky' : undefined}
      top={pinned ? `${stickyTop}px` : undefined}
      zIndex={pinned ? 6 - node.depth : undefined}
      // Opaque, so rows scrolling under the pinned ones don't show and the
      // pinned name cell (sp-pin) has a background to take.
      bg={active ? colors.brandSoft : pinned && node.depth === 0 ? colors.pageBg : colors.cardBg}
      boxShadow={active ? `inset 3px 0 0 ${colors.brand}` : undefined}
      _hover={{ bg: active ? colors.brandSoft : colors.hoverBg }}
      aria-current={active || undefined}
      title={onClick ? (isGroup ? (isOpen ? `Fold ${node.name}` : `Unfold ${node.name}`) : `Open ${node.name}`) : undefined}
      className="nat-row sp-pin"
    >
      <Flex align="center" gap="6px" minW={0} pl={`${node.depth * 18}px`}>
        <Box w="14px" flexShrink={0} color={colors.mutedText} display="flex">
          {isGroup && (isOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />)}
        </Box>
        <Text
          fontSize="13px"
          fontWeight={isGroup || opensSheets || active ? 600 : 400}
          color={active ? colors.brand : unmapped ? colors.mutedText : colors.darkText}
          fontStyle={unmapped ? 'italic' : undefined}
          truncate
          title={node.name}
        >
          {node.name}
        </Text>
        {node.code && (
          <Text fontSize="11px" color={colors.mutedText} flexShrink={0} fontVariantNumeric="tabular-nums">
            {node.code}
          </Text>
        )}
      </Flex>
      <Values t={node.sums} all={all} columns={columns} node={node} />
      <Box display="flex" justifyContent="center">
        {isGroup ? (
          onOpenSheet && (
            <Box
              as="button"
              aria-label={`Open ${node.name} details`}
              title={`Open ${node.name} details`}
              color={colors.mutedText}
              cursor="pointer"
              p="2px"
              borderRadius="3px"
              _hover={{ color: colors.brand, bg: colors.brandSoft }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onOpenSheet();
              }}
            >
              <FiArrowUpRight size={14} />
            </Box>
          )
        ) : null}
      </Box>
    </Box>
  );
}

