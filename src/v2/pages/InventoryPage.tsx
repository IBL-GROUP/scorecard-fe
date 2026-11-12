// Tab 3: Inventory & Working Capital (PRD v2 section 4.3, wireframe 5.2).
// Every item IN-01 … IN-17 is rendered with its data-kpi ID.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/v2/components/chart-card';
import { DataTable } from '@/v2/components/data-table';
import { Segmented } from '@/v2/components/segmented';
import { ExecTile } from '@/v2/components/exec/ExecTile';
import { CardGrid, CardState, ChipBar, OperationalDetail, TileRow, ViewDetails, Zone, openDetail } from '@/v2/components/exec/Panels';
import { Bullet, Heatmap, Legend, axis, grid, tooltipStyle } from '@/v2/components/exec/charts';
import { RagDot } from '@/v2/components/exec/Rag';
import { colors } from '@/v2/constants/theme';
import { clsColor } from '@/v2/constants/classColors';
import { INV_BRANCHES, RATED_CLASSES, n0, num, type BenchmarkRow, type CoverDaysRow, type TgtVsActualRow, type TotalSkuRow } from '@/v2/api/types';
import { rowsOf, type DashboardData } from '@/v2/features/data';
import { service, status, stock, workingCapitalTrend } from '@/v2/features/derive';
import { classCoverage, inventoryClassRows, shortfallRag } from '@/v2/features/kpis';
import { rag } from '@/v2/features/kpiThresholds';
import { change, days, full, money, pct0, pct1, pkr } from '@/v2/features/format';
import { monthLabel } from '@/v2/features/period';
import { useStore } from '@/v2/features/store';

const CLASS_ORDER = ['A', 'B', 'C', 'N', 'Others'];

import { useDetail } from '@/v2/features/detail';

