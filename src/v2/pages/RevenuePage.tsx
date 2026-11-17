// Tab 2: Summary, formerly Revenue & Plan (PRD v2 section 4.2, wireframe 5.2). Keeps the 1.0
// gauges with their three-month class charts, the Days gone tiles and the Sales
// Summary (RV-13 … RV-16) next to the new pace-adjusted KPIs.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/v2/components/chart-card';
import { Segmented } from '@/v2/components/segmented';
import { ExecTile } from '@/v2/components/exec/ExecTile';
import { CardGrid, CardState, ChipBar, OperationalDetail } from '@/v2/components/exec/Panels';
import { AreaLayout } from '@/v2/components/exec/AreaLayout';
import { HBars } from '@/v2/components/exec/HBars';
import { GroupedTable } from '@/v2/components/grouped-table/GroupedTable';
import { AreaRisks } from './OverviewPage';
import { useStockLevelTopic } from './topics/StockLevel';
import { usePlanAlignmentTopic } from './topics/PlanAlignment';
import { axis, Gauge, grid, Legend, tooltipStyle } from '@/v2/components/exec/charts';
import { clsColor } from '@/v2/constants/classColors';
import { colors } from '@/v2/constants/theme';
import { helpFor } from '@/v2/constants/help';
import { type CategoryAccuracyRow, type SalesSummaryRow, type SalesTypeRow, type TotalSkuRow } from '@/v2/api/types';
import { rowsOf, type DashboardData } from '@/v2/features/data';
import { plan, status } from '@/v2/features/derive';
import { attainmentTrend, categoryCells, classHistory, classRanking, salesTypeSplit, type MonthClass, rangeActivation, salesSummary, varianceByClass } from '@/v2/features/kpis';
import { kpiThresholds, rag } from '@/v2/features/kpiThresholds';
import { change, full, money, pct0, pct1, pkr } from '@/v2/features/format';
import { monthLabel, periodTag, rangeLabel } from '@/v2/features/period';
import { useStore } from '@/v2/features/store';
import { compareLabel } from './OverviewPage';

const CLASSES = ['A', 'B', 'C', 'N', 'Others'];

// The 1.0 gauges divide the whole window's sales by the To month's target
// (BR-MET-004/005), so over several months they overstate. Kept unchanged as
// retained 1.0 metrics, with this warning; RV-02/RV-04 use rule F1 instead.
const MULTI_MONTH_NOTE = "1.0 rule: window sales ÷ one month's plan, so it overstates over several months. Use achievement to date above.";

import { useDetail } from '@/v2/features/detail';

