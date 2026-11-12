// Tab 4: Fulfilment & Operations (PRD v2 section 4.4, wireframe 5.2).
// Are we delivering what customers order, is production flowing, and is
// material usable? OP-01 … OP-16.

import { Box, Flex, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExecTile } from '@/v2/components/exec/ExecTile';
import { CardGrid, CardState, ChipBar, DATES_ONLY, OperationalDetail, TileRow, ViewDetails, Zone, openDetail } from '@/v2/components/exec/Panels';
import { axis, grid, Legend, tooltipStyle } from '@/v2/components/exec/charts';
import { RAG_META } from '@/v2/components/exec/Rag';
import { ChartCard } from '@/v2/components/chart-card';
import { DataTable } from '@/v2/components/data-table';
import { Segmented } from '@/v2/components/segmented';
import { colors } from '@/v2/constants/theme';
import { n0, type DispatchVsOrderRow, type RpmRow, type WipRow } from '@/v2/api/types';
import type { DashboardData } from '@/v2/features/data';
import { fulfilment, production, service, status } from '@/v2/features/derive';
import { materialsBelow, paretoUnfulfilled, rmpmByPlant, RMPM_STATES, wipByPlant } from '@/v2/features/kpis';
import { rag } from '@/v2/features/kpiThresholds';
import { change, full, money, pct0, pct1, pkr, units } from '@/v2/features/format';
import { useStore } from '@/v2/features/store';

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
  const cmpLabel = st.compare === 'ly' ? 'vs same period LY' : 'vs previous period';

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

  const channelData = f.channels.map((c) => ({ channel: c.channel, pct: c.pct == null ? 0 : Math.round(c.pct * 10) / 10, rag: rag(c.pct, 'fillRate') }));
  const fillRag = rag(f.pct, 'fillRate');
  const holdRag = rag(p.r.onHoldPct, 'onHoldPct');

  return (
    <Box>
      <ChipBar tab="fulfilment" />

      <Zone label="Verdict">
        <TileRow max={6}>
          <ExecTile
            id="OP-01"
            label="Order Fill Rate"
            value={pct1(f.pct)}
            rag={fillRag}
            band="fillRate"
            variance="Target ≥ 95% · by quantity"
            delta={{ value: f.pct != null && f.cmpPct != null ? f.pct - f.cmpPct : null, unit: 'pts', label: cmpLabel }}
            {...sDispatchCmp}
          />
          <ExecTile
            id="OP-02"
            label="Unfulfilled Quantity"
            value={units(f.unfulfilled)}
            caption={`${full(f.ordered)} ordered · ${full(f.delivered)} delivered`}
            delta={{ value: change(f.unfulfilled, f.cmpUnfulfilled), label: cmpLabel, upIsGood: false }}
            {...sDispatchCmp}
          />
          <ExecTile
            id="OP-07"
            label="Production Completion"
            value={pct1(p.w.completion)}
            rag={rag(p.w.completion, 'productionCompletion')}
            band="productionCompletion"
            variance="Target ≥ 90%"
            delta={{ value: p.w.completion != null && p.wCmp.completion != null ? p.w.completion - p.wCmp.completion : null, unit: 'pts', label: cmpLabel }}
            scopeNote={DATES_ONLY}
            {...sWip}
          />
          <ExecTile
            id="OP-06"
            label="WIP Value"
            value={pkr(p.w.value)}
            delta={{ value: change(p.w.value, p.wCmp.value), label: cmpLabel, upIsGood: false }}
            scopeNote={DATES_ONLY}
            {...status(d, 'wip', 'wipCmp')}
          />
          <ExecTile
            id="OP-10"
            label="RMPM Value (at cost)"
            value={pkr(p.r.total)}
            delta={{ value: change(p.r.total, p.rCmp.total), label: cmpLabel, upIsGood: false }}
            scopeNote={DATES_ONLY}
            {...status(d, 'rpm', 'rpmCmp')}
          />
          <ExecTile
            id="OP-11"
            label="Material on Hold"
            value={pct1(p.r.onHoldPct)}
            rag={holdRag}
            band="onHoldPct"
            variance={`${pkr(p.r.held)} blocked, in QI, restricted or returned`}
            delta={{ value: p.r.onHoldPct != null && p.rCmp.onHoldPct != null ? p.r.onHoldPct - p.rCmp.onHoldPct : null, unit: 'pts', label: cmpLabel, upIsGood: false }}
            scopeNote={DATES_ONLY}
            {...sRpm}
          />
        </TileRow>
        <Box mt={3}>
          <TileRow max={3}>
            <ExecTile
              id="OP-04"
              label="Materials Below Fill Target"
              value={`${below.below} of ${below.total}`}
              valueSuffix="materials"
              caption="Delivery below 90%"
              {...sDispatch}
            />
            <ExecTile id="OP-08" label="Open Production Orders" value={full(p.w.openOrders)} caption="Received below item quantity" scopeNote={DATES_ONLY} {...sWip} />
            <ExecTile
              id="OP-13"
              label="Service Level (network)"
              value={pct1(svc.level)}
              rag={rag(svc.level, 'serviceLevel')}
              band="serviceLevel"
              variance={`${full(svc.above)} of ${full(svc.above + svc.below)} SKUs above threshold`}
              caption="Open the branch heatmap"
              goTo={{ tab: 'inventory', focus: 'IN-10' }}
              {...status(d, 'aboveBelow')}
            />
          </TileRow>
        </Box>
      </Zone>

      <Zone label="Why">
        <CardGrid>
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
              <Flex direction="column" h="100%">
                <Box flex={1} minH={0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={channelData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                      <CartesianGrid {...grid} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow {...axis} tickFormatter={(v: number) => `${v}%`} />
                      <YAxis type="category" dataKey="channel" width={90} {...axis} />
                      <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Fill rate']} />
                      <ReferenceLine x={95} stroke={colors.target} strokeDasharray="4 3" label={{ value: '95%', fill: colors.target, fontSize: 11, position: 'top' }} />
                      <Bar
                        dataKey="pct"
                        radius={[0, 3, 3, 0]}
                        cursor="pointer"
                        label={{ position: 'right', fontSize: 11, fill: colors.bodyText, formatter: (v: unknown) => `${v}%` }}
                        onClick={(e: unknown) => {
                          const ch = (e as { payload?: { channel?: string } }).payload?.channel;
                          if (ch) detail.open({ kind: 'channel', channel: ch });
                        }}
                      >
                        {channelData.map((c) => (
                          <Cell key={c.channel} fill={c.rag ? RAG_META[c.rag].color : colors.sales} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <Legend
                  items={[
                    { label: `${RAG_META.green.word} ≥ 95%`, color: RAG_META.green.color },
                    { label: `${RAG_META.amber.word} 90–95%`, color: RAG_META.amber.color },
                    { label: `${RAG_META.red.word} < 90%`, color: RAG_META.red.color },
                  ]}
                />
              </Flex>
            )}
          </ChartCard>
          <ChartCard
            dataKpi="OP-05"
            title="Top 10 Unfulfilled Materials"
            subtitle="Unfulfilled quantity and cumulative share · click a bar to see its orders in Dispatch Vs Order"
            colSpan={{ base: 1, lg: 7 }}
            height="300px"
            isLoading={sDispatch.isLoading}
            headerRight={<ViewDetails detailId="dispatch" />}
          >
            {CardState({ ...sDispatch, empty: !pareto.length }) ?? (
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
            )}
          </ChartCard>
        </CardGrid>
      </Zone>

      <Zone label="Where">
        <CardGrid>
          <ChartCard
            dataKpi="OP-09"
            title="WIP Value by Plant and Material Type"
            subtitle={`PKR · ⓘ ${DATES_ONLY}`}
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
        </CardGrid>
      </Zone>

      <Zone label="Operational detail">
        <OperationalDetail id="dispatch" kpi="OP-14" title="Dispatch Vs Order" subtitle="1.0 table · by material and channel">
          {CardState({ ...sDispatch, empty: !sDispatch.isLoading && !dispatchRows.length }) ?? (
            <DataTable
              headerGradient={colors.tableHeaderBg}
              headers={['Material', 'Channel', 'Ordered Qty', 'Delivered Qty', 'Delivery %']}
              isLoading={sDispatch.isLoading}
              rows={dispatchRows.map((r: DispatchVsOrderRow) => {
                const pct = n0(r.delivery_pct);
                const g = rag(pct, 'fillRate');
                return {
                  onClick: () => detail.open({ kind: 'material', material: r.material_name }),
                  cells: [r.material_name, r.channel_type, full(n0(r.total_order_qty)), full(n0(r.total_delivery_qty)), `${pct.toFixed(1)}%`],
                  cellColors: [undefined, undefined, undefined, undefined, g ? RAG_META[g].color : undefined],
                };
              })}
            />
          )}
        </OperationalDetail>

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
              <DataTable
                headerGradient={colors.tableHeaderBg}
                headers={['Order', 'Material', 'Plant', 'Storage location', 'Material type', 'Item Qty', 'Good Received Qty', 'Quantity', 'WIP Value']}
                isLoading={sWip.isLoading}
                rows={wipRows.map((r: WipRow) => ({
                  onClick: () => detail.open({ kind: 'order', order: r.order_number }),
                  cells: [
                    r.order_number,
                    r['Material Name'],
                    r.plnt_desc,
                    r.storage_loc_desc,
                    r.material_type_description,
                    full(n0(r.item_qty)),
                    full(n0(r.good_received_qty)),
                    full(n0(r.Quantity)),
                    full(n0(r['WIP Value'])),
                  ],
                }))}
              />
            </>
          )}
        </OperationalDetail>

        <OperationalDetail id="rmpm" kpi="OP-16" title="Raw and Packing Material (RMPM)" subtitle={`1.0 table and plant filter · ${DATES_ONLY}`}>
          {CardState({ ...sRpm }) ?? (
            <>
              <Flex gap={4} px={2} py={2}>
                <Picker label="Plant" value={rmPlant} options={rmPlants} onChange={setRmPlant} />
              </Flex>
              <DataTable
                headerGradient={colors.tableHeaderBg}
                headers={['Material', 'Type', 'Plant', 'Storage location', 'Unrestricted', 'Quality inspection', 'Blocked', 'Restricted', 'Returns', 'In transit', 'Total value', 'Unrestricted qty', 'Total qty']}
                isLoading={sRpm.isLoading}
                rows={rmRows.map((r: RpmRow) => {
                  const held = (v: number) => (v > 0 ? colors.warn : undefined);
                  return {
                    onClick: () => detail.open({ kind: 'rmpm', material: r.materialname, plant: r.plantname }),
                    cells: [
                      r.materialname,
                      r.producttype,
                      r.plantname,
                      r.storagelocationname,
                      full(n0(r.unrestricted_val)),
                      full(n0(r.quality_inspection_val)),
                      full(n0(r.blocked_val)),
                      full(n0(r.restricted_val)),
                      full(n0(r.returns_val)),
                      full(n0(r.stock_in_transit_val)),
                      full(n0(r.total_val)),
                      full(n0(r.unrestricted_qty)),
                      full(n0(r.total_qty)),
                    ],
                    cellColors: [
                      undefined,
                      undefined,
                      undefined,
                      undefined,
                      undefined,
                      held(n0(r.quality_inspection_val)),
                      held(n0(r.blocked_val)),
                      held(n0(r.restricted_val)),
                      held(n0(r.returns_val)),
                    ],
                  };
                })}
              />
            </>
          )}
        </OperationalDetail>
      </Zone>
    </Box>
  );
}