export function InventoryPage({ data }: { data: DashboardData }) {
  const d = data.tabs.inventory;
  const st = useStore();
  const detail = useDetail();
  const chip = st.chips.inventory;
  const clsChip = chip?.key === 'cls' ? chip.value : null;
  const branchChip = chip?.key === 'branch' ? chip.value : null;
  const [basis, setBasis] = useState<'TP' | 'EFP'>('TP');
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
  const sStock = status(d, 'cover', 'coverTotal', 'bench');
  const sSvc = status(d, 'aboveBelow');
  const sTrend = status(d, ...[0, 1, 2, 3, 4, 5].flatMap((i) => [`wcFg${i}`, `wcWip${i}`, `wcRpm${i}`]));
  const sMatrix = status(d, 'serviceAll');
  const sInv = status(d, 'invDays', 'bench');

  const wcTotal = cur ? cur.total : null;
  const excessRag = rag(s.excess.pct, 'excessPct');
  const shortRag = shortfallRag(s.shortfall);

  // IN-14 cards: Total + classes.
  const coverRows = rowsOf<CoverDaysRow>(d.cover);
  const cards = [
    ...(s.total ? [{ cls: 'Total', r: s.total }] : []),
    ...CLASS_ORDER.map((c) => ({ cls: c, r: coverRows.find((r) => (r.classification ?? 'Others') === c) })).filter((x): x is { cls: string; r: CoverDaysRow } => !!x.r),
  ];

  // IN-07 scale.
  const bulletMax = Math.max(10, ...s.cls.flatMap((r) => [r.cd ?? 0, r.bm ?? 0, r.th ?? 0])) * 1.1;

  // IN-08 waterfall: start FG, minus each class excess, end right-sized; shortfall as separate bars.
  const excessSteps = s.excessByClass.filter((e) => e.value > 0);
  let running = s.fgCost ?? 0;
  const bridge: { name: string; base: number; value: number; kind: 'total' | 'down' | 'short' }[] = [{ name: 'FG at cost', base: 0, value: running, kind: 'total' }];
  for (const e of excessSteps) {
    running -= e.value;
    bridge.push({ name: `Excess ${e.cls}`, base: running, value: e.value, kind: 'down' });
  }
  bridge.push({ name: 'Right-sized', base: 0, value: Math.max(0, running), kind: 'total' });
  for (const sh of s.shortfall) bridge.push({ name: `Short ${sh.cls}`, base: 0, value: sh.value, kind: 'short' });

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
  const headers = ['Class / SKU', ...INV_BRANCHES.filter((_, i) => keepCol(i)).map((b) => b.label), 'Total'];
  const tableRows = invClasses
    .filter((c) => showCls(c.cls) && (!invFocus || c.cls === invFocus.cls))
    .flatMap((c) => {
      const th = thOf(c.cls);
      const color = (v: number) => (th != null && v >= th ? colors.good : undefined);
      return [
        { onClick: () => detail.open({ kind: 'class', cls: c.cls }), cells: [`Class ${c.cls}`, ...c.vals.filter((_, i) => keepCol(i)).map((v) => v.toFixed(0)), c.total.toFixed(0)], cellColors: [undefined, ...c.vals.filter((_, i) => keepCol(i)).map(color), color(c.total)], cellWeights: c.vals.filter((_, i) => keepCol(i)).map(() => '700').concat(['700', '700']) },
        ...c.skus.map((k) => ({ onClick: () => detail.open({ kind: 'sku', sku: k.sku }), cells: [`  ↳ ${k.sku}`, ...k.vals.filter((_, i) => keepCol(i)).map((v) => v.toFixed(0)), k.total.toFixed(0)], cellColors: [undefined, ...k.vals.filter((_, i) => keepCol(i)).map(color), color(k.total)] })),
      ];
    });

  return (
    <Box>
      <ChipBar tab="inventory" />

      <Zone label="Verdict">
        <TileRow max={6}>
          <ExecTile
            id="IN-01"
            label="Supply-Chain Working Capital"
            value={pkr(wcTotal)}
            caption="At cost: finished goods + WIP + RMPM"
            delta={{ value: change(cur?.total, prevMonth?.total), label: 'vs previous month-end', upIsGood: false }}
            spark={trend.map((t) => t.total)}
            {...sWc}
          />
          <ExecTile id="IN-02" label="FG Inventory Value (cost)" value={pkr(s.fgCost)} caption={`At TP: ${pkr(s.fgTp)}`} {...status(d, 'coverTotal')} />
          <ExecTile id="IN-03" label="Coverage Index" value={pct1(s.coverage)} rag={rag(s.coverage, 'coverage')} band="coverage" variance={`${days(s.totalCd)} vs ${days(s.wBm)} benchmark`} {...sStock} />
          <ExecTile
            id="IN-04"
            label="Excess Inventory Value"
            value={pkr(s.excess.value)}
            rag={excessRag}
            band="excessPct"
            variance={`${pct1(s.excess.pct)} of FG at cost`}
            {...sStock}
          />
          <ExecTile id="IN-05" label="Cover Shortfall Value (TP)" value={pkr(s.shortfallValue)} rag={sStock.isLoading ? null : shortRag} caption={s.shortfall.length ? `Below threshold: ${s.shortfall.map((x) => x.cls).join(', ')}` : 'No class below threshold'} {...sStock} />
          <ExecTile id="IN-06" label="Stock-out Risk" value={pct1(sv.risk)} rag={rag(sv.risk, 'stockoutRisk')} band="stockoutRisk" caption={`${full(sv.below)} of ${full(sv.above + sv.below)} SKUs below threshold`} {...sSvc} />
        </TileRow>
      </Zone>

      <Zone label="Why">
        <CardGrid mb={3}>
          <ChartCard
            dataKpi="IN-14"
            title="Cover Days by Class"
            subtitle={basis === 'TP' ? 'Valued at trade price (TP)' : 'Valued at item cost (EFP)'}
            colSpan={12}
            isLoading={sStock.isLoading}
            expandable={false}
            headerRight={<Segmented size="xs" value={basis} onChange={setBasis} ariaLabel="Valuation" options={[{ value: 'TP', label: 'TP' }, { value: 'EFP', label: 'EFP' }]} />}
          >
            {CardState({ ...sStock, empty: !cards.length }) ?? (
              <Grid templateColumns={{ base: 'repeat(2, minmax(0,1fr))', md: 'repeat(3, minmax(0,1fr))', xl: 'repeat(6, minmax(0,1fr))' }} gap={3}>
                {cards.map(({ cls, r }) => {
                  const cd = num(basis === 'TP' ? r.cover_days : r.cover_days_efp);
                  const inv = num(basis === 'TP' ? r.inv_val : r.inv_val_efp);
                  const cs = s.cls.find((x) => x.cls === cls);
                  const rg = cs ? rag(classCoverage(cs), 'coverage') : null;
                  const dim = clsChip && cls !== clsChip && cls !== 'Total';
                  return (
                    <Box key={cls} borderTop={`3px solid ${clsColor(cls)}`} bg={colors.sunkBg} borderRadius="3px" px={3} py={2} opacity={dim ? 0.4 : 1}>
                      <Flex align="center" gap="6px">
                        <Text fontSize="12.5px" fontWeight={700} color={colors.darkText}>
                          {cls === 'Total' ? 'Total' : `Class ${cls}`}
                        </Text>
                        <Box ml="auto">
                          <RagDot rag={rg} />
                        </Box>
                      </Flex>
                      <Text fontSize="22px" fontWeight={700} color={colors.darkText}>
                        {days(cd)}
                      </Text>
                      <Text fontSize="12px" color={colors.bodyText}>
                        {pkr(inv)}
                      </Text>
                      <Text fontSize="12px" color={colors.mutedText}>
                        {full(num(r.quantity))} units
                      </Text>
                    </Box>
                  );
                })}
              </Grid>
            )}
          </ChartCard>
        </CardGrid>
        <CardGrid>
          <ChartCard dataKpi="IN-07" title="Cover Days vs Benchmark by Class" subtitle="Bar = actual · tick = benchmark · red zone = below threshold" colSpan={{ base: 12, lg: 6 }} height="280px" isLoading={sStock.isLoading}>
            {CardState({ ...sStock, empty: !s.cls.length }) ?? (
              <Box>
                {s.cls
                  .filter((r) => showCls(r.cls))
                  .map((r) => {
                    const cov = classCoverage(r);
                    const rg = rag(cov, 'coverage');
                    return (
                      <Bullet
                        key={r.cls}
                        label={`Class ${r.cls}`}
                        actual={r.cd}
                        target={r.bm}
                        threshold={r.th}
                        max={bulletMax}
                        color={clsColor(r.cls)}
                        rag={rg}
                        right={
                          <>
                            {days(r.cd)} · {cov == null ? 'no benchmark' : pct0(cov)} <RagDot rag={rg} />
                          </>
                        }
                        onClick={() => detail.open({ kind: 'class', cls: r.cls })}
                      />
                    );
                  })}
                {s.totalCd != null && (
                  <Bullet label="Total" actual={s.totalCd} target={s.wBm} max={bulletMax} color={colors.darkText} rag={rag(s.coverage, 'coverage')} right={<>{days(s.totalCd)} · {pct0(s.coverage)}</>} />
                )}
              </Box>
            )}
          </ChartCard>
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
                <Legend items={[{ label: 'Finished goods', color: colors.sales }, { label: 'WIP', color: colors.target }, { label: 'RMPM', color: colors.prior }, { label: 'Total', color: colors.darkText }]} />
              </Flex>
            )}
          </ChartCard>
        </CardGrid>
      </Zone>

      <Zone label="Where">
        <CardGrid mb={3}>
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
                </tbody>
              </Box>
            )}
            <Text fontSize="11px" color={colors.mutedText} mt={2}>
              No. of SKUs: whole range, not filtered.
            </Text>
          </ChartCard>
          <ChartCard dataKpi="IN-15" title="Cover Days Threshold vs Actual" colSpan={{ base: 12, lg: 4 }} height="260px" isLoading={status(d, 'tgt').isLoading}>
            {CardState({ ...status(d, 'tgt'), empty: !tgtData.length }) ?? (
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
            )}
          </ChartCard>
          <ChartCard dataKpi="IN-16" title="SKUs Against Threshold" colSpan={{ base: 12, lg: 4 }} height="260px" isLoading={sSvc.isLoading} headerRight={<ViewDetails detailId="inv-days" />}>
            {CardState({ ...sSvc, empty: !abData.length }) ?? (
              <Flex direction="column" h="100%">
                <Box flex={1} minH={0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={abData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid {...grid} horizontal={false} />
                      <XAxis type="number" {...axis} />
                      <YAxis type="category" dataKey="cls" {...axis} width={30} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="above" name="Above threshold" stackId="s" fill={colors.borderStrong} />
                      <Bar dataKey="below" name="Below threshold" stackId="s" fill={colors.bad} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <Legend items={[{ label: 'Above threshold', color: colors.borderStrong }, { label: 'Below threshold (risk)', color: colors.bad }]} />
              </Flex>
            )}
          </ChartCard>
        </CardGrid>

        <CardGrid mb={3}>
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
                <Heatmap
                  cols={RATED_CLASSES.map((c) => `Class ${c}`)}
                  rows={sv.matrix.map((r) => ({ label: r.branch, cells: r.cells }))}
                  format={(v) => pct0(v)}
                  ragOf={(v) => rag(v, 'serviceLevel')}
                  highlightRow={[...branchNames, ...(branchChip ? [branchChip] : [])]}
                  onCell={(branch, col, shift) => (shift ? focusInvDays(branch, RATED_CLASSES[col]) : detail.open({ kind: 'branch', branch }))}
                />
              ) : (
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
              ))}
          </ChartCard>
          <ChartCard dataKpi="IN-11" title="Branch Service Ranking" subtitle="Simple average across classes, not SKU-weighted · bottom 5 highlighted" colSpan={{ base: 12, lg: 5 }} height="460px" isLoading={sMatrix.isLoading}>
            {CardState({ ...sMatrix, empty: !ranking.length }) ?? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ranking} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid {...grid} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow {...axis} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="branch" {...axis} width={88} interval={0} />
                  <Tooltip {...tooltipStyle} formatter={(v) => pct1(Number(v))} />
                  <Bar dataKey="avg" name="Average service level">
                    {ranking.map((r) => (
                      <Cell key={r.branch} fill={r.worst ? colors.bad : colors.borderStrong} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </CardGrid>

        <CardGrid mb={3}>
          <ChartCard dataKpi="IN-12" title="Cover Days by Branch" subtitle="Average cover of each class’s SKUs · coloured against the class benchmark" colSpan={{ base: 12, lg: 7 }} height="460px" isLoading={sInv.isLoading} headerRight={<ViewDetails detailId="inv-days" />}>
            {CardState({ ...sInv, empty: !invClasses.length }) ?? (
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
            )}
          </ChartCard>
          <ChartCard dataKpi="IN-08" title="Excess / Shortfall Bridge" subtitle="FG at cost → less excess above benchmark → right-sized; shortfall (TP) in red" colSpan={{ base: 12, lg: 5 }} height="460px" isLoading={sStock.isLoading}>
            {CardState({ ...sStock, empty: !s.cls.length }) ?? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bridge} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
                  <CartesianGrid {...grid} vertical={false} />
                  <XAxis dataKey="name" {...axis} angle={-30} textAnchor="end" interval={0} height={50} />
                  <YAxis {...axis} tickFormatter={(v: number) => money(v)} width={52} />
                  <Tooltip {...tooltipStyle} formatter={(v, name) => (name === 'base' ? null : pkr(Number(v)))} />
                  <Bar dataKey="base" stackId="w" fill="transparent" legendType="none" />
                  <Bar dataKey="value" name="Value" stackId="w">
                    {bridge.map((b) => (
                      <Cell key={b.name} fill={b.kind === 'total' ? colors.sales : b.kind === 'down' ? colors.warn : colors.bad} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </CardGrid>
      </Zone>

      <Zone label="Detail">
        <OperationalDetail id="inv-days" kpi="IN-17" title="Inventory Days" subtitle={`Class → SKU × 14 branches + Total${invFocus ? ` · focus: ${invFocus.branch}, Class ${invFocus.cls}` : branchChip ? ` · focus: ${branchChip}` : ''}`}>
          {CardState({ ...sInv, empty: !tableRows.length }) ?? (
            <>
              {invFocus && (
                <Flex align="center" gap="8px" px={2} pb={2} fontSize="12.5px" color={colors.bodyText} data-testid="inv-focus">
                  Showing {invFocus.branch}, Class {invFocus.cls}{focusCol < 0 ? ' (all branches: no Inventory Days column for this branch)' : ''}.
                  <Box as="button" color={colors.brand} fontWeight={600} onClick={() => setInvFocus(null)}>
                    Show all
                  </Box>
                </Flex>
              )}
              <DataTable title="Inventory Days (cover days)" headerGradient={colors.tableHeaderBg} headers={headers} rows={tableRows} pageSize={80} autoTotal={false} />
              <Text fontSize="11.5px" color={colors.mutedText} mt={2} px={2}>
                Total = simple average of branches with a value, not stock-weighted. Green cells are at or above the class threshold.
              </Text>
            </>
          )}
        </OperationalDetail>
      </Zone>
    </Box>
  );
}