export function RevenuePage({ data }: { data: DashboardData }) {
  const d = data.tabs.revenue;
  const { chips } = useStore();
  const detail = useDetail();
  const chip = chips.revenue;
  const onlyCls = chip?.key === 'cls' ? chip.value : null;
  const cl = compareLabel(data.cmpWindow);
  const [trendBasis, setTrendBasis] = useState<'target' | 'budget'>('target');
  // Stock level sits at row 1, column 2 (FR-EXEC-031); it uses this tab's class chip.
  const stockTopic = useStockLevelTopic(d, onlyCls);
  // Plan alignment sits in the side column under Risks & Opportunities (FR-EXEC-036).
  const planTopic = usePlanAlignmentTopic(d, data.window, onlyCls);

  const p = plan(d, data.window);
  const sales = salesSummary(rowsOf<SalesSummaryRow>(d.sales));
  const salesSplit = salesTypeSplit(rowsOf<SalesTypeRow>(d.salesType));
  const salesCmp = salesSummary(rowsOf<SalesSummaryRow>(d.salesCmp));
  const range = rangeActivation(rowsOf<SalesSummaryRow>(d.sales), rowsOf<TotalSkuRow>(d.totalSku));
  const budgetCells = categoryCells([rowsOf<CategoryAccuracyRow>(d.catY1), rowsOf<CategoryAccuracyRow>(d.catY0)]);
  // Budget rows are monthly: the running month is scaled to the days gone (derive.plan).
  const trend = trendBasis === 'target' ? p.trend : attainmentTrend(budgetCells.map((c) => (c.month === p.paceMonth ? { ...c, target: c.target * p.budShare } : c)));
  const variance = varianceByClass(p.cells, p.currentMonth, p.currentMonth === p.paceMonth ? p.iblShare : 1);
  const budgetRanking = classRanking(budgetCells, p.currentMonth);
  // RV-15 / RV-14 side charts: 3 months of accuracy per class, as 1.0 (FR-EXEC-041).
  const budgetHistory = classHistory([rowsOf<CategoryAccuracyRow>(d.catY1), rowsOf<CategoryAccuracyRow>(d.catY0)], data.window.end);
  const iblHistory = classHistory([rowsOf<CategoryAccuracyRow>(d.cat1), rowsOf<CategoryAccuracyRow>(d.cat0)], data.window.end);

  const st = {
    att: status(d, 'fam', 'daysgone'),
    bud: status(d, 'fay'),
    sales: status(d, 'sales'),
    cat: status(d, 'cat0', 'cat1'),
    catY: status(d, 'catY0', 'catY1'),
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
    { period: `A · ${periodTag(data.window)}`, ...Object.fromEntries(sales.rows.map((r) => [r.cls, r.share])) },
    { period: `B · ${periodTag(data.cmpWindow)}`, ...Object.fromEntries(salesCmp.rows.map((r) => [r.cls, r.share])) },
  ];

  return (
    <AreaLayout
      top={<ChipBar tab="revenue" />}
      topics={[
        {
          key: 'sales',
          title: 'Sales & mix',
          tiles: [
            <ExecTile
              key="RV-01"
              id="RV-01"
              label="Sales (TP)"
              value={pkr(sales.total)}
              // As Sales Pulse 2.0's Sales TP card (FR-EXEC-048): achievement to date (EX-01's rule) and the comparison.
              variance={p.attIbl == null || p.Ttd == null ? undefined : `${pct0(p.attIbl)} of ${money(p.Ttd)} target to date`}
              delta={{ value: change(sales.total, salesCmp.total), label: cl }}
              split={salesSplit.map((x) => ({ ...x, text: money(x.value) }))}
              {...st.sales}
            >
              <SalesComparison now={sales.total} before={salesCmp.total} when={rangeLabel(data.cmpWindow)} />
            </ExecTile>,
          ],
          lead: (
            <ChartCard title="Sales Summary" subtitle="By class (1.0 card)" colSpan={4} height="auto" isLoading={st.sales.isLoading} help={helpFor('RV-13')} dataKpi="RV-13" expandable={false}>
              {CardState({ locked: st.sales.locked, error: st.sales.error, empty: !sales.rows.length }) ?? (
                <>
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
                    {[...sales.rows]
                      .sort((a, b) => a.cls.localeCompare(b.cls))
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
                <Legend items={[{ label: 'Class colour', color: clsColor('A'), colors: CLASSES.map(clsColor) }, { label: 'Share of sales', color: colors.salesSoft }]} />
                </>
              )}
            </ChartCard>
          ),
          details: (
            <>
              <CardGrid mb={3}>
                <ChartCard title="Sales mix" subtitle={`${periodTag(data.window)} vs ${periodTag(data.cmpWindow)}`} colSpan={6} height="220px" isLoading={st.sales.isLoading} help={helpFor('RV-09')} dataKpi="RV-09">
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
                      <Legend items={CLASSES.map((c) => ({ label: `${c === 'Others' ? 'Other' : `Class ${c}`} share of sales`, color: clsColor(c) }))} />
                    </Flex>
                  )}
                </ChartCard>
                <ChartCard title="Range activation" subtitle="SKUs that sold ÷ SKUs in the range" colSpan={6} height="220px" isLoading={st.range.isLoading} help={helpFor('RV-10')} dataKpi="RV-10" headerRight={<Text fontSize="12px" color={colors.mutedText}>Total {pct0(range.total)}</Text>}>
                  {CardState({ locked: st.range.locked, error: st.range.error, empty: !range.rows.some((r) => r.inRange > 0) }) ?? (
                    <HBars
                      rows={range.rows.filter((r) => visibleClasses.includes(r.cls)).map((r) => ({ key: r.cls, label: `Class ${r.cls}`, value: r.pct, color: clsColor(r.cls), valueText: pct0(r.pct), note: `${full(r.sold)} of ${full(r.inRange)} SKUs` }))}
                      fmt={pct0}
                      max={100}
                      legend={[{ label: 'SKUs sold ÷ SKUs in range (class colour)', color: clsColor('A'), colors: CLASSES.map(clsColor) }]}
                    />
                  )}
                </ChartCard>
              </CardGrid>
            </>
          ),
        },
        stockTopic,
        {
          key: 'budget',
          title: 'Budget Accuracy TSCL',
          tiles: [
            <ExecTile key="RV-04"
              id="RV-04"
              label="Budget achievement to date"
              value={pct1(p.attBud)}
              rag={rag(p.attBud, 'attainment')}
              band="attainment"
              variance={p.varBud == null ? undefined : `vs pace: ${p.varBud >= 0 ? '+' : '−'}${money(Math.abs(p.varBud))}`}
              delta={{ value: p.attBud != null && p.attBudCmp != null ? p.attBud - p.attBudCmp : null, unit: 'pts', label: cl }}
              {...st.bud}
            />,
            <ExecTile key="RV-05"
              id="RV-05"
              label="Run-rate required"
              value={p.runRate.required == null ? '—' : `${money(p.runRate.required)}/day`}
              caption={p.runRate.current == null ? undefined : `Running ${money(p.runRate.current)}/day`}
              variance={p.runRate.required != null && p.runRate.current != null ? (p.runRate.current >= p.runRate.required ? 'On course for target' : `Need ${money(p.runRate.required - p.runRate.current)}/day more`) : undefined}
              {...st.att}
            />,
            // Days gone, as on Forecast Accuracy IBL: the budget gauge is read against the same days (FR-EXEC-038).
            <ExecTile key="RV-16-budget" id="RV-16" label="Days gone" value={`${p.days.pct}%`} caption={`${p.days.daysGone} of ${p.days.totalDays} days`} isLoading={false} />,
          ],
          lead: (
            <ChartCard title="Budget Accuracy TSCL" subtitle={p.single ? 'Full month, vs TSCL budget' : MULTI_MONTH_NOTE} colSpan={12} height="auto" isLoading={st.bud.isLoading} help={helpFor('RV-15')} dataKpi="RV-15" expandable={false}>
                  {CardState({ locked: st.bud.locked, error: st.bud.error }) ?? (
                    <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={3} alignItems="center" h={{ base: 'auto', md: '100%' }} minH={{ base: 0, md: '180px' }}>
                      <Gauge
                        value={p.gaugeBud}
                        label="Achieved of month budget"
                        rag={rag(p.gaugeBud == null ? null : (p.gaugeBud / p.days.pct) * 100, 'attainment')}
                        footer={{ targetLabel: 'Month Budget', target: p.B && p.B > 0 ? pkr(p.B) : '—', achieved: pkr(p.Se) }}
                      />
                      <ClassHistoryBars hist={budgetHistory} isLoading={st.catY.isLoading} />
                    </Grid>
                  )}
                </ChartCard>
          ),
          details: (
            <>
              <CardGrid mb={3}>
                <ChartCard title="Variance to plan by class" subtitle={`This month, plan prorated to ${p.days.pct}% of days gone`} colSpan={12} height="300px" isLoading={st.cat.isLoading} help={helpFor('RV-08')} dataKpi="RV-08">
              {CardState({ locked: st.cat.locked, error: st.cat.error, empty: !variance.steps.length }) ?? (
                <Flex direction="column" h="100%">
                <Box flex={1} minH={0}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfall} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...grid} vertical={false} />
                    <XAxis dataKey="name" {...axis} interval={0} fontSize={10.5} />
                    <YAxis {...axis} tickFormatter={(v) => money(Number(v))} domain={[waterfallMin, 'auto']} allowDataOverflow />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(_v, _n, item) => {
                        const row = item.payload as { value: number; signed?: number };
                        return [row.signed != null ? `${row.signed >= 0 ? '+' : '−'}${money(Math.abs(row.signed))}` : pkr(row.value), ''];
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
                </Box>
                <Legend
                  items={[
                    { label: 'Plan to date (prorated)', color: colors.target },
                    { label: 'Class ahead of plan', color: colors.good },
                    { label: 'Class behind plan', color: colors.bad },
                    { label: 'Actual sales', color: colors.sales },
                  ]}
                />
                </Flex>
              )}
            </ChartCard>
              </CardGrid>
            </>
          ),
        },
        {
          key: 'attainment',
          title: 'Forecast Accuracy IBL',
          tiles: [
            <ExecTile key="RV-02"
              id="RV-02"
              label="Sales achievement to date"
              value={pct1(p.attIbl)}
              rag={rag(p.attIbl, 'attainment')}
              band="attainment"
              variance={p.varIbl == null ? undefined : `vs pace: ${p.varIbl >= 0 ? '+' : '−'}${money(Math.abs(p.varIbl))}`}
              delta={{ value: p.attIbl != null && p.attIblCmp != null ? p.attIbl - p.attIblCmp : null, unit: 'pts', label: cl }}
              spark={p.spark}
              {...st.att}
            />,
            <ExecTile key="RV-03" id="RV-03" label={p.projectedFinal ? 'Month-end achievement (final)' : 'Projected month-end'} value={pct1(p.projected)} rag={rag(p.projected, 'projected')} band="projected" {...st.att} caption={p.single ? undefined : 'Shown for a single month only'}>
              {p.projected != null && (
                <Box position="relative" h="10px" bg={colors.sunkBg} borderRadius="3px" mt="2px" title="Bar = projection, line = 100%">
                  <Box h="100%" w={`${Math.min(100, (p.projected / Math.max(130, p.projected)) * 100)}%`} bg={colors.sales} borderRadius="3px" className="sp-grow" />
                  <Box position="absolute" top="-3px" bottom="-3px" w="2px" bg={colors.target} left={`${(100 / Math.max(130, p.projected)) * 100}%`} />
                </Box>
              )}
            </ExecTile>,
            <ExecTile key="RV-16" id="RV-16" label="Days gone" value={`${p.days.pct}%`} caption={`${p.days.daysGone} of ${p.days.totalDays} days`} isLoading={false} />,
          ],
          lead: (
            <ChartCard title="Forecast Accuracy IBL" subtitle={p.single ? 'Full month, vs IBL target' : MULTI_MONTH_NOTE} colSpan={12} height="auto" isLoading={st.att.isLoading} help={helpFor('RV-14')} dataKpi="RV-14" expandable={false}>
                  {CardState({ locked: st.att.locked, error: st.att.error }) ?? (
                    <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={3} alignItems="center" h={{ base: 'auto', md: '100%' }} minH={{ base: 0, md: '180px' }}>
                      <Gauge
                        value={p.gaugeIbl}
                        label="Achieved of month target"
                        rag={rag(p.gaugeIbl == null ? null : (p.gaugeIbl / p.days.pct) * 100, 'attainment')}
                        footer={{ targetLabel: 'Month Target', target: p.T && p.T > 0 ? pkr(p.T) : '—', achieved: pkr(p.S) }}
                      />
                      <ClassHistoryBars hist={iblHistory} isLoading={st.cat.isLoading} />
                    </Grid>
                  )}
                </ChartCard>
          ),
          details: (
            <>
              <CardGrid mb={3}>
                <ChartCard
              title={trendBasis === 'target' ? 'Achievement by class vs target, 6 months' : 'Achievement by class vs budget, 6 months'}
              subtitle="100% = on plan · amber band 90–100% · this month pace-adjusted"
              colSpan={12}
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
                  <Legend
                    items={[
                      ...visibleClasses.map((c) => ({ label: c === 'Others' ? 'Other' : `Class ${c}`, color: clsColor(c), shape: 'line' as const })),
                      ...(onlyCls ? [] : [{ label: 'All classes', color: colors.darkText, shape: 'line' as const }]),
                      { label: `100% = on ${trendBasis === 'target' ? 'target' : 'budget'}`, color: colors.target, shape: 'dashed' },
                      { label: `Watch band ${kpiThresholds.attainment.amber}–${kpiThresholds.attainment.green}%`, color: colors.warnSoft, ink: colors.warn, shape: 'band' },
                    ]}
                  />
                </Flex>
              )}
            </ChartCard>
              </CardGrid>
              <OperationalDetail id="rev-acc" kpi="RV-06 RV-07" title="Accuracy by class by month" subtitle="IBL target and TSCL budget, the last 6 months">
                <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={3}>
                  {[
                    { title: 'vs IBL target', cells: p.cells },
                    { title: 'vs TSCL budget', cells: budgetCells },
                  ].map((t) => (
                    <GroupedTable<MonthClass>
                      key={t.title}
                      title={t.title}
                      rows={t.cells.filter((c) => visibleClasses.includes(c.cls))}
                      levels={[
                        { key: 'month', label: 'Month', of: (c) => c.month, name: (c) => monthLabel(c.month, 'long') },
                        { key: 'cls', label: 'Class', of: (c) => c.cls, name: (c) => (c.cls === 'Others' ? 'Other' : `Class ${c.cls}`), order: (a, b) => CLASSES.indexOf(a) - CLASSES.indexOf(b) },
                      ]}
                      presets={[
                        { value: 'month', label: 'Month › Class', levels: ['month'] },
                        { value: 'cls', label: 'Class › Month', levels: ['cls'], leaf: { label: 'Month', name: (c) => monthLabel(c.month, 'long') } },
                      ]}
                      leaf={{ label: 'Class', key: (c) => `${c.month}|${c.cls}`, name: (c) => (c.cls === 'Others' ? 'Other' : `Class ${c.cls}`) }}
                      figures={[
                        { header: 'Sales', value: (c) => c.amount, fmt: full },
                        { header: t.title === 'vs IBL target' ? 'Target' : 'Budget', value: (c) => c.target, fmt: full },
                        {
                          header: 'Accuracy %',
                          value: (c) => (c.target > 0 ? (c.amount / c.target) * 100 : null),
                          fmt: pct1,
                          // A month's (or class's) accuracy: Σ sales ÷ Σ target, as the RV-06 Total line.
                          group: (list) => { const tg = list.reduce((s, c) => s + c.target, 0); return tg > 0 ? (list.reduce((s, c) => s + c.amount, 0) / tg) * 100 : null; },
                        },
                      ]}
                      onLeaf={(c) => detail.open({ kind: 'class', cls: c.cls })}
                    />
                  ))}
                </Grid>
                <Text fontSize="11.5px" color={colors.mutedText} mt={2} px={2}>
                  Budget ranking this month: {budgetRanking.map((r) => `${r.cls} ${pct0(r.pct)}`).join(' · ') || '—'}
                </Text>
              </OperationalDetail>
            </>
          ),
        },
      ]}
      aside={<AreaRisks data={data} tab="revenue" area="Summary" />}
      asideKpi="EX-10"
      asideTopic={planTopic}
    />
  );
}

