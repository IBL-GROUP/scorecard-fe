// Tab 4: Fulfilment & Operations (PRD v2 section 4.4, wireframe 5.2).
// Are we delivering what customers order, is production flowing, and is
// material usable? OP-01 … OP-16.

import { Box, Flex, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExecTile } from '@/v2/components/exec/ExecTile';
import { CardGrid, CardState, ChipBar, DATES_ONLY, OperationalDetail, ViewDetails, openDetail } from '@/v2/components/exec/Panels';
import { AreaLayout } from '@/v2/components/exec/AreaLayout';
import { AreaRisks } from './OverviewPage';
import { axis, grid, Legend, ragLegend, tooltipStyle } from '@/v2/components/exec/charts';
import { RAG_META } from '@/v2/components/exec/Rag';
import { ChartCard } from '@/v2/components/chart-card';
import { Segmented } from '@/v2/components/segmented';
import { colors } from '@/v2/constants/theme';
import { n0, type DispatchVsOrderRow, type RpmRow, type WipRow } from '@/v2/api/types';
import { rowsOf, type DashboardData } from '@/v2/features/data';
import { fulfilment, production, service, status } from '@/v2/features/derive';
import { fillByChannel, fillRate, materialsBelow, paretoUnfulfilled, rmpmByPlant, RMPM_STATES, wipByPlant } from '@/v2/features/kpis';
import { kpiThresholds, rag } from '@/v2/features/kpiThresholds';
import { change, full, money, pct0, pct1, pkr, units } from '@/v2/features/format';
import { useStore } from '@/v2/features/store';
import { compareText, periodTag } from '@/v2/features/period';
import { HBars } from '@/v2/components/exec/HBars';
import { GroupedTable } from '@/v2/components/grouped-table/GroupedTable';

const TYPE_COLORS = [colors.sales, colors.target, colors.prior, colors.accent, colors.borderStrong];
const STATE_COLORS: Record<string, string> = {
  Unrestricted: colors.sunkBg,
  'In transit': colors.prior,
  'Quality inspection': colors.warn,
  Blocked: colors.bad,
  Restricted: colors.warnSoft,
  Returns: colors.badSoft,
};

/** A filter for the re-created 1.0 dialog filters (design-system Select). */
function Picker({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Box minW="180px">
      <Select label={label} value={value} onChange={onChange} options={['All', ...options].map((o) => ({ value: o, label: o }))} aria-label={label} />
    </Box>
  );
}

import { useDetail } from '@/v2/features/detail';
import { Select } from '@/v2/components/select';

