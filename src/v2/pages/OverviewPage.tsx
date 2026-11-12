// Tab 1: Executive Overview (PRD v2 section 4.1, wireframe 5.2).
// The 60-second view: plan and service first, then cash and visibility, then
// the ranked Top Risks & Opportunities, then two trends.

import { Box, Flex, Text } from '@chakra-ui/react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiArrowRight, FiTrendingUp } from 'react-icons/fi';
import { ChartCard } from '@/v2/components/chart-card';
import { ExecTile } from '@/v2/components/exec/ExecTile';
import { CardGrid, CardState, TileRow, Zone, DATES_ONLY } from '@/v2/components/exec/Panels';
import { RAG_META } from '@/v2/components/exec/Rag';
import { axis, grid, tooltipStyle } from '@/v2/components/exec/charts';
import { colors } from '@/v2/constants/theme';
import { helpFor } from '@/v2/constants/help';
import type { DashboardData } from '@/v2/features/data';
import { distribution, fulfilment, plan, production, service, status, stock, trust, workingCapitalTrend } from '@/v2/features/derive';
import { buildRisks, type Risk } from '@/v2/features/kpis';
import { rag } from '@/v2/features/kpiThresholds';
import { change, money, pct1, pkr, days } from '@/v2/features/format';
import { useNav } from '@/v2/features/nav';
import { useStore } from '@/v2/features/store';
import type { TabKey } from '@/v2/features/tabs';
import { monthLabel } from '@/v2/features/period';
import { InfoTip } from '@/v2/components/overlay';
import { BarChart as DsBarChart } from '@/v2/components/charts';

export const compareLabel = (c: 'prev' | 'ly') => (c === 'ly' ? 'vs same period LY' : 'vs previous period');

function RiskList({ risks, loading, onOpen }: { risks: Risk[]; loading: boolean; onOpen: (r: Risk) => void }) {
  const help = helpFor('EX-10');
  return (
    <Box data-kpi="EX-10" scrollMarginTop="140px" bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderRadius="4px" px={4} py={3}>
      <Flex align="center" gap="8px" mb={2}>
        <Text fontWeight={600} fontSize="14.5px" color={colors.darkText}>
          Top Risks &amp; Opportunities
        </Text>
        <Text fontSize="12px" color={colors.mutedText}>
          ranked, most severe first
        </Text>
        <Box ml="auto">{help && <InfoTip help={help} />}</Box>
      </Flex>
      {loading ? (
        <Text fontSize="13px" color={colors.mutedText}>
          Checking the figures…
        </Text>
      ) : risks.length === 0 ? (
        <Text fontSize="13px" color={colors.good}>
          ✓ Nothing needs attention: every KPI is within its band.
        </Text>
      ) : (
        <Flex direction="column" as="ol" listStyleType="none">
          {risks.map((r) => {
            const meta = r.tone === 'opportunity' ? null : RAG_META[r.tone === 'red' ? 'red' : 'amber'];
            const color = meta ? meta.color : colors.good;
            // The <li> keeps list semantics; the link role sits on its content (WCAG 1.3.1, S5).
            return (
              <Box as="li" key={r.id} borderTop="1px solid" borderColor={colors.border}>
                <Flex
                  align="center"
                  gap="10px"
                  py="7px"
                  cursor="pointer"
                  _hover={{ bg: colors.hoverBg }}
                  onClick={() => onOpen(r)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onOpen(r)}
                >
                  <Flex align="center" gap="5px" minW="92px" color={color} fontSize="12px" fontWeight={700}>
                    {meta ? <meta.Icon /> : <FiTrendingUp />}
                    {meta ? (r.tone === 'red' ? 'Act' : 'Watch') : 'Opportunity'}
                  </Flex>
                  <Text fontSize="13px" color={colors.darkText} flex={1}>
                    {r.text}
                  </Text>
                  <Flex align="center" gap="4px" fontSize="12px" color={colors.brand} flexShrink={0}>
                    {r.kpi} <FiArrowRight />
                  </Flex>
                </Flex>
              </Box>
            );
          })}
        </Flex>
      )}
    </Box>
  );
}

