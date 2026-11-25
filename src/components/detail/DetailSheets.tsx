// The detail sheets for Supply Chain Pulse 2.0, shown in the design-system
// SheetStack (slides in from the right). One renderer per kind of item; each
// reads the data the dashboard has already loaded, so opening a sheet costs no
// extra request. Rows inside a sheet open a deeper sheet.

import { Box, Flex, Grid, Skeleton, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { FiArrowLeft, FiFilter, FiX } from 'react-icons/fi';
import { SheetStack } from '@/ui/drill/SheetStack';
import { RagBadge, ragCell } from '@/components/rag/Rag';
import { colors } from '@/constants/theme';
import {
  INV_BRANCHES,
  n0,
  num,
  type BenchmarkRow,
  type DispatchVsOrderRow,
  type InventoryDaysRow,
  type RpmRow,
  type SalesSummaryRow,
  type WipRow,
} from '@/api/types';
import { fetchRows, rowsOf, type DashboardData, type Result } from '@/features/data';
import { useStore } from '@/features/store';
import { useQuery } from '@tanstack/react-query';
import { ACTIVE_ROW, KIND_LABEL, titleOf, useDetail, useOpenedRow, type DetailItem } from '@/features/detail';
import { plan, service, stock } from '@/features/derive';
import * as K from '@/features/kpis';
import { rag } from '@/features/kpiThresholds';
import { DASH, days, full, money, pct1, pkr } from '@/features/format';
import { useActiveTab, useNav } from '@/features/nav';
import type { Chip } from '@/features/store';
import { TABS, type TabKey } from '@/features/tabs';
import { geoOf } from '@/features/geo';
import { useRowWindow } from '@/features/rowWindow';

// ── Data lookup: the first tab that loaded a result of this name ──
const TAB_ORDER: TabKey[] = ['overview', 'revenue', 'inventory', 'fulfilment', 'distribution'];
function find(data: DashboardData, name: string): Result | undefined {
  let fallback: Result | undefined;
  for (const t of TAB_ORDER) {
    const r = data.tabs[t][name];
    if (!r) continue;
    if (r.data) return r;
    fallback ??= r;
  }
  return fallback;
}
const rowsFrom = <T,>(data: DashboardData, name: string) => rowsOf<T>(find(data, name));
/** A TabData view assembled from whichever tabs loaded each name. */
function merged(data: DashboardData, names: string[]) {
  return Object.fromEntries(names.map((n) => [n, find(data, n) ?? { data: undefined, isLoading: false, isError: false, pending: false, locked: false, section: 'SUMMARY' as const }]));
}

// ── Building blocks (Sales Pulse 2.0 drill sheets: dsr-fe GroupSheets) ──
function Stat({ label, value, sub, rag: r }: { label: string; value: ReactNode; sub?: ReactNode; rag?: ReturnType<typeof rag> }) {
  return (
    <Box className="sp-card sp-tint" border="1px solid" borderColor={colors.border} borderRadius="4px" px={3} py="10px" minW={0}>
      <Text fontSize="11px" fontWeight={600} letterSpacing=".05em" textTransform="uppercase" color={colors.cardAccent} truncate>
        {label}
      </Text>
      <Flex align="center" gap="6px" wrap="wrap">
        <Text fontSize="22px" fontWeight={700} color={colors.darkText} lineHeight="1.25" fontVariantNumeric="tabular-nums">
          {value}
        </Text>
        {r && <RagBadge rag={r} size="sm" />}
      </Flex>
      {sub && (
        <Text fontSize="12px" color={colors.mutedText} mt="2px" lineClamp={2}>
          {sub}
        </Text>
      )}
    </Box>
  );
}

/** The sheet's KPI cards: they stay in place while the lists under them scroll. */
function StatGrid({ children }: { children: ReactNode }) {
  return (
    <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(auto-fit, minmax(150px, 1fr))' }} gap={3} flexShrink={0} className="sp-stagger">
      {children}
    </Grid>
  );
}

/**
 * A list of the sheet, as a card: its title on top, then the table.
 * The card takes the height the sheet leaves (at least 240px) and its rows
 * scroll inside it, under the pinned column headers and Total row.
 */
function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Flex direction="column" flex="1 1 0" minH="240px" border="1px solid" borderColor={colors.border} borderRadius="4px" className="sp-tint" overflow="hidden">
      <Flex align="center" gap={2} px={3} py={2} borderBottom="1px solid" borderColor={colors.border} flexShrink={0} wrap="wrap">
        <Text fontSize="13px" fontWeight={600} color={colors.cardAccent}>
          {title}
        </Text>
        {hint && (
          <Text fontSize="12px" color={colors.mutedText} ml={2}>
            {hint}
          </Text>
        )}
      </Flex>
      <Box flex={1} minH={0} display="flex" flexDirection="column" overflowY="auto">
        {children}
      </Box>
    </Flex>
  );
}

/** Row label of a class in a detail sheet: "Class A" … "Class N", and "Other" for unclassified (FR-EXEC-029). */
const clsName = (c: string) => (c === 'Others' ? 'Other' : `Class ${c}`);

const sumOf = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((t, x) => t + (f(x) || 0), 0);

/**
 * A table whose rows can open a deeper sheet. Its first row is a Total
 * (FR-EXEC-028): `total` holds the cells after the label, summed by the caller
 * for count and value columns only; %, days and dates stay blank. `noTotal`
 * is for key/value lists, which are not tables of rows.
 */
