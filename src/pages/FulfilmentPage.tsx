// Tab 4: Dispatch & WIP. Since 19 Nov 2026 (user: follow supply chain 1.0, as Summary and
// Service Measure do) it keeps 1.0's layout — Dispatch Vs Order (OP-14) · WIP (OP-15) · RMPM
// (OP-16), side by side and as tall as the screen — in Sales Pulse 2.0's cards, with the
// highlight cards (2.0) on top. Drawn to be read at a glance: each table puts its problems
// first and colours them; the 2.0 charts are a second view of the card they belong to
// (fill rate by channel OP-03, WIP by plant OP-09, RMPM usability by plant OP-12).
// Every figure here follows the dates only: these sources have no division, class or branch.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { ChartCard } from '@/ui/chart-card';
import { RowBars } from '@/ui/row-bars';
import { Segmented } from '@/ui/segmented';
import { HighlightCard, HighlightGrid } from '@/ui/highlights';
import { MatrixTable } from '@/ui/matrix';
import { DetailTable, type DetailColumn } from '@/ui/detail-table';
import { useListFilter } from '@/ui/detail-table/useListFilter';
import { Overlay } from '@/ui/overlay';
import { SearchBar } from '@/components/search';
import { CardState } from '@/components/card-state';
import { colors } from '@/constants/theme';
import { n0, type DispatchVsOrderRow, type RpmRow, type WipRow } from '@/api/types';
import { rowsOf, type DashboardData } from '@/features/data';
import { fulfilment, production, status } from '@/features/derive';
import { fillByChannel, materialsBelow, rmpmByPlant, RMPM_STATES, wipByPlant } from '@/features/kpis';
import { kpiThresholds, rag, riskRules, type Rag } from '@/features/kpiThresholds';
import { DASH, change, full, money, pct1, pkr, units } from '@/features/format';
import { COMPARE_ON, compareText } from '@/features/period';
import { useDetail } from '@/features/detail';
import { useFitScreen } from '@/features/fit';

const INK: Record<Rag, string> = { green: colors.good, amber: colors.warn, red: colors.bad };
const ink = (r: Rag | null | undefined) => (r ? INK[r] : colors.bodyText);
const TYPE_COLORS = [colors.sales, colors.target, colors.prior, colors.accent, colors.borderStrong];
/** RMPM stock states: usable in calm hues, held stock in warning hues. */
const STATE_COLORS: Record<string, string> = {
  Unrestricted: colors.prior,
  'In Transit': colors.sales,
  'Quality Inspection': colors.warn,
  Blocked: colors.bad,
  Restricted: colors.target,
  Returns: colors.borderStrong,
};

