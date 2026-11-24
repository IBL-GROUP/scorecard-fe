// Tab 1: Pulse — the supply chain director view, in Sales Pulse 2.0's Pulse
// layout (dsr-fe components/pulse/PulseView): the supply chain at a glance in
// the dark band (service, fill, cover, excess, working capital), its health and
// the service grid under it, and Key insights on the right. Sales Pulse is about
// sales; this tab is about stock, service, dispatch, production and
// distributors (user, 19 Nov 2026). Every row, cell and insight opens where it lives.

import { Box, Flex, Grid, HStack, Skeleton, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { FiArrowRight, FiMaximize2 } from 'react-icons/fi';
import { colors, fmt1 } from '@/constants/theme';
import { PULSE_HELP, helpFor, type HelpText } from '@/constants/help';
import { RATED_CLASSES } from '@/api/types';
import type { DashboardData } from '@/features/data';
import { distribution, fulfilment, production, service, status, stock, trust } from '@/features/derive';
import { buildRisks, type Risk } from '@/features/kpis';
import { kpiThresholds, rag, type BandKey, type Rag } from '@/features/kpiThresholds';
import { DASH, full, money, pct1, pkr } from '@/features/format';
import { useNav } from '@/features/nav';
import { useDetail } from '@/features/detail';
import { TABS, type TabKey } from '@/features/tabs';
import { rangeLabel } from '@/features/period';
import { ChartCard } from '@/ui/chart-card';
import { RowBars } from '@/ui/row-bars';
import { InfoTip, Overlay } from '@/ui/overlay';
import { AnimatedValue } from '@/ui/motion';
import { titleCase } from '@/utils/titleCase';
import { ReviewSheet } from '@/ui/pulse/ReviewSheet';
import type { AnalyzePoint } from '@/ui/analyze';

const INK: Record<Rag, string> = { green: colors.good, amber: colors.warn, red: colors.bad };
const RAG_WORD: Record<Rag, string> = { green: 'On Target', amber: 'Watch', red: 'Below' };
const tabLabel = (k: TabKey) => TABS.find((t) => t.key === k)?.mid ?? k;
const dayText = (n: number | null | undefined) => (n == null ? DASH : `${Math.round(n)} d`);

// ── Insights: the scorecard's exception rules, in Sales Pulse's insight shape ──

type Tone = 'bad' | 'good' | 'data';
interface Insight {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  weight: number;
  /** tab: it leaves the page (the ⤢ pop-out closes first); otherwise a sheet slides in on top. */
  action?: { label: string; run: () => void; tab?: boolean };
}

/** Why each supply chain exception matters, in a director's words. */
const WHY: Record<string, string> = {
  R1: 'A headline supply chain KPI is below its red line.',
  R2: 'Customers in this branch are not getting this class in full.',
  R3: 'Cover is below the class threshold: stock-out risk.',
  R4: 'Stock far above benchmark ties up working capital.',
  R5: 'Orders in this channel are not dispatched in full.',
  R6: 'Their stock is not seen, so replenishment runs on old figures.',
  R7: 'Held material can hold up production.',
  O2: 'Stock above benchmark that could be released to cut working capital.',
};
/** Sales rules (achievement, forecast vs budget) belong to Summary, not to the supply chain view. */
const SALES_RULES = ['R8', 'O1'];

/** The supply chain's figures, statuses and insights. */
function pulseModel(data: DashboardData) {
  const d = data.tabs.overview;
  const s = stock(d);
  const sv = service(d);
  const f = fulfilment(d);
  const pr = production(d);
  const rd = distribution(d);
  const tr = trust(d);
  const st = {
    cover: status(d, 'cover', 'coverTotal', 'bench'),
    svc: status(d, 'aboveBelow', 'serviceAll'),
    fill: status(d, 'dispatch'),
    prod: status(d, 'wip', 'rpm'),
    rd: status(d, 'rd'),
  };
  const wc = { fg: s.fgCost ?? 0, wip: pr.w.value, rmpm: pr.r.total };
  const working = wc.fg + wc.wip + wc.rmpm;

  const row = (key: string, name: string, value: number | null, band: BandKey, target: number, note: string, tab: TabKey, focus: string, loading: boolean) => ({
    key,
    name,
    value,
    band,
    target,
    note,
    tab,
    focus,
    loading,
    rag: rag(value, band),
  });
  const T = kpiThresholds;
  const health = [
    row('svc', 'Service level', sv.level, 'serviceLevel', T.serviceLevel.green, `target ${T.serviceLevel.green}%`, 'inventory', 'IN-10', st.svc.isLoading),
    row('fill', 'Order fill rate', f.pct, 'fillRate', T.fillRate.green, `target ${T.fillRate.green}%`, 'fulfilment', 'OP-01', st.fill.isLoading),
    row('cov', 'Coverage index', s.coverage, 'coverage', 100, `band ${T.coverage.greenLo}–${T.coverage.greenHi}%`, 'revenue', 'IN-03', st.cover.isLoading),
    row('exc', 'Excess inventory', s.excess.pct, 'excessPct', T.excessPct.green, `under ${T.excessPct.green}%`, 'revenue', 'IN-08', st.cover.isLoading),
    row('wip', 'Production completion', pr.w.completion, 'productionCompletion', T.productionCompletion.green, `target ${T.productionCompletion.green}%`, 'fulfilment', 'OP-06', st.prod.isLoading),
    row('hold', 'RMPM on hold', pr.r.onHoldPct, 'onHoldPct', T.onHoldPct.green, `under ${T.onHoldPct.green}%`, 'fulfilment', 'OP-11', st.prod.isLoading),
    row('rd', 'RD reporting compliance', rd.compliance, 'rdCompliance', T.rdCompliance.green, `target ${T.rdCompliance.green}%`, 'distribution', 'DH-01', st.rd.isLoading),
  ];

  const risks = buildRisks(
    {
      redKpis: health.filter((h) => h.rag === 'red').map((h) => ({ id: h.focus, name: h.name, value: pct1(h.value), tab: h.tab })),
      serviceMatrix: sv.matrix,
      classStock: s.cls,
      channels: f.channels,
      rdRows: rd.rows,
      blockedQiPct: pr.r.blockedQiPct,
      planAlignmentPct: null,
      classAttainment: [],
      fmtMoney: money,
    },
    Infinity,
  ).filter((r) => !SALES_RULES.includes(r.id.split('-')[0]));
  // Going well: every headline KPI on target.
  const wins = health.filter((h) => h.rag === 'green');
  // Data checks: what makes the other figures less trustworthy.
  const dataChecks: { id: string; title: string; detail: string; tab: TabKey; focus: string }[] = [];
  if (rag(tr.freshness, 'freshnessDays') === 'red') dataChecks.push({ id: 'D1', title: `Stock data is ${tr.freshness} days old`, detail: 'Cover, excess and service use the last closing stock.', tab: 'distribution', focus: 'DH-07' });
  const bench = tr.checks.find((c) => c.label.startsWith('Benchmarks'));
  if (!st.cover.isLoading && bench && !bench.ok) dataChecks.push({ id: 'D2', title: 'Benchmarks or thresholds missing', detail: 'Cover, excess and shortfall show no status for those classes.', tab: 'revenue', focus: 'IN-03' });
  if (rd.count > 0 && rd.staleValue > 0) dataChecks.push({ id: 'D3', title: `${money(rd.staleValue)} of distributor stock not reported today`, detail: `${full(rd.count - rd.reporting)} RDs show their previous stock.`, tab: 'distribution', focus: 'DH-03' });

  const loading = st.cover.isLoading || st.svc.isLoading || st.fill.isLoading || st.prod.isLoading || st.rd.isLoading;
  return { s, sv, f, pr, rd, wc, working, health, risks, wins, dataChecks, loading, st };
}

export type PulseModel = ReturnType<typeof pulseModel>;
type Model = PulseModel;

/**
 * "Analyze" (the filter bar's button, every tab): the supply chain in 3–6 plain
 * points from the same model and rules as this tab — where it stands, the most
 * severe exceptions, the stock that could be released, working capital and the
 * data to doubt. Stock, service, dispatch, production and distributors; never sales.
 */
export function supplyChainAnalysis(data: DashboardData): { loading: boolean; headline: string; points: AnalyzePoint[] } {
  const m = pulseModel(data);
  const { s, sv, f, pr, rd, wc, working } = m;
  const below = m.health.filter((h) => h.rag === 'red');
  const watch = m.health.filter((h) => h.rag === 'amber');
  const names = (hs: typeof below) => hs.map((h) => h.name.charAt(0).toLowerCase() + h.name.slice(1)).join(', ');
  const headline = below.length
    ? `${below.length === 1 ? 'One headline KPI is' : `${below.length} headline KPIs are`} below target: ${names(below)}.`
    : watch.length
      ? `Nothing below target; ${names(watch)} ${watch.length === 1 ? 'needs' : 'need'} watching.`
      : 'Every headline supply chain KPI is on target.';

  const points: AnalyzePoint[] = [];
  // 1. Where we stand: the band's figures in a sentence each.
  points.push({
    tone: below.length ? 'bad' : watch.length ? 'neutral' : 'good',
    title: 'Where the supply chain stands',
    body: [
      `Service level is ${pct1(sv.level)} (target ${kpiThresholds.serviceLevel.green}%), with ${full(sv.below)} of ${full(sv.above + sv.below)} SKUs below their threshold.`,
      `Order fill rate is ${pct1(f.pct)}: ${full(f.unfulfilled)} units ordered were not dispatched.`,
      `Stock covers ${dayText(s.totalCd)} of sales against a ${dayText(s.wBm)} benchmark (coverage ${pct1(s.coverage)}).`,
      pr.w.completion != null ? `Production completion is ${pct1(pr.w.completion)} and ${pct1(pr.r.onHoldPct)} of RMPM is on hold.` : '',
      rd.compliance != null ? `${pct1(rd.compliance)} of distributors reported their stock.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  });
  // 2. The most severe exceptions, three at most.
  const bad = m.risks.filter((r) => r.tone !== 'opportunity').sort((a, b) => b.weight - a.weight).slice(0, 3);
  for (const r of bad)
    points.push({
      tone: 'bad',
      title: r.text,
      body: [WHY[r.id.split('-')[0]], `See it on ${tabLabel(r.tab as TabKey)}.`].filter(Boolean).join(' '),
    });
  // 3. Stock that could be released.
  if (s.excess.value > 0)
    points.push({
      tone: 'good',
      title: `${money(s.excess.value)} of stock sits above benchmark`,
      body: `That is ${pct1(s.excess.pct)} of finished goods (target under ${kpiThresholds.excessPct.green}%). Releasing it, or slowing replenishment of those SKUs, frees working capital without risking cover.`,
    });
  // 4. Working capital, where the money is.
  if (working > 0) {
    const share = (n: number) => pct1((n / working) * 100);
    points.push({
      tone: 'neutral',
      title: `Working capital is ${money(working)}`,
      body: `Finished goods ${money(wc.fg)} (${share(wc.fg)}), work in progress ${money(wc.wip)} (${share(wc.wip)}) and raw and packing material ${money(wc.rmpm)} (${share(wc.rmpm)}), all at cost.`,
    });
  }
  // 5. What makes the figures less certain.
  const check = m.dataChecks[0];
  if (check) points.push({ tone: 'neutral', title: check.title, body: `${check.detail} See it on ${tabLabel(check.tab)}.` });
  return { loading: m.loading, headline, points: points.slice(0, 6) };
}

function useInsights(m: Model): Insight[] {
  const nav = useNav();
  const detail = useDetail();
  const actionOf = (r: Risk): Insight['action'] => {
    if (r.chip?.key === 'cls') return { label: `Open Class ${r.chip.value}`, run: () => detail.open({ kind: 'class', cls: r.chip!.value }) };
    if (r.chip?.key === 'branch') return { label: `Open ${r.chip.value}`, run: () => detail.open({ kind: 'branch', branch: r.chip!.value }) };
    if (r.chip?.key === 'channel') return { label: `Open ${r.chip.value}`, run: () => detail.open({ kind: 'channel', channel: r.chip!.value }) };
    return { label: `Open ${tabLabel(r.tab as TabKey)}`, run: () => nav(r.tab as TabKey, r.kpi), tab: true };
  };
  return [
    ...m.risks.map((r) => ({ id: r.id, tone: (r.tone === 'opportunity' ? 'good' : 'bad') as Tone, title: r.text, detail: WHY[r.id.split('-')[0]] ?? '', weight: r.weight, action: actionOf(r) })),
    ...m.wins.map((h) => ({
      id: `W-${h.key}`,
      tone: 'good' as Tone,
      title: `${h.name} ${pct1(h.value)}: on target`,
      detail: `Within its band (${h.note}).`,
      weight: 10,
      action: { label: `Open ${tabLabel(h.tab)}`, run: () => nav(h.tab, h.focus), tab: true },
    })),
    ...m.dataChecks.map((c) => ({ id: c.id, tone: 'data' as Tone, title: c.title, detail: c.detail, weight: 0, action: { label: `Open ${tabLabel(c.tab)}`, run: () => nav(c.tab, c.focus), tab: true } })),
  ];
}

export function PulsePage({ data }: { data: DashboardData }) {
  const m = pulseModel(data);
  const insights = useInsights(m);
  const [reviewOpen, setReviewOpen] = useState(false);
  return (
    <Grid templateColumns={{ base: '1fr', lg: 'minmax(0, 1fr) 300px' }} gap={3} h={{ lg: '100%' }} minH={0}>
      <Flex direction="column" gap={3} minH={0} minW={0}>
        <Band data={data} m={m} onReview={m.loading ? undefined : () => setReviewOpen(true)} />
        <Grid templateColumns={{ base: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1.1fr)' }} gap={3} flex={1} minH={0}>
          <Health m={m} />
          <ServiceGrid m={m} />
        </Grid>
      </Flex>
      <SignalsRail insights={insights} loading={m.loading} periodLabel={rangeLabel(data.window)} />
      <ReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} periodLabel={rangeLabel(data.window)} m={m} />
    </Grid>
  );
}

/** The banner's status colours, readable on its dark ground. */
const BAND_GOOD = '#7EE2A8';
const BAND_WARN = '#F6C177';
const BAND_BAD = '#F4A39B';
const BAND_INK: Record<Rag, string> = { green: BAND_GOOD, amber: BAND_WARN, red: BAND_BAD };

/** The supply chain at a glance, numbers first (Sales Pulse's Band). */
function Band({ data, m, onReview }: { data: DashboardData; m: Model; onReview?: () => void }) {
  const { s, sv, f, wc, working } = m;
  const tip = (h: HelpText | undefined) =>
    h && (
      <Box color={colors.bandMuted} display="inline-flex" css={{ '& [role=button]': { color: 'inherit' } }}>
        <InfoTip help={h} size={13} />
      </Box>
    );
  const red = m.health.filter((h) => h.rag === 'red').length;
  const amber = m.health.filter((h) => h.rag === 'amber').length;
  const overall: Rag = red ? 'red' : amber ? 'amber' : 'green';
  const statusText = red ? `${red} Below Target` : amber ? `${amber} To Watch` : 'All On Target';
  const ink = (r: Rag | null) => (r ? BAND_INK[r] : colors.bandInk);
  // Working capital bar: finished goods (its excess hatched at the end), WIP, RMPM.
  const share = (n: number) => (working > 0 ? (n / working) * 100 : 0);
  const excess = Math.min(s.excess.value, wc.fg);

  return (
    <Box bg={colors.band} color={colors.bandInk} borderRadius="6px" px={5} py={4} flexShrink={0} data-kpi="EX-04 EX-05 EX-06 EX-07 EX-08">
      <Flex align="center" gap={3} mb={3} wrap="wrap">
        <Text fontSize="13px" color={colors.bandMuted}>
          {rangeLabel(data.window)}
        </Text>
        {m.loading ? (
          <Skeleton h="22px" w="110px" />
        ) : (
          <Box px="10px" py="2px" borderRadius="full" fontSize="13px" fontWeight={700} color={BAND_INK[overall]} border="1px solid" borderColor={BAND_INK[overall]}>
            {statusText}
          </Box>
        )}
        {tip(PULSE_HELP.status)}
        {onReview && (
          <Box
            as="button"
            ml="auto"
            onClick={onReview}
            display="inline-flex"
            alignItems="center"
            gap={1}
            px="10px"
            py="4px"
            borderRadius="4px"
            fontSize="13px"
            fontWeight={600}
            bg="rgba(255,255,255,.10)"
            color={colors.bandInk}
            border="1px solid rgba(255,255,255,.22)"
            cursor="pointer"
            _hover={{ bg: 'rgba(255,255,255,.18)' }}
          >
            Analyze The Supply Chain <FiArrowRight size={13} />
          </Box>
        )}
      </Flex>
      <Grid templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }} gap={4} className="sp-stagger">
        <BandNum label="Service Level" value={pct1(sv.level)} valueColor={ink(rag(sv.level, 'serviceLevel'))} sub={`${full(sv.below)} Of ${full(sv.above + sv.below)} SKUs Below Threshold`} help={tip(helpFor('EX-05'))} />
        <BandNum label="Order Fill Rate" value={pct1(f.pct)} valueColor={ink(rag(f.pct, 'fillRate'))} sub={`${full(f.unfulfilled)} Units Not Dispatched`} help={tip(helpFor('EX-06'))} />
        <BandNum label="Days Of Cover" value={dayText(s.totalCd)} valueColor={ink(rag(s.coverage, 'coverage'))} sub={`Benchmark ${dayText(s.wBm)} · ${pct1(s.coverage)}`} help={tip(helpFor('EX-04'))} />
        <BandNum label="Excess Stock" value={pkr(s.excess.value)} valueColor={ink(rag(s.excess.pct, 'excessPct'))} sub={`${pct1(s.excess.pct)} Of Finished Goods`} help={tip(helpFor('EX-08'))} />
        <BandNum label="Working Capital" value={pkr(working)} valueColor={colors.bandTarget} sub="Finished Goods + WIP + RMPM, At Cost" help={tip(helpFor('EX-07'))} />
      </Grid>
      <Box mt={4}>
        <Flex h="8px" borderRadius="4px" bg={colors.bandLine} overflow="hidden">
          <Box w={`${share(wc.fg - excess)}%`} bg={colors.bandSales} title={`Finished goods ${money(wc.fg)}`} />
          <Box
            w={`${share(excess)}%`}
            title={`Excess above benchmark ${money(excess)}`}
            css={{ background: `repeating-linear-gradient(90deg, ${colors.bandSales} 0 6px, color-mix(in srgb, ${colors.bandSales} 35%, transparent) 6px 10px)` }}
          />
          <Box w={`${share(wc.wip)}%`} bg={colors.bandTarget} title={`WIP ${money(wc.wip)}`} />
          <Box w={`${share(wc.rmpm)}%`} bg={colors.bandMuted} title={`RMPM ${money(wc.rmpm)}`} />
        </Flex>
        <Flex justify="space-between" mt="6px" fontSize="12px" color={colors.bandMuted} gap={3} wrap="wrap" fontVariantNumeric="tabular-nums">
          <HStack gap={3}>
            {(
              [
                [colors.bandSales, 'Finished Goods', wc.fg],
                [colors.bandTarget, 'WIP', wc.wip],
                [colors.bandMuted, 'RMPM', wc.rmpm],
              ] as const
            ).map(([c, l, v]) => (
              <HStack key={l} gap="5px">
                <Box w="9px" h="9px" borderRadius="2px" bg={c} />
                <Text>
                  {l}{' '}
                  <Text as="span" color={colors.bandInk} fontWeight={600}>
                    {money(v)}
                  </Text>
                </Text>
              </HStack>
            ))}
          </HStack>
          <Text>
            <Text as="span" color={colors.bandInk} fontWeight={600}>
              {money(excess)}
            </Text>{' '}
            Excess Could Be Released
          </Text>
        </Flex>
      </Box>
    </Box>
  );
}

function BandNum({ label, value, sub, valueColor, help }: { label: string; value: string; sub: string; valueColor?: string; help: React.ReactNode }) {
  return (
    <Box minW={0}>
      <HStack gap="6px">
        <Text fontSize="11px" color={colors.bandMuted} truncate>
          {label}
        </Text>
        {help}
      </HStack>
      <Text fontSize="22px" fontWeight={700} color={valueColor ?? colors.bandInk} fontVariantNumeric="tabular-nums" lineHeight="1.25">
        <AnimatedValue value={value} />
      </Text>
      <Text fontSize="11px" color={colors.bandMuted} truncate title={sub}>
        {sub}
      </Text>
    </Box>
  );
}

/** Every headline supply chain KPI against its target, in Sales Pulse's breakdown bars. */
function Health({ m }: { m: Model }) {
  const nav = useNav();
  const byKey = new Map(m.health.map((h) => [h.key, h]));
  return (
    <ChartCard title="Supply chain health" colSpan={1} height="100%" variant="rows" isLoading={m.health.every((h) => h.loading)} help={PULSE_HELP.health} dataKpi="EX-04 EX-05 EX-06 EX-08 EX-09">
      <RowBars
        rows={m.health.map((h) => ({
          key: h.key,
          name: titleCase(h.name),
          // The status reads in the note; the column stays blue (red and green are for +/− bars only).
          parts: [{ value: h.value ?? 0, color: colors.sales, label: titleCase(h.name) }],
          target: h.target,
          note: (
            <>
              {titleCase(h.note)}
              {h.rag && (
                <>
                  {' · '}
                  <Box as="span" color={INK[h.rag]} fontWeight={700}>
                    {RAG_WORD[h.rag]}
                  </Box>
                </>
              )}
            </>
          ),
        }))}
        legend={[
          { label: 'Actual', color: colors.sales },
          { label: 'Target', color: colors.target, shape: 'line' },
        ]}
        fmt={(n) => `${fmt1(n)}%`}
        onPick={(k) => {
          const h = byKey.get(k);
          if (h) nav(h.tab, h.focus);
        }}
      />
    </ChartCard>
  );
}

/** Sales Pulse's Achievement grid, for service: the lowest branches × class, each cell opening that branch's class. */
function ServiceGrid({ m }: { m: Model }) {
  const detail = useDetail();
  const MAX_ROWS = 6;
  const rows = m.sv.matrix.filter((r) => r.avg != null).slice(0, MAX_ROWS);
  const { green, amber } = kpiThresholds.serviceLevel;
  const look = (v: number | null) =>
    v == null ? { bg: colors.sunkBg, fg: colors.mutedText } : v >= green ? { bg: colors.goodSoft, fg: colors.good } : v >= amber ? { bg: colors.warnSoft, fg: colors.warn } : { bg: colors.badSoft, fg: colors.bad };
  return (
    <Flex direction="column" className="sp-card sp-tint" border="1px solid" borderColor={colors.border} borderRadius="4px" px={4} py={3} minH={{ base: '320px', lg: 0 }} minW={0} data-kpi="IN-10">
      <Flex align="baseline" gap={2} mb={2}>
        <Text fontSize="16px" fontWeight={700} color={colors.cardAccent} whiteSpace="nowrap">
          Service Grid
        </Text>
        <Text fontSize="12px" color={colors.mutedText} truncate>
          lowest branches · click a cell to open it
        </Text>
        <Box ml="auto">
          <InfoTip help={PULSE_HELP.serviceGrid} />
        </Box>
      </Flex>
      {m.st.svc.isLoading && !rows.length ? (
        <Skeleton flex={1} borderRadius="4px" />
      ) : (
        <Box flex={1} minH={0} display="grid" gridTemplateColumns={`minmax(90px, 1.3fr) repeat(${RATED_CLASSES.length + 1}, minmax(0, 1fr))`} gridTemplateRows={`auto repeat(${rows.length}, minmax(0, 1fr))`} gap="4px">
          <Box />
          {[...RATED_CLASSES.map((c) => `Class ${c}`), 'Average'].map((c) => (
            <Text key={c} fontSize="11px" fontWeight={600} color={colors.mutedText} textAlign="center" truncate px={1}>
              {c}
            </Text>
          ))}
          {rows.map((r) => (
            <Box key={r.branch} display="contents">
              <Text fontSize="13px" fontWeight={600} color={colors.darkText} truncate title={r.branch} alignSelf="center">
                {r.branch}
              </Text>
              {[...r.cells, r.avg].map((v, i) => {
                const cls = RATED_CLASSES[i];
                const st = look(v);
                const opens = v != null;
                return (
                  <Box
                    as="button"
                    key={cls ?? 'avg'}
                    onClick={() => opens && (cls ? detail.open({ kind: 'classBranch', cls, branch: r.branch }) : detail.open({ kind: 'branch', branch: r.branch }))}
                    title={cls ? `${r.branch} × Class ${cls}` : `${r.branch}, all classes`}
                    bg={st.bg}
                    color={st.fg}
                    borderRadius="4px"
                    px={2}
                    py={1}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    minH={0}
                    overflow="hidden"
                    cursor={opens ? 'pointer' : 'default'}
                    _hover={opens ? { outline: `2px solid ${colors.brand}`, outlineOffset: '1px' } : undefined}
                  >
                    <Text fontSize="13px" fontWeight={700} fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                      {v == null ? '—' : `${v.toFixed(1).replace(/[.]0$/, '')}%`}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      )}
      <Flex gap={3} mt={2} fontSize="11px" color={colors.mutedText} wrap="wrap" align="center">
        {[
          [colors.goodSoft, `≥${green}%`],
          [colors.warnSoft, `${amber}–${green}%`],
          [colors.badSoft, `<${amber}%`],
        ].map(([bg, l]) => (
          <HStack key={l} gap="4px">
            <Box w="11px" h="11px" borderRadius="3px" bg={bg} />
            <Text>{l}</Text>
          </HStack>
        ))}
        <Text ml="auto">
          Lowest {rows.length} Of {m.sv.matrix.length} Branches
        </Text>
      </Flex>
    </Flex>
  );
}

const TONE: Record<Tone, { label: string; color: string; mark: string }> = {
  bad: { label: 'Needs Attention', color: colors.bad, mark: '▼' },
  good: { label: 'Going Well', color: colors.good, mark: '▲' },
  data: { label: 'Data Check', color: colors.brand, mark: '◆' },
};
const TONE_ORDER: Tone[] = ['bad', 'good', 'data'];

function InsightItem({ ins, onAction, full }: { ins: Insight; onAction: (a: NonNullable<Insight['action']>) => void; full?: boolean }) {
  const t = TONE[ins.tone];
  return (
    <Box px={4} py="10px" borderBottom="1px solid" borderColor={colors.sunkBg}>
      <Text fontSize="11px" fontWeight={700} letterSpacing=".05em" textTransform="uppercase" color={t.color}>
        {t.mark} {t.label}
      </Text>
      <Text fontSize="13px" fontWeight={600} color={colors.darkText} lineHeight="1.35" mt="2px">
        {ins.title}
      </Text>
      {ins.detail && (
        <Text fontSize="12px" color={colors.bodyText} mt="2px" lineClamp={full ? undefined : 2} title={ins.detail}>
          {ins.detail}
        </Text>
      )}
      {ins.action && (
        <Box
          as="button"
          mt="4px"
          fontSize="12px"
          fontWeight={600}
          color={colors.brand}
          display="inline-flex"
          alignItems="center"
          gap={1}
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => onAction(ins.action!)}
        >
          {ins.action.label} <FiArrowRight size={12} />
        </Box>
      )}
    </Box>
  );
}

/** Sales Pulse's Key insights rail: tone chips, most severe first, ⤢ for all of them by tone. */
function SignalsRail({ insights, loading, periodLabel }: { insights: Insight[]; loading: boolean; periodLabel: string }) {
  const [filter, setFilter] = useState<Tone | 'all'>('all');
  const [expanded, setExpanded] = useState(false);
  const count = (t: Tone) => insights.filter((i) => i.tone === t).length;
  const sorted = [...insights].sort((a, b) => TONE_ORDER.indexOf(a.tone) - TONE_ORDER.indexOf(b.tone) || b.weight - a.weight);
  const list = filter === 'all' ? sorted : sorted.filter((i) => i.tone === filter);
  const act = (a: NonNullable<Insight['action']>) => {
    if (a.tab) setExpanded(false);
    a.run();
  };
  const chip = (v: Tone | 'all', label: string) => {
    const on = filter === v;
    return (
      <Box
        as="button"
        key={v}
        onClick={() => setFilter(v)}
        px="9px"
        py="3px"
        borderRadius="999px"
        fontSize="12px"
        fontWeight={on ? 600 : 500}
        bg={on ? colors.brandSoft : colors.sunkBg}
        color={on ? colors.brand : colors.bodyText}
        cursor="pointer"
        whiteSpace="nowrap"
      >
        {label}
      </Box>
    );
  };
  return (
    <Flex direction="column" className="sp-card sp-tint" border="1px solid" borderColor={colors.border} borderRadius="4px" minH={{ base: '360px', lg: 0 }} minW={0} data-kpi="EX-10">
      <Flex align="center" gap={2} px={4} pt={3} pb={2}>
        <Text fontSize="16px" fontWeight={700} color={colors.cardAccent}>
          Key Insights
        </Text>
        <Text fontSize="12px" color={colors.mutedText}>
          {insights.length}
        </Text>
        <Flex ml="auto" align="center" gap={2}>
          {helpFor('EX-10') && <InfoTip help={helpFor('EX-10')} />}
          {insights.length > 0 && (
            <Box as="button" aria-label="Expand key insights" title="Expand" onClick={() => setExpanded(true)} color={colors.mutedText} _hover={{ color: colors.brand }} cursor="pointer" display="flex">
              <FiMaximize2 size={14} />
            </Box>
          )}
        </Flex>
      </Flex>
      <Flex gap={1} px={4} pb={2} wrap="wrap" borderBottom="1px solid" borderColor={colors.border}>
        {chip('all', 'All')}
        {chip('bad', `Attention ${count('bad')}`)}
        {chip('good', `Good ${count('good')}`)}
        {chip('data', `Data ${count('data')}`)}
      </Flex>
      <Box flex={1} minH={0} overflowY="auto">
        {loading && !insights.length ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h="64px" m={3} borderRadius="4px" />)
        ) : list.length ? (
          list.map((ins) => <InsightItem key={ins.id} ins={ins} onAction={act} />)
        ) : (
          <Text px={4} py={3} fontSize="12px" color={colors.mutedText}>
            Nothing here for this period.
          </Text>
        )}
      </Box>
      {expanded && (
        <Overlay title="Key Insights" subtitle={`${insights.length} found for ${periodLabel} · click a link to open it on the right`} onClose={() => setExpanded(false)}>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, minmax(0, 1fr))' }} gap={3} alignItems="start">
            {TONE_ORDER.map((tone) => {
              const items = sorted.filter((i) => i.tone === tone);
              return (
                <Box key={tone} border="1px solid" borderColor={colors.border} borderRadius="4px" bg={colors.cardBg} minW={0}>
                  <Flex align="center" gap={2} px={4} py="8px" borderBottom="1px solid" borderColor={colors.border}>
                    <Text fontSize="13px" fontWeight={700} color={TONE[tone].color}>
                      {TONE[tone].mark} {TONE[tone].label}
                    </Text>
                    <Text fontSize="12px" color={colors.mutedText}>
                      {items.length}
                    </Text>
                  </Flex>
                  <Box maxH="70vh" overflowY="auto">
                    {items.length ? (
                      items.map((ins) => <InsightItem key={ins.id} ins={ins} onAction={act} full />)
                    ) : (
                      <Text px={4} py={3} fontSize="12px" color={colors.mutedText}>
                        Nothing here for this period.
                      </Text>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Grid>
        </Overlay>
      )}
    </Flex>
  );
}
