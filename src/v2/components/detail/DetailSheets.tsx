// The detail sheets for Supply Chain Pulse 2.0, shown in the design-system
// SheetStack (slides in from the right). One renderer per kind of item; each
// reads the data the dashboard has already loaded, so opening a sheet costs no
// extra request. Rows inside a sheet open a deeper sheet.

import { Box, Flex, Grid, Skeleton, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { FiArrowLeft, FiArrowRight, FiFilter, FiX } from 'react-icons/fi';
import { SheetStack } from '@/v2/components/drill/SheetStack';
import { RagBadge, ragCell } from '@/v2/components/exec/Rag';
import { Bullet } from '@/v2/components/exec/charts';
import { clsColor } from '@/v2/constants/classColors';
import { colors } from '@/v2/constants/theme';
import { helpFor } from '@/v2/constants/help';
import {
  INV_BRANCHES,
  n0,
  num,
  type BenchmarkRow,
  type CategoryAccuracyRow,
  type DispatchVsOrderRow,
  type InventoryDaysRow,
  type RdStatusRow,
  type RpmRow,
  type SalesSummaryRow,
  type WipRow,
} from '@/v2/api/types';
import { rowsOf, type DashboardData, type Result } from '@/v2/features/data';
import { KIND_LABEL, titleOf, useDetail, type DetailItem } from '@/v2/features/detail';
import { plan, service, stock, workingCapitalTrend } from '@/v2/features/derive';
import * as K from '@/v2/features/kpis';
import { bandText, rag } from '@/v2/features/kpiThresholds';
import { DASH, days, full, money, pct0, pct1, pkr } from '@/v2/features/format';
import { monthLabel } from '@/v2/features/period';
import { useNav } from '@/v2/features/nav';
import type { Chip } from '@/v2/features/store';
import type { TabKey } from '@/v2/features/tabs';

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
const loading = (data: DashboardData, ...names: string[]) => names.some((n) => find(data, n)?.isLoading);
/** A TabData view assembled from whichever tabs loaded each name. */
function merged(data: DashboardData, names: string[]) {
  return Object.fromEntries(names.map((n) => [n, find(data, n) ?? { data: undefined, isLoading: false, isError: false, pending: false, locked: false, section: 'SUMMARY' as const }]));
}

// ── Building blocks ──
function Stat({ label, value, sub, rag: r }: { label: string; value: ReactNode; sub?: ReactNode; rag?: ReturnType<typeof rag> }) {
  return (
    <Box bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderRadius="4px" px={3} py="8px" minW={0}>
      <Text fontSize="12px" color={colors.mutedText} truncate>
        {label}
      </Text>
      <Flex align="center" gap="6px" wrap="wrap">
        <Text fontSize="19px" fontWeight={700} color={colors.darkText} fontVariantNumeric="tabular-nums">
          {value}
        </Text>
        {r && <RagBadge rag={r} size="sm" />}
      </Flex>
      {sub && (
        <Text fontSize="11.5px" color={colors.mutedText}>
          {sub}
        </Text>
      )}
    </Box>
  );
}

function StatGrid({ children }: { children: ReactNode }) {
  return (
    <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(auto-fit, minmax(150px, 1fr))' }} gap={2} mb={4}>
      {children}
    </Grid>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Box mb={5}>
      <Flex align="baseline" gap="8px" mb={2}>
        <Text fontSize="13.5px" fontWeight={700} color={colors.darkText}>
          {title}
        </Text>
        {hint && (
          <Text fontSize="12px" color={colors.mutedText}>
            {hint}
          </Text>
        )}
      </Flex>
      {children}
    </Box>
  );
}

/** A table whose rows can open a deeper sheet. */
function Rows({ head, rows }: { head: string[]; rows: { cells: ReactNode[]; onClick?: () => void; key: string; tone?: string }[] }) {
  if (!rows.length)
    return (
      <Text fontSize="12.5px" color={colors.mutedText}>
        Nothing to show for this selection.
      </Text>
    );
  return (
    <Box border="1px solid" borderColor={colors.border} borderRadius="4px" overflowX="auto">
      <Box as="table" w="100%" fontSize="12.5px" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <Box as="tr" bg={colors.sunkBg}>
            {head.map((h, i) => (
              <Box as="th" key={h} textAlign={i === 0 ? 'left' : 'right'} px={3} py="6px" color={colors.mutedText} fontWeight={600}>
                {h}
              </Box>
            ))}
            <Box as="th" w="20px" />
          </Box>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Box
              as="tr"
              key={r.key}
              borderTop="1px solid"
              borderColor={colors.border}
              cursor={r.onClick ? 'pointer' : undefined}
              _hover={r.onClick ? { bg: colors.hoverBg } : undefined}
              onClick={r.onClick}
              tabIndex={r.onClick ? 0 : undefined}
              onKeyDown={r.onClick ? (e: { key: string }) => e.key === 'Enter' && r.onClick!() : undefined}
            >
              {r.cells.map((c, i) => (
                <Box as="td" key={i} px={3} py="6px" textAlign={i === 0 ? 'left' : 'right'} color={i === 0 ? colors.darkText : colors.bodyText} fontWeight={i === 0 ? 600 : 400} fontVariantNumeric="tabular-nums">
                  {c}
                </Box>
              ))}
              <Box as="td" pr={2} color={colors.mutedText}>
                {r.onClick && <FiArrowRight size={12} />}
              </Box>
            </Box>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

const RagText = ({ v, r, text }: { v?: number | null; r: ReturnType<typeof rag>; text?: string }) => (
  <Text as="span" color={ragCell(r).color} fontWeight={700}>
    {text ?? pct0(v)}
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
  return (
    <Flex direction="column" h="100%" bg={colors.pageBg} borderLeft="1px solid" borderColor={colors.border} boxShadow={`-8px 0 28px ${colors.shadow}`} role="dialog" aria-label={`${KIND_LABEL[item.kind]}: ${titleOf(item)}`}>
      <Flex gap={3} align="flex-start" wrap="wrap" px={{ base: 4, md: 5 }} py={4} bg={colors.cardBg} borderBottom="1px solid" borderColor={colors.border}>
        {depth > 0 && (
          <Box as="button" aria-label="Back" title="Back" onClick={() => d.popTo(depth - 1)} mt="2px" p={1} borderRadius="4px" color={colors.bodyText} _hover={{ bg: colors.hoverBg }}>
            <FiArrowLeft size={16} />
          </Box>
        )}
        <Box mt="3px" px="7px" py="2px" borderRadius="4px" bg={colors.brandSoft} color={colors.brand} fontSize="11px" fontWeight={700} letterSpacing=".05em" textTransform="uppercase" flexShrink={0}>
          {KIND_LABEL[item.kind]}
        </Box>
        <Box flex={1} minW={0} order={1}>
          <Text fontSize="18px" fontWeight={700} color={colors.darkText} truncate title={titleOf(item)}>
            {titleOf(item)}
          </Text>
          {depth > 0 && (
            <Flex fontSize="12.5px" color={colors.mutedText} gap="4px" wrap="wrap">
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
          )}
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
              fontSize="12.5px"
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
      <Box flex={1} overflowY="auto" px={{ base: 4, md: 5 }} py={4} className="sp-fade">
        {children}
      </Box>
    </Flex>
  );
}

// ── KPI sheet ──
const GROUPS: { ids: string[]; kind: 'attain' | 'budget' | 'stock' | 'service' | 'fill' | 'wc' | 'rd' | 'prod' | 'rmpm' }[] = [
  { ids: ['EX-01', 'EX-02', 'RV-01', 'RV-02', 'RV-03', 'RV-05', 'RV-16'], kind: 'attain' },
  { ids: ['EX-03', 'RV-04'], kind: 'budget' },
  { ids: ['EX-04', 'EX-08', 'IN-02', 'IN-03', 'IN-04', 'IN-05', 'IN-06'], kind: 'stock' },
  { ids: ['EX-05', 'OP-13'], kind: 'service' },
  { ids: ['EX-06', 'OP-01', 'OP-02', 'OP-04'], kind: 'fill' },
  { ids: ['EX-07', 'IN-01'], kind: 'wc' },
  { ids: ['EX-09', 'DH-01', 'DH-02', 'DH-03', 'DH-11', 'DH-12', 'DH-13'], kind: 'rd' },
  { ids: ['OP-06', 'OP-07', 'OP-08'], kind: 'prod' },
  { ids: ['OP-10', 'OP-11'], kind: 'rmpm' },
];

function KpiBody({ item, data }: { item: Extract<DetailItem, { kind: 'kpi' }>; data: DashboardData }) {
  const { push } = useDetail();
  const help = helpFor(item.id);
  const group = GROUPS.find((g) => g.ids.includes(item.id))?.kind;
  const delta = item.delta;
  return (
    <>
      <Flex align="center" gap={3} mb={2} wrap="wrap">
        <Text fontSize="32px" fontWeight={800} color={colors.darkText} fontVariantNumeric="tabular-nums">
          {item.value}
        </Text>
        {item.valueSuffix && <Text color={colors.mutedText}>{item.valueSuffix}</Text>}
        <RagBadge rag={item.rag} />
        <Text ml="auto" fontSize="11px" color={colors.mutedText}>
          {item.id}
        </Text>
      </Flex>
      <Flex direction="column" gap="2px" mb={4} fontSize="13px" color={colors.bodyText}>
        {item.variance && <Text>{item.variance}</Text>}
        {delta && (
          <Text>
            {delta.value == null ? 'No comparison' : `${delta.value > 0 ? '▲' : delta.value < 0 ? '▼' : '■'} ${Math.abs(delta.value).toFixed(1)}${delta.unit === 'pts' ? ' pts' : '%'} ${delta.label}`}
          </Text>
        )}
        {item.caption && <Text color={colors.mutedText}>{item.caption}</Text>}
      </Flex>
      {help && (
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3} mb={5}>
          <Box bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderRadius="4px" p={3}>
            <Text fontSize="11px" textTransform="uppercase" color={colors.mutedText} mb={1}>
              What it tells you
            </Text>
            <Text fontSize="13px" color={colors.bodyText}>
              {help.what}
            </Text>
          </Box>
          <Box bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderRadius="4px" p={3}>
            <Text fontSize="11px" textTransform="uppercase" color={colors.mutedText} mb={1}>
              How it is calculated
            </Text>
            <Text fontSize="13px" color={colors.bodyText}>
              {help.source}
            </Text>
            {item.band && !help.source.includes('Band') && (
              <Text fontSize="12px" color={colors.mutedText} mt={2}>
                Band (proposed): {bandText(item.band, item.bandUnit)}
              </Text>
            )}
          </Box>
        </Grid>
      )}
      {group === 'attain' || group === 'budget' ? <AttainBreakdown data={data} budget={group === 'budget'} onClass={(cls) => push({ kind: 'class', cls })} /> : null}
      {group === 'stock' && <StockBreakdown data={data} onClass={(cls) => push({ kind: 'class', cls })} />}
      {group === 'service' && <ServiceBreakdown data={data} onBranch={(b) => push({ kind: 'branch', branch: b })} />}
      {group === 'fill' && <FillBreakdown data={data} onChannel={(c) => push({ kind: 'channel', channel: c })} />}
      {group === 'wc' && <WcBreakdown data={data} />}
      {group === 'rd' && <RdBreakdown data={data} onRd={(code) => push({ kind: 'rd', code })} />}
      {group === 'prod' && <ProdBreakdown data={data} onOrder={(o) => push({ kind: 'order', order: o })} />}
      {group === 'rmpm' && <RmpmBreakdown data={data} onMaterial={(m, p) => push({ kind: 'rmpm', material: m, plant: p })} />}
    </>
  );
}

function AttainBreakdown({ data, budget, onClass }: { data: DashboardData; budget: boolean; onClass: (c: string) => void }) {
  const cells = budget
    ? K.categoryCells([rowsFrom<CategoryAccuracyRow>(data, 'catY1'), rowsFrom<CategoryAccuracyRow>(data, 'catY0')])
    : K.categoryCells([rowsFrom<CategoryAccuracyRow>(data, 'cat1'), rowsFrom<CategoryAccuracyRow>(data, 'cat0')]);
  const month = data.window.end.slice(0, 7);
  const rows = cells.filter((c) => c.month === month);
  if (loading(data, budget ? 'catY0' : 'cat0')) return <Waiting />;
  return (
    <Section title={`By class, ${monthLabel(month, 'long')}`} hint={budget ? 'EFP sales vs TSCL budget' : 'Sales vs IBL target'}>
      <Rows
        head={['Class', 'Sales', budget ? 'Budget' : 'Target', 'Achieved']}
        rows={rows.map((c) => ({ key: c.cls, cells: [`Class ${c.cls}`, money(c.amount), money(c.target), c.target > 0 ? pct1((c.amount / c.target) * 100) : DASH], onClick: () => onClass(c.cls) }))}
      />
    </Section>
  );
}

function StockBreakdown({ data, onClass }: { data: DashboardData; onClass: (c: string) => void }) {
  const s = stock(merged(data, ['cover', 'bench', 'coverTotal']));
  if (loading(data, 'cover')) return <Waiting />;
  const ex = new Map(s.excessByClass.map((e) => [e.cls, e.value]));
  const sh = new Map(s.shortfall.map((e) => [e.cls, e.value]));
  return (
    <Section title="By class" hint="Cover days against benchmark and threshold">
      <Rows
        head={['Class', 'Cover', 'Benchmark', 'Threshold', 'Coverage', 'Excess (cost)', 'Shortfall (TP)']}
        rows={s.cls.map((c) => {
          const cov = K.classCoverage(c);
          return {
            key: c.cls,
            cells: [c.cls === 'Others' ? 'Others' : `Class ${c.cls}`, days(c.cd), days(c.bm), days(c.th), <RagText key="c" v={cov} r={rag(cov, 'coverage')} />, ex.get(c.cls) ? money(ex.get(c.cls)) : DASH, sh.get(c.cls) ? money(sh.get(c.cls)) : DASH],
            onClick: () => onClass(c.cls),
          };
        })}
      />
    </Section>
  );
}

function ServiceBreakdown({ data, onBranch }: { data: DashboardData; onBranch: (b: string) => void }) {
  const sv = service(merged(data, ['aboveBelow', 'serviceAll']));
  if (loading(data, 'serviceAll')) return <Waiting />;
  return (
    <Section title="Branches, worst first" hint="Share of SKUs above threshold">
      <Rows
        head={['Branch', 'A', 'B', 'C', 'N', 'Average']}
        rows={sv.matrix.map((m) => ({
          key: m.branch,
          cells: [m.branch, ...m.cells.map((v, i) => <RagText key={i} v={v} r={rag(v, 'serviceLevel')} />), <RagText key="a" v={m.avg} r={rag(m.avg, 'serviceLevel')} />],
          onClick: () => onBranch(m.branch),
        }))}
      />
    </Section>
  );
}

function FillBreakdown({ data, onChannel }: { data: DashboardData; onChannel: (c: string) => void }) {
  const rows = rowsFrom<DispatchVsOrderRow>(data, 'dispatch');
  if (loading(data, 'dispatch')) return <Waiting />;
  return (
    <Section title="By channel, worst first" hint="By quantity">
      <Rows
        head={['Channel', 'Ordered', 'Delivered', 'Unfulfilled', 'Fill rate']}
        rows={K.fillByChannel(rows).map((c) => ({ key: c.channel, cells: [c.channel, full(c.ordered), full(c.delivered), full(c.unfulfilled), <RagText key="f" v={c.pct} r={rag(c.pct, 'fillRate')} text={pct1(c.pct)} />], onClick: () => onChannel(c.channel) }))}
      />
    </Section>
  );
}

function WcBreakdown({ data }: { data: DashboardData }) {
  const names = Array.from({ length: 6 }, (_, i) => [`wcFg${i}`, `wcWip${i}`, `wcRpm${i}`]).flat();
  const wc = workingCapitalTrend(merged(data, names), data.window.end);
  if (loading(data, 'wcFg5')) return <Waiting />;
  return (
    <Section title="Last 6 month-ends" hint="At cost">
      <Rows head={['Month', 'Finished goods', 'WIP', 'RMPM', 'Total']} rows={wc.map((w) => ({ key: w.month, cells: [monthLabel(w.month, 'long'), money(w.fg), money(w.wip), money(w.rpm), money(w.total)] }))} />
    </Section>
  );
}

function RdBreakdown({ data, onRd }: { data: DashboardData; onRd: (code: string) => void }) {
  const rows = rowsFrom<RdStatusRow>(data, 'rd');
  if (loading(data, 'rd')) return <Waiting />;
  const silent = rows.filter((r) => !K.uploaded(r)).sort((a, b) => n0(b.day_diff) - n0(a.day_diff));
  return (
    <>
      <Section title="By branch, worst first">
        <Rows head={['Branch', 'RDs', 'Reported today']} rows={K.rdComplianceByBranch(rows).map((b) => ({ key: b.branch, cells: [b.branch, b.count, <RagText key="p" v={b.pct} r={rag(b.pct, 'rdCompliance')} />] }))} />
      </Section>
      <Section title="Not reported today" hint="Longest silent first">
        <Rows
          head={['Distributor', 'Branch', 'Days silent', 'Last stock']}
          rows={silent.map((r) => ({ key: String(r.ibl_distributor_code), cells: [r.distributor_desc ?? DASH, r.branch_desc ?? DASH, <RagText key="d" v={n0(r.day_diff)} r={rag(n0(r.day_diff), 'staleRdDays')} text={String(n0(r.day_diff))} />, money(n0(r.last_stock_value))], onClick: () => onRd(String(r.ibl_distributor_code)) }))}
        />
      </Section>
    </>
  );
}

function ProdBreakdown({ data, onOrder }: { data: DashboardData; onOrder: (o: string) => void }) {
  const rows = rowsFrom<WipRow>(data, 'wip');
  if (loading(data, 'wip')) return <Waiting />;
  const open = rows.filter((r) => n0(r.good_received_qty) < n0(r.item_qty)).sort((a, b) => n0(b['WIP Value']) - n0(a['WIP Value']));
  return (
    <Section title="Open production orders" hint="Largest WIP value first">
      <Rows
        head={['Order', 'Material', 'Plant', 'Completion', 'WIP value']}
        rows={open.map((r) => {
          const c = n0(r.item_qty) > 0 ? (n0(r.good_received_qty) / n0(r.item_qty)) * 100 : null;
          return { key: r.order_number, cells: [r.order_number, r['Material Name'], r.plnt_desc, <RagText key="c" v={c} r={rag(c, 'productionCompletion')} />, money(n0(r['WIP Value']))], onClick: () => onOrder(r.order_number) };
        })}
      />
    </Section>
  );
}

function RmpmBreakdown({ data, onMaterial }: { data: DashboardData; onMaterial: (m: string, plant: string) => void }) {
  const rows = rowsFrom<RpmRow>(data, 'rpm');
  if (loading(data, 'rpm')) return <Waiting />;
  const held = (r: RpmRow) => n0(r.blocked_val) + n0(r.quality_inspection_val) + n0(r.restricted_val) + n0(r.returns_val);
  return (
    <Section title="Most material on hold" hint="Blocked, in QI, restricted or returned">
      <Rows
        head={['Material', 'Plant', 'On hold', 'Total value', 'On hold %']}
        rows={rows
          .filter((r) => held(r) > 0)
          .sort((a, b) => held(b) - held(a))
          .slice(0, 15)
          .map((r) => {
            const p = n0(r.total_val) > 0 ? (held(r) / n0(r.total_val)) * 100 : null;
            return { key: r.materialname + r.plant, cells: [r.materialname, r.plantname, money(held(r)), money(n0(r.total_val)), <RagText key="p" v={p} r={rag(p, 'onHoldPct')} text={pct1(p)} />], onClick: () => onMaterial(r.materialname, r.plantname) };
          })}
      />
    </Section>
  );
}

// ── Entity sheets ──
function ClassBody({ cls, data }: { cls: string; data: DashboardData }) {
  const { push } = useDetail();
  const s = stock(merged(data, ['cover', 'bench', 'coverTotal']));
  const c = s.cls.find((x) => x.cls === cls);
  const sv = service(merged(data, ['aboveBelow', 'serviceAll']));
  const ci = ['A', 'B', 'C', 'N'].indexOf(cls);
  const sales = rowsFrom<SalesSummaryRow>(data, 'sales').find((r) => (r.classification || 'Others') === cls);
  const p = plan(merged(data, ['fam', 'daysgone', 'fay', 'cat0', 'cat1', 'ibl']), data.window);
  const att = p.cells.find((x) => x.month === p.currentMonth && x.cls === cls);
  const inv = rowsFrom<InventoryDaysRow>(data, 'invDays').filter((r) => (r.classification || 'Others') === cls);
  const cov = c ? K.classCoverage(c) : null;
  const excess = s.excessByClass.find((e) => e.cls === cls)?.value;
  return (
    <>
      <StatGrid>
        <Stat label="Cover days" value={days(c?.cd)} sub={`Benchmark ${days(c?.bm)} · threshold ${days(c?.th)}`} rag={rag(cov, 'coverage')} />
        <Stat label="Inventory (cost)" value={pkr(c?.invCost)} sub={`TP ${money(c?.invTp)} · ${money(c?.qty)} units`} />
        <Stat label="Excess (cost)" value={excess ? pkr(excess) : DASH} sub="Above benchmark" />
        <Stat label="Sales this period" value={pkr(num(sales?.amount ?? null))} sub={att && att.target > 0 ? `${pct1((att.amount / att.target) * 100)} of month target` : undefined} />
      </StatGrid>
      {ci >= 0 && (
        <Section title="Service by branch" hint="Share of this class's SKUs above threshold, worst first">
          <Rows
            head={['Branch', 'Service level']}
            rows={[...sv.matrix]
              .sort((a, b) => (a.cells[ci] ?? 0) - (b.cells[ci] ?? 0))
              .map((m) => ({ key: m.branch, cells: [m.branch, <RagText key="s" v={m.cells[ci]} r={rag(m.cells[ci], 'serviceLevel')} />], onClick: () => push({ kind: 'branch', branch: m.branch }) }))}
          />
        </Section>
      )}
      <Section title="SKUs" hint={inv.length ? 'Network cover, lowest first' : 'Opens once Inventory has loaded'}>
        <Rows
          head={['SKU', 'Cover (avg of branches)', 'Status']}
          rows={inv
            .slice()
            .sort((a, b) => n0(a.total) - n0(b.total))
            .map((r) => {
              const below = c?.th != null && n0(r.total) < c.th;
              return { key: r.item_desc, cells: [r.item_desc, days(n0(r.total)), below ? <RagText key="b" r="red" text="Below threshold" /> : <RagText key="o" r="green" text="OK" />], onClick: () => push({ kind: 'sku', sku: r.item_desc }) };
            })}
        />
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
        <Stat label="Service level (avg)" value={pct0(row?.avg)} rag={rag(row?.avg, 'serviceLevel')} sub="Simple average of classes" />
        {['A', 'B', 'C', 'N'].map((c, i) => (
          <Stat key={c} label={`Class ${c}`} value={pct0(row?.cells[i])} rag={rag(row?.cells[i], 'serviceLevel')} />
        ))}
      </StatGrid>
      {bi >= 0 && classRows.length > 0 && (
        <Section title="Cover days here, by class">
          <Rows head={['Class', 'Cover', 'Threshold']} rows={classRows.map((c) => ({ key: c.cls, cells: [c.cls === 'Others' ? 'Others' : `Class ${c.cls}`, days(c.vals[bi]), days(th(c.cls))], onClick: () => push({ kind: 'class', cls: c.cls }) }))} />
        </Section>
      )}
      <Section title="SKUs below threshold here" hint={inv.length ? `${risky.length} SKUs · 0 d means no stock in this branch` : 'Opens once Inventory has loaded'}>
        <Rows head={['SKU', 'Class', 'Cover here', 'Threshold']} rows={risky.map(({ r, v, t }) => ({ key: r.item_desc, cells: [r.item_desc, r.classification, <RagText key="v" r={v === 0 ? 'red' : 'amber'} text={v === 0 ? 'No stock' : days(v)} />, days(t)], onClick: () => push({ kind: 'sku', sku: r.item_desc }) }))} />
      </Section>
    </>
  );
}

function SkuBody({ sku, data }: { sku: string; data: DashboardData }) {
  const { push } = useDetail();
  const r = rowsFrom<InventoryDaysRow>(data, 'invDays').find((x) => x.item_desc === sku);
  const bench = rowsFrom<BenchmarkRow>(data, 'bench').find((x) => x.classification === r?.classification);
  const bm = num(bench?.days ?? null);
  const th = num(bench?.threshold ?? null);
  const disp = rowsFrom<DispatchVsOrderRow>(data, 'dispatch').filter((x) => x.material_name === sku);
  const f = K.fillRate(disp);
  const vals = r ? INV_BRANCHES.map((b) => ({ b: b.label, v: Number(r[b.key] ?? 0) })) : [];
  const max = Math.max(60, ...vals.map((x) => x.v), (bm ?? 0) * 1.4);
  return (
    <>
      <StatGrid>
        <Stat label="Class" value={r?.classification ?? DASH} />
        <Stat label="Cover (avg of branches)" value={days(num(r?.total ?? null))} rag={rag(bm && r ? (n0(r.total) / bm) * 100 : null, 'coverage')} />
        <Stat label="Branches below threshold" value={th != null ? vals.filter((x) => x.v < th).length : DASH} sub={`Threshold ${days(th)}`} />
        <Stat label="Fill rate" value={pct1(f.pct)} rag={rag(f.pct, 'fillRate')} sub={disp.length ? `${full(f.unfulfilled)} units short` : 'No orders in period'} />
      </StatGrid>
      <Section title="Cover by branch" hint="Bar = cover · tick = benchmark · red zone = below threshold">
        {vals.map((x) => (
          <Bullet key={x.b} label={x.b} actual={x.v} target={bm} threshold={th} max={max} color={clsColor(r?.classification ?? 'Others')} rag={th != null && x.v < th ? 'red' : null} right={x.v === 0 ? 'No stock' : days(x.v)} onClick={() => push({ kind: 'branch', branch: x.b })} />
        ))}
      </Section>
      {disp.length > 0 && (
        <Section title="Orders by channel">
          <Rows head={['Channel', 'Ordered', 'Delivered', 'Fill rate']} rows={disp.map((d) => ({ key: d.channel_type, cells: [d.channel_type, full(n0(d.total_order_qty)), full(n0(d.total_delivery_qty)), <RagText key="f" v={num(d.delivery_pct)} r={rag(num(d.delivery_pct), 'fillRate')} text={pct1(num(d.delivery_pct))} />], onClick: () => push({ kind: 'channel', channel: d.channel_type }) }))} />
        </Section>
      )}
    </>
  );
}

function ChannelBody({ channel, data }: { channel: string; data: DashboardData }) {
  const { push } = useDetail();
  const rows = rowsFrom<DispatchVsOrderRow>(data, 'dispatch').filter((r) => r.channel_type === channel);
  const f = K.fillRate(rows);
  const mats = rows
    .map((r) => ({ r, short: Math.max(0, n0(r.total_order_qty) - n0(r.total_delivery_qty)) }))
    .sort((a, b) => b.short - a.short);
  return (
    <>
      <StatGrid>
        <Stat label="Fill rate" value={pct1(f.pct)} rag={rag(f.pct, 'fillRate')} sub="By quantity" />
        <Stat label="Ordered" value={full(f.ordered)} sub="units" />
        <Stat label="Delivered" value={full(f.delivered)} sub="units" />
        <Stat label="Unfulfilled" value={full(f.unfulfilled)} sub={`${K.materialsBelow(rows).below} of ${K.materialsBelow(rows).total} materials below 90%`} />
      </StatGrid>
      <Section title="Materials, most unfulfilled first">
        <Rows head={['Material', 'Ordered', 'Delivered', 'Short', 'Fill rate']} rows={mats.map(({ r, short }) => ({ key: r.material_name, cells: [r.material_name, full(n0(r.total_order_qty)), full(n0(r.total_delivery_qty)), full(short), <RagText key="f" v={num(r.delivery_pct)} r={rag(num(r.delivery_pct), 'fillRate')} text={pct1(num(r.delivery_pct))} />], onClick: () => push({ kind: 'material', material: r.material_name }) }))} />
      </Section>
    </>
  );
}

function MaterialBody({ material, data }: { material: string; data: DashboardData }) {
  const { push } = useDetail();
  const rows = rowsFrom<DispatchVsOrderRow>(data, 'dispatch').filter((r) => r.material_name === material);
  const wip = rowsFrom<WipRow>(data, 'wip').filter((r) => r['Material Name'] === material);
  const f = K.fillRate(rows);
  const inInventory = rowsFrom<InventoryDaysRow>(data, 'invDays').some((r) => r.item_desc === material);
  return (
    <>
      <StatGrid>
        <Stat label="Fill rate" value={pct1(f.pct)} rag={rag(f.pct, 'fillRate')} />
        <Stat label="Ordered" value={full(f.ordered)} sub="units" />
        <Stat label="Unfulfilled" value={full(f.unfulfilled)} sub="units" />
        <Stat label="In production" value={wip.length} sub={`${money(wip.reduce((t, r) => t + n0(r['WIP Value']), 0))} WIP value`} />
      </StatGrid>
      <Section title="By channel">
        <Rows head={['Channel', 'Ordered', 'Delivered', 'Fill rate']} rows={rows.map((r) => ({ key: r.channel_type, cells: [r.channel_type, full(n0(r.total_order_qty)), full(n0(r.total_delivery_qty)), <RagText key="f" v={num(r.delivery_pct)} r={rag(num(r.delivery_pct), 'fillRate')} text={pct1(num(r.delivery_pct))} />], onClick: () => push({ kind: 'channel', channel: r.channel_type }) }))} />
      </Section>
      {wip.length > 0 && (
        <Section title="Production orders">
          <Rows head={['Order', 'Plant', 'Received', 'WIP value']} rows={wip.map((r) => ({ key: r.order_number, cells: [r.order_number, r.plnt_desc, `${full(n0(r.good_received_qty))} of ${full(n0(r.item_qty))}`, money(n0(r['WIP Value']))], onClick: () => push({ kind: 'order', order: r.order_number }) }))} />
        </Section>
      )}
      {inInventory && (
        <Box as="button" fontSize="13px" color={colors.brand} fontWeight={600} onClick={() => push({ kind: 'sku', sku: material })}>
          See stock cover for this SKU →
        </Box>
      )}
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
        <Stat label="Completion" value={pct1(c)} rag={rag(c, 'productionCompletion')} sub={`${full(n0(r.good_received_qty))} of ${full(n0(r.item_qty))} received`} />
        <Stat label="Still in production" value={full(n0(r.Quantity))} sub="units" />
        <Stat label="WIP value" value={pkr(n0(r['WIP Value']))} />
        <Stat label="Material type" value={<Text as="span" fontSize="14px">{r.material_type_description}</Text>} />
      </StatGrid>
      <Section title="Where">
        <Rows head={['Field', 'Value']} rows={[
          { key: 'm', cells: ['Material', r['Material Name']], onClick: () => push({ kind: 'material', material: r['Material Name'] }) },
          { key: 'p', cells: ['Plant', `${r.plnt_desc} (${r.plant})`] },
          { key: 's', cells: ['Storage location', `${r.storage_loc_desc} (${r.storage_loc})`] },
        ]} />
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
        <Stat label="Total value" value={pkr(total)} sub={`${full(n0(r.total_qty))} units`} />
        <Stat label="On hold" value={pct1(s.onHoldPct)} rag={rag(s.onHoldPct, 'onHoldPct')} sub={pkr(s.held)} />
        <Stat label="Usable now" value={pkr(n0(r.unrestricted_val))} sub={`${full(n0(r.unrestricted_qty))} units`} />
        <Stat label="Where" value={<Text as="span" fontSize="14px">{r.plantname}</Text>} sub={r.storagelocationname} />
      </StatGrid>
      <Section title="By stock state">
        {K.RMPM_STATES.map((st) => {
          const v = n0(r[st.key]);
          return (
            <Grid key={st.key} templateColumns="150px 1fr 90px" gap={3} alignItems="center" py="4px" fontSize="12.5px">
              <Text color={colors.darkText}>{st.label}</Text>
              <Box h="10px" bg={colors.sunkBg} borderRadius="3px" overflow="hidden">
                <Box h="100%" w={`${total > 0 ? (v / total) * 100 : 0}%`} bg={st.held ? colors.bad : colors.prior} />
              </Box>
              <Text textAlign="right" fontVariantNumeric="tabular-nums">
                {money(v)}
              </Text>
            </Grid>
          );
        })}
      </Section>
    </>
  );
}

function RdBody({ code, data }: { code: string; data: DashboardData }) {
  const { push } = useDetail();
  const all = rowsFrom<RdStatusRow>(data, 'rd');
  const r = all.find((x) => String(x.ibl_distributor_code) === code);
  if (!r) return <Text color={colors.mutedText}>This distributor is not in today’s list.</Text>;
  const up = K.uploaded(r);
  const peers = all.filter((x) => x.branch_desc === r.branch_desc && x !== r);
  const change = n0(r.last_stock_value) > 0 && up ? ((n0(r.stock_value) - n0(r.last_stock_value)) / n0(r.last_stock_value)) * 100 : null;
  return (
    <>
      <Text fontSize="14px" color={colors.bodyText} mb={3}>
        {r.distributor_desc} · {r.branch_desc} (branch {String(r.branch_code)})
      </Text>
      <StatGrid>
        <Stat label="Today" value={up ? 'Reported' : 'Not reported'} rag={up ? 'green' : rag(n0(r.day_diff), 'staleRdDays')} sub={up ? undefined : `${n0(r.day_diff)} days since last report`} />
        <Stat label="Current stock" value={up ? pkr(n0(r.stock_value)) : DASH} sub={up ? `${full(n0(r.stock_qty))} units` : 'No report today'} />
        <Stat label="Previous report" value={pkr(n0(r.last_stock_value))} sub={`${full(n0(r.last_stock_qty))} units · ${r.last_stock_date ?? DASH}`} />
        <Stat label="Change vs previous" value={change == null ? DASH : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`} />
      </StatGrid>
      <Section title={`Other distributors in ${r.branch_desc}`} hint={`${peers.filter(K.uploaded).length} of ${peers.length} reported today`}>
        <Rows head={['Distributor', 'Status', 'Days silent']} rows={peers.map((p) => ({ key: String(p.ibl_distributor_code), cells: [p.distributor_desc ?? DASH, K.uploaded(p) ? <RagText key="s" r="green" text="Reported" /> : <RagText key="s" r={rag(n0(p.day_diff), 'staleRdDays')} text="Not reported" />, String(n0(p.day_diff))], onClick: () => push({ kind: 'rd', code: String(p.ibl_distributor_code) }) }))} />
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
      case 'kpi':
        return item.action ? [{ label: item.action.label, icon: <FiArrowRight />, primary: true, run: () => (d.close(), item.action!.run()) }] : [];
      case 'class':
        return [filterAction('inventory', { key: 'cls', value: item.cls }, 'Filter Inventory to this class'), filterAction('revenue', { key: 'cls', value: item.cls }, 'Filter Revenue')];
      case 'branch':
        return [filterAction('inventory', { key: 'branch', value: item.branch }, 'Filter Inventory to this branch')];
      case 'channel':
        return [filterAction('fulfilment', { key: 'channel', value: item.channel }, 'Filter Fulfilment to this channel')];
      case 'material':
        return [filterAction('fulfilment', { key: 'material', value: item.material }, 'Filter Fulfilment to this material')];
      default:
        return [];
    }
  };

  const body = (item: DetailItem) => {
    switch (item.kind) {
      case 'kpi':
        return <KpiBody item={item} data={data} />;
      case 'class':
        return <ClassBody cls={item.cls} data={data} />;
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
      case 'rd':
        return <RdBody code={item.code} data={data} />;
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