export function FulfilmentPage({ data }: { data: DashboardData }) {
  const d = data.tabs.fulfilment;
  const detail = useDetail();
  const fit = useFitScreen();
  const cmpLabel = compareText(data.cmpWindow);

  const f = fulfilment(d);
  const p = production(d);
  const below = materialsBelow(f.rows);
  const dispatched = new Set(f.rows.map((r) => r.material_name));

  const sDispatch = status(d, 'dispatch');
  const sWip = status(d, 'wip');
  const sRpm = status(d, 'rpm');

  // Up or down against the comparison period, only while comparison is on (as Summary).
  const vs = (v: number | null, unit: '%' | 'pts' = '%') => (COMPARE_ON && v != null ? ` · ${v >= 0 ? '▲' : '▼'} ${unit === 'pts' ? `${Math.abs(v).toFixed(1)} pts` : pct1(Math.abs(v))} ${cmpLabel}` : '');

  const highlights = (
    <HighlightGrid isLoading={sDispatch.isLoading && sWip.isLoading && sRpm.isLoading}>
      <Box data-kpi="OP-01" minW={0}>
        <HighlightCard
          label="Order Fill Rate"
          tone={rag(f.pct, 'fillRate') === 'green' ? 'good' : 'bad'}
          name={`Target ${kpiThresholds.fillRate.green}% · By Quantity`}
          value={pct1(f.pct)}
          caption={`${full(f.delivered)} Of ${full(f.ordered)} Delivered${vs(f.pct != null && f.cmpPct != null ? f.pct - f.cmpPct : null, 'pts')}`}
        />
      </Box>
      <Box data-kpi="OP-02 OP-04" minW={0}>
        <HighlightCard
          label="Unfulfilled"
          tone="bad"
          name={`${below.below} Of ${below.total} Materials Below ${riskRules.materialFillBelow}%`}
          value={units(f.unfulfilled)}
          caption={`Ordered But Not Delivered${vs(change(f.unfulfilled, f.cmpUnfulfilled))}`}
        />
      </Box>
      <Box data-kpi="OP-07 OP-08" minW={0}>
        <HighlightCard
          label="Production Completion"
          tone={rag(p.w.completion, 'productionCompletion') === 'green' ? 'good' : 'bad'}
          name={`${full(p.w.openOrders)} Open Production Orders`}
          value={pct1(p.w.completion)}
          caption={`Received ÷ Item Quantity · Target ${kpiThresholds.productionCompletion.green}%`}
        />
      </Box>
      <Box data-kpi="OP-06" minW={0}>
        <HighlightCard label="WIP Value" tone="sales" name="Work In Progress, At Cost" value={pkr(p.w.value)} caption={`Across ${full(new Set(p.wip.map((r) => r.plnt_desc)).size)} Plants${vs(change(p.w.value, p.wCmp.value))}`} />
      </Box>
      <Box data-kpi="OP-10 OP-11" minW={0}>
        <HighlightCard
          label="Material On Hold"
          tone={rag(p.r.onHoldPct, 'onHoldPct') === 'green' ? 'good' : 'bad'}
          name={`RMPM ${pkr(p.r.total)} At Cost`}
          value={pct1(p.r.onHoldPct)}
          caption={`${pkr(p.r.held)} Blocked, In QI, Restricted Or Returned`}
        />
      </Box>
    </HighlightGrid>
  );

  return (
    <Flex direction="column" gap={3} h={fit ? '100%' : undefined} minH={0}>
      {highlights}
      {/* 1.0's three tables side by side, in its proportions (10 · 8 · 9 of 27). */}
      <Grid templateColumns={{ base: '1fr', lg: 'minmax(0, 10fr) minmax(0, 8fr) minmax(0, 9fr)' }} gap={3} flex={1} minH={fit ? 0 : '560px'}>
        <DispatchCard data={data} state={sDispatch} onMaterial={(m) => detail.open({ kind: 'material', material: m })} onChannel={(c) => detail.open({ kind: 'channel', channel: c })} />
        <WipCard rows={p.wip} state={sWip} hasDispatch={(m) => dispatched.has(m)} onMaterial={(m) => detail.open({ kind: 'material', material: m })} onPlant={(pl) => detail.open({ kind: 'wipPlant', plant: pl })} />
        <RmpmCard rows={p.rpm} state={sRpm} onMaterial={(m, plant) => detail.open({ kind: 'rmpm', material: m, plant })} onPlant={(pl) => detail.open({ kind: 'rmpmPlant', plant: pl })} />
      </Grid>
    </Flex>
  );
}

type State = ReturnType<typeof status>;

/**
 * OP-14, 1.0's Dispatch Vs Order: per material, ordered, delivered, what is still short and
 * the fill rate (delivered ÷ ordered, 0% when nothing went out). Most short first, so the
 * materials holding customers up lead; 1.0's channel filter is the switch in the header.
 * Its second view is the fill rate by channel (OP-03).
 */
