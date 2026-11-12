// Tab 2: Revenue & Plan (PRD v2 section 4.2, wireframe 5.2). Keeps the 1.0
// gauges, Days Gone pill and Sales Summary (RV-13 … RV-16) next to the new
// pace-adjusted KPIs.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/v2/components/chart-card';
import { DataTable } from '@/v2/components/data-table';
import { Segmented } from '@/v2/components/segmented';
import { ExecTile } from '@/v2/components/exec/ExecTile';
import { CardGrid, CardState, ChipBar, OperationalDetail, TileRow, ViewDetails, Zone } from '@/v2/components/exec/Panels';
import { RAG_META, RagBadge } from '@/v2/components/exec/Rag';
import { axis, Gauge, grid, Legend, tooltipStyle } from '@/v2/components/exec/charts';
import { clsColor } from '@/v2/constants/classColors';
import { colors } from '@/v2/constants/theme';
import { helpFor } from '@/v2/constants/help';
import { num, type CategoryAccuracyRow, type SalesSummaryRow, type TotalSkuRow } from '@/v2/api/types';
import { rowsOf, type DashboardData } from '@/v2/features/data';
import { plan, status } from '@/v2/features/derive';
import { attainmentTrend, categoryCells, classRanking, rangeActivation, salesSummary, varianceByClass } from '@/v2/features/kpis';
import { rag } from '@/v2/features/kpiThresholds';
import { change, full, money, pct0, pct1, pkr } from '@/v2/features/format';
import { monthLabel } from '@/v2/features/period';
import { useStore } from '@/v2/features/store';
import { compareLabel } from './OverviewPage';

const CLASSES = ['A', 'B', 'C', 'N', 'Others'];

// The 1.0 gauges divide the whole window's sales by the To month's target
// (BR-MET-004/005), so over several months they overstate. Kept unchanged as
// retained 1.0 metrics, with this warning; RV-02/RV-04 use rule F1 instead.
const MULTI_MONTH_NOTE = "1.0 rule: window sales ÷ one month's plan, so it overstates over several months. Use attainment to date above.";

import { useDetail } from '@/v2/features/detail';