export function FulfilmentPage({ data }: { data: DashboardData }) {
  const d = data.tabs.fulfilment;
  const st = useStore();
  const detail = useDetail();
  const chip = st.chips.fulfilment;
  const cmpLabel = compareText(data.cmpWindow);

  const f = fulfilment(d);
  const p = production(d);
  const svc = service(d, st.filters.classification);
  const below = materialsBelow(f.rows);
  const pareto = paretoUnfulfilled(f.rows);
  const byPlant = wipByPlant(p.wip);
  const rmpmPlants = rmpmByPlant(p.rpm);

  const sDispatch = status(d, 'dispatch');
  const sDispatchCmp = status(d, 'dispatch', 'dispatchCmp');
  const sWip = status(d, 'wip');
  const sRpm = status(d, 'rpm');

  // OP-14 rows honour the channel / material chips (rule F4).
  const dispatchRows = f.rows.filter(
    (r) => !chip || (chip.key === 'channel' ? r.channel_type === chip.value : chip.key === 'material' ? r.material_name === chip.value : true),
  );

  // 1.0 dialog filters, re-created above the tables.
  const [wipPlant, setWipPlant] = useState('All');
  const [wipType, setWipType] = useState('All');
  const [rmPlant, setRmPlant] = useState('All');
  const wipPlants = useMemo(() => [...new Set(p.wip.map((r) => r.plnt_desc))].sort(), [p.wip]);
  const wipTypes = useMemo(() => [...new Set(p.wip.map((r) => r.material_type_description))].sort(), [p.wip]);
  const rmPlants = useMemo(() => [...new Set(p.rpm.map((r) => r.plantname))].sort(), [p.rpm]);
  const wipRows = p.wip.filter((r) => (wipPlant === 'All' || r.plnt_desc === wipPlant) && (wipType === 'All' || r.material_type_description === wipType));
  const rmRows = p.rpm.filter((r) => rmPlant === 'All' || r.plantname === rmPlant);

  // B period fill rate per channel, for the lighter bar (FR-EXEC-045).
  const cmpFill = new Map(fillByChannel(rowsOf<DispatchVsOrderRow>(d.dispatchCmp)).map((c) => [c.channel, c.pct]));
  const channelData = f.channels.map((c) => ({ channel: c.channel, pct: c.pct == null ? 0 : Math.round(c.pct * 10) / 10, rag: rag(c.pct, 'fillRate') }));
  const fillRag = rag(f.pct, 'fillRate');
  const holdRag = rag(p.r.onHoldPct, 'onHoldPct');

  return (
    <AreaLayout
      top={<ChipBar tab="fulfilment" />}
      topics={[
        {
          key: 'orders',
          title: 'Orders',
          tiles: [
            <ExecTile key="OP-01"
              id="OP-01"
              label="Order Fill Rate"
              value={pct1(f.pct)}
              rag={fillRag}
              band="fillRate"
              variance="Target ≥ 95% · by quantity"
              delta={{ value: f.pct != null && f.cmpPct != null ? f.pct - f.cmpPct : null, unit: 'pts', label: cmpLabel }}
              {...sDispatchCmp}
            />,
            <ExecTile key="OP-02"
              id="OP-02"
              label="Unfulfilled Quantity"
              value={units(f.unfulfilled)}
              caption={`${full(f.ordered)} ordered · ${full(f.delivered)} delivered`}
              delta={{ value: change(f.unfulfilled, f.cmpUnfulfilled), label: cmpLabel, upIsGood: false }}
              {...sDispatchCmp}
            />,
            <ExecTile key="OP-04"
              id="OP-04"
              label="Materials Below Fill Target"
              value={`${below.below} of ${below.total}`}
              valueSuffix="materials"
              caption="Delivery below 90%"
              {...sDispatch}
            />,
          ],
          lead: (
            <ChartCard
              dataKpi="OP-03"
              title="Fill Rate by Channel"
              subtitle="Delivered ÷ ordered quantity · target 95% · click a bar to filter"
              colSpan={{ base: 1, lg: 5 }}
              height="300px"
              isLoading={sDispatch.isLoading}
              headerRight={<ViewDetails detailId="dispatch" />}
            >
              {CardState({ ...sDispatch, empty: !channelData.length }) ?? (
                <HBars
                  rows={channelData.map((c) => ({
                    key: c.channel,
                    label: c.channel,
                    value: c.pct,
                    prior: cmpFill.get(c.channel) ?? null,
                    target: kpiThresholds.fillRate.green,
                    color: c.rag ? RAG_META[c.rag].color : colors.sales,
                    valueText: `${c.pct}%`,
                    priorText: cmpFill.get(c.channel) == null ? '—' : `${Math.round((cmpFill.get(c.channel) as number) * 10) / 10}%`,
                    note: `${kpiThresholds.fillRate.green}% target`,
                    onClick: () => detail.open({ kind: 'channel', channel: c.channel }),
                  }))}
                  fmt={(n) => `${n}%`}
                  max={100}
                  legend={[...ragLegend('fillRate', { shape: 'bar', what: 'fill rate' }), { label: `B · ${periodTag(data.cmpWindow)}`, color: colors.prior }, { label: `Target ${kpiThresholds.fillRate.green}%`, color: colors.target, shape: 'tick' }]}
                />
              )}
            </ChartCard>
          ),
          details: (
            <>
              <CardGrid mb={3}>
                <ChartCard
                  dataKpi="OP-05"
                  title="Top 10 Unfulfilled Materials"
                  subtitle="Unfulfilled quantity and cumulative share · click a bar to see its orders in Dispatch Vs Order"
                  colSpan={12}
                  height="300px"
                  isLoading={sDispatch.isLoading}
                  headerRight={<ViewDetails detailId="dispatch" />}
                >
                  {CardState({ ...sDispatch, empty: !pareto.length }) ?? (
                    <Flex direction="column" h="100%">
                    <Box flex={1} minH={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={pareto} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                        <CartesianGrid {...grid} vertical={false} />
                        <XAxis dataKey="material" {...axis} interval={0} tick={{ fontSize: 10 }} tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)} />
                        <YAxis yAxisId="q" {...axis} tickFormatter={(v: number) => money(v)} />
                        <YAxis yAxisId="c" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow {...axis} tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip
                          {...tooltipStyle}
                          formatter={(v, name) => (name === 'cumPct' ? [pct0(Number(v)), 'Cumulative share'] : [full(Number(v)), 'Unfulfilled units'])}
                        />
                        <Bar
                          yAxisId="q"
                          dataKey="qty"
                          fill={colors.sales}
                          radius={[3, 3, 0, 0]}
                          cursor="pointer"
                          onClick={(e: unknown) => {
                            const m = (e as { payload?: { material?: string } }).payload?.material;
                            if (!m) return;
                            // TC-S4-12: filter the Dispatch Vs Order table to this material and open it.
                            st.setChip('fulfilment', { key: 'material', value: m });
                            openDetail('dispatch', st.setZone4);
                          }}
                        />
                        <Line yAxisId="c" dataKey="cumPct" stroke={colors.target} strokeWidth={2} dot={{ r: 2.5 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    </Box>
                    <Legend items={[{ label: 'Unfulfilled units (left axis)', color: colors.sales }, { label: 'Cumulative share of unfulfilled (right axis)', color: colors.target, shape: 'line' }]} />
                    </Flex>
                  )}
                </ChartCard>
              </CardGrid>
              <OperationalDetail id="dispatch" kpi="OP-14" title="Dispatch Vs Order" subtitle="1.0 table · by material and channel">
                {CardState({ ...sDispatch, empty: !sDispatch.isLoading && !dispatchRows.length }) ?? (
                  <GroupedTable<DispatchVsOrderRow>
                    rows={dispatchRows}
                    isLoading={sDispatch.isLoading}
                    levels={[
                      { key: 'channel', label: 'Channel', of: (r) => r.channel_type },
                      { key: 'material', label: 'Material', of: (r) => r.material_name },
                    ]}
                    presets={[
                      { value: 'channel', label: 'Channel › Material', levels: ['channel'] },
                      { value: 'material', label: 'Material › Channel', levels: ['material'], leaf: { label: 'Channel', name: (r) => r.channel_type } },
                    ]}
                    leaf={{ label: 'Material', key: (r) => `${r.material_name}|${r.channel_type}`, name: (r) => r.material_name }}
                    figures={[
                      { header: 'Ordered Qty', value: (r) => n0(r.total_order_qty), fmt: full },
                      { header: 'Delivered Qty', value: (r) => n0(r.total_delivery_qty), fmt: full },
                      {
                        header: 'Delivery %',
                        value: (r) => n0(r.delivery_pct),
                        fmt: pct1,
                        // A group's delivery % is its fill rate: Σ delivered ÷ Σ ordered (the OP-01 rule).
                        group: (list) => fillRate(list).pct,
                        color: (r) => { const g = rag(n0(r.delivery_pct), 'fillRate'); return g ? RAG_META[g].color : undefined; },
                        groupColor: (v) => { const g = rag(v, 'fillRate'); return g ? RAG_META[g].color : undefined; },
                      },
                    ]}
                    onLeaf={(r) => detail.open({ kind: 'material', material: r.material_name })}
                  />
                )}
              </OperationalDetail>
            </>
          ),
        },
        {
          key: 'production',
          title: 'Production',
          tiles: [
            <ExecTile key="OP-07"
              id="OP-07"
              label="Production Completion"
              value={pct1(p.w.completion)}
              rag={rag(p.w.completion, 'productionCompletion')}
              band="productionCompletion"
              variance="Target ≥ 90%"
              delta={{ value: p.w.completion != null && p.wCmp.completion != null ? p.w.completion - p.wCmp.completion : null, unit: 'pts', label: cmpLabel }}
              scopeNote={DATES_ONLY}
              {...sWip}
            />,
            <ExecTile key="OP-06"
              id="OP-06"
              label="WIP Value"
              value={pkr(p.w.value)}
              delta={{ value: change(p.w.value, p.wCmp.value), label: cmpLabel, upIsGood: false }}
              scopeNote={DATES_ONLY}
              {...status(d, 'wip', 'wipCmp')}
            />,
            <ExecTile key="OP-08" id="OP-08" label="Open Production Orders" value={full(p.w.openOrders)} caption="Received below item quantity" scopeNote={DATES_ONLY} {...sWip} />,
          ],
          lead: (
            <ChartCard
              dataKpi="OP-09"
              title="WIP Value by Plant and Material Type"
              subtitle={`ⓘ ${DATES_ONLY}`}
              colSpan={{ base: 1, lg: 6 }}
              height="300px"
              isLoading={sWip.isLoading}
              headerRight={<ViewDetails detailId="wip" />}
            >
              {CardState({ ...sWip, empty: !byPlant.rows.length }) ?? (
                <Flex direction="column" h="100%">
                  <Box flex={1} minH={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byPlant.rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                        <CartesianGrid {...grid} horizontal={false} />
                        <XAxis type="number" {...axis} tickFormatter={(v: number) => money(v)} />
                        <YAxis type="category" dataKey="plant" width={100} {...axis} />
                        <Tooltip {...tooltipStyle} formatter={(v, name) => [pkr(Number(v)), String(name)]} />
                        {byPlant.types.map((t, i) => (
                          <Bar key={t} dataKey={t} stackId="w" fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  <Legend items={byPlant.types.map((t, i) => ({ label: t, color: TYPE_COLORS[i % TYPE_COLORS.length] }))} />
                </Flex>
              )}
            </ChartCard>
          ),
          details: (
            <>
              <OperationalDetail id="wip" kpi="OP-15" title="Work in Progress" subtitle={`1.0 table and detail filters · ${DATES_ONLY}`}>
                {CardState({ ...sWip }) ?? (
                  <>
                    <Flex gap={4} wrap="wrap" px={2} py={2} align="center">
                      <Picker label="Plant" value={wipPlant} options={wipPlants} onChange={setWipPlant} />
                      <Text fontSize="12px" color={colors.mutedText}>
                        Material type
                      </Text>
                      <Segmented size="xs" value={wipType} onChange={setWipType} options={['All', ...wipTypes].map((t) => ({ value: t, label: t }))} ariaLabel="Material type" />
                    </Flex>
                    <GroupedTable<WipRow>
                      rows={wipRows}
                      isLoading={sWip.isLoading}
                      levels={[
                        { key: 'plant', label: 'Plant', of: (r) => r.plnt_desc },
                        { key: 'type', label: 'Material type', of: (r) => r.material_type_description },
                      ]}
                      presets={[
                        { value: 'plant', label: 'Plant › Material type', levels: ['plant', 'type'] },
                        { value: 'type', label: 'Material type › Plant', levels: ['type', 'plant'] },
                      ]}
                      leaf={{ label: 'Order', key: (r) => String(r.order_number), name: (r) => String(r.order_number) }}
                      texts={[
                        { header: 'Material', value: (r) => r['Material Name'] },
                        { header: 'Storage location', value: (r) => r.storage_loc_desc },
                      ]}
                      figures={[
                        { header: 'Item Qty', value: (r) => n0(r.item_qty), fmt: full },
                        { header: 'Good Received Qty', value: (r) => n0(r.good_received_qty), fmt: full },
                        { header: 'Quantity', value: (r) => n0(r.Quantity), fmt: full },
                        { header: 'WIP Value', value: (r) => n0(r['WIP Value']), fmt: full },
                      ]}
                      onLeaf={(r) => detail.open({ kind: 'order', order: r.order_number })}
                    />
                  </>
                )}
              </OperationalDetail>
            </>
          ),
        },
        {
          key: 'materials',
          title: 'Materials & service',
          tiles: [
            <ExecTile key="OP-10"
              id="OP-10"
              label="RMPM Value (at cost)"
              value={pkr(p.r.total)}
              delta={{ value: change(p.r.total, p.rCmp.total), label: cmpLabel, upIsGood: false }}
              scopeNote={DATES_ONLY}
              {...status(d, 'rpm', 'rpmCmp')}
            />,
            <ExecTile key="OP-11"
              id="OP-11"
              label="Material on Hold"
              value={pct1(p.r.onHoldPct)}
              rag={holdRag}
              band="onHoldPct"
              variance={`${pkr(p.r.held)} blocked, in QI, restricted or returned`}
              delta={{ value: p.r.onHoldPct != null && p.rCmp.onHoldPct != null ? p.r.onHoldPct - p.rCmp.onHoldPct : null, unit: 'pts', label: cmpLabel, upIsGood: false }}
              scopeNote={DATES_ONLY}
              {...sRpm}
            />,
            <ExecTile key="OP-13"
              id="OP-13"
              label="Service Level (network)"
              value={pct1(svc.level)}
              rag={rag(svc.level, 'serviceLevel')}
              band="serviceLevel"
              variance={`${full(svc.above)} of ${full(svc.above + svc.below)} SKUs above threshold`}
              caption="Open the branch heatmap"
              goTo={{ tab: 'inventory', focus: 'IN-10' }}
              {...status(d, 'aboveBelow')}
            />,
          ],
          lead: (
            <ChartCard
              dataKpi="OP-12"
              title="RMPM Usability by Plant"
              subtitle={`Share of value by stock state · ⓘ ${DATES_ONLY}`}
              colSpan={{ base: 1, lg: 6 }}
              height="300px"
              isLoading={sRpm.isLoading}
              headerRight={<ViewDetails detailId="rmpm" />}
            >
              {CardState({ ...sRpm, empty: !rmpmPlants.length }) ?? (
                <Flex direction="column" h="100%">
                  <Box flex={1} minH={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rmpmPlants} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                        <CartesianGrid {...grid} horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow {...axis} tickFormatter={(v: number) => `${v}%`} />
                        <YAxis type="category" dataKey="plant" width={100} {...axis} />
                        <Tooltip {...tooltipStyle} formatter={(v, name) => [pct1(Number(v)), String(name)]} />
                        {RMPM_STATES.map((s) => (
                          <Bar key={s.label} dataKey={s.label} stackId="r" fill={STATE_COLORS[s.label]} stroke={s.label === 'Unrestricted' ? colors.border : undefined} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  <Legend items={RMPM_STATES.map((s) => ({ label: `${s.label}${s.held ? ' (on hold)' : ''}`, color: STATE_COLORS[s.label] }))} />
                </Flex>
              )}
            </ChartCard>
          ),
          details: (
            <>
              <OperationalDetail id="rmpm" kpi="OP-16" title="Raw and Packing Material (RMPM)" subtitle={`1.0 table and plant filter · ${DATES_ONLY}`}>
                {CardState({ ...sRpm }) ?? (
                  <>
                    <Flex gap={4} px={2} py={2}>
                      <Picker label="Plant" value={rmPlant} options={rmPlants} onChange={setRmPlant} />
                    </Flex>
                    <GroupedTable<RpmRow>
                      rows={rmRows}
                      isLoading={sRpm.isLoading}
                      levels={[
                        { key: 'plant', label: 'Plant', of: (r) => r.plantname },
                        { key: 'type', label: 'Type', of: (r) => r.producttype },
                      ]}
                      presets={[
                        { value: 'plant', label: 'Plant › Type', levels: ['plant', 'type'] },
                        { value: 'type', label: 'Type › Plant', levels: ['type', 'plant'] },
                      ]}
                      leaf={{ label: 'Material', key: (r) => `${r.materialname}|${r.plantname}|${r.storagelocationname}`, name: (r) => r.materialname }}
                      texts={[{ header: 'Storage location', value: (r) => r.storagelocationname }]}
                      figures={[
                        { header: 'Unrestricted', value: (r) => n0(r.unrestricted_val), fmt: full },
                        { header: 'Quality inspection', value: (r) => n0(r.quality_inspection_val), fmt: full, color: (r) => (n0(r.quality_inspection_val) > 0 ? colors.warn : undefined) },
                        { header: 'Blocked', value: (r) => n0(r.blocked_val), fmt: full, color: (r) => (n0(r.blocked_val) > 0 ? colors.warn : undefined) },
                        { header: 'Restricted', value: (r) => n0(r.restricted_val), fmt: full, color: (r) => (n0(r.restricted_val) > 0 ? colors.warn : undefined) },
                        { header: 'Returns', value: (r) => n0(r.returns_val), fmt: full, color: (r) => (n0(r.returns_val) > 0 ? colors.warn : undefined) },
                        { header: 'In transit', value: (r) => n0(r.stock_in_transit_val), fmt: full },
                        { header: 'Total value', value: (r) => n0(r.total_val), fmt: full },
                        { header: 'Unrestricted qty', value: (r) => n0(r.unrestricted_qty), fmt: full },
                        { header: 'Total qty', value: (r) => n0(r.total_qty), fmt: full },
                      ]}
                      onLeaf={(r) => detail.open({ kind: 'rmpm', material: r.materialname, plant: r.plantname })}
                    />
                  </>
                )}
              </OperationalDetail>
            </>
          ),
        },
      ]}
      aside={<AreaRisks data={data} tab="fulfilment" area="Dispatch & WIP" />}
      asideKpi="EX-10"
    />
  );
}