function DispatchCard({ data, state, onMaterial, onChannel }: { data: DashboardData; state: State; onMaterial: (m: string) => void; onChannel: (c: string) => void }) {
  const d = data.tabs.fulfilment;
  const all = rowsOf<DispatchVsOrderRow>(d.dispatch);
  const [view, setView] = useState<'table' | 'channel'>('table');
  const [channel, setChannel] = useState('All');
  const channels = [...new Set(all.map((r) => r.channel_type).filter(Boolean))].sort();
  const rows = channel === 'All' ? all : all.filter((r) => r.channel_type === channel);

  const byMaterial = new Map<string, { ordered: number; delivered: number; channels: number }>();
  for (const r of rows) {
    const m = byMaterial.get(r.material_name) ?? { ordered: 0, delivered: 0, channels: 0 };
    m.ordered += n0(r.total_order_qty);
    m.delivered += n0(r.total_delivery_qty);
    m.channels += 1;
    byMaterial.set(r.material_name, m);
  }
  const fill = (o: number, dlv: number) => (o > 0 ? Math.max(0, (dlv / o) * 100) : null);
  const list = [...byMaterial.entries()]
    .map(([name, m]) => ({ name, ...m, short: Math.max(0, m.ordered - m.delivered), pct: fill(m.ordered, m.delivered) }))
    .sort((a, b) => b.short - a.short || (a.pct ?? 0) - (b.pct ?? 0));
  const tot = list.reduce((t, r) => ({ ordered: t.ordered + r.ordered, delivered: t.delivered + r.delivered, short: t.short + r.short }), { ordered: 0, delivered: 0, short: 0 });
  const totPct = fill(tot.ordered, tot.delivered);

  const cmpFill = new Map(fillByChannel(rowsOf<DispatchVsOrderRow>(d.dispatchCmp)).map((c) => [c.channel, c.pct]));
  // Worst fill first (fillByChannel's order).
  const channelData = fillByChannel(all).map((c) => ({ channel: c.channel, pct: c.pct ?? 0, ordered: c.ordered, delivered: c.delivered, prior: cmpFill.get(c.channel) ?? 0 }));

  return (
    <ChartCard
      dataKpi="OP-14 OP-03 OP-05"
      title="Dispatch vs order"
      colSpan={1}
      isLoading={state.isLoading}
      variant={view === 'table' ? 'table' : 'rows'}
      headerRight={
        <Flex gap={2} align="center" flexShrink={0}>
          {view === 'table' && channels.length > 1 && (
            <Segmented size="xs" ariaLabel="Channel" value={channel} onChange={setChannel} options={['All', ...channels].map((c) => ({ value: c, label: c }))} />
          )}
          <Segmented
            size="xs"
            ariaLabel="Dispatch view"
            value={view}
            onChange={setView}
            options={[
              { value: 'table' as const, label: 'Table' },
              { value: 'channel' as const, label: 'By Channel' },
            ]}
          />
        </Flex>
      }
    >
      {CardState({ ...state, empty: !all.length }) ??
        (view === 'table' ? (
          <MatrixTable
            nameHeader="Material"
            cols={[
              { key: 'o', label: 'Ordered' },
              { key: 'd', label: 'Delivered' },
              { key: 's', label: 'Short' },
              { key: 'p', label: 'Fill' },
            ]}
            total={[full(tot.ordered), full(tot.delivered), full(tot.short), totPct == null ? DASH : pct1(totPct)]}
            rows={list.map((r) => ({
              name: r.name,
              // A material opens its channel split only when it has one: in a single channel (or one-channel material) the row already says it all.
              opens: r.channels > 1,
              cells: [
                { text: full(r.ordered) },
                { text: full(r.delivered) },
                { text: r.short ? full(r.short) : '0', color: r.short ? colors.bad : undefined },
                { text: r.pct == null ? DASH : pct1(r.pct), color: ink(rag(r.pct, 'fillRate')) },
              ],
            }))}
            onRow={onMaterial}
          />
        ) : (
          // One row per channel, worst first: its fill rate as a bar on a 0–100% scale, coloured by status, the target as a tick.
          <RowBars
            fmt={full}
            targetLabel="ordered"
            status={(pct) => ink(rag(pct, 'fillRate'))}
            legend={[
              { label: 'Delivered', color: colors.sales },
              { label: 'Ordered', color: colors.target, shape: 'tick' },
            ]}
            rows={channelData.map((c) => ({
              key: c.channel,
              name: c.channel,
              parts: [{ value: c.delivered, color: colors.sales, label: 'Delivered' }],
              target: c.ordered,
            }))}
            onPick={onChannel}
          />
        ))}
    </ChartCard>
  );
}

/**
 * OP-15, 1.0's WIP: one row per production order — by default every order, or only those with nothing received
 * yet (1.0's "Pending GR") — with its WIP quantity and value, largest value
 * first. ⤢ opens 1.0's WIP Details: every column and its filters. The second view is WIP value
 * by plant and material type (OP-09).
 */
