// Tab 5: RD Data Status, in Sales Pulse 2.0's pattern (rebuilt 19 Nov 2026, user request
// "follow the DSR pattern"): highlight cards on top, then — by the Graph / List switch in the
// filter bar — 1.0's RD Data Status table (DH-14) as Sales Pulse's grouped distributor list
// (as its RD tab), or the charts: reporting age, compliance by branch, data trust, chronic
// non-reporters and stock in hand. On a desktop the tab fills the screen.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { ChartCard } from '@/ui/chart-card';
import { BarChart } from '@/ui/charts';
import { HighlightCard, HighlightGrid } from '@/ui/highlights';
import { FigureCell, GroupedTable, type FigureColumn, type GroupNode, type LevelDef, type Sums } from '@/ui/national';
import { MatrixTable } from '@/ui/matrix';
import { CardState } from '@/components/card-state';
import { colors } from '@/constants/theme';
import { n0, type RdStatusRow } from '@/api/types';
import type { DashboardData } from '@/features/data';
import { distribution, status, trust } from '@/features/derive';
import { chronicNonReporters, rdAgeBuckets, rdComplianceByBranch, uploaded } from '@/features/kpis';
import { kpiThresholds, rag, riskRules, type Rag } from '@/features/kpiThresholds';
import { DASH, full, pct1, pkr } from '@/features/format';
import { useFitScreen } from '@/features/fit';
import { useTabView } from '@/features/views';
import { geoOf, type Geo } from '@/features/geo';

const INK: Record<Rag, string> = { green: colors.good, amber: colors.warn, red: colors.bad };
const ink = (r: Rag | null | undefined) => (r ? INK[r] : colors.bodyText);
const AGE_COLOR = (min: number) => (min <= 1 ? colors.good : min <= 3 ? colors.warn : colors.bad);
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : DASH;

export function DistributionPage({ data }: { data: DashboardData }) {
  const d = data.tabs.distribution;
  const fit = useFitScreen();
  const view = useTabView('distribution');
  const rd = distribution(d);
  const t = trust(d);
  const sRd = status(d, 'rd');
  const sTrust = status(d, 'closing', 'fam', 'fay', 'bench', 'sales');

  // 1.0's figures (user, 23 Nov 2026) in Sales Pulse 2.0's cards: current, previous and total
  // stock in hand, each as units, value, share of the units and the RDs behind it, then
  // today's reporting and how fresh the warehouse stock is.
  const UNITS = { text: 'Units', color: colors.target };
  const VALUE = { text: 'Value', color: colors.accent };
  const plural = (n: number, one: string) => `${full(n)} ${one}${n === 1 ? '' : 's'}`;
  const highlights = (
    <HighlightGrid isLoading={sRd.isLoading}>
      <Box data-kpi="DH-11" minW={0}>
        <HighlightCard
          label="Current Stock In Hand"
          tone="sales"
          nameTag={UNITS}
          name={full(rd.current.qty)}
          valueTag={VALUE}
          value={full(rd.current.value)}
          caption={`${pct1(rd.current.qtyShare)} Of Total · ${plural(rd.reporting, 'RD')} Uploaded`}
        />
      </Box>
      <Box data-kpi="DH-12" minW={0}>
        <HighlightCard
          label="Previous Stock In Hand"
          tone="bad"
          nameTag={UNITS}
          name={full(rd.previous.qty)}
          valueTag={VALUE}
          value={full(rd.previous.value)}
          caption={`${pct1(rd.previous.qtyShare)} Of Total · ${plural(rd.older, 'RD')} On An Older Upload`}
        />
      </Box>
      <Box data-kpi="DH-13" minW={0}>
        <HighlightCard
          label="Total Stock In Hand"
          tone="target"
          nameTag={UNITS}
          name={full(rd.total.qty)}
          valueTag={VALUE}
          value={full(rd.total.value)}
          caption={`Current + Previous · ${plural(rd.count, 'Distributor')}`}
        />
      </Box>
      <Box data-kpi="DH-01" minW={0}>
        <HighlightCard
          label="Reported Today"
          tone={rag(rd.compliance, 'rdCompliance') === 'green' ? 'good' : 'bad'}
          name={`${full(rd.reporting)} Of ${full(rd.count)} RDs`}
          value={pct1(rd.compliance)}
          caption={`Target ${kpiThresholds.rdCompliance.green}%`}
        />
      </Box>
      <Box data-kpi="DH-07" minW={0}>
        <HighlightCard
          label="Data Freshness"
          tone={rag(t.freshness, 'freshnessDays') === 'green' ? 'good' : 'bad'}
          name={fmtDate(t.closing)}
          value={t.freshness == null ? DASH : `${t.freshness} Day${t.freshness === 1 ? '' : 's'} Old`}
          caption="Warehouse Closing Stock"
        />
      </Box>
    </HighlightGrid>
  );

  return (
    <Flex direction="column" gap={3} h={fit ? '100%' : undefined} minH={0}>
      {highlights}
      <Box flex={1} minH={fit ? 0 : '560px'}>
        {view === 'list' ? (
          <RdList rows={rd.rows} where={geoOf(data)} loading={sRd.isLoading} />
        ) : (
          <RdCharts rd={rd} t={t} states={{ rd: sRd, trust: sTrust }} />
        )}
      </Box>
    </Flex>
  );
}