// Oldest month muted, the To month strongest.
const HISTORY_COLORS = [colors.prior, colors.target, colors.sales];

/**
 * Beside each accuracy gauge (FR-EXEC-041): accuracy % per class for the three
 * months ending with the To date's month, in the Sales Pulse bar style
 * (FR-EXEC-045): one bar per month, oldest muted and the To month strongest,
 * with the 100% line; the legend names the three months only.
 */
function ClassHistoryBars({ hist, isLoading }: { hist: ReturnType<typeof classHistory>; isLoading: boolean }) {
  if (isLoading) return <Box h="200px" />;
  if (!hist.rows.length)
    return (
      <Text fontSize="12.5px" color={colors.mutedText} textAlign="center">
        No accuracy by class for these months
      </Text>
    );
  return (
    <Flex direction="column" h="100%" minH="170px" minW={0} alignSelf="stretch" data-class-history>
      <HBars
        sort="keep"
        rows={hist.rows.map((row) => ({
          key: String(row.cls),
          label: row.cls === 'Others' ? 'Other' : `Class ${row.cls}`,
          value: null,
          target: 100,
          series: hist.months.map((m, i) => {
            const v = typeof row[m] === 'number' ? (row[m] as number) : null;
            return { value: v, color: HISTORY_COLORS[i] ?? colors.sales, text: v == null ? '—' : `${Math.round(v)}%` };
          }),
        }))}
        fmt={(n) => `${Math.round(n)}%`}
        legend={hist.months.map((m, i) => ({ label: monthLabel(m, 'long'), color: HISTORY_COLORS[i] ?? colors.sales }))}
      />
    </Flex>
  );
}

/** "▲ 2% vs 1,217.1M in 1–15 Oct 2026": the Sales TP card's comparison, as Sales Pulse 2.0 shows it (FR-EXEC-048). */
function SalesComparison({ now, before, when }: { now: number; before: number; when: string }) {
  const c = change(now, before);
  if (c == null) return null;
  const up = c > 0;
  const flat = Math.abs(c) < 0.05;
  return (
    <Flex fontSize="12px" gap="6px" align="center" wrap="wrap" data-sales-comparison>
      <Text as="span" fontWeight={700} color={flat ? colors.mutedText : up ? colors.good : colors.bad} fontVariantNumeric="tabular-nums">
        {flat ? '■' : up ? '▲' : '▼'} {Math.abs(c).toFixed(1)}%
      </Text>
      <Text as="span" color={colors.mutedText}>
        vs {money(before)} in {when}
      </Text>
    </Flex>
  );
}