function WipCard({ rows, state, hasDispatch, onMaterial, onPlant }: { rows: WipRow[]; state: State; hasDispatch: (m: string) => boolean; onMaterial: (m: string) => void; onPlant: (p: string) => void }) {
  const [view, setView] = useState<'table' | 'plant'>('table');
  const [scope, setScope] = useState<'pending' | 'all'>('all');
  const [details, setDetails] = useState(false);
  const shown = (scope === 'pending' ? rows.filter((r) => n0(r.good_received_qty) === 0) : rows).slice().sort((a, b) => n0(b['WIP Value']) - n0(a['WIP Value']));
  const tot = shown.reduce((t, r) => ({ qty: t.qty + n0(r.Quantity), value: t.value + n0(r['WIP Value']) }), { qty: 0, value: 0 });
  const byPlant = wipByPlant(rows);
  const keyOf = (r: WipRow, i: number) => `${r.order_number}|${i}`;

  return (
    <ChartCard
      dataKpi="OP-15 OP-09"
      title="WIP"
      colSpan={1}
      isLoading={state.isLoading}
      variant={view === 'table' ? 'table' : 'rows'}
      onExpand={() => setDetails(true)}
      headerRight={
        <Flex gap={2} align="center" flexShrink={0}>
          {view === 'table' && (
            <Segmented
              size="xs"
              ariaLabel="Orders"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all' as const, label: 'All Orders' },
                { value: 'pending' as const, label: 'Pending GR' },
              ]}
            />
          )}
          <Segmented
            size="xs"
            ariaLabel="WIP view"
            value={view}
            onChange={setView}
            options={[
              { value: 'table' as const, label: 'Table' },
              { value: 'plant' as const, label: 'By Plant' },
            ]}
          />
        </Flex>
      }
    >
      {CardState({ ...state, empty: !rows.length || (view === 'table' && !shown.length), emptyText: scope === 'pending' && rows.length ? 'No order is waiting for its first goods receipt. See All orders.' : undefined }) ??
        (view === 'table' ? (
          <MatrixTable
            nameHeader="Material · Order"
            cols={[
              { key: 'q', label: 'WIP Qty' },
              { key: 'v', label: 'Value' },
            ]}
            total={[full(tot.qty), money(tot.value)]}
            rows={shown.map((r, i) => ({
              name: keyOf(r, i),
              label: <TwoLine top={r['Material Name']} sub={`Order ${r.order_number} · ${r.plnt_desc}`} />,
              cells: [{ text: full(n0(r.Quantity)) }, { text: money(n0(r['WIP Value'])), color: colors.darkText }],
              // Its material's sheet is its dispatch by channel: nothing to open without dispatch orders.
              opens: hasDispatch(r['Material Name']),
            }))}
            onRow={(k) => {
              const r = shown.find((x, i) => keyOf(x, i) === k);
              if (r) onMaterial(r['Material Name']);
            }}
          />
        ) : (
          // One row per plant, largest WIP first: a 100% bar split by material type (as RMPM's by stock state); its value beside the name.
          <RowBars
            fmt={money}
            legend={byPlant.types.map((t, i) => ({ label: t, color: TYPE_COLORS[i % TYPE_COLORS.length] }))}
            rows={[...byPlant.rows]
              .map((r) => ({ r, total: byPlant.types.reduce((t, ty) => t + Number(r[ty] ?? 0), 0) }))
              .sort((a, b) => b.total - a.total)
              .map(({ r, total }) => ({
                key: String(r.plant),
                name: String(r.plant),
                note: `${money(total)} · ${full(rows.filter((x) => x.plnt_desc === r.plant).length)} Orders`,
                parts: byPlant.types.map((t, i) => ({ value: Number(r[t] ?? 0), color: TYPE_COLORS[i % TYPE_COLORS.length], label: t })),
              }))}
            onPick={onPlant}
          />
        ))}
      {details && <WipDetails rows={rows} hasDispatch={hasDispatch} onClose={() => setDetails(false)} onMaterial={onMaterial} />}
    </ChartCard>
  );
}

/** A table name with a muted second line (an order and plant, a plant and storage location). */
function TwoLine({ top, sub }: { top: string; sub: string }) {
  return (
    <Flex as="span" direction="column" minW={0} lineHeight="1.25">
      <Text as="span" truncate title={top}>
        {top}
      </Text>
      <Text as="span" fontSize="11px" color={colors.mutedText} truncate title={sub}>
        {sub}
      </Text>
    </Flex>
  );
}