// ── List: 1.0's RD Data Status columns, in Sales Pulse 2.0's grouped table ──

type RdRow = RdStatusRow & Geo & { status: string };

const RD_LEVELS: Record<string, LevelDef<RdRow>> = {
  zone: { label: 'Zone', key: (r) => r.zone },
  region: { label: 'Region', key: (r) => r.region },
  branch: { label: 'Branch', key: (r) => String(r.branch_code ?? '') || r.branch_desc || 'Others', name: (r) => r.branch_desc || 'Others' },
  status: { label: 'Upload Status', key: (r) => r.status },
  // The RD's code is its own column (as 1.0), not beside the name.
  rd: { label: 'RD Name', key: (r) => String(r.ibl_distributor_code ?? ''), name: (r) => r.distributor_desc || 'Others' },
};

/** A text cell of the table (codes, names, dates): left of the figures, never added up. */
const TextCell = ({ children, bold }: { children: ReactNode; bold?: boolean }) => (
  <Text fontSize="13px" textAlign="center" whiteSpace="nowrap" color={colors.bodyText} fontWeight={bold ? 700 : 400} truncate>
    {children}
  </Text>
);

/**
 * 1.0's RD Data Status, with its ten columns in its order — RD Name, RD Code, Branch Name, Branch
 * Code, Current Stock in Hand Units and Value, Previous Stock Date, Units and Value, Days
 * Difference — in Sales Pulse 2.0's grouped table: Zone › Region › Branch › Distributor by default (as Sales
 * Pulse), by upload status, or one row per RD as 1.0. Find searches names and codes (1.0's code and name filters);
 * an RD that did not upload shows its previous stock in red and "—" for current, as 1.0.
 */
