// Tab 3: Inventory & Working Capital (PRD v2 section 4.3, wireframe 5.2).
// Every item of PRD_ITEMS.inventory is rendered with its data-kpi ID. Since
// 16 Nov 2026 the Stock level topic (IN-03, IN-04, IN-05, IN-07, IN-08, IN-14)
// is on Summary (FR-EXEC-031).

import { Box, Flex, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/v2/components/chart-card';
import { Segmented } from '@/v2/components/segmented';
import { ExecTile } from '@/v2/components/exec/ExecTile';
import { CardGrid, CardState, ChipBar, OperationalDetail, ViewDetails, openDetail } from '@/v2/components/exec/Panels';
import { AreaLayout } from '@/v2/components/exec/AreaLayout';
import { HBars } from '@/v2/components/exec/HBars';
import { GroupedTable } from '@/v2/components/grouped-table/GroupedTable';
import { AreaRisks } from './OverviewPage';
import { Heatmap, Legend, axis, grid, ragLegend, tooltipStyle } from '@/v2/components/exec/charts';
import { colors } from '@/v2/constants/theme';
import { clsColor } from '@/v2/constants/classColors';
import { INV_BRANCHES, RATED_CLASSES, n0, num, type BenchmarkRow, type TgtVsActualRow, type TotalSkuRow } from '@/v2/api/types';
import { rowsOf, type DashboardData } from '@/v2/features/data';
import { service, status, stock, workingCapitalTrend } from '@/v2/features/derive';
import { inventoryClassRows } from '@/v2/features/kpis';
import { kpiThresholds, rag } from '@/v2/features/kpiThresholds';
import { change, days, full, money, pct0, pct1, pkr } from '@/v2/features/format';
import { monthLabel } from '@/v2/features/period';
import { useStore } from '@/v2/features/store';


import { useDetail } from '@/v2/features/detail';

/** One SKU row of the Inventory Days table. */
type InvLeaf = { cls: string; sku: string; vals: number[]; total: number };

export function InventoryPage({ data }: { data: DashboardData }) {
  const d = data.tabs.inventory;
  const st = useStore();
  const detail = useDetail();
  const chip = st.chips.inventory;
  const clsChip = chip?.key === 'cls' ? chip.value : null;
  const branchChip = chip?.key === 'branch' ? chip.value : null;
  const [svcView, setSvcView] = useState<'heat' | 'line'>('heat');
  // TC-S4-11: Shift-click on a heatmap cell focuses the Inventory Days table on that branch and class.
  const [invFocus, setInvFocus] = useState<{ branch: string; cls: string } | null>(null);

  const s = stock(d);
  const sv = service(d, st.filters.classification);
  const trend = workingCapitalTrend(d, data.window.end);
  const cur = trend[trend.length - 1];
  const prevMonth = trend[trend.length - 2];
  const bench = rowsOf<BenchmarkRow>(d.bench);
  const totalSku = rowsOf<TotalSkuRow>(d.totalSku);
  const tgt = rowsOf<TgtVsActualRow>(d.tgt);
  const invRaw = rowsOf<Record<string, unknown>>(d.invDays);
  const invClasses = inventoryClassRows(invRaw);

  const branchNames = st.filters.branch.map((code) => data.options.branches.find((b) => String(b.hub_branch_code) === code)?.hub_branch_desc ?? code);
  const showCls = (c: string) => !clsChip || c === clsChip;

  const sWc = status(d, 'coverTotal', 'wip', 'rpm');
  const sSvc = status(d, 'aboveBelow');
  const sTrend = status(d, ...[0, 1, 2, 3, 4, 5].flatMap((i) => [`wcFg${i}`, `wcWip${i}`, `wcRpm${i}`]));
  const sMatrix = status(d, 'serviceAll');
  const sInv = status(d, 'invDays', 'bench');

  const wcTotal = cur ? cur.total : null;

  // IN-10 line view data.
  const lineData = [...sv.matrix]
    .sort((a, b) => a.branch.localeCompare(b.branch))
    .map((r) => Object.fromEntries([['branch', r.branch], ...RATED_CLASSES.map((c, i) => [c, r.cells[i]])]));

  // IN-11 ranking (worst first, bottom 5 highlighted).
  const ranking = sv.matrix.map((r, i) => ({ branch: r.branch, avg: r.avg ?? 0, worst: i < 5 }));

  // IN-12 cover days by branch × class.
  const bmOf = (c: string) => s.cls.find((r) => r.cls === c)?.bm ?? null;
  const thOf = (c: string) => s.cls.find((r) => r.cls === c)?.th ?? null;
  const heatClasses = invClasses.map((r) => r.cls);
  const coverHeat = INV_BRANCHES.map((b, bi) => ({ label: b.label, cells: invClasses.map((r) => (r.vals[bi] > 0 ? r.vals[bi] : null)) }));

  // IN-16
  const ab = sv.ab.filter((r) => showCls(r.classification));
  const abData = ab.map((r) => ({ cls: r.classification, above: n0(r['No Of SKUs > Threshold']), below: n0(r['No Of SKUs < Threshold']) }));

  // IN-15
  const tgtData = tgt.filter((r) => showCls(r.classification)).map((r) => ({ cls: r.classification, threshold: num(r.cover_days_tgt), actual: num(r.cover_days) }));

  const focusInvDays = (branch: string, cls: string) => {
    setInvFocus({ branch, cls });
    openDetail('inv-days', st.setZone4);
  };

  // IN-17 table
  const focusCol = invFocus ? INV_BRANCHES.findIndex((b) => b.label.toLowerCase() === invFocus.branch.trim().toLowerCase()) : -1;
  const keepCol = (i: number) => focusCol < 0 || i === focusCol;
  // Class › SKU rows of the grouped table (FR-EXEC-046); the table orders them (FR-EXEC-027).
  const CLASS_ORDER = ['A', 'B', 'C', 'N', 'Others'];
  const invCols = INV_BRANCHES.map((b, i) => ({ label: b.label, i })).filter(({ i }) => keepCol(i));
  const invLeaves: InvLeaf[] = invClasses
    .filter((c) => showCls(c.cls) && (!invFocus || c.cls === invFocus.cls))
    .flatMap((c) => c.skus.map((k) => ({ cls: c.cls, sku: k.sku, vals: k.vals, total: k.total })));
  // Green at or above the class threshold, as before.
  const coverColor = (cls: string, v: number | null | undefined) => {
    const th = thOf(cls);
    return th != null && v != null && v >= th ? colors.good : undefined;
  };

  return (
    <AreaLayout
      top={<ChipBar tab="inventory" />}
      topics={[
        {
          key: 'capital',
          title: 'Working capital',
          tiles: [
            <ExecTile key="IN-01"
              id="IN-01"
              label="Supply-Chain Working Capital"
              value={pkr(wcTotal)}
              caption="At cost: finished goods + WIP + RMPM"
              delta={{ value: change(cur?.total, prevMonth?.total), label: 'vs previous month-end', upIsGood: false }}
              spark={trend.map((t) => t.total)}
              {...sWc}
            />,
            <ExecTile key="IN-02" id="IN-02" label="FG Inventory Value (cost)" value={pkr(s.fgCost)} caption={`At TP: ${pkr(s.fgTp)}`} {...status(d, 'coverTotal')} />,
          ],
          lead: (
            <ChartCard dataKpi="IN-09" title="Working Capital Trend & Composition" subtitle="Last 6 month-ends, at cost" colSpan={{ base: 12, lg: 6 }} height="280px" isLoading={sTrend.isLoading} variant="bar">
              {CardState({ ...sTrend, empty: !trend.some((t) => t.total > 0) }) ?? (
                <Flex direction="column" h="100%">
                  <Box flex={1} minH={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trend.map((t) => ({ ...t, label: monthLabel(t.month) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...grid} vertical={false} />
                        <XAxis dataKey="label" {...axis} />
                        <YAxis {...axis} tickFormatter={(v: number) => money(v)} width={52} />
                        <Tooltip {...tooltipStyle} formatter={(v) => pkr(Number(v))} />
                        <Bar dataKey="fg" name="Finished goods" stackId="wc" fill={colors.sales} />
                        <Bar dataKey="wip" name="WIP" stackId="wc" fill={colors.target} />
                        <Bar dataKey="rpm" name="RMPM" stackId="wc" fill={colors.prior} />
                        <Line dataKey="total" name="Total" stroke={colors.darkText} strokeWidth={2} dot={{ r: 2 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                  <Legend items={[{ label: 'Finished goods', color: colors.sales }, { label: 'WIP', color: colors.target }, { label: 'RMPM', color: colors.prior }, { label: 'Total working capital', color: colors.darkText, shape: 'line' }]} />
                </Flex>
              )}
            </ChartCard>
          ),
        },
        {
          key: 'service',
          title: 'Service',
          tiles: [
            <ExecTile key="IN-06" id="IN-06" label="Stock-out Risk" value={pct1(sv.risk)} rag={rag(sv.risk, 'stockoutRisk')} band="stockoutRisk" caption={`${full(sv.below)} of ${full(sv.above + sv.below)} SKUs below threshold`} {...sSvc} />,
          ],
          lead: (
            <ChartCard
              dataKpi="IN-10"
              title="Service Level by Branch × Class"
              subtitle="% of SKUs above threshold · worst branches first · click for the branch, Shift-click for its Inventory Days rows"
              colSpan={{ base: 12, lg: 7 }}
              height="460px"
              isLoading={sMatrix.isLoading}
              headerRight={
                <Flex gap="8px" align="center">
                  <Segmented size="xs" value={svcView} onChange={setSvcView} ariaLabel="Service view" options={[{ value: 'heat', label: 'Heatmap' }, { value: 'line', label: 'Line' }]} />
                  <ViewDetails detailId="inv-days" />
                </Flex>
              }
            >
              {CardState({ ...sMatrix, empty: !sv.matrix.length }) ??
                (svcView === 'heat' ? (
                  <Flex direction="column" h="100%">
                  <Box flex={1} minH={0} overflowY="auto" tabIndex={0} role="region" aria-label="Service level by branch and class" _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: "-2px" }}>
                  <Heatmap
                    cols={RATED_CLASSES.map((c) => `Class ${c}`)}
                    rows={sv.matrix.map((r) => ({ label: r.branch, cells: r.cells }))}
                    format={(v) => pct0(v)}
                    ragOf={(v) => rag(v, 'serviceLevel')}
                    highlightRow={[...branchNames, ...(branchChip ? [branchChip] : [])]}
                    onCell={(branch, col, shift) => (shift ? focusInvDays(branch, RATED_CLASSES[col]) : detail.open({ kind: 'branch', branch }))}
                  />
                  </Box>
                  <Legend items={[...ragLegend('serviceLevel', { shape: 'band', what: 'of SKUs above threshold' }), ...(branchNames.length || branchChip ? [{ label: '▸ Filtered branch', color: colors.darkText, shape: 'dot' as const }] : [])]} />
                  </Flex>
                ) : (
                  <Flex direction="column" h="100%">
                  <Box flex={1} minH={0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 8, right: 12, left: 0, bottom: 30 }}>
                      <CartesianGrid {...grid} />
                      <XAxis dataKey="branch" {...axis} angle={-35} textAnchor="end" interval={0} height={50} />
                      <YAxis {...axis} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow tickFormatter={(v: number) => `${v}%`} width={40} />
                      <Tooltip {...tooltipStyle} formatter={(v) => pct0(Number(v))} />
                      {RATED_CLASSES.map((c) => (
                        <Line key={c} dataKey={c} name={`Class ${c}`} stroke={clsColor(c)} strokeWidth={2} dot={{ r: 2 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  </Box>
                  <Legend items={RATED_CLASSES.map((c) => ({ label: `Class ${c}: % of SKUs above threshold`, color: clsColor(c), shape: 'line' as const }))} />
                  </Flex>
                ))}
            </ChartCard>
          ),
          details: (
            <>
              <CardGrid mb={3}>
                <ChartCard dataKpi="IN-11" title="Branch Service Ranking" subtitle="Simple average across classes, not SKU-weighted · bottom 5 highlighted" colSpan={{ base: 12, lg: 5 }} height="460px" isLoading={sMatrix.isLoading}>
                  {CardState({ ...sMatrix, empty: !ranking.length }) ?? (
                    <HBars
                      sort="keep"
                      rows={ranking.map((r) => ({ key: r.branch, label: r.branch, value: r.avg, target: kpiThresholds.serviceLevel.green, color: r.worst ? colors.bad : colors.borderStrong, valueText: pct1(r.avg), onClick: () => detail.open({ kind: 'branch', branch: r.branch }) }))}
                      fmt={pct1}
                      max={100}
                      legend={[{ label: 'Bottom 5 branches', color: colors.bad }, { label: 'Other branches', color: colors.borderStrong }, { label: `Target ${kpiThresholds.serviceLevel.green}%`, color: colors.target, shape: 'tick' }]}
                    />
                  )}
                </ChartCard>
                <ChartCard dataKpi="IN-16" title="SKUs Against Threshold" colSpan={{ base: 12, lg: 7 }} height="260px" isLoading={sSvc.isLoading} headerRight={<ViewDetails detailId="inv-days" />}>
                  {CardState({ ...sSvc, empty: !abData.length }) ?? (
                    <HBars
                      rows={abData.map((r) => ({ key: r.cls, label: r.cls === 'Others' ? 'Other' : `Class ${r.cls}`, value: r.below, prior: r.above, color: colors.bad, valueText: full(r.below), priorText: full(r.above), note: `${full(r.below + r.above)} SKUs` }))}
                      fmt={full}
                      legend={[{ label: 'Below threshold (risk)', color: colors.bad }, { label: 'Above threshold', color: colors.prior }]}
                    />
                  )}
                </ChartCard>
              </CardGrid>
              <CardGrid mb={3}>
                <ChartCard dataKpi="IN-12" title="Cover Days by Branch" subtitle="Average cover of each class’s SKUs · coloured against the class benchmark" colSpan={12} height="460px" isLoading={sInv.isLoading} headerRight={<ViewDetails detailId="inv-days" />}>
                  {CardState({ ...sInv, empty: !invClasses.length }) ?? (
                    <Flex direction="column" h="100%">
                    <Box flex={1} minH={0} overflowY="auto" tabIndex={0} role="region" aria-label="Cover days by branch" _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: "-2px" }}>
                    <Heatmap
                      cols={heatClasses.map((c) => (c === 'Others' ? 'Other' : `Class ${c}`))}
                      rows={coverHeat}
                      format={(v) => (v == null ? '—' : v.toFixed(0))}
                      ragOf={(v, col) => {
                        const bm = bmOf(heatClasses[col]);
                        return v == null || bm == null ? null : rag((v / bm) * 100, 'coverage');
                      }}
                      highlightRow={[...branchNames, ...(branchChip ? [branchChip] : [])]}
                      onCell={(branch, col, shift) => (shift ? focusInvDays(branch, heatClasses[col]) : detail.open({ kind: 'branch', branch }))}
                    />
                    </Box>
                    <Legend items={[...ragLegend('coverage', { shape: 'band', what: 'of class benchmark' }), { label: 'No benchmark', color: colors.sunkBg, ink: colors.border, shape: 'band' }]} />
                    </Flex>
                  )}
                </ChartCard>
              </CardGrid>
              <OperationalDetail id="inv-days" kpi="IN-17" title="Inventory Days" subtitle={`Class → SKU × 14 branches + Total${invFocus ? ` · focus: ${invFocus.branch}, Class ${invFocus.cls}` : branchChip ? ` · focus: ${branchChip}` : ''}`}>
                {CardState({ ...sInv, empty: !invLeaves.length }) ?? (
                  <>
                    {invFocus && (
                      <Flex align="center" gap="8px" px={2} pb={2} fontSize="12.5px" color={colors.bodyText} data-testid="inv-focus">
                        Showing {invFocus.branch}, Class {invFocus.cls}{focusCol < 0 ? ' (all branches: no Inventory Days column for this branch)' : ''}.
                        <Box as="button" color={colors.brand} fontWeight={600} onClick={() => setInvFocus(null)}>
                          Show all
                        </Box>
                      </Flex>
                    )}
                    <GroupedTable<InvLeaf>
                      title="Inventory Days (cover days)"
                      rows={invLeaves}
                      levels={[{ key: 'cls', label: 'Class', of: (r) => r.cls, name: (r) => (r.cls === 'Others' ? 'Other' : `Class ${r.cls}`), order: (a, b) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b) }]}
                      presets={[{ value: 'cls', label: 'Class › SKU', levels: ['cls'] }]}
                      leaf={{ label: 'SKU', key: (r) => `${r.cls}|${r.sku}`, name: (r) => r.sku }}
                      figures={[
                        ...invCols.map((col) => ({
                          header: col.label,
                          value: (r: InvLeaf) => r.vals[col.i] ?? null,
                          fmt: (v: number | null) => (v == null ? '' : v.toFixed(0)),
                          // A class row shows that class's cover days (inventoryClassRows); the Total row has none.
                          group: (_rows: InvLeaf[], _level: string | null, key: string | null) => (key ? invClasses.find((c) => c.cls === key)?.vals[col.i] ?? null : null),
                          color: (r: InvLeaf) => coverColor(r.cls, r.vals[col.i]),
                          groupColor: (v: number | null, _level: string | null, key: string | null) => (key ? coverColor(key, v) : undefined),
                        })),
                        {
                          header: 'Total',
                          value: (r: InvLeaf) => r.total,
                          fmt: (v: number | null) => (v == null ? '' : v.toFixed(0)),
                          group: (_rows: InvLeaf[], _level: string | null, key: string | null) => (key ? invClasses.find((c) => c.cls === key)?.total ?? null : null),
                          color: (r: InvLeaf) => coverColor(r.cls, r.total),
                          groupColor: (v: number | null, _level: string | null, key: string | null) => (key ? coverColor(key, v) : undefined),
                        },
                      ]}
                      onLeaf={(r) => detail.open({ kind: 'sku', sku: r.sku })}
                    />
                    <Text fontSize="11.5px" color={colors.mutedText} mt={2} px={2}>
                      Total = simple average of branches with a value, not stock-weighted. Green cells are at or above the class threshold.
                    </Text>
                  </>
                )}
              </OperationalDetail>
            </>
          ),
        },
        {
          key: 'benchmarks',
          title: 'Benchmarks & thresholds',
          lead: (
            <ChartCard dataKpi="IN-13" title="Benchmark & Threshold" subtitle="1.0 Benchmark card and threshold banner" colSpan={{ base: 12, lg: 4 }} height="260px" isLoading={status(d, 'bench', 'totalSku').isLoading} expandable={false}>
              {CardState({ ...status(d, 'bench', 'totalSku'), empty: !bench.length }) ?? (
                <Box as="table" w="100%" fontSize="12.5px">
                  <thead>
                    <tr>
                      {['Class', 'Benchmark', 'Threshold', 'No. of SKUs', 'From'].map((h) => (
                        <Box as="th" key={h} textAlign={h === 'Class' ? 'left' : 'right'} color={colors.mutedText} fontWeight={500} py="4px">
                          {h}
                        </Box>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RATED_CLASSES.map((c) => {
                      const b = bench.find((x) => x.classification === c);
                      const bm = num(b?.days ?? null);
                      const th = num(b?.threshold ?? null);
                      return (
                        <tr key={c}>
                          <Box as="td" py="5px" fontWeight={700} color={clsColor(c)}>
                            {c}
                          </Box>
                          <Box as="td" textAlign="right" color={colors.darkText}>
                            {bm && bm > 0 ? days(bm) : '—'}
                          </Box>
                          <Box as="td" textAlign="right" color={colors.darkText}>
                            {th && th > 0 ? days(th) : '—'}
                          </Box>
                          <Box as="td" textAlign="right" color={colors.darkText}>
                            {full(num(totalSku.find((x) => x.classification === c)?.count ?? null))}
                          </Box>
                          <Box as="td" textAlign="right" color={colors.mutedText}>
                            {b?.effective_date ?? '—'}
                          </Box>
                        </tr>
                      );
                    })}
                    {/* Total: only the SKU count is summed; days and dates are not (FR-EXEC-026). */}
                    <Box as="tr" bg={colors.tableTotalStart} fontWeight={700} data-total-row>
                      <Box as="td" py="5px">
                        Total
                      </Box>
                      <Box as="td" />
                      <Box as="td" />
                      <Box as="td" textAlign="right" color={colors.darkText}>
                        {full(RATED_CLASSES.reduce((t, c) => t + (num(totalSku.find((x) => x.classification === c)?.count ?? null) ?? 0), 0))}
                      </Box>
                      <Box as="td" />
                    </Box>
                  </tbody>
                </Box>
              )}
              <Text fontSize="11px" color={colors.mutedText} mt={2}>
                No. of SKUs: whole range, not filtered.
              </Text>
            </ChartCard>
          ),
          details: (
            <>
              <CardGrid mb={3}>
                <ChartCard dataKpi="IN-15" title="Cover Days Threshold vs Actual" colSpan={12} height="260px" isLoading={status(d, 'tgt').isLoading}>
                  {CardState({ ...status(d, 'tgt'), empty: !tgtData.length }) ?? (
                    <Flex direction="column" h="100%">
                    <Box flex={1} minH={0}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tgtData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...grid} vertical={false} />
                        <XAxis dataKey="cls" {...axis} />
                        <YAxis {...axis} width={36} />
                        <Tooltip {...tooltipStyle} formatter={(v) => days(Number(v))} />
                        <Bar dataKey="threshold" name="Threshold" fill={colors.borderStrong} />
                        <Bar dataKey="actual" name="Actual">
                          {tgtData.map((r) => (
                            <Cell key={r.cls} fill={clsColor(r.cls)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    </Box>
                    <Legend items={[{ label: 'Threshold (days)', color: colors.borderStrong }, { label: 'Actual cover days (class colour)', color: clsColor('A'), colors: tgtData.map((r) => clsColor(r.cls)) }]} />
                    </Flex>
                  )}
                </ChartCard>
              </CardGrid>
            </>
          ),
        },
      ]}
      aside={<AreaRisks data={data} tab="inventory" area="Inventory & Capital" />}
      asideKpi="EX-10"
    />
  );
}