/** 1.0's WIP Details material types, always offered (1.0 lists them even when none is in WIP); any other type the data has follows. */
const WIP_TYPES = ['TSCL -  Toll-In Bulk', 'HOTC - Mfg Finished Goods', 'TSCL - Semi Finished', 'TSCL - Mfg Finished Goods', 'TSCL - Export FG'];

/** 1.0's WIP Details: every production order; its filters (material type, plant, storage location, WIP) in the search bar. */
function WipDetails({ rows, hasDispatch, onClose, onMaterial }: { rows: WipRow[]; hasDispatch: (m: string) => boolean; onClose: () => void; onMaterial: (m: string) => void }) {
  const { shown, values, setValues, searchFields } = useListFilter<WipRow>(rows, [
    { key: 'status', label: 'WIP', of: (r) => (n0(r.good_received_qty) === 0 ? 'pending' : 'received'), fixed: [{ value: 'pending', label: 'Pending GR' }, { value: 'received', label: 'Goods Received' }] },
    { key: 'type', label: 'Material Type', of: (r) => r.material_type_description, fixed: WIP_TYPES.map((t) => ({ value: t, label: t.replace(/\s+/g, ' ') })) },
    { key: 'plant', label: 'Plant', of: (r) => r.plnt_desc },
    { key: 'storage', label: 'Storage Location', of: (r) => r.storage_loc_desc },
    { key: 'material', label: 'Material', of: (r) => r['Material Name'] },
    { key: 'order', label: 'Order Number', of: (r) => String(r.order_number ?? '') },
  ]);
  const columns: DetailColumn<WipRow>[] = [
    { key: 'm', header: 'Material', kind: 'text', value: (r) => r['Material Name'] },
    { key: 't', header: 'Material Type', kind: 'text', value: (r) => r.material_type_description },
    { key: 'o', header: 'Order Number', kind: 'text', value: (r) => String(r.order_number ?? '') },
    { key: 'p', header: 'Plant', kind: 'text', value: (r) => r.plnt_desc },
    { key: 's', header: 'Storage Location', kind: 'text', value: (r) => r.storage_loc_desc },
    { key: 'i', header: 'Process Item Qty', kind: 'number', value: (r) => n0(r.item_qty) },
    { key: 'g', header: 'Good Received Qty', kind: 'number', value: (r) => n0(r.good_received_qty), color: (v) => (v === 0 ? colors.bad : undefined) },
    { key: 'q', header: 'Variance Qty', kind: 'number', value: (r) => n0(r.Quantity) },
    { key: 'v', header: 'WIP Value', kind: 'number', value: (r) => n0(r['WIP Value']) },
  ];
  return (
    <Overlay title="WIP Details" subtitle="Every production order in WIP · 0 received = pending goods receipt" onClose={onClose} width="min(1700px, 96vw)">
      <Box h="min(76vh, 820px)">
        <DetailTable
          rows={shown}
          total={rows.length}
          columns={columns}
          exportName="WIP Details"
          onRow={(r) => {
            onClose();
            onMaterial(r['Material Name']);
          }}
          rowOpens={(r) => hasDispatch(r['Material Name'])}
          toolbar={
            <Box flex="1 1 520px" maxW="760px" minW={0}>
              <SearchBar fields={searchFields} values={values} onChange={setValues} quickFilterKeys={['status', 'type']} placeholder="Search material, order, type, plant, storage location…" />
            </Box>
          }
        />
      </Box>
    </Overlay>
  );
}

/**
 * OP-16, 1.0's RMPM: one row per material at each plant and storage location, with its total
 * quantity and cost and how much is on hold (blocked, in QI, restricted or returned); 1.0's
 * All / PM / RM switch in the header; largest cost first. ⤢ opens 1.0's RMPM Details. The
 * second view is the stock state by plant (OP-12).
 */