function RdList({ rows, where, loading }: { rows: RdStatusRow[]; where: (branch: string) => Geo; loading: boolean }) {
  const list: RdRow[] = rows.map((r) => ({ ...r, ...where(r.branch_desc ?? ''), status: uploaded(r) ? 'Uploaded' : 'Not Uploaded' }));
  const byCode = new Map(list.map((r) => [String(r.ibl_distributor_code ?? ''), r]));
  const rdOf = (node?: GroupNode) => (node?.level === 'rd' ? byCode.get(node.id.split('rd:').pop() ?? '') : undefined);
  const dash = (v: number) => (v ? full(v) : '—');
  // levels: the rows the column describes; zones and regions do not carry an RD's code or date.
  const textCol = (key: string, header: string, width: string, levels: string[], text: (r: RdRow | undefined, node?: GroupNode) => string): FigureColumn => ({
    key,
    header,
    width,
    levels,
    render: (_t, _all, bold, node) => <TextCell bold={bold}>{node ? text(rdOf(node), node) : ''}</TextCell>,
  });
  const numCol = (key: string, header: string, show: (t: Sums) => string, color?: (t: Sums, node?: GroupNode) => string | undefined): FigureColumn => ({
    key,
    header,
    width: 'minmax(110px, 1fr)',
    render: (t, _all, bold, node) => (
      <FigureCell bold={bold} color={color?.(t, node)}>
        {show(t)}
      </FigureCell>
    ),
  });
  // An RD with nothing uploaded today: its previous stock is what is known, in red (1.0).
  const staleInk = (t: Sums, node?: GroupNode) => (node?.level === 'rd' && !t.cq ? colors.bad : undefined);

  return (
    <GroupedTable<RdRow>
      title="RD Data Status"
      rows={list}
      isLoading={loading}
      levels={RD_LEVELS}
      wide
      // Branches under their zone and region, as Sales Pulse 2.0 describes them; the flat list is 1.0's.
      presets={[
        { value: 'geo', label: 'Zone › Region › Branch › Distributor', levels: ['zone', 'region', 'branch', 'rd'] },
        { value: 'status', label: 'Upload Status › Zone › Region › Branch › Distributor', levels: ['status', 'zone', 'region', 'branch', 'rd'] },
        { value: 'rd', label: 'Distributor', levels: ['rd'] },
      ]}
      searchPlaceholder="Find RD or branch, name or code…"
      sums={(r) => ({ rds: 1, cq: n0(r.stock_qty), cv: n0(r.stock_value), pq: n0(r.last_stock_qty), pv: n0(r.last_stock_value), days: n0(r.day_diff) })}
      columns={[
        textCol('code', 'RD Code', 'minmax(110px, .8fr)', ['rd'], (r) => (r ? String(r.ibl_distributor_code ?? '') : '')),
        textCol('bname', 'Branch Name', 'minmax(130px, 1fr)', ['rd'], (r, node) => (r ? r.branch_desc ?? '—' : node?.level === 'branch' ? node.name : '')),
        textCol('bcode', 'Branch Code', 'minmax(100px, .7fr)', ['branch', 'rd'], (r, node) => (r ? String(r.branch_code ?? '') : node?.level === 'branch' ? (node.id.split('branch:').pop() ?? '').split('/')[0] : '')),
        numCol('cq', 'Current Stock In Hand Units', (t) => dash(t.cq ?? 0)),
        numCol('cv', 'Current Stock In Hand Value', (t) => dash(t.cv ?? 0)),
        textCol('pdate', 'Previous Stock Date', 'minmax(120px, .9fr)', ['rd'], (r) => (r?.last_stock_date ? r.last_stock_date.slice(0, 10) : '')),
        numCol('pq', 'Previous Stock Units', (t) => dash(t.pq ?? 0), staleInk),
        numCol('pv', 'Previous Stock Value', (t) => dash(t.pv ?? 0), staleInk),
        // Days belong to one RD: a group or the Total shows none.
        {
          key: 'days',
          header: 'Days Difference',
          width: 'minmax(110px, 1fr)',
          levels: ['rd'],
          render: (t, _all, bold, node) => (
            <FigureCell bold={bold} color={node?.level === 'rd' ? ink(rag(t.days ?? 0, 'staleRdDays')) : undefined}>
              {node?.level === 'rd' ? String(t.days ?? 0) : ''}
            </FigureCell>
          ),
        },
      ]}
      exportName="RD Data Status"
      exportRow={(r) => ({
        'RD Name': r.distributor_desc ?? '',
        'RD Code': String(r.ibl_distributor_code ?? ''),
        'Branch Name': r.branch_desc ?? '',
        'Branch Code': String(r.branch_code ?? ''),
        'Current Stock in Hand Units': n0(r.stock_qty),
        'Current Stock in Hand Value': n0(r.stock_value),
        'Previous Stock Date': r.last_stock_date ?? '',
        'Previous Stock Units': n0(r.last_stock_qty),
        'Previous Stock Value': n0(r.last_stock_value),
        'Days Difference': n0(r.day_diff),
      })}
    />
  );
}

// ── Graph ──────────────────────────────────────────────────────────────────

type State = ReturnType<typeof status>;