export function RevenuePage({ data }: { data: DashboardData }) {
  const d = data.tabs.revenue;
  const { compare, chips } = useStore();
  const detail = useDetail();
  const chip = chips.revenue;
  const onlyCls = chip?.key === 'cls' ? chip.value : null;
  const cl = compareLabel(compare);
  const [trendBasis, setTrendBasis] = useState<'target' | 'budget'>('target');

  const p = plan(d, data.window);
  const sales = salesSummary(rowsOf<SalesSummaryRow>(d.sales));
  const salesCmp = salesSummary(rowsOf<SalesSummaryRow>(d.salesCmp));
  const range = rangeActivation(rowsOf<SalesSummaryRow>(d.sales), rowsOf<TotalSkuRow>(d.totalSku));
  const budgetCells = categoryCells([rowsOf<CategoryAccuracyRow>(d.catY1), rowsOf<CategoryAccuracyRow>(d.catY0)]);
  // Budget rows are monthly: the running month is scaled to the days gone (derive.plan).
  const trend = trendBasis === 'target' ? p.trend : attainmentTrend(budgetCells.map((c) => (c.month === p.paceMonth ? { ...c, target: c.target * p.budShare } : c)));
  const variance = varianceByClass(p.cells, p.currentMonth, p.currentMonth === p.paceMonth ? p.iblShare : 1);
  const ranking = classRanking(p.cells, p.currentMonth);
  const budgetRanking = classRanking(budgetCells, p.currentMonth);

  const st = {
    att: status(d, 'fam', 'daysgone'),
    bud: status(d, 'fay'),
    sales: status(d, 'sales'),
    cat: status(d, 'cat0', 'cat1'),
    catY: status(d, 'catY0', 'catY1'),
    ibl: status(d, 'ibl'),
    range: status(d, 'sales', 'totalSku'),
  };
  const visibleClasses = onlyCls ? [onlyCls] : CLASSES;

  // RV-08 waterfall: invisible base + visible step.
  let running = variance.prorated;
  const waterfall = [
    { name: 'Plan to date', base: 0, value: variance.prorated, color: colors.target },
    ...variance.steps
      .filter((s) => visibleClasses.includes(s.cls))
      .map((s) => {
        const base = s.variance >= 0 ? running : running + s.variance;
        running += s.variance;
        return { name: `Class ${s.cls}`, base, value: Math.abs(s.variance), color: s.variance >= 0 ? colors.good : colors.bad, signed: s.variance };
      }),
    { name: 'Actual', base: 0, value: onlyCls ? running : variance.actual, color: colors.sales },
  ];

  // Start the axis just below the lowest running level so class steps are readable.
  const levels = waterfall.flatMap((w) => (w.base > 0 ? [w.base, w.base + w.value] : [w.value]));
  const waterfallMin = levels.length ? Math.max(0, Math.floor((Math.min(...levels) * 0.9) / 1e6) * 1e6) : 0;

  // RV-09 mix: current vs comparison, 100% stacked.
  const mix = [
    { period: 'This period', ...Object.fromEntries(sales.rows.map((r) => [r.cls, r.share])) },
    { period: compare === 'ly' ? 'Same period LY' : 'Previous period', ...Object.fromEntries(salesCmp.rows.map((r) => [r.cls, r.share])) },
  ];
  // A class with no TSCL budget loaded has no alignment (the API sends 0): left out, not drawn as 0%.
  const alignment = p.iblRows.filter((r) => (num(r.tscl_target) ?? 0) > 0).map((r) => ({ cls: r.classification, pct: num(r.ibl_vs_tscl_pct) ?? 0, gap: (num(r.ibl_target) ?? 0) - (num(r.tscl_target) ?? 0) })).filter((r) => r.cls === 'Total' || visibleClasses.includes(r.cls));

  return (
    <Box>
      <ChipBar tab="revenue" />
      <Zone label="Verdict">
        <TileRow max={6}>
          <ExecTile id="RV-01" label="Sales (TP)" value={pkr(sales.total)} delta={{ value: change(sales.total, salesCmp.total), label: cl }} {...st.sales} />
          <ExecTile
            id="RV-02"
            label="Sales attainment to date"
            value={pct1(p.attIbl)}
            rag={rag(p.attIbl, 'attainment')}
            band="attainment"
            variance={p.varIbl == null ? undefined : `vs pace: ${p.varIbl >= 0 ? '+' : '−'}PKR ${money(Math.abs(p.varIbl))}`}
            delta={{ value: p.attIbl != null && p.attIblCmp != null ? p.attIbl - p.attIblCmp : null, unit: 'pts', label: cl }}
            spark={p.spark}
            {...st.att}
          />
          <ExecTile id="RV-03" label={p.projectedFinal ? 'Month-end attainment (final)' : 'Projected month-end'} value={pct1(p.projected)} rag={rag(p.projected, 'projected')} band="projected" {...st.att} caption={p.single ? undefined : 'Shown for a single month only'}>
            {p.projected != null && (
              <Box position="relative" h="10px" bg={colors.sunkBg} borderRadius="3px" mt="2px" title="Bar = projection, line = 100%">
                <Box h="100%" w={`${Math.min(100, (p.projected / Math.max(130, p.projected)) * 100)}%`} bg={colors.sales} borderRadius="3px" className="sp-grow" />
                <Box position="absolute" top="-3px" bottom="-3px" w="2px" bg={colors.target} left={`${(100 / Math.max(130, p.projected)) * 100}%`} />
              </Box>
            )}
          </ExecTile>
          <ExecTile
            id="RV-04"
            label="Budget attainment to date"
            value={pct1(p.attBud)}
            rag={rag(p.attBud, 'attainment')}
            band="attainment"
            variance={p.varBud == null ? undefined : `vs pace: ${p.varBud >= 0 ? '+' : '−'}PKR ${money(Math.abs(p.varBud))}`}
            delta={{ value: p.attBud != null && p.attBudCmp != null ? p.attBud - p.attBudCmp : null, unit: 'pts', label: cl }}
            {...st.bud}
          />
          <ExecTile
            id="RV-05"
            label="Run-rate required"
            value={p.runRate.required == null ? '—' : `${money(p.runRate.required)}/day`}
            caption={p.runRate.current == null ? undefined : `Running ${money(p.runRate.current)}/day`}
            variance={p.runRate.required != null && p.runRate.current != null ? (p.runRate.current >= p.runRate.required ? 'On course for target' : `Need ${money(p.runRate.required - p.runRate.current)}/day more`) : undefined}
            {...st.att}
          />
          <ExecTile id="RV-16" label="Days gone" value={`${p.days.pct}%`} caption={`${p.days.daysGone} of ${p.days.totalDays} days`} isLoading={false} />
        </TileRow>
      </Zone>

      <Zone label="Why">
        <CardGrid mb={3}>
          <ChartCard title="Forecast Accuracy IBL" subtitle={p.single ? 'Full month, vs IBL target (1.0 gauge)' : MULTI_MONTH_NOTE} colSpan={6} height="auto" isLoading={st.att.isLoading} help={helpFor('RV-14')} dataKpi="RV-14" expandable={false}>
            {CardState({ locked: st.att.locked, error: st.att.error }) ?? (
              <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={3} alignItems="center">
                <Gauge value={p.gaugeIbl} label="Achieved of month target" rag={rag(p.gaugeIbl == null ? null : (p.gaugeIbl / p.days.pct) * 100, 'attainment')} />
                <Box fontSize="13px" color={colors.bodyText}>
                  <Text>
                    Achieved: <b>{pkr(p.S)}</b>
                  </Text>
                  <Text>
                    Month target: <b>{p.T && p.T > 0 ? pkr(p.T) : '—'}</b>
                  </Text>
                  <Text>
                    Days-gone target: <b>{pkr(p.Ttd)}</b>
                  </Text>
                  <Flex mt={2} align="center" gap="6px" data-kpi="RV-16">
                    <Box px="8px" py="1px" borderRadius="999px" bg={colors.targetSoft} color={colors.target} fontSize="12px" fontWeight={700}>
                      Days Gone {p.days.pct}%
                    </Box>
                  </Flex>
                </Box>
              </Grid>
            )}
          </ChartCard>
          <ChartCard title="Budget Accuracy TSCL" subtitle={p.single ? 'Full month, vs TSCL budget (1.0 gauge)' : MULTI_MONTH_NOTE} colSpan={6} height="auto" isLoading={st.bud.isLoading} help={helpFor('RV-15')} dataKpi="RV-15" expandable={false}>
            {CardState({ locked: st.bud.locked, error: st.bud.error }) ?? (
              <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={3} alignItems="center">
                <Gauge value={p.gaugeBud} label="Achieved of month budget" rag={rag(p.gaugeBud == null ? null : (p.gaugeBud / p.days.pct) * 100, 'attainment')} />
                <Box fontSize="13px" color={colors.bodyText}>
                  <Text>
                    EFP sales: <b>{pkr(p.Se)}</b>
                  </Text>
                  <Text>
                    Month budget: <b>{p.B && p.B > 0 ? pkr(p.B) : '—'}</b>
                  </Text>
                  <Text>
                    Days-gone budget: <b>{pkr(p.Btd)}</b>
                  </Text>
                  <Flex mt={2}>
                    <Box px="8px" py="1px" borderRadius="999px" bg={colors.targetSoft} color={colors.target} fontSize="12px" fontWeight={700}>
                      Days Gone {p.days.pct}%
                    </Box>
                  </Flex>
                </Box>
              </Grid>
            )}
          </ChartCard>
        </CardGrid>
        <CardGrid>
          <ChartCard
            title={trendBasis === 'target' ? 'Attainment by class vs target, 6 months' : 'Attainment by class vs budget, 6 months'}
            subtitle="100% = on plan · amber band 90–100% · this month pace-adjusted"
            colSpan={7}
            height="300px"
            isLoading={trendBasis === 'target' ? st.cat.isLoading : st.catY.isLoading}
            help={helpFor(trendBasis === 'target' ? 'RV-06' : 'RV-07')}
            dataKpi="RV-06 RV-07"
            headerRight={<Segmented size="xs" value={trendBasis} onChange={setTrendBasis} options={[{ value: 'target', label: 'vs Target' }, { value: 'budget', label: 'vs Budget' }]} />}
          >
            {CardState({ locked: st.cat.locked, error: trendBasis === 'target' ? st.cat.error : st.catY.error, empty: !trend.length }) ?? (
              <Flex direction="column" h="100%">
                <Box flex={1} minH={0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend.map((r) => ({ ...r, label: monthLabel(r.month as string) }))} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                      <CartesianGrid {...grid} vertical={false} />
                      <XAxis dataKey="label" {...axis} />
                      <YAxis {...axis} domain={['dataMin - 5', 'dataMax + 5']} allowDecimals={false} tickFormatter={(v) => `${Math.round(Number(v))}%`} />
                      <ReferenceArea y1={90} y2={100} fill={colors.warnSoft} fillOpacity={0.6} />
                      <ReferenceLine y={100} stroke={colors.target} strokeDasharray="4 3" />
                      <Tooltip {...tooltipStyle} formatter={(v) => pct1(Number(v))} />
                      {visibleClasses.map((c) => (
                        <Line key={c} type="monotone" dataKey={c} stroke={clsColor(c)} strokeWidth={1.6} dot={{ r: 2 }} connectNulls name={`Class ${c}`} />
                      ))}
                      {!onlyCls && <Line type="monotone" dataKey="Total" stroke={colors.darkText} strokeWidth={2.8} dot={{ r: 3 }} connectNulls name="All classes" />}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Legend items={[...visibleClasses.map((c) => ({ label: c, color: clsColor(c) })), ...(onlyCls ? [] : [{ label: 'All classes', color: colors.darkText }])]} />
              </Flex>
            )}
          </ChartCard>
          <ChartCard title="Variance to plan by class" subtitle={`This month, plan prorated to ${p.days.pct}% of days gone`} colSpan={5} height="300px" isLoading={st.cat.isLoading} help={helpFor('RV-08')} dataKpi="RV-08">
            {CardState({ locked: st.cat.locked, error: st.cat.error, empty: !variance.steps.length }) ?? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfall} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...grid} vertical={false} />
                  <XAxis dataKey="name" {...axis} interval={0} fontSize={10.5} />
                  <YAxis {...axis} tickFormatter={(v) => money(Number(v))} domain={[waterfallMin, 'auto']} allowDataOverflow />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(_v, _n, item) => {
                      const row = item.payload as { value: number; signed?: number };
                      return [row.signed != null ? `${row.signed >= 0 ? '+' : '−'}PKR ${money(Math.abs(row.signed))}` : pkr(row.value), ''];
                    }}
                  />
                  <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="value" stackId="w">
                    {waterfall.map((w) => (
                      <Cell key={w.name} fill={w.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </CardGrid>
      </Zone>

      <Zone label="Where">
        <CardGrid>
          <ChartCard title="Sales Summary" subtitle="By class (1.0 card)" colSpan={4} height="auto" isLoading={st.sales.isLoading} help={helpFor('RV-13')} dataKpi="RV-13" expandable={false}>
            {CardState({ locked: st.sales.locked, error: st.sales.error, empty: !sales.rows.length }) ?? (
              <Box as="table" w="100%" fontSize="13px">
                <thead>
                  <tr>
                    {['Class', 'SKUs', 'Sales', 'Share'].map((h) => (
                      <Box as="th" key={h} textAlign={h === 'Class' ? 'left' : 'right'} color={colors.mutedText} fontWeight={500} py="4px">
                        {h}
                      </Box>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.rows
                    .filter((r) => visibleClasses.includes(r.cls))
                    .map((r) => (
                      <Box as="tr" key={r.cls} cursor="pointer" _hover={{ bg: colors.hoverBg }} onClick={() => detail.open({ kind: 'class', cls: r.cls })} title="Click for details">
                        <Box as="td" py="5px">
                          <Flex align="center" gap="6px">
                            <Box w="10px" h="10px" borderRadius="2px" bg={clsColor(r.cls)} />
                            {r.cls}
                          </Flex>
                        </Box>
                        <Box as="td" textAlign="right">
                          {full(r.skus)}
                        </Box>
                        <Box as="td" textAlign="right" title={full(r.amount)}>
                          {full(r.amount)}
                        </Box>
                        <Box as="td" textAlign="right" position="relative">
                          <Box position="absolute" right={0} top="20%" bottom="20%" w={`${r.share}%`} maxW="100%" bg={colors.salesSoft} zIndex={0} borderRadius="2px" />
                          <Text as="span" position="relative">
                            {r.share.toFixed(1)}%
                          </Text>
                        </Box>
                      </Box>
                    ))}
                  <Box as="tr" bg={colors.tableTotalStart} fontWeight={700}>
                    <Box as="td" py="5px">
                      Total
                    </Box>
                    <Box as="td" textAlign="right">
                      {full(sales.rows.reduce((t, r) => t + r.skus, 0))}
                    </Box>
                    <Box as="td" textAlign="right">
                      {full(sales.total)}
                    </Box>
                    <Box as="td" textAlign="right">
                      100%
                    </Box>
                  </Box>
                </tbody>
              </Box>
            )}
          </ChartCard>
          <ChartCard title="Sales mix" subtitle={`This period vs ${compare === 'ly' ? 'same period LY' : 'previous period'}`} colSpan={4} height="220px" isLoading={st.sales.isLoading} help={helpFor('RV-09')} dataKpi="RV-09">
            {CardState({ locked: st.sales.locked, error: st.sales.error, empty: !sales.rows.length }) ?? (
              <Flex direction="column" h="100%">
                <Box flex={1} minH={0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mix} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                      <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow {...axis} unit="%" />
                      <YAxis type="category" dataKey="period" {...axis} width={96} />
                      <Tooltip {...tooltipStyle} formatter={(v) => pct1(Number(v))} />
                      {CLASSES.map((c) => (
                        <Bar key={c} dataKey={c} stackId="m" fill={clsColor(c)} name={`Class ${c}`} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <Legend items={CLASSES.map((c) => ({ label: c, color: clsColor(c) }))} />
              </Flex>
            )}
          </ChartCard>
          <ChartCard title="Range activation" subtitle="SKUs that sold ÷ SKUs in the range" colSpan={4} height="220px" isLoading={st.range.isLoading} help={helpFor('RV-10')} dataKpi="RV-10" headerRight={<Text fontSize="12px" color={colors.mutedText}>Total {pct0(range.total)}</Text>}>
            {CardState({ locked: st.range.locked, error: st.range.error, empty: !range.rows.some((r) => r.inRange > 0) }) ?? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={range.rows.filter((r) => visibleClasses.includes(r.cls))} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow {...axis} unit="%" />
                  <YAxis type="category" dataKey="cls" {...axis} width={30} />
                  <Tooltip {...tooltipStyle} formatter={(v, _n, item) => [`${pct1(Number(v))} (${(item.payload as { sold: number }).sold} of ${(item.payload as { inRange: number }).inRange})`, 'Activated']} />
                  <Bar dataKey="pct" radius={[0, 3, 3, 0]} label={{ position: 'right', fontSize: 11, fill: colors.bodyText, formatter: (v: unknown) => pct0(Number(v)) }}>
                    {range.rows.filter((r) => visibleClasses.includes(r.cls)).map((r) => (
                      <Cell key={r.cls} fill={clsColor(r.cls)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Plan alignment: forecast vs budget" subtitle="IBL target ÷ TSCL budget · green band 95–105%" colSpan={7} height="240px" isLoading={st.ibl.isLoading} help={helpFor('RV-11')} dataKpi="RV-11">
            {CardState({ locked: st.ibl.locked, error: st.ibl.error, empty: !alignment.length, emptyText: 'No TSCL budget is loaded for this month' }) ?? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alignment.map((a) => ({ ...a, diff: a.pct - 100 }))} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
                  <CartesianGrid {...grid} horizontal={false} />
                  <XAxis type="number" {...axis} domain={[-25, 25]} ticks={[-20, -10, 0, 10, 20]} allowDataOverflow tickFormatter={(v) => `${100 + Number(v)}%`} />
                  <YAxis type="category" dataKey="cls" {...axis} width={44} />
                  <ReferenceArea x1={-5} x2={5} fill={colors.goodSoft} fillOpacity={0.7} />
                  <ReferenceLine x={0} stroke={colors.target} />
                  <Tooltip {...tooltipStyle} formatter={(_v, _n, item) => {
                    const row = item.payload as { pct: number; gap: number };
                    return [`${pct1(row.pct)} · gap ${row.gap >= 0 ? '+' : '−'}PKR ${money(Math.abs(row.gap))}`, 'Forecast ÷ budget'];
                  }} />
                  <Bar dataKey="diff" label={{ position: 'right', fontSize: 11, fill: colors.bodyText, formatter: (v: unknown) => pct0(100 + Number(v)) }}>
                    {alignment.map((a) => (
                      <Cell key={a.cls} fill={RAG_META[rag(a.pct, 'planAlignment') ?? 'green'].color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Class leaders and laggards" subtitle={`This month · ${monthLabel(p.currentMonth, 'long')}`} colSpan={5} height="auto" isLoading={st.cat.isLoading} help={helpFor('RV-12')} dataKpi="RV-12" expandable={false} headerRight={<ViewDetails detailId="rev-acc" />}>
            {CardState({ locked: st.cat.locked, error: st.cat.error, empty: !ranking.length }) ?? (
              <Grid templateColumns="1fr 1fr" gap={4}>
                {[
                  { title: 'Ahead', list: ranking.slice(0, 2) },
                  { title: 'Behind', list: [...ranking].reverse().slice(0, 2) },
                ].map((g) => (
                  <Box key={g.title}>
                    <Text fontSize="11px" color={colors.mutedText} textTransform="uppercase" mb={1}>
                      {g.title}
                    </Text>
                    {g.list.map((r) => {
                      const prorated = p.days.totalDays > 0 ? (r.pct / p.days.daysGone) * p.days.totalDays : r.pct;
                      const status = rag(p.projectedFinal ? r.pct : prorated, 'attainment');
                      return (
                        <Flex key={r.cls} align="center" gap="8px" py="4px" cursor="pointer" _hover={{ bg: colors.hoverBg }} onClick={() => detail.open({ kind: 'class', cls: r.cls })}>
                          <Box w="10px" h="10px" borderRadius="2px" bg={clsColor(r.cls)} />
                          <Text fontWeight={600} fontSize="13px">
                            Class {r.cls}
                          </Text>
                          <Text fontSize="13px" ml="auto">
                            {pct0(r.pct)}
                          </Text>
                          <RagBadge rag={status} size="sm" />
                        </Flex>
                      );
                    })}
                  </Box>
                ))}
              </Grid>
            )}
          </ChartCard>
        </CardGrid>
      </Zone>

      <Zone label="Operational detail">
        <OperationalDetail id="rev-acc" kpi="RV-06 RV-07" title="Accuracy by class by month" subtitle="IBL target and TSCL budget, the last 6 months">
          <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={3}>
            {[
              { title: 'vs IBL target', cells: p.cells },
              { title: 'vs TSCL budget', cells: budgetCells },
            ].map((t) => (
              <DataTable
                key={t.title}
                title={t.title}
                headerGradient={colors.tableHeaderBg}
                headers={['Month', 'Class', 'Sales', 'Target', 'Accuracy %']}
                searchable={false}
                pageSize={40}
                rows={t.cells
                  .filter((c) => visibleClasses.includes(c.cls))
                  .map((c) => ({
                    onClick: () => detail.open({ kind: 'class', cls: c.cls }),
                    cells: [monthLabel(c.month, 'long'), c.cls, full(c.amount), full(c.target), c.target > 0 ? `${((c.amount / c.target) * 100).toFixed(1)}%` : '—'],
                  }))}
              />
            ))}
          </Grid>
          <Text fontSize="11.5px" color={colors.mutedText} mt={2} px={2}>
            Budget ranking this month: {budgetRanking.map((r) => `${r.cls} ${pct0(r.pct)}`).join(' · ') || '—'}
          </Text>
        </OperationalDetail>
      </Zone>
    </Box>
  );
}