function RmpmCard({ rows, state, onMaterial, onPlant }: { rows: RpmRow[]; state: State; onMaterial: (m: string, plant: string) => void; onPlant: (p: string) => void }) {
  const [view, setView] = useState<'table' | 'plant'>('table');
  const [type, setType] = useState<'All' | 'TPKG' | 'TRAW'>('All');
  const [details, setDetails] = useState(false);
  const held = (r: RpmRow) => n0(r.blocked_val) + n0(r.quality_inspection_val) + n0(r.restricted_val) + n0(r.returns_val);
  const shown = (type === 'All' ? rows : rows.filter((r) => r.producttype === type)).slice().sort((a, b) => n0(b.total_val) - n0(a.total_val));
  const tot = shown.reduce((t, r) => ({ qty: t.qty + n0(r.total_qty), value: t.value + n0(r.total_val), held: t.held + held(r) }), { qty: 0, value: 0, held: 0 });
  const holdPct = (h: number, v: number) => (v > 0 ? (h / v) * 100 : null);
  const plants = rmpmByPlant(rows);
  const keyOf = (r: RpmRow, i: number) => `${r.materialname}|${r.plant}|${r.storagelocation}|${i}`;

  return (
    <ChartCard
      dataKpi="OP-16 OP-12"
      title="RMPM"
      colSpan={1}
      isLoading={state.isLoading}
      variant={view === 'table' ? 'table' : 'rows'}
      onExpand={() => setDetails(true)}
      headerRight={
        <Flex gap={2} align="center" flexShrink={0}>
          {view === 'table' && (
            <Segmented
              size="xs"
              ariaLabel="Material type"
              value={type}
              onChange={setType}
              options={[
                { value: 'All' as const, label: 'All' },
                { value: 'TPKG' as const, label: 'PM' },
                { value: 'TRAW' as const, label: 'RM' },
              ]}
            />
          )}
          <Segmented
            size="xs"
            ariaLabel="RMPM view"
            value={view}
            onChange={setView}
            options={[
              { value: 'table' as const, label: 'Table' },
              { value: 'plant' as const, label: 'By Plant' },
            ]}
          />
        </Flex>
      }
    >
      {CardState({ ...state, empty: !rows.length }) ??
        (view === 'table' ? (
          <MatrixTable
            nameHeader="Material"
            cols={[
              { key: 'q', label: 'Total Qty' },
              { key: 'v', label: 'Total Cost' },
              { key: 'h', label: 'On Hold' },
            ]}
            total={[full(tot.qty), money(tot.value), pct1(holdPct(tot.held, tot.value))]}
            rows={shown.map((r, i) => {
              const h = holdPct(held(r), n0(r.total_val));
              return {
                name: keyOf(r, i),
                label: <TwoLine top={r.materialname} sub={`${r.plantname} · ${r.storagelocationname}`} />,
                cells: [{ text: full(n0(r.total_qty)) }, { text: money(n0(r.total_val)), color: colors.darkText }, { text: h ? pct1(h) : '0%', color: h ? ink(rag(h, 'onHoldPct')) : undefined }],
              };
            })}
            onRow={(k) => {
              const r = shown.find((x, i) => keyOf(x, i) === k);
              if (r) onMaterial(r.materialname, r.plantname);
            }}
          />
        ) : (
          // One row per plant, largest stock first: its stock as a 100% bar split by state; the value and share on hold beside its name.
          <RowBars
            fmt={money}
            legend={RMPM_STATES.map((st) => ({ label: st.label, color: STATE_COLORS[st.label] }))}
            rows={[...plants]
              .sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))
              .map((r) => {
                const total = Number(r.total ?? 0);
                const hold = RMPM_STATES.filter((st) => st.held).reduce((t, st) => t + Number(r[st.label] ?? 0), 0);
                return {
                  key: String(r.plant),
                  name: String(r.plant),
                  note: (
                    <>
                      {money(total)} ·{' '}
                      <Box as="span" color={ink(rag(hold, 'onHoldPct'))} fontWeight={700}>
                        {pct1(hold)} On Hold
                      </Box>
                    </>
                  ),
                  // rmpmByPlant gives each state as a share of the plant's value: back to value.
                  parts: RMPM_STATES.map((st) => ({ value: (Number(r[st.label] ?? 0) / 100) * total, color: STATE_COLORS[st.label], label: st.label })),
                };
              })}
            onPick={onPlant}
          />
        ))}
      {details && <RmpmDetails rows={rows} onClose={() => setDetails(false)} />}
    </ChartCard>
  );
}