function RdCharts({ rd, t, states }: { rd: ReturnType<typeof distribution>; t: ReturnType<typeof trust>; states: Record<'rd' | 'trust', State> }) {
  const empty = !states.rd.isLoading && !states.rd.locked && !states.rd.error && rd.rows.length === 0;
  const ages = rdAgeBuckets(rd.rows);
  const byBranch = rdComplianceByBranch(rd.rows);
  const chronic = chronicNonReporters(rd.rows);
  const versions = [...new Set(t.bench.map((b) => b.effective_date).filter(Boolean))];

  return (
    <Grid templateColumns={{ base: '1fr', lg: 'repeat(12, minmax(0, 1fr))' }} templateRows={{ lg: 'repeat(2, minmax(0, 1fr))' }} gap={3} h={{ lg: '100%' }} minH={0}>
      {/* DH-04 */}
      <ChartCard dataKpi="DH-04" title="RD reporting age" colSpan={{ base: 12, lg: 4 }} isLoading={states.rd.isLoading} variant="rows">
        {CardState({ ...states.rd, empty }) ?? (
          <BarChart
            data={ages.map((a) => ({ bucket: a.bucket, count: a.count, min: a.min }))}
            xKey="bucket"
            // One bar per age, top to bottom from today to oldest.
            orientation="horizontal"
            keepOrder
            bars={[{ key: 'count', label: 'Distributors', color: colors.sales, cellColor: (e) => AGE_COLOR(Number(e.min)) }]}
            labelFormatter={(v) => full(v)}
            showLabels
            height="100%"
          />
        )}
      </ChartCard>

      {/* DH-05 */}
      <ChartCard dataKpi="DH-05" title="Compliance by branch" colSpan={{ base: 12, lg: 4 }} isLoading={states.rd.isLoading} variant="rows">
        {CardState({ ...states.rd, empty }) ?? (
          <BarChart
            data={byBranch.map((b) => ({ branch: b.branch, pct: b.pct }))}
            xKey="branch"
            orientation="horizontal"
            rankAscending
            topN={byBranch.length}
            bars={[{ key: 'pct', label: 'Reported today', color: colors.sales, cellColor: (e) => ink(rag(Number(e.pct), 'rdCompliance')) }]}
            referenceValue={kpiThresholds.rdCompliance.green}
            referenceLabel={`Target ${kpiThresholds.rdCompliance.green}%`}
            labelFormatter={(v) => pct1(v)}
            showLabels
            height="100%"
          />
        )}
      </ChartCard>

      {/* DH-07 … DH-10 */}
      <ChartCard dataKpi="DH-07 DH-08 DH-09 DH-10" title="Data trust" colSpan={{ base: 12, lg: 4 }} isLoading={states.trust.isLoading} variant="table">
        {CardState({ ...states.trust }) ?? (
          <MatrixTable
            nameHeader="Check"
            cols={[
              { key: 'v', label: 'Value' },
              { key: 's', label: 'Status' },
            ]}
            rows={[
              {
                name: 'Data Freshness',
                cells: [{ text: t.freshness == null ? DASH : `${t.freshness} Day${t.freshness === 1 ? '' : 's'} Old` }, { text: rag(t.freshness, 'freshnessDays') === 'green' ? 'On Track' : 'Stale', color: ink(rag(t.freshness, 'freshnessDays')) }],
              },
              ...t.checks.map((c) => ({ name: c.label, cells: [{ text: c.ok ? 'Loaded' : 'Missing' }, { text: c.ok ? '✓' : '✕', color: c.ok ? colors.good : colors.bad }] })),
              { name: 'Unclassified Sales Share', cells: [{ text: pct1(t.unclassified) }, { text: rag(t.unclassified, 'unclassifiedPct') === 'green' ? 'On Track' : 'Check', color: ink(rag(t.unclassified, 'unclassifiedPct')) }] },
              {
                name: 'Benchmark Version In Force',
                cells: [{ text: versions.length === 0 ? DASH : versions.length === 1 ? `From ${fmtDate(versions[0])}` : `${versions.length} Versions` }, { text: versions.length ? '✓' : '✕', color: versions.length ? colors.good : colors.bad }],
              },
            ]}
          />
        )}
      </ChartCard>

      {/* DH-06: every RD silent longer than the rule, largest last stock first. */}
      <ChartCard dataKpi="DH-06" title={`Chronic non-reporters · silent over ${riskRules.chronicRdDays} days`} colSpan={{ base: 12, lg: 8 }} isLoading={states.rd.isLoading} variant="table">
        {CardState({ ...states.rd, empty, ...(chronic.length ? {} : { empty: true, emptyText: `No distributor has been silent for more than ${riskRules.chronicRdDays} days.` }) }) ?? (
          <MatrixTable
            nameHeader="Distributor"
            cols={[
              { key: 'b', label: 'Branch' },
              { key: 'd', label: 'Days Silent' },
              { key: 'v', label: 'Last Stock Value' },
              { key: 't', label: 'Last Report' },
            ]}
            rows={chronic.map((r) => ({
              name: String(r.ibl_distributor_code ?? ''),
              label: r.distributor_desc ?? DASH,
              cells: [{ text: r.branch_desc ?? DASH }, { text: String(n0(r.day_diff)), color: colors.bad }, { text: full(n0(r.last_stock_value)) }, { text: fmtDate(r.last_stock_date) }],
            }))}
          />
        )}
      </ChartCard>

      {/* DH-11 … DH-13 */}
      <ChartCard dataKpi="DH-11 DH-12 DH-13" title="Stock in hand" colSpan={{ base: 12, lg: 4 }} isLoading={states.rd.isLoading} variant="table">
        {CardState({ ...states.rd, empty }) ?? (
          <MatrixTable
            nameHeader="Stock"
            cols={[
              { key: 'q', label: 'Units' },
              { key: 'v', label: 'Value' },
              { key: 's', label: 'Share' },
            ]}
            rows={[
              { name: 'Current', label: 'Current (Reported Today)', cells: [{ text: full(rd.current.qty) }, { text: pkr(rd.current.value) }, { text: pct1(rd.current.share) }] },
              { name: 'Previous', label: 'Previous (Older Reports)', cells: [{ text: full(rd.previous.qty) }, { text: pkr(rd.previous.value) }, { text: pct1(rd.previous.share) }] },
            ]}
            total={[full(rd.total.qty), pkr(rd.total.value), '100%']}
          />
        )}
      </ChartCard>
    </Grid>
  );
}