function Rows({ head, rows, total, noTotal }: { head: string[]; rows: { cells: ReactNode[]; onClick?: () => void; key: string; tone?: string }[]; total?: ReactNode[]; noTotal?: boolean }) {
  const opened = useOpenedRow();
  // Callers build rows afresh each render: back to 50 only when the list itself changes.
  const win = useRowWindow(rows, `${rows.length}|${rows[0]?.key}|${rows[rows.length - 1]?.key}`);
  if (!rows.length)
    return (
      <Text p={6} textAlign="center" fontSize="13px" color={colors.mutedText}>
        Nothing to show for this selection.
      </Text>
    );
  const th = { position: 'sticky' as const, top: 0, zIndex: 2, bg: colors.pageBg, px: 3, py: '7px', color: colors.darkText, fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap' as const, borderBottom: '1px solid', borderColor: colors.border };
  const tot = { position: 'sticky' as const, top: '33px', zIndex: 1, bg: colors.tableTotalStart, px: 3, py: '7px', color: colors.darkText, fontWeight: 700, fontSize: '13px', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid', borderColor: colors.border };
  return (
    <Box flex={1} minH={0} overflow="auto">
      <Box as="table" w="100%" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead className="sp-th">
          <tr>
            {head.map((h, i) => (
              <Box as="th" key={h} {...th} textAlign={i === 0 ? 'left' : 'right'}>
                {h}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {!noTotal && (
            <tr data-total-row>
              <Box as="td" {...tot} textAlign="left">
                Total
              </Box>
              {head.slice(1).map((_, i) => (
                <Box as="td" key={i} {...tot} textAlign="right">
                  {total?.[i] ?? ''}
                </Box>
              ))}
            </tr>
          )}
          {win.rows.map((r) => (
            <Box
              as="tr"
              key={r.key}
              cursor={r.onClick ? 'pointer' : undefined}
              _hover={r.onClick ? { '& td': { bg: opened.isActive(r.key) ? ACTIVE_ROW.bg : colors.hoverBg } } : undefined}
              onClick={r.onClick ? () => opened.open(r.key, r.onClick!) : undefined}
              css={opened.isActive(r.key) ? { '& td': { background: ACTIVE_ROW.bg }, '& td:first-of-type': { boxShadow: ACTIVE_ROW.boxShadow, fontWeight: 600 } } : undefined}
              aria-current={opened.isActive(r.key) || undefined}
              tabIndex={r.onClick ? 0 : undefined}
              onKeyDown={r.onClick ? (e: { key: string }) => e.key === 'Enter' && opened.open(r.key, r.onClick!) : undefined}
            >
              {r.cells.map((c, i) => (
                <Box
                  as="td"
                  key={i}
                  px={3}
                  py="7px"
                  fontSize="13px"
                  borderBottom="1px solid"
                  borderColor={colors.sunkBg}
                  textAlign={i === 0 ? 'left' : 'right'}
                  color={i === 0 ? (r.onClick ? colors.brand : colors.darkText) : colors.bodyText}
                  fontWeight={i === 0 ? 500 : 400}
                  fontVariantNumeric="tabular-nums"
                >
                  {c}
                </Box>
              ))}
            </Box>
          ))}
          {win.markerRow(head.length)}
        </tbody>
      </Box>
    </Box>
  );
}

const RagText = ({ v, r, text }: { v?: number | null; r: ReturnType<typeof rag>; text?: string }) => (
  <Text as="span" color={ragCell(r).color} fontWeight={700}>
    {text ?? pct1(v)}
  </Text>
);

function Waiting() {
  return (
    <Box>
      <Skeleton h="64px" mb={3} />
      <Skeleton h="160px" mb={3} />
      <Skeleton h="120px" />
    </Box>
  );
}

// ── Sheet frame (same header as the Sales Pulse drill sheets) ──
interface FrameProps {
  item: DetailItem;
  depth: number;
  stack: DetailItem[];
  actions: { label: string; icon?: ReactNode; run: () => void; primary?: boolean }[];
  children: ReactNode;
}
function Frame({ item, depth, stack, actions, children }: FrameProps) {
  const d = useDetail();
  const tab = useActiveTab();
  const rootLabel = TABS.find((t) => t.key === tab)?.label ?? 'Supply Chain Pulse';
  return (
    <Flex direction="column" h="100%" bg={colors.cardBg} borderLeft="1px solid" borderColor={colors.border} boxShadow={`-8px 0 28px ${colors.shadow}`} role="dialog" aria-label={`${item.kind === 'geo' && item.region ? 'Region' : KIND_LABEL[item.kind]}: ${titleOf(item)}`}>
      <Flex gap={3} align="flex-start" wrap="wrap" px={{ base: 4, md: 5 }} py={4} bg={colors.cardBg} borderBottom="1px solid" borderColor={colors.border} flexShrink={0}>
        {depth > 0 && (
          <Box as="button" aria-label="Back" title="Back" onClick={() => d.popTo(depth - 1)} mt="2px" p={1} borderRadius="4px" color={colors.bodyText} _hover={{ bg: colors.hoverBg }}>
            <FiArrowLeft size={16} />
          </Box>
        )}
        <Box mt="3px" px="7px" py="2px" borderRadius="4px" bg={colors.brandSoft} color={colors.brand} fontSize="11px" fontWeight={700} letterSpacing=".05em" textTransform="uppercase" flexShrink={0}>
          {item.kind === 'geo' && item.region ? 'Region' : KIND_LABEL[item.kind]}
        </Box>
        <Box flex={1} minW={0} order={1}>
          <Text fontSize="18px" fontWeight={700} color={colors.darkText} truncate title={titleOf(item)}>
            {titleOf(item)}
          </Text>
          {/* The trail, as Sales Pulse shows it: the tab, then every sheet open before this one. */}
          <Flex fontSize="13px" color={colors.mutedText} gap="4px" wrap="wrap">
              <Box as="button" color={colors.brand} fontWeight={600} _hover={{ textDecoration: 'underline' }} onClick={d.close} title={`Back to ${rootLabel}`}>
                {rootLabel}
              </Box>
              <Text as="span">›</Text>
              {stack.slice(0, depth).map((s, i) => (
                <Flex key={i} gap="4px" align="center">
                  <Box as="button" color={colors.brand} fontWeight={600} _hover={{ textDecoration: 'underline' }} onClick={() => d.popTo(i)}>
                    {titleOf(s)}
                  </Box>
                  <Text as="span">›</Text>
                </Flex>
              ))}
              <Text as="span" color={colors.darkText} fontWeight={600}>
                {titleOf(item)}
              </Text>
          </Flex>
        </Box>
        <Box as="button" order={{ base: 2, md: 3 }} aria-label="Close" title="Close (Esc)" onClick={d.close} p={1} mt="2px" borderRadius="4px" color={colors.bodyText} _hover={{ bg: colors.hoverBg }}>
          <FiX size={18} />
        </Box>
        <Flex gap={2} flexShrink={0} wrap="wrap" justify={{ base: 'flex-start', md: 'flex-end' }} order={{ base: 3, md: 2 }} w={{ base: '100%', md: 'auto' }}>
          {actions.map((a) => (
            <Flex
              key={a.label}
              as="button"
              align="center"
              gap="6px"
              h="28px"
              px="10px"
              borderRadius="4px"
              bg={a.primary ? colors.brand : colors.sunkBg}
              color={a.primary ? colors.onBrand : colors.darkText}
              fontSize="13px"
              fontWeight={600}
              _hover={{ opacity: 0.9 }}
              onClick={a.run}
            >
              {a.icon}
              {a.label}
            </Flex>
          ))}
        </Flex>
      </Flex>
      {/* KPI cards stay in place; each list card fills what is left and scrolls inside. With
          several lists the body scrolls, each list keeping at least 240px. */}
      <Flex direction="column" gap={4} flex={1} minH={0} overflowY="auto" px={{ base: 4, md: 5 }} py={4} className="sp-fade">
        {children}
      </Flex>
    </Flex>
  );
}

/** A row of /ibl-vs-tscl?groupBy=sku. */
interface IblSkuRow { item_code: string | number; classification: string; ibl_target: number | string | null; tscl_target: number | string | null }

// ── Plan alignment drill (FR-EXEC-049) ──
/**
 * One class's IBL target vs TSCL budget, SKU by SKU (/ibl-vs-tscl?groupBy=sku).
 * The budget is national, so the class goes straight to its SKUs: there is no
 * branch step (no branch budget in the data, BR-MET-006). A SKU opens its sheet.
 */
function AlignClassBody({ cls, data }: { cls: string; data: DashboardData }) {
  const { push } = useDetail();
  const { filters } = useStore();
  const params: Record<string, unknown> = { endDate: data.window.end, groupBy: 'sku', classification: [cls] };
  if (filters.branch.length) params.branch = filters.branch;
  const q = useQuery({ queryKey: ['api', '/ibl-vs-tscl', params], queryFn: () => fetchRows('/ibl-vs-tscl', params) as Promise<IblSkuRow[]>, staleTime: 5 * 60_000 });
  const names = new Map(data.options.items.map((i) => [String(i.item_code), i.item_description]));
  const rows = (q.data ?? [])
    .map((r) => ({ code: String(r.item_code), name: names.get(String(r.item_code)) ?? String(r.item_code), ibl: num(r.ibl_target) ?? 0, tscl: num(r.tscl_target) ?? 0 }))
    .filter((r) => r.ibl || r.tscl)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  const ibl = rows.reduce((t, r) => t + r.ibl, 0);
  const tscl = rows.reduce((t, r) => t + r.tscl, 0);
  // The class figure: Σ IBL target ÷ Σ TSCL budget (BR-MET-006's Total rule).
  const classPct = tscl > 0 ? (ibl / tscl) * 100 : null;
  if (q.isLoading) return <Waiting />;
  if (q.isError)
    return (
      <Text fontSize="13px" color={colors.bad}>
        Couldn’t load the SKUs of this class.
      </Text>
    );
  return (
    <>
      <StatGrid>
        <Stat label="IBL target" value={pkr(ibl)} sub={`${rows.length} SKUs`} />
        <Stat label="TSCL budget" value={pkr(tscl)} sub="National: the budget has no branch" />
        <Stat label="Forecast ÷ budget" value={pct1(classPct)} rag={rag(classPct, 'planAlignment')} />
      </StatGrid>
      <Section title={`SKUs in ${clsName(cls)}`} hint="IBL target and TSCL budget for the month; budget is national">
        <Rows
          head={['SKU', 'IBL Target', 'TSCL Budget', 'Forecast ÷ Budget']}
          total={[money(ibl), money(tscl), <RagText key="t" v={classPct} r={rag(classPct, 'planAlignment')} text={pct1(classPct)} />]}
          rows={rows.map((r) => {
            const p = r.tscl > 0 ? (r.ibl / r.tscl) * 100 : null;
            return {
              key: r.code,
              cells: [r.name, money(r.ibl), money(r.tscl), p == null ? 'No Budget' : <RagText key="p" v={p} r={rag(p, 'planAlignment')} text={pct1(p)} />],
              onClick: () => push({ kind: 'sku', sku: r.name }),
            };
          })}
        />
      </Section>
    </>
  );
}

// ── Class hierarchy: Zone → Region → Branch → SKU (as Sales Pulse 2.0) ──

interface GeoRow { name: string; branches: number; cover: number | null; service: number | null }

/**
 * One class's cover days and service level per branch (the 14 Inventory Days
 * branches), and the same rolled up to regions and zones. A roll-up is the
 * average of its branches that hold stock, the rule the Inventory Days total
 * already uses; service is the average of its branches' service level.
 */
function geoLevels(data: DashboardData, cls: string) {
  const where = geoOf(data);
  const inv = rowsFrom<InventoryDaysRow>(data, 'invDays');
  const classRow = K.inventoryClassRows(inv as unknown as Record<string, unknown>[]).find((r) => r.cls === cls);
  const ci = ['A', 'B', 'C', 'N'].indexOf(cls);
  const matrix = service(merged(data, ['aboveBelow', 'serviceAll'])).matrix;
  const branches = INV_BRANCHES.map((b, i) => {
    const g = where(b.label);
    const sv = ci >= 0 ? matrix.find((m) => m.branch.trim().toLowerCase() === b.label.toLowerCase())?.cells[ci] ?? null : null;
    return { name: b.label, zone: g.zone, region: g.region, cover: classRow ? classRow.vals[i] : null, service: sv };
  });
  const roll = (key: 'zone' | 'region', list: typeof branches): GeoRow[] => {
    const by = new Map<string, typeof branches>();
    for (const b of list) by.set(b[key], [...(by.get(b[key]) ?? []), b]);
    return [...by]
      .map(([name, bs]) => {
        const covers = bs.map((b) => b.cover).filter((v): v is number => v != null && v > 0);
        const svs = bs.map((b) => b.service).filter((v): v is number => v != null);
        return {
          name,
          branches: bs.length,
          cover: covers.length ? sumOf(covers, (v) => v) / covers.length : null,
          service: svs.length ? sumOf(svs, (v) => v) / svs.length : null,
        };
      })
      .sort((a, b) => Number(a.name === 'Others') - Number(b.name === 'Others') || a.name.localeCompare(b.name, undefined, { numeric: true }));
  };
  return { branches, zones: roll('zone', branches), regionsOf: (zone: string) => roll('region', branches.filter((b) => b.zone === zone)), loaded: inv.length > 0 };
}

/** A zone, region or branch list of one class: cover days and service level. */
function GeoRows({ rows, onPick, noun = 'branches' }: { rows: GeoRow[]; onPick: (name: string) => void; noun?: string }) {
  return (
    <Rows
      head={['Name', noun === 'branches' ? 'Branches' : 'SKUs', 'Cover Days', 'Service Level']}
      total={[String(sumOf(rows, (r) => r.branches)), '', '']}
      rows={rows.map((r) => ({
        key: r.name,
        cells: [r.name, String(r.branches), days(r.cover), r.service == null ? DASH : <RagText key="s" v={r.service} r={rag(r.service, 'serviceLevel')} />],
        onClick: () => onPick(r.name),
      }))}
    />
  );
}

/** A class in a zone (its regions) or in a region (its branches). */
function GeoBody({ cls, zone, region, data }: { cls: string; zone: string; region?: string; data: DashboardData }) {
  const { push } = useDetail();
  const g = geoLevels(data, cls);
  const regions = g.regionsOf(zone);
  const branches = g.branches
    .filter((b) => b.zone === zone && (!region || b.region === region))
    .map((b) => ({ name: b.name, branches: 1, cover: b.cover, service: b.service }));
  const here = region ? regions.find((r) => r.name === region) : g.zones.find((z) => z.name === zone);
  if (!g.loaded) return <Waiting />;
  return (
    <>
      <StatGrid>
        <Stat label="Cover days" value={days(here?.cover)} sub="Average Of The Branches" />
        <Stat label="Service level" value={pct1(here?.service)} rag={rag(here?.service ?? null, 'serviceLevel')} sub="Share Of SKUs Above Threshold" />
        <Stat label={region ? 'Branches' : 'Regions'} value={region ? branches.length : regions.length} sub={region ? `In ${region}` : `In ${zone}`} />
      </StatGrid>
      {region ? (
        <Section title={`Branches In ${region}`} hint={`${clsName(cls)} · open a branch for its SKUs`}>
          <GeoRows rows={branches} onPick={(b) => push({ kind: 'classBranch', cls, branch: b })} />
        </Section>
      ) : (
        <Section title={`Regions In ${zone}`} hint={clsName(cls)}>
          <GeoRows rows={regions} onPick={(r) => push({ kind: 'geo', cls, zone, region: r })} />
        </Section>
      )}
    </>
  );
}

/** A class at one branch: its SKUs' cover there against the class threshold. */
function ClassBranchBody({ cls, branch, data }: { cls: string; branch: string; data: DashboardData }) {
  const { push } = useDetail();
  const b = INV_BRANCHES.find((x) => x.label === branch);
  const inv = rowsFrom<InventoryDaysRow>(data, 'invDays').filter((r) => (r.classification || 'Others') === cls);
  const bench = rowsFrom<BenchmarkRow>(data, 'bench').find((x) => (x.classification || 'Others') === cls);
  const th = num(bench?.threshold ?? null);
  const bm = num(bench?.days ?? null);
  const g = geoLevels(data, cls).branches.find((x) => x.name === branch);
  if (!b) return <Text color={colors.mutedText}>This branch has no cover days in Inventory Days.</Text>;
  const skus = inv.map((r) => ({ sku: r.item_desc, v: Number(r[b.key] ?? 0) })).sort((x, y) => x.v - y.v);
  const below = th == null ? 0 : skus.filter((x) => x.v < th).length;
  return (
    <>
      <StatGrid>
        <Stat label="Cover days" value={days(g?.cover)} sub={`Benchmark ${days(bm)} · Threshold ${days(th)}`} />
        <Stat label="Service level" value={pct1(g?.service)} rag={rag(g?.service ?? null, 'serviceLevel')} />
        <Stat label="SKUs below threshold" value={th == null ? DASH : below} sub={`Of ${skus.length} SKUs`} />
        <Stat label="Zone · region" value={<Text as="span" fontSize="15px">{g?.zone ?? DASH}</Text>} sub={g?.region} />
      </StatGrid>
      <Section title={`SKUs In ${clsName(cls)} At ${branch}`} hint="Lowest cover first · 0 d means no stock here">
        <Rows
          head={['SKU', 'Cover Here', 'Threshold', 'Status']}
          rows={skus.map(({ sku, v }, i) => ({
            // An SKU name can repeat within a class (one row per item code).
            key: `${sku}|${i}`,
            cells: [sku, v === 0 ? 'No Stock' : days(v), days(th), th != null && v < th ? <RagText key="b" r={v === 0 ? 'red' : 'amber'} text="Below Threshold" /> : <RagText key="o" r="green" text="OK" />],
            onClick: () => push({ kind: 'sku', sku }),
          }))}
        />
      </Section>
    </>
  );
}

// ── Entity sheets ──
function ClassBody({ cls, data }: { cls: string; data: DashboardData }) {
  const { push } = useDetail();
  const s = stock(merged(data, ['cover', 'bench', 'coverTotal']));
  const c = s.cls.find((x) => x.cls === cls);
  const sales = rowsFrom<SalesSummaryRow>(data, 'sales').find((r) => (r.classification || 'Others') === cls);
  const p = plan(merged(data, ['fam', 'daysgone', 'fay', 'cat0', 'cat1', 'ibl']), data.window);
  const att = p.cells.find((x) => x.month === p.currentMonth && x.cls === cls);
  const cov = c ? K.classCoverage(c) : null;
  const excess = s.excessByClass.find((e) => e.cls === cls)?.value;
  const zones = geoLevels(data, cls).zones;
  // Only the next level of the hierarchy, as Sales Pulse 2.0: its zones; regions, branches and SKUs open from there.
  return (
    <>
      <StatGrid>
        <Stat label="Cover days" value={days(c?.cd)} sub={`Benchmark ${days(c?.bm)} · Threshold ${days(c?.th)}`} rag={rag(cov, 'coverage')} />
        <Stat label="Inventory cost" value={pkr(c?.invCost)} sub={`TP ${money(c?.invTp)} · ${money(c?.qty)} Units`} />
        <Stat label="Excess cost" value={excess ? pkr(excess) : DASH} sub="Above Benchmark" />
        <Stat label="Sales this period" value={pkr(num(sales?.amount ?? null))} sub={att && att.target > 0 ? `${pct1((att.amount / att.target) * 100)} Of Month Target` : undefined} />
      </StatGrid>
      <Section title={`${clsName(cls)} By Zone`} hint="Zone › Region › Branch › SKU · cover and service are averages of the branches">
        <GeoRows rows={zones} onPick={(z) => push({ kind: 'geo', cls, zone: z })} />
      </Section>
    </>
  );
}

function BranchBody({ branch, data }: { branch: string; data: DashboardData }) {
  const { push } = useDetail();
  const sv = service(merged(data, ['aboveBelow', 'serviceAll']));
  const row = sv.matrix.find((m) => m.branch === branch);
  const b = INV_BRANCHES.find((x) => x.label === branch);
  const inv = rowsFrom<InventoryDaysRow>(data, 'invDays');
  const bench = rowsFrom<BenchmarkRow>(data, 'bench');
  const th = (cls: string) => num(bench.find((x) => x.classification === cls)?.threshold ?? null);
  const classRows = b ? K.inventoryClassRows(inv as unknown as Record<string, unknown>[]) : [];
  const bi = b ? INV_BRANCHES.indexOf(b) : -1;
  const risky = b
    ? inv
        .map((r) => ({ r, v: Number(r[b.key] ?? 0), t: th(r.classification) }))
        .filter((x) => x.t != null && x.v < (x.t as number))
        .sort((a, c) => a.v - c.v)
    : [];
  return (
    <>
      <StatGrid>
        <Stat label="Service level (avg)" value={pct1(row?.avg)} rag={rag(row?.avg, 'serviceLevel')} sub="Simple Average Of Classes" />
        {['A', 'B', 'C', 'N'].map((c, i) => (
          <Stat key={c} label={`Class ${c}`} value={pct1(row?.cells[i])} rag={rag(row?.cells[i], 'serviceLevel')} />
        ))}
      </StatGrid>
      <Section title={`Classes At ${branch}`} hint="Open a class for its SKUs here">
        <Rows
          head={['Class', 'Cover Here', 'Threshold', 'Service Level', 'SKUs Below']}
          rows={classRows.map((c) => {
            const ci = ['A', 'B', 'C', 'N'].indexOf(c.cls);
            const sl = ci >= 0 ? row?.cells[ci] ?? null : null;
            const below = risky.filter((x) => (x.r.classification || 'Others') === c.cls).length;
            const t = th(c.cls);
            return {
              key: c.cls,
              cells: [
                clsName(c.cls),
                // Other has no threshold: its cover is shown plain.
                t == null ? days(c.vals[bi]) : <RagText key="c" r={c.vals[bi] < t ? 'red' : 'green'} text={days(c.vals[bi])} />,
                days(t),
                sl == null ? DASH : <RagText key="s" v={sl} r={rag(sl, 'serviceLevel')} />,
                below ? <RagText key="b" r="red" text={full(below)} /> : '0',
              ],
              onClick: () => push({ kind: 'classBranch', cls: c.cls, branch }),
            };
          })}
          noTotal
        />
      </Section>
    </>
  );
}

function SkuBody({ sku, data }: { sku: string; data: DashboardData }) {
  const r = rowsFrom<InventoryDaysRow>(data, 'invDays').find((x) => x.item_desc === sku);
  const bench = rowsFrom<BenchmarkRow>(data, 'bench').find((x) => x.classification === r?.classification);
  const bm = num(bench?.days ?? null);
  const th = num(bench?.threshold ?? null);
  const disp = rowsFrom<DispatchVsOrderRow>(data, 'dispatch').filter((x) => x.material_name === sku);
  const f = K.fillRate(disp);
  const vals = r ? INV_BRANCHES.map((b) => ({ b: b.label, v: Number(r[b.key] ?? 0) })) : [];
  return (
    <>
      <StatGrid>
        <Stat label="Class" value={r?.classification ?? DASH} />
        <Stat label="Cover (avg of branches)" value={days(num(r?.total ?? null))} rag={rag(bm && r ? (n0(r.total) / bm) * 100 : null, 'coverage')} />
        <Stat label="Branches below threshold" value={th != null ? vals.filter((x) => x.v < th).length : DASH} sub={`Threshold ${days(th)}`} />
        <Stat label="Fill rate" value={pct1(f.pct)} rag={rag(f.pct, 'fillRate')} sub={disp.length ? `${full(f.unfulfilled)} Units Short` : 'No Orders In Period'} />
      </StatGrid>
      {/* The drill ends here: Class → SKU → cover by branch. A branch row opens nothing (user request, 17 Nov 2026; FR-EXEC-053). */}
      <Section title="Cover By Branch" hint="Lowest cover first · 0 d means no stock">
        <Rows
          head={['Branch', 'Cover', 'Threshold', 'Of Benchmark', 'Status']}
          rows={[...vals]
            .sort((a, b) => a.v - b.v)
            .map((x) => {
              const short = th != null && x.v < th;
              return {
                key: x.b,
                cells: [
                  x.b,
                  x.v === 0 ? 'No Stock' : days(x.v),
                  days(th),
                  bm ? <RagText key="p" v={(x.v / bm) * 100} r={rag((x.v / bm) * 100, 'coverage')} /> : DASH,
                  <RagText key="s" r={short ? 'red' : 'green'} text={short ? 'Below Threshold' : 'OK'} />,
                ],
              };
            })}
          noTotal
        />
      </Section>
    </>
  );
}

function ChannelBody({ channel, data }: { channel: string; data: DashboardData }) {
  const rows = rowsFrom<DispatchVsOrderRow>(data, 'dispatch').filter((r) => r.channel_type === channel);
  const f = K.fillRate(rows);
  const mats = rows
    .map((r) => ({ r, short: Math.max(0, n0(r.total_order_qty) - n0(r.total_delivery_qty)) }))
    .sort((a, b) => b.short - a.short);
  return (
    <>
      <StatGrid>
        <Stat label="Fill rate" value={pct1(f.pct)} rag={rag(f.pct, 'fillRate')} sub="By Quantity" />
        <Stat label="Ordered" value={full(f.ordered)} sub="Units" />
        <Stat label="Delivered" value={full(f.delivered)} sub="Units" />
        <Stat label="Unfulfilled" value={full(f.unfulfilled)} sub={`${K.materialsBelow(rows).below} Of ${K.materialsBelow(rows).total} Materials Below 90%`} />
      </StatGrid>
      <Section title={`Materials In ${channel}`} hint="Most Unfulfilled First">
        <Rows head={['Material', 'Ordered', 'Delivered', 'Short', 'Fill Rate']} total={[full(sumOf(mats, (m) => n0(m.r.total_order_qty))), full(sumOf(mats, (m) => n0(m.r.total_delivery_qty))), full(sumOf(mats, (m) => m.short)), '']} rows={mats.map(({ r, short }) => ({ key: r.material_name, cells: [r.material_name, full(n0(r.total_order_qty)), full(n0(r.total_delivery_qty)), full(short), <RagText key="f" v={num(r.delivery_pct)} r={rag(num(r.delivery_pct), 'fillRate')} text={pct1(num(r.delivery_pct))} />] }))} />
      </Section>
    </>
  );
}

function MaterialBody({ material, data }: { material: string; data: DashboardData }) {
  const rows = rowsFrom<DispatchVsOrderRow>(data, 'dispatch').filter((r) => r.material_name === material);
  const wip = rowsFrom<WipRow>(data, 'wip').filter((r) => r['Material Name'] === material);
  const f = K.fillRate(rows);
  return (
    <>
      <StatGrid>
        <Stat label="Fill rate" value={pct1(f.pct)} rag={rag(f.pct, 'fillRate')} />
        <Stat label="Ordered" value={full(f.ordered)} sub="Units" />
        <Stat label="Unfulfilled" value={full(f.unfulfilled)} sub="Units" />
        <Stat label="In production" value={wip.length} sub={`${money(wip.reduce((t, r) => t + n0(r['WIP Value']), 0))} WIP Value`} />
      </StatGrid>
      <Section title="By Channel">
        <Rows head={['Channel', 'Ordered', 'Delivered', 'Fill Rate']} total={[full(sumOf(rows, (r) => n0(r.total_order_qty))), full(sumOf(rows, (r) => n0(r.total_delivery_qty))), '']} rows={rows.map((r) => ({ key: r.channel_type, cells: [r.channel_type, full(n0(r.total_order_qty)), full(n0(r.total_delivery_qty)), <RagText key="f" v={num(r.delivery_pct)} r={rag(num(r.delivery_pct), 'fillRate')} text={pct1(num(r.delivery_pct))} />] }))} />
      </Section>
    </>
  );
}

function OrderBody({ order, data }: { order: string; data: DashboardData }) {
  const { push } = useDetail();
  const r = rowsFrom<WipRow>(data, 'wip').find((x) => x.order_number === order);
  if (!r) return <Text color={colors.mutedText}>This order is not in the current period.</Text>;
  const c = n0(r.item_qty) > 0 ? (n0(r.good_received_qty) / n0(r.item_qty)) * 100 : null;
  return (
    <>
      <StatGrid>
        <Stat label="Completion" value={pct1(c)} rag={rag(c, 'productionCompletion')} sub={`${full(n0(r.good_received_qty))} Of ${full(n0(r.item_qty))} Received`} />
        <Stat label="Still in production" value={full(n0(r.Quantity))} sub="Units" />
        <Stat label="WIP value" value={pkr(n0(r['WIP Value']))} />
        <Stat label="Material type" value={<Text as="span" fontSize="14px">{r.material_type_description}</Text>} />
      </StatGrid>
      <Section title="Where">
        <Rows noTotal head={['Field', 'Value']} rows={[
          { key: 'm', cells: ['Material', r['Material Name']], onClick: rowsFrom<DispatchVsOrderRow>(data, 'dispatch').some((x) => x.material_name === r['Material Name']) ? () => push({ kind: 'material', material: r['Material Name'] }) : undefined },
          { key: 'p', cells: ['Plant', `${r.plnt_desc} (${r.plant})`] },
          { key: 's', cells: ['Storage Location', `${r.storage_loc_desc} (${r.storage_loc})`] },
        ]} />
      </Section>
    </>
  );
}

/** A plant's WIP: its production orders, largest value first; an order opens its material. */
function WipPlantBody({ plant, data }: { plant: string; data: DashboardData }) {
  const { push } = useDetail();
  const rows = rowsFrom<WipRow>(data, 'wip')
    .filter((r) => r.plnt_desc === plant)
    .sort((a, b) => n0(b['WIP Value']) - n0(a['WIP Value']));
  const w = K.wipSummary(rows);
  const pending = rows.filter((r) => n0(r.good_received_qty) === 0).length;
  const dispatched = new Set(rowsFrom<DispatchVsOrderRow>(data, 'dispatch').map((x) => x.material_name));
  return (
    <>
      <StatGrid>
        <Stat label="WIP value" value={pkr(w.value)} sub="At Cost" />
        <Stat label="Orders" value={full(rows.length)} sub={`${full(w.openOrders)} Still Open`} />
        <Stat label="Pending GR" value={full(pending)} sub="Nothing Received Yet" />
        <Stat label="Completion" value={pct1(w.completion)} rag={rag(w.completion, 'productionCompletion')} sub="Received ÷ Item Quantity" />
      </StatGrid>
      <Section title={`Orders At ${plant}`} hint="Largest WIP value first · open an order's material">
        <Rows
          head={['Material', 'Order', 'Material Type', 'Received', 'WIP Value']}
          total={['', '', `${full(sumOf(rows, (r) => n0(r.good_received_qty)))} Of ${full(sumOf(rows, (r) => n0(r.item_qty)))}`, money(w.value)]}
          rows={rows.map((r) => ({
            key: String(r.order_number),
            cells: [r['Material Name'], String(r.order_number), r.material_type_description, n0(r.good_received_qty) === 0 ? <RagText key="g" r="red" text="Pending GR" /> : `${full(n0(r.good_received_qty))} Of ${full(n0(r.item_qty))}`, money(n0(r['WIP Value']))],
            onClick: dispatched.has(r['Material Name']) ? () => push({ kind: 'material', material: r['Material Name'] }) : undefined,
          }))}
        />
      </Section>
    </>
  );
}

/** A plant's raw and packing material: its materials, largest cost first; a material opens its stock states. */
function RmpmPlantBody({ plant, data }: { plant: string; data: DashboardData }) {
  const { push } = useDetail();
  const rows = rowsFrom<RpmRow>(data, 'rpm')
    .filter((r) => r.plantname === plant)
    .sort((a, b) => n0(b.total_val) - n0(a.total_val));
  const s = K.rmpmSummary(rows);
  const held = (r: RpmRow) => n0(r.blocked_val) + n0(r.quality_inspection_val) + n0(r.restricted_val) + n0(r.returns_val);
  return (
    <>
      <StatGrid>
        <Stat label="Stock value" value={pkr(s.total)} sub="At Cost" />
        <Stat label="On hold" value={pct1(s.onHoldPct)} rag={rag(s.onHoldPct, 'onHoldPct')} sub={pkr(s.held)} />
        <Stat label="Blocked or in QI" value={pct1(s.blockedQiPct)} sub="Of The Plant's Stock Value" />
        <Stat label="Materials" value={full(rows.length)} sub={`${full(rows.filter((r) => held(r) > 0).length)} With Stock On Hold`} />
      </StatGrid>
      <Section title={`Materials At ${plant}`} hint="Largest cost first · open a material for its stock states">
        <Rows
          head={['Material', 'Storage Location', 'Total Cost', 'On Hold']}
          total={['', money(s.total), pct1(s.onHoldPct)]}
          rows={rows.map((r, i) => {
            const h = n0(r.total_val) > 0 ? (held(r) / n0(r.total_val)) * 100 : null;
            return {
              key: `${r.materialname}|${r.storagelocation}|${i}`,
              cells: [r.materialname, r.storagelocationname, money(n0(r.total_val)), h ? <RagText key="h" v={h} r={rag(h, 'onHoldPct')} /> : '0%'],
              onClick: () => push({ kind: 'rmpm', material: r.materialname, plant }),
            };
          })}
        />
      </Section>
    </>
  );
}

function RmpmBody({ material, plant, data }: { material: string; plant: string; data: DashboardData }) {
  const r = rowsFrom<RpmRow>(data, 'rpm').find((x) => x.materialname === material && x.plantname === plant);
  if (!r) return <Text color={colors.mutedText}>This material is not in the current period.</Text>;
  const total = n0(r.total_val);
  const s = K.rmpmSummary([r]);
  return (
    <>
      <StatGrid>
        <Stat label="Total value" value={pkr(total)} sub={`${full(n0(r.total_qty))} Units`} />
        <Stat label="On hold" value={pct1(s.onHoldPct)} rag={rag(s.onHoldPct, 'onHoldPct')} sub={pkr(s.held)} />
        <Stat label="Usable now" value={pkr(n0(r.unrestricted_val))} sub={`${full(n0(r.unrestricted_qty))} Units`} />
        <Stat label="Where" value={<Text as="span" fontSize="14px">{r.plantname}</Text>} sub={r.storagelocationname} />
      </StatGrid>
      <Section title="By Stock State" hint="On-hold states in red when there is any">
        <Rows
          head={['Stock State', 'Value', 'Contribution']}
          total={[pkr(total), '100%']}
          rows={K.RMPM_STATES.map((st) => {
            const v = n0(r[st.key]);
            return { key: st.key, cells: [st.label, st.held && v > 0 ? <RagText key="v" r="red" text={money(v)} /> : money(v), total > 0 ? pct1((v / total) * 100) : DASH] };
          })}
        />
      </Section>
    </>
  );
}

// ── The layer ──
export function DetailLayer({ data }: { data: DashboardData }) {
  const d = useDetail();
  const nav = useNav();

  const filterAction = (tab: TabKey, chip: Chip, label: string) => ({
    label,
    icon: <FiFilter />,
    run: () => {
      d.close();
      nav(tab, undefined, chip);
    },
  });

  const actionsFor = (item: DetailItem) => {
    switch (item.kind) {
      case 'class':
        return [filterAction('inventory', { key: 'cls', value: item.cls }, 'Filter Inventory To This Class'), filterAction('revenue', { key: 'cls', value: item.cls }, 'Filter Revenue')];
      case 'branch':
        return [filterAction('inventory', { key: 'branch', value: item.branch }, 'Filter Inventory To This Branch')];
      case 'channel':
        return [filterAction('fulfilment', { key: 'channel', value: item.channel }, 'Filter Fulfilment To This Channel')];
      case 'material':
        return [filterAction('fulfilment', { key: 'material', value: item.material }, 'Filter Fulfilment To This Material')];
      default:
        return [];
    }
  };

  const body = (item: DetailItem) => {
    switch (item.kind) {
      case 'class':
        return <ClassBody cls={item.cls} data={data} />;
      case 'alignClass':
        return <AlignClassBody cls={item.cls} data={data} />;
      case 'geo':
        return <GeoBody cls={item.cls} zone={item.zone} region={item.region} data={data} />;
      case 'classBranch':
        return <ClassBranchBody cls={item.cls} branch={item.branch} data={data} />;
      case 'branch':
        return <BranchBody branch={item.branch} data={data} />;
      case 'sku':
        return <SkuBody sku={item.sku} data={data} />;
      case 'channel':
        return <ChannelBody channel={item.channel} data={data} />;
      case 'material':
        return <MaterialBody material={item.material} data={data} />;
      case 'order':
        return <OrderBody order={item.order} data={data} />;
      case 'rmpm':
        return <RmpmBody material={item.material} plant={item.plant} data={data} />;
      case 'wipPlant':
        return <WipPlantBody plant={item.plant} data={data} />;
      case 'rmpmPlant':
        return <RmpmPlantBody plant={item.plant} data={data} />;
    }
  };

  return (
    <SheetStack
      keys={d.keys}
      labels={d.stack.map(titleOf)}
      onPopTo={d.popTo}
      onClose={d.close}
      renderSheet={(i) => (
        <Frame item={d.stack[i]} depth={i} stack={d.stack} actions={actionsFor(d.stack[i])}>
          {body(d.stack[i])}
        </Frame>
      )}
    />
  );
}