/** 1.0's RMPM Details columns: each stock state in units (when it has a quantity) and in value. */
const RMPM_COLS: { label: string; qty: keyof RpmRow | null; val: keyof RpmRow | null }[] = [
  { label: 'Unrestricted', qty: 'unrestricted_qty', val: 'unrestricted_val' },
  { label: 'Restricted', qty: 'restricted_qty', val: 'restricted_val' },
  { label: 'Quality Inspection', qty: 'qualityinspection_qty', val: 'quality_inspection_val' },
  { label: 'Blocked', qty: 'blocked_qty', val: 'blocked_val' },
  { label: 'GR Blocked', qty: null, val: 'gr_blocked_val' },
  { label: 'Returns', qty: 'return_qty', val: 'returns_val' },
  { label: 'Stock In Transit', qty: 'stockintransit_qty', val: 'stock_in_transit_val' },
  { label: 'Stock Transfer Plant', qty: 'stocktransferplant_qty', val: 'stock_transfer_plant_val' },
  { label: 'Stock Transfer Stor. Loc.', qty: 'stocktransferstoragelocation_qty', val: null },
  { label: 'Storage Location', qty: null, val: 'storage_location_val' },
  { label: 'Tied Empties', qty: 'tiedempties_qty', val: 'tied_empties_val' },
  { label: 'Total', qty: 'total_qty', val: 'total_val' },
];
const HELD_LABELS = ['Restricted', 'Quality Inspection', 'Blocked', 'GR Blocked', 'Returns'];

/** 1.0's RMPM Details: Unit / Value as a switch; type (PM / RM), plant and storage location in the search bar. */
function RmpmDetails({ rows, onClose }: { rows: RpmRow[]; onClose: () => void }) {
  const [mode, setMode] = useState<'unit' | 'value'>('unit');
  const { shown, values, setValues, searchFields } = useListFilter<RpmRow>(rows, [
    { key: 'type', label: 'Type', of: (r) => r.producttype, fixed: [{ value: 'TPKG', label: 'PM' }, { value: 'TRAW', label: 'RM' }] },
    { key: 'plant', label: 'Plant', of: (r) => r.plantname },
    { key: 'storage', label: 'Storage Location', of: (r) => r.storagelocationname },
    { key: 'material', label: 'Material', of: (r) => r.materialname },
  ]);
  const columns: DetailColumn<RpmRow>[] = [
    { key: 'm', header: 'Material', kind: 'text', value: (r) => r.materialname },
    { key: 'p', header: 'Plant', kind: 'text', value: (r) => r.plantname },
    { key: 's', header: 'Storage Location', kind: 'text', value: (r) => r.storagelocationname },
    ...RMPM_COLS.flatMap((c): DetailColumn<RpmRow>[] => {
      const field = mode === 'unit' ? c.qty : c.val;
      if (!field) return [];
      return [
        {
          key: c.label,
          header: c.label,
          kind: 'number',
          value: (r) => n0(r[field] as never),
          // Stock that cannot be used shows in amber when there is any.
          color: (v) => (HELD_LABELS.includes(c.label) && v > 0 ? colors.warn : c.label === 'Total' ? colors.darkText : undefined),
        },
      ];
    }),
  ];
  return (
    <Overlay title="RMPM Details" subtitle={`Raw and packing material by stock state · in ${mode === 'unit' ? 'units' : 'value at cost'}`} onClose={onClose} width="min(1800px, 97vw)">
      <Box h="min(76vh, 820px)">
        <DetailTable
          rows={shown}
          total={rows.length}
          columns={columns}
          exportName="RMPM Details"
          toolbar={
            <Flex flex="1 1 620px" maxW="860px" minW={0} gap={3} align="center">
              <Segmented
                size="xs"
                ariaLabel="Units or value"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'unit' as const, label: 'Unit' },
                  { value: 'value' as const, label: 'Value' },
                ]}
              />
              <Box flex={1} minW={0}>
                <SearchBar fields={searchFields} values={values} onChange={setValues} quickFilterKeys={['type']} placeholder="Search material, type, plant, storage location…" />
              </Box>
            </Flex>
          }
        />
      </Box>
    </Overlay>
  );
}