import { useDetail } from '@/v2/features/detail';

export function OverviewPage({ data }: { data: DashboardData }) {
  const d = data.tabs.overview;
  const nav = useNav();
  const detail = useDetail();
  const { compare } = useStore();
  // A risk about a class, branch or channel opens its sheet; others go to the tab.
  const openRisk = (r: Risk) => {
    if (r.chip?.key === 'cls') detail.open({ kind: 'class', cls: r.chip.value });
    else if (r.chip?.key === 'branch') detail.open({ kind: 'branch', branch: r.chip.value });
    else if (r.chip?.key === 'channel') detail.open({ kind: 'channel', channel: r.chip.value });
    else nav(r.tab as TabKey, r.kpi);
  };
  const cl = compareLabel(compare);

  const p = plan(d, data.window);
  const s = stock(d);
  const sv = service(d);
  const f = fulfilment(d);
  const pr = production(d);
  const rd = distribution(d);
  const tr = trust(d);
  const wc = workingCapitalTrend(d, data.window.end);
  const wcNow = wc[wc.length - 1];
  const wcPrev = wc[wc.length - 2];

  const st = {
    att: status(d, 'fam', 'daysgone'),
    bud: status(d, 'fay'),
    cover: status(d, 'cover', 'coverTotal', 'bench'),
    svc: status(d, 'aboveBelow', 'serviceAll'),
    fill: status(d, 'dispatch'),
    wc: status(d, 'coverTotal', 'wip', 'rpm'),
    rd: status(d, 'rd'),
  };

  const tiles = {
    att: { rag: rag(p.attIbl, 'attainment'), value: pct1(p.attIbl) },
    proj: { rag: rag(p.projected, 'projected'), value: pct1(p.projected) },
    bud: { rag: rag(p.attBud, 'attainment'), value: pct1(p.attBud) },
    svc: { rag: rag(sv.level, 'serviceLevel'), value: pct1(sv.level) },
    fill: { rag: rag(f.pct, 'fillRate'), value: pct1(f.pct) },
    cov: { rag: rag(s.coverage, 'coverage'), value: pct1(s.coverage) },
    exc: { rag: rag(s.excess.pct, 'excessPct'), value: pkr(s.excess.value) },
    rd: { rag: rag(rd.compliance, 'rdCompliance'), value: pct1(rd.compliance) },
  };

  const names: Record<string, [string, string, string]> = {
    att: ['EX-01', 'Sales attainment to date', 'revenue'],
    proj: ['EX-02', 'Projected month-end', 'revenue'],
    bud: ['EX-03', 'Budget attainment to date', 'revenue'],
    svc: ['EX-05', 'Service level', 'inventory'],
    fill: ['EX-06', 'Order fill rate', 'fulfilment'],
    cov: ['EX-04', 'Coverage index', 'inventory'],
    exc: ['EX-08', 'Excess inventory', 'inventory'],
    rd: ['EX-09', 'RD reporting compliance', 'distribution'],
  };
  const redKpis = Object.entries(tiles)
    .filter(([, t]) => t.rag === 'red')
    .map(([k, t]) => ({ id: names[k][0], name: names[k][1], value: t.value, tab: names[k][2] }));
  const allLoading = st.att.isLoading || st.cover.isLoading || st.svc.isLoading || st.fill.isLoading || st.rd.isLoading;
  const risks = buildRisks({
    redKpis,
    serviceMatrix: sv.matrix,
    classStock: s.cls,
    channels: f.channels,
    rdRows: rd.rows,
    blockedQiPct: pr.r.blockedQiPct,
    planAlignmentPct: p.alignment,
    classAttainment: p.classRank,
    fmtMoney: money,
  });

  const trustRed = rag(tr.freshness, 'freshnessDays') === 'red' || tr.checks.some((c) => !c.ok && !d.fam.isLoading) || rag(tr.unclassified, 'unclassifiedPct') === 'red';

  return (
    <Box>
      {trustRed && (
        <Flex mb={3} px={4} py="8px" borderRadius="4px" bg={colors.badSoft} color={colors.bad} fontSize="13px" fontWeight={600} align="center" gap="8px" role="alert">
          Some figures may be incomplete: see Data Health.
          <Box as="button" ml="auto" textDecoration="underline" onClick={() => nav('distribution', 'DH-07')}>
            Open Data Health
          </Box>
        </Flex>
      )}

      <Zone label="Plan & service">
        <TileRow max={5}>
          <ExecTile
            id="EX-01"
            label="Sales attainment to date"
            value={tiles.att.value}
            rag={tiles.att.rag}
            band="attainment"
            variance={p.varIbl == null ? undefined : `vs pace: ${p.varIbl >= 0 ? '+' : '−'}PKR ${money(Math.abs(p.varIbl))}`}
            delta={{ value: p.attIbl != null && p.attIblCmp != null ? p.attIbl - p.attIblCmp : null, unit: 'pts', label: cl }}
            spark={p.spark}
            {...st.att}
            goTo={{ tab: 'revenue', focus: 'RV-02' }}
          />
          <ExecTile
            id="EX-02"
            label={p.projectedFinal ? 'Month-end attainment (final)' : 'Projected month-end'}
            value={tiles.proj.value}
            rag={tiles.proj.rag}
            band="projected"
            caption={p.single ? (p.projectedFinal ? 'Final: the month is complete' : `If today's run-rate holds · ${p.days.pct}% of the month gone`) : 'Shown for a single month only'}
            {...st.att}
            goTo={{ tab: 'revenue', focus: 'RV-03' }}
          />
          <ExecTile
            id="EX-03"
            label="Budget attainment to date"
            value={tiles.bud.value}
            rag={tiles.bud.rag}
            band="attainment"
            variance={p.varBud == null ? undefined : `vs pace: ${p.varBud >= 0 ? '+' : '−'}PKR ${money(Math.abs(p.varBud))}`}
            delta={{ value: p.attBud != null && p.attBudCmp != null ? p.attBud - p.attBudCmp : null, unit: 'pts', label: cl }}
            {...st.bud}
            goTo={{ tab: 'revenue', focus: 'RV-04' }}
          />
          <ExecTile
            id="EX-05"
            label="Service level"
            value={tiles.svc.value}
            rag={tiles.svc.rag}
            band="serviceLevel"
            caption={sv.worst?.avg != null ? `Lowest: ${sv.worst.branch} ${Math.round(sv.worst.avg)}%` : undefined}
            {...st.svc}
            goTo={{ tab: 'inventory', focus: 'IN-10' }}
          />
          <ExecTile
            id="EX-06"
            label="Order fill rate"
            value={tiles.fill.value}
            rag={tiles.fill.rag}
            band="fillRate"
            delta={{ value: f.pct != null && f.cmpPct != null ? f.pct - f.cmpPct : null, unit: 'pts', label: cl }}
            caption="By quantity"
            {...st.fill}
            goTo={{ tab: 'fulfilment', focus: 'OP-01' }}
          />
        </TileRow>
      </Zone>

      <Zone label="Cash & visibility">
        <TileRow max={4}>
          <ExecTile
            id="EX-04"
            label="Coverage index"
            value={tiles.cov.value}
            rag={tiles.cov.rag}
            band="coverage"
            variance={`${days(s.totalCd)} cover vs ${days(s.wBm)} benchmark`}
            {...st.cover}
            goTo={{ tab: 'inventory', focus: 'IN-03' }}
          />
          <ExecTile
            id="EX-07"
            label="Supply-chain working capital"
            value={pkr(wcNow?.total)}
            valueSuffix="at cost"
            delta={{ value: change(wcNow?.total, wcPrev?.total), label: 'vs previous month-end', upIsGood: false }}
            spark={wc.map((x) => x.total || null)}
            {...st.wc}
            goTo={{ tab: 'inventory', focus: 'IN-01' }}
          >
            <Flex h="6px" borderRadius="3px" overflow="hidden" title="Finished goods / WIP / RMPM" mt="2px">
              {wcNow && wcNow.total > 0 && (
                <>
                  <Box w={`${(wcNow.fg / wcNow.total) * 100}%`} bg={colors.sales} />
                  <Box w={`${(wcNow.wip / wcNow.total) * 100}%`} bg={colors.target} />
                  <Box w={`${(wcNow.rpm / wcNow.total) * 100}%`} bg={colors.prior} />
                </>
              )}
            </Flex>
            <Text fontSize="11px" color={colors.mutedText}>
              FG {money(wcNow?.fg)} · WIP {money(wcNow?.wip)} · RMPM {money(wcNow?.rpm)}
            </Text>
          </ExecTile>
          <ExecTile
            id="EX-08"
            label="Excess inventory"
            value={tiles.exc.value}
            valueSuffix="at cost"
            rag={tiles.exc.rag}
            band="excessPct"
            variance={`${pct1(s.excess.pct)} of finished goods above benchmark`}
            {...st.cover}
            goTo={{ tab: 'inventory', focus: 'IN-08' }}
          />
          <ExecTile
            id="EX-09"
            label="RD reporting compliance"
            value={tiles.rd.value}
            rag={tiles.rd.rag}
            band="rdCompliance"
            caption={`${rd.reporting} of ${rd.count} RDs reported today`}
            scopeNote={DATES_ONLY}
            {...st.rd}
            goTo={{ tab: 'distribution', focus: 'DH-01' }}
          />
        </TileRow>
      </Zone>

      <Zone label="What needs attention">
        <RiskList risks={risks} loading={allLoading} onOpen={openRisk} />
      </Zone>

      <Zone label="Trends">
        <CardGrid>
          <ChartCard title="Sales attainment, 6 months" subtitle="All classes, vs IBL target · 100% = on target · this month pace-adjusted" colSpan={6} height="240px" isLoading={st.att.isLoading} help={helpFor('RV-06')} dataKpi="EX-01">
            {CardState({ locked: st.att.locked, error: st.att.error, empty: !p.trend.length }) ?? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={p.trend.map((r) => ({ ...r, label: monthLabel(r.month as string) }))} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid {...grid} vertical={false} />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis {...axis} domain={['dataMin - 5', 'dataMax + 5']} allowDecimals={false} tickFormatter={(v) => `${Math.round(Number(v))}%`} />
                  <ReferenceArea y1={90} y2={100} fill={colors.warnSoft} fillOpacity={0.6} />
                  <ReferenceLine y={100} stroke={colors.target} strokeDasharray="4 3" />
                  <Tooltip {...tooltipStyle} formatter={(v) => pct1(Number(v))} />
                  <Line type="monotone" dataKey="Total" stroke={colors.sales} strokeWidth={2.5} dot={{ r: 3 }} name="All classes" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Working capital composition, 6 month-ends" subtitle="Finished goods at cost, WIP and RMPM" colSpan={6} height="240px" isLoading={st.wc.isLoading} help={helpFor('IN-09')} dataKpi="EX-07">
            {CardState({ locked: st.wc.locked, error: st.wc.error, empty: !wc.some((x) => x.total > 0) }) ?? (
              <DsBarChart
                data={wc.map((x) => ({ month: monthLabel(x.month), fg: x.fg, wip: x.wip, rpm: x.rpm }))}
                xKey="month"
                variant="stacked-bar"
                orientation="vertical"
                height="100%"
                bars={[
                  { key: 'fg', label: 'Finished goods', color: colors.sales },
                  { key: 'wip', label: 'WIP', color: colors.target },
                  { key: 'rpm', label: 'RMPM', color: colors.prior },
                ]}
                yTickFormatter={(v) => money(v)}
              />
            )}
          </ChartCard>
        </CardGrid>
      </Zone>
    </Box>
  );
}
