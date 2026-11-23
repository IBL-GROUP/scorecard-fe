// Summary tab: 1.0's Summary in Sales Pulse 2.0's style. The order follows 1.0
// (user request, 18 Nov 2026): KPI cards, then Sales, then Inventory, then the
// accuracy cards. Like Sales Pulse, a full-HD desktop shows it all without
// scrolling: cards fill the screen, scroll inside and expand with ⤢. Every 1.0 figure is here (Sales Summary, Benchmark, Cover
// Days TP / EFP, Budget Accuracy TSCL and Forecast Accuracy IBL with their
// donut, days gone, month plan and three-month class history, Forecast vs
// Budget), plus what the same data supports: sales mix, range activation,
// run-rate required, coverage, excess and shortfall.

import { Box, Flex, Grid, Skeleton, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { KpiTile, type KpiTileProps } from '@/ui/kpi-card';
import { ChartCard } from '@/ui/chart-card';
import { BarChart } from '@/ui/charts';
import { Overlay } from '@/ui/overlay';
import { BreakdownBars, BreakdownTable } from '@/ui/breakdown';
import { SharePie } from '@/ui/breakdown/SharePie';
import { ClassBadge } from '@/ui/class-badge';
import { Segmented } from '@/ui/segmented';
import { colors, fmt1, formatCompact } from '@/constants/theme';
import { clsColor } from '@/constants/classColors';
import { SUMMARY_HELP, helpFor, type HelpText } from '@/constants/help';
import { num, type CategoryAccuracyRow, type DailyAccuracyRow, type IblVsTsclRow, type SalesSummaryRow, type SalesTypeRow, type TotalSkuRow } from '@/api/types';
import { rowsOf, type DashboardData } from '@/features/data';
import { plan, status, stock, trust } from '@/features/derive';
import { categoryCells, classHistory, projectedMonthEnd, salesSummary, salesTypeSplit } from '@/features/kpis';
import { COMPARE_ON, addDays, monthLabel, periodTag, todayIso } from '@/features/period';
import { useDetail } from '@/features/detail';
import { useFitScreen } from '@/features/fit';
import { rag } from '@/features/kpiThresholds';

const CLASS_ORDER = ['A', 'B', 'C', 'N', 'Others'];
const clsName = (c: string) => (c === 'Others' ? 'Other' : `Class ${c}`);
const clsOf = (name: string) => (name === 'Other' ? 'Others' : name.replace(/^Class /, ''));
const byClass = (a: string, b: string) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b);
const fmt = (n: number) => formatCompact(n);
const pct = (n: number | null | undefined) => (n == null ? '—' : `${fmt1(n)}%`);
const closingLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Achievement against pace: on or ahead of the days gone = good, within 80% of it = close, else behind. */
const paceInk = (achPct: number | null, daysPct: number) =>
  achPct == null ? colors.mutedText : achPct >= daysPct ? colors.good : achPct >= daysPct * 0.8 ? colors.warn : colors.bad;

/** One labelled figure. */
function Figure({ label, value, ink, small }: { label: string; value: string; ink?: string; small?: boolean }) {
  return (
    <Box minW={0} textAlign="center">
      <Text fontSize="11px" fontWeight={700} letterSpacing=".05em" textTransform="uppercase" color={colors.mutedText} whiteSpace="nowrap">
        {label}
      </Text>
      <Text fontSize={small ? '13px' : '15px'} fontWeight={700} color={ink ?? colors.darkText} fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
        {value}
      </Text>
    </Box>
  );
}

/**
 * The 1.0 gauge as a Sales Pulse ring: the arc is the share of the month's
 * plan achieved; the tick is where pace says it should be (days gone).
 * Green on or ahead of pace, amber close, red behind.
 */
function PaceRing({ achPct, daysPct, size = 104 }: { achPct: number | null; daysPct: number; size?: number }) {
  const stroke = 16;
  const r = (size - stroke) / 2 - 4;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const shown = Math.max(0, Math.min(100, achPct ?? 0));
  const ink = paceInk(achPct, daysPct);
  const tickA = (daysPct / 100) * 2 * Math.PI - Math.PI / 2;
  const tick = (k: number) => ({ x: c + (r + k) * Math.cos(tickA), y: c + (r + k) * Math.sin(tickA) });
  const t1 = tick(-stroke / 2 - 4);
  const t2 = tick(stroke / 2 + 4);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ height: "100%", width: "auto", aspectRatio: "1" }} role="img" aria-label={`${pct(achPct)} of the month achieved; ${daysPct}% of the days gone`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={colors.sunkBg} strokeWidth={stroke} />
      {achPct != null && (
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={ink}
          strokeWidth={stroke}
          strokeDasharray={`${(shown / 100) * circ} ${circ}`}
          strokeLinecap="butt"
          transform={`rotate(-90 ${c} ${c})`}
        />
      )}
      <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke={colors.darkText} strokeWidth={3} strokeLinecap="round" />
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="700" fill={colors.darkText}>
        {pct(achPct)}
      </text>
    </svg>
  );
}

interface AccuracyFigures {
  noun: 'target' | 'budget';
  monthPlan: number | null;
  planToDate: number | null;
  achieved: number | null;
  monthPct: number | null;
  /** Achievement against the plan due so far. */
  toDatePct: number | null;
  /** Where the month lands at the current daily rate, % of the month plan (null when the month is not running). */
  projectedPct: number | null;
  /** Sales needed per remaining day, and the current daily rate. */
  required: number | null;
  current: number | null;
  daysPct: number;
  daysText: string;
}

/** The card's left column: days gone and plan to date, the pace ring, the month plan and what was achieved, then where it is heading. */
function AccuracySummary({ noun, monthPlan, planToDate, achieved, monthPct, toDatePct, projectedPct, required, current, daysPct, daysText }: AccuracyFigures) {
  const gap = monthPct == null ? null : monthPct - 100;
  const Noun = noun === 'budget' ? 'Budget' : 'Target';
  return (
    <Flex direction="column" align="center" justify="space-evenly" gap="4px" minW={0} minH={0} h="100%" overflow="hidden">
      <Grid templateColumns="1fr 1fr" gap={2} w="100%" flexShrink={0} bg={colors.pageBg} borderRadius="4px" px={2} py="4px">
        <Figure label="Days gone" value={`${daysPct}%`} small />
        <Figure label={`${Noun} to date`} value={planToDate == null ? '—' : fmt(planToDate)} small />
      </Grid>
      {/* Never squeezed by a short card. The tick marks the pace: where the days gone say it should be. */}
      <Flex flex="1 1 0" minH="100px" maxH="150px" w="100%" justify="center" title={`${daysText}: the tick marks where the month should be by now`}>
        <PaceRing achPct={monthPct} daysPct={daysPct} />
      </Flex>
      <Grid templateColumns="1fr 1px 1fr" gap={2} w="100%" flexShrink={0} alignItems="center">
        <Figure label={`Month ${noun}`} value={monthPlan == null ? '—' : fmt(monthPlan)} small />
        <Box bg={colors.border} h="28px" />
        <Figure label="Achieved" value={achieved == null ? '—' : fmt(achieved)} ink={colors.sales} small />
      </Grid>
      {gap != null && (
        <Text fontSize="12px" fontWeight={700} color={gap >= 0 ? colors.good : colors.bad} fontVariantNumeric="tabular-nums">
          {gap >= 0 ? '▲' : '▼'} {fmt1(Math.abs(gap))}% {gap >= 0 ? 'Above' : 'Below'} {Noun}
        </Text>
      )}
      {/* Where the month stands and where it is heading: achievement so far, the
          month-end estimate at today's daily rate, and the daily sales still needed. */}
      <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap={1} w="100%" flexShrink={0} borderTop="1px solid" borderColor={colors.sunkBg} pt="6px">
        <Figure label="To date" value={pct(toDatePct)} ink={paceInk(toDatePct, 100)} small />
        <Figure
          label="Month end"
          value={pct(projectedPct)}
          ink={projectedPct == null ? undefined : projectedPct >= 100 ? colors.good : projectedPct >= 90 ? colors.warn : colors.bad}
          small
        />
        <Box title={current == null ? undefined : `Running ${fmt(current)} a day`}>
          <Figure label="Need / day" value={required == null ? '—' : fmt(required)} ink={required != null && current != null && required > current ? colors.bad : colors.good} small />
        </Box>
      </Grid>
    </Flex>
  );
}

/** One day gone: its sales. */
interface DayPoint {
  day: string;
  sales: number;
}

/**
 * Budget Accuracy TSCL / Forecast Accuracy IBL, the 1.0 cards: days gone and
 * the plan to date on top, the ring with the month plan and what was
 * achieved, then the 1.0 class chart (achievement per class, three months).
 * ⤢ opens it full size with the days gone day by day (AccuracyDays).
 */
function AccuracyCard({
  title,
  help,
  history,
  loading,
  onPick,
  days,
  dailyLoading,
  basis,
  ...figures
}: AccuracyFigures & {
  title: string;
  help: HelpText | undefined;
  history: ReturnType<typeof classHistory>;
  loading: boolean;
  onPick: (cls: string) => void;
  /** The days gone, one point each (empty for a window over one month). */
  days: DayPoint[];
  dailyLoading: boolean;
  basis: 'TP' | 'EFP';
}) {
  const [open, setOpen] = useState(false);
  return (
    <ChartCard title={title} help={help} isLoading={loading} colSpan={1} onExpand={() => setOpen(true)}>
      <Grid templateColumns={{ base: '1fr', md: '236px minmax(0, 1fr)' }} gap={4} h="100%" minH={0}>
        <AccuracySummary {...figures} />
        <Box minH={{ base: '240px', lg: 0 }} minW={0}>
          <ClassHistoryChart history={history} onPick={onPick} />
        </Box>
      </Grid>
      {open && (
        <AccuracyDays title={title} figures={figures} days={days} loading={dailyLoading} basis={basis} history={history} onPick={onPick} onClose={() => setOpen(false)} />
      )}
    </ChartCard>
  );
}

/** The 1.0 class chart: achievement per class over three months. */
function ClassHistoryChart({ history, onPick }: { history: ReturnType<typeof classHistory>; onPick: (cls: string) => void }) {
  const [m0, m1, m2] = history.months;
  const data = history.rows.map((r) => ({ name: clsName(String(r.cls)), [m0]: r[m0] ?? 0, [m1]: r[m1] ?? 0, [m2]: r[m2] ?? 0 }));
  return (
    <BarChart
      data={data}
      xKey="name"
      bars={[
        { key: m0, label: monthLabel(m0, 'long'), color: colors.borderStrong },
        { key: m1, label: monthLabel(m1, 'long'), color: colors.prior },
        { key: m2, label: monthLabel(m2, 'long'), color: colors.current },
      ]}
      labelKeys={[m2]}
      compact
      showLabels
      orientation="vertical"
      labelFormatter={(v) => `${fmt1(v)}%`}
      yTickFormatter={(v) => `${v}%`}
      referenceValue={100}
      referenceLabel="100%"
      onBarClick={(n) => onPick(clsOf(n))}
      height="100%"
    />
  );
}

/**
 * The accuracy card full size: the card as it is (summary and class chart),
 * with each day gone as a column under it.
 */
function AccuracyDays({
  title,
  figures,
  days,
  loading,
  basis,
  history,
  onPick,
  onClose,
}: {
  title: string;
  figures: AccuracyFigures;
  days: DayPoint[];
  loading: boolean;
  basis: 'TP' | 'EFP';
  history: ReturnType<typeof classHistory>;
  onPick: (cls: string) => void;
  onClose: () => void;
}) {
  return (
    <Overlay title={title} subtitle={figures.daysText} onClose={onClose}>
      <Flex direction="column" gap={4} h="min(760px, 82vh)" minH={0}>
        <Grid templateColumns={{ base: '1fr', md: '236px minmax(0, 1fr)' }} gap={4} flex="1 1 0" minH={0}>
          <AccuracySummary {...figures} />
          <Box minH={{ base: '240px', lg: 0 }} minW={0}>
            <ClassHistoryChart history={history} onPick={onPick} />
          </Box>
        </Grid>
        <Flex direction="column" flex="1 1 0" minH="220px" minW={0}>
          <Text fontSize="16px" fontWeight={700} color={colors.cardAccent} mb={2}>
            Day By Day ({basis})
          </Text>
          <Box flex="1 1 0" minH={0}>
            {loading ? (
              <Skeleton h="100%" borderRadius="6px" />
            ) : days.length ? (
              <BarChart
                data={days.map((d) => ({ name: d.day.slice(8, 10), sales: d.sales }))}
                xKey="name"
                bars={[{ key: 'sales', label: `Sales ${basis}`, color: colors.current }]}
                orientation="vertical"
                showLabels
                labelFormatter={(v) => fmt(v)}
                yTickFormatter={(v) => fmt(v)}
                height="100%"
              />
            ) : (
              <Flex h="100%" align="center" justify="center">
                <Text fontSize="13px" color={colors.mutedText}>
                  Day by day covers one month; pick a single month to see it.
                </Text>
              </Flex>
            )}
          </Box>
        </Flex>
      </Flex>
    </Overlay>
  );
}

/** A card's view (Table / Bars / Pie…), remembered in this browser as Sales Pulse 2.0 does. */
function useKeptView<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: string) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const kept = localStorage.getItem(key) as T | null;
      return kept && allowed.includes(kept) ? kept : fallback;
    } catch {
      return fallback;
    }
  });
  const set = (next: string) => {
    setV(next as T);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* ignore */
    }
  };
  return [v, set];
}

/**
 * 1.0 Benchmark + Cover Days cards as one table, drawn exactly like the
 * BreakdownTable of the cards beside it (Sales Pulse 2.0): header and Total
 * pinned at the top, the same row height, fonts and colours, and each class
 * as its badge and name.
 */
function StockByClass({ d, basis, onPick }: { d: ReturnType<typeof stock> & { range: TotalSkuRow[] }; basis: 'TP' | 'EFP'; onPick: (cls: string) => void }) {
  const rows = [...d.cls].sort((a, b) => byClass(a.cls, b.cls));
  const skus = (c: string) => num(d.range.find((r) => (r.classification || 'Others') === c)?.count ?? null);
  const total = d.total;
  const tpl = 'minmax(96px, 1.3fr) repeat(7, minmax(0, 1fr))';
  const head = ['Name', 'Benchmark', 'Threshold', 'SKUs', `Cover ${basis}`, 'Coverage', `Value ${basis}`, 'Units'];
  const coverage = (cd: number | null, bm: number | null) => (cd != null && bm ? (cd / bm) * 100 : null);
  const tone = (c: number | null) => (c == null ? colors.mutedText : c < 60 || c > 150 ? colors.bad : c >= 80 && c <= 120 ? colors.good : colors.warn);
  const totalCover = basis === 'TP' ? d.totalCd : num(total?.cover_days_efp ?? null);
  // BreakdownTable's cell, row and header styles.
  const cell = (isTotal: boolean) => ({
    textAlign: 'center' as const,
    fontVariantNumeric: 'tabular-nums',
    fontSize: '13px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: colors.bodyText,
    fontWeight: isTotal ? 700 : 400,
  });
  const row = { display: 'grid', gridTemplateColumns: tpl, columnGap: 3, rowGap: 2, px: 3 } as const;
  const days = (n: number | null) => (n == null ? '—' : `${fmt1(n)} d`);
  return (
    <Box border="1px solid" borderColor={colors.border} borderRadius="4px" overflow="hidden" h="100%" minH={0}>
      <Box maxH="100%" h="100%" overflowY="auto" overflowX="hidden">
        <Box position="sticky" top={0} zIndex={1}>
          <Box {...row} className="sp-th" py="8px" borderBottom="1px solid" borderColor={colors.border}>
            {head.map((h, i) => (
              <Box key={h} textAlign={i ? 'center' : 'start'} fontSize="13px" fontWeight={700} whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" color={colors.darkText} title={h}>
                {h}
              </Box>
            ))}
          </Box>
          <Box {...row} py="8px" bg={colors.pageBg} borderBottom="1px solid" borderColor={colors.border}>
            <Box {...cell(true)} textAlign="start" color={colors.darkText}>
              Total
            </Box>
            <Box {...cell(true)} title="Benchmark weighted by each class's daily target">
              {days(d.wBm)}
            </Box>
            <Box {...cell(true)} color={colors.mutedText}>
              —
            </Box>
            <Box {...cell(true)}>{d.range.reduce((a, r) => a + (num(r.count) ?? 0), 0).toLocaleString('en-US')}</Box>
            <Box {...cell(true)} color={colors.sales}>
              {days(totalCover)}
            </Box>
            <Box {...cell(true)} color={tone(d.coverage)}>
              {pct(d.coverage)}
            </Box>
            <Box {...cell(true)}>{fmt(num(basis === 'TP' ? total?.inv_val ?? null : total?.inv_val_efp ?? null) ?? 0)}</Box>
            <Box {...cell(true)}>{(num(total?.quantity ?? null) ?? 0).toLocaleString('en-US')}</Box>
          </Box>
        </Box>
        {rows.map((r) => {
          const cd = basis === 'TP' ? r.cd : r.cdEfp;
          const cov = coverage(r.cd, r.bm);
          const below = r.th != null && r.cd != null && r.cd < r.th;
          return (
            <Box
              key={r.cls}
              {...row}
              py="7px"
              borderBottom="1px solid"
              borderColor={colors.sunkBg}
              bg={colors.cardBg}
              _hover={{ bg: colors.hoverBg }}
              css={{ '&:hover .bd-name': { textDecoration: 'underline' } }}
              cursor="pointer"
              role="button"
              tabIndex={0}
              title={`Open ${clsName(r.cls)}`}
              onClick={() => onPick(r.cls)}
              onKeyDown={(e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(r.cls))}
            >
              <Box {...cell(false)} className="bd-name" textAlign="start" color={colors.brand} display="flex" alignItems="center" gap={2}>
                <ClassBadge cls={r.cls} />
                {clsName(r.cls)}
              </Box>
              <Box {...cell(false)}>{days(r.bm)}</Box>
              <Box {...cell(false)}>{days(r.th)}</Box>
              <Box {...cell(false)}>{skus(r.cls)?.toLocaleString('en-US') ?? '—'}</Box>
              <Box {...cell(false)} fontWeight={600} color={below ? colors.bad : colors.sales} title={below ? 'Below threshold' : undefined}>
                {days(cd)}
              </Box>
              <Box {...cell(false)} fontWeight={600} color={tone(cov)} title="TP cover days ÷ benchmark">
                {pct(cov)}
              </Box>
              <Box {...cell(false)}>{fmt(basis === 'TP' ? r.invTp : r.invCost)}</Box>
              <Box {...cell(false)}>{r.qty.toLocaleString('en-US')}</Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function SummaryPage({ data }: { data: DashboardData }) {
  const d = data.tabs.revenue;
  const detail = useDetail();
  const openClass = (cls: string) => detail.open({ kind: 'class', cls });
  const [basis, setBasis] = useState<'TP' | 'EFP'>('TP');
  // Fills the window on a desktop (Shell fit mode); otherwise the rows keep a readable height and the page scrolls.
  const fit = useFitScreen();
  const [salesView, setSalesView] = useKeptView('sc2-sales-view', ['table', 'bars', 'pie'] as const, 'table');
  const [stockView, setStockView] = useKeptView('sc2-stock-view', ['table', 'chart'] as const, 'table');
  // Forecast vs budget always opens on its bars (user request); the table is one click away.
  const [fvbView, setFvbView] = useState('bars');

  const p = plan(d, data.window);
  const st = { ...stock(d), range: rowsOf<TotalSkuRow>(d.totalSku) };
  const sales = salesSummary(rowsOf<SalesSummaryRow>(d.sales));
  const salesCmp = salesSummary(rowsOf<SalesSummaryRow>(d.salesCmp));
  const split = salesTypeSplit(rowsOf<SalesTypeRow>(d.salesType));
  const growth = salesCmp.total > 0 ? ((sales.total - salesCmp.total) / salesCmp.total) * 100 : null;
  const bTag = periodTag(data.cmpWindow);
  const aTag = periodTag(data.window);
  const daysPct = p.days.pct;

  // The accuracy cards' ⤢: every day gone in a single-month window (days without sales count as 0).
  const dailyRows = rowsOf<DailyAccuracyRow>(d.daily);
  const daysOf = (key: 'amount_tp' | 'amount_efp') => {
    if (!p.single) return [];
    const byDay = new Map(dailyRows.map((r) => [r.day, num(r[key]) ?? 0]));
    const today = todayIso();
    const last = data.window.end < today ? data.window.end : today;
    const out: { day: string; sales: number }[] = [];
    for (let day = data.window.start; day <= last; day = addDays(day, 1)) out.push({ day, sales: byDay.get(day) ?? 0 });
    return out;
  };

  const sSales = status(d, 'sales', 'salesCmp');
  const sStock = status(d, 'cover', 'coverTotal', 'bench');
  // The stock closing date the cover days are worked out on (1.0: "Closing Date: 17th Nov'26").
  const closing = trust(d).closing;

  // ── KPI cards: sales, then inventory against its benchmark (user, 19 Nov 2026). The IBL and
  // TSCL achievement, needed per day and days gone are in the two accuracy cards below. ──
  const invTp = num(st.total?.inv_val ?? null) ?? 0;
  // Stock at benchmark: the weighted benchmark × the daily target, so inventory ÷ it = the coverage index.
  const dailyTarget = num(st.total?.daily_target ?? null);
  const invTarget = st.wBm != null && dailyTarget ? st.wBm * dailyTarget : null;
  const coverInk = st.coverage == null ? undefined : rag(st.coverage, 'coverage') === 'green' ? colors.good : colors.warn;
  const longClasses = st.excessByClass.filter((c) => c.value > 0).sort((a, b) => b.value - a.value).map((c) => clsName(c.cls));
  const tiles: KpiTileProps[] = [
    {
      label: 'Sales TP',
      value: fmt(sales.total),
      help: helpFor('RV-01'),
      isLoading: sSales.isLoading,
      delta: COMPARE_ON ? { pct: growth, label: `vs ${fmt(salesCmp.total)} in ${bTag}` } : undefined,
      split: split.map((s) => ({ label: s.label.replace(/^Rd /, 'RD ').replace(/^Ibl /, 'IBL '), value: s.value, text: fmt(s.value), color: s.color })),
    },
    {
      label: 'Inventory TP',
      value: fmt(invTp),
      help: SUMMARY_HELP.inventory,
      isLoading: sStock.isLoading,
      caption: (
        <>
          {(num(st.total?.quantity ?? null) ?? 0).toLocaleString('en-US')} Units · At Cost{' '}
          <Text as="span" fontWeight={600} color={colors.darkText}>
            {st.fgCost == null ? '—' : fmt(st.fgCost)}
          </Text>
          {closing && <Text as="span" display="block">As Of {closingLabel(closing)}</Text>}
        </>
      ),
    },
    {
      label: 'Inventory target TP',
      value: invTarget == null ? '—' : fmt(invTarget),
      help: SUMMARY_HELP.inventoryTarget,
      isLoading: sStock.isLoading,
      caption:
        invTarget == null ? (
          'No benchmark set'
        ) : (
          <>
            <Text as="span" fontWeight={600} color={coverInk}>
              {invTp >= invTarget ? `${fmt(invTp - invTarget)} Over` : `${fmt(invTarget - invTp)} Under`}
            </Text>{' '}
            · Inventory Is {pct(st.coverage)} Of It
          </>
        ),
    },
    {
      label: 'Cover days TP',
      value: st.totalCd == null ? '—' : fmt1(st.totalCd),
      valueSuffix: 'days',
      help: helpFor('IN-14'),
      isLoading: sStock.isLoading,
      caption: (
        <>
          Benchmark {st.wBm == null ? '—' : `${fmt1(st.wBm)} Days`} ·{' '}
          <Text as="span" fontWeight={600} color={coverInk}>
            {pct(st.coverage)} Of Benchmark
          </Text>
        </>
      ),
    },
    {
      label: 'Excess stock cost',
      value: fmt(st.excess.value),
      help: helpFor('IN-04'),
      isLoading: sStock.isLoading,
      caption: (
        <>
          <Text as="span" fontWeight={600} color={rag(st.excess.pct, 'excessPct') === 'green' ? colors.good : colors.warn}>
            {pct(st.excess.pct)} Of Finished Goods
          </Text>
          {longClasses.length > 0 && <> · {longClasses.join(', ')}</>}
        </>
      ),
    },
    {
      label: 'Stock-out risk TP',
      value: fmt(st.shortfallValue),
      help: helpFor('IN-05'),
      isLoading: sStock.isLoading,
      caption: st.shortfall.length ? (
        <Text as="span" fontWeight={600} color={colors.bad}>
          {st.shortfall.map((c) => clsName(c.cls)).join(', ')} Below Threshold
        </Text>
      ) : (
        <Text as="span" fontWeight={600} color={colors.good}>
          No Class Below Its Threshold
        </Text>
      ),
    },
  ];

  // ── Sales: by class (1.0 Sales Summary) with the IBL target to date per class ──
  const cells = categoryCells([rowsOf<CategoryAccuracyRow>(d.cat0)]);
  const targetOf = (cls: string) => {
    if (!p.single) return 0;
    const c = cells.find((x) => x.month === p.currentMonth && x.cls === cls);
    return c ? c.target * p.iblShare : 0;
  };
  const breakdown = sales.rows.map((r) => ({
    name: clsName(r.cls),
    sale: r.amount,
    prior: salesCmp.rows.find((x) => x.cls === r.cls)?.amount ?? 0,
    target: targetOf(r.cls),
    count: r.skus,
  }));

  // ── Inventory: cover days vs benchmark and threshold per class ──
  const coverChart = [...st.cls]
    .sort((a, b) => byClass(a.cls, b.cls))
    .map((r) => ({ name: clsName(r.cls), cover: (basis === 'TP' ? r.cd : r.cdEfp) ?? 0, benchmark: r.bm ?? 0, threshold: r.th ?? 0, cls: r.cls }));

  // ── Accuracy: three months per class, and forecast vs budget ──
  const histIbl = classHistory([rowsOf<CategoryAccuracyRow>(d.cat1), rowsOf<CategoryAccuracyRow>(d.cat0)], data.window.end);
  const histBud = classHistory([rowsOf<CategoryAccuracyRow>(d.catY1), rowsOf<CategoryAccuracyRow>(d.catY0)], data.window.end);
  const fvb = rowsOf<IblVsTsclRow>(d.ibl)
    .map((r) => ({ cls: r.classification === 'Total' ? 'Total' : r.classification || 'Others', value: num(r.ibl_vs_tscl_pct) ?? 0, ibl: num(r.ibl_target) ?? 0, tscl: num(r.tscl_target) ?? 0 }))
    .sort((a, b) => (a.cls === 'Total' ? -1 : b.cls === 'Total' ? 1 : byClass(a.cls, b.cls)))
    .map((r) => ({ ...r, name: r.cls === 'Total' ? 'All classes' : clsName(r.cls) }));
  const daysText = `${p.days.daysGone} Of ${p.days.totalDays} Days`;
  // Forecast vs budget as Sales Pulse rows: the IBL target as the "sales", the TSCL budget as its target.
  const fvbRows = fvb.filter((r) => r.cls !== 'Total').map((r) => ({ name: r.name, sale: r.ibl, prior: 0, target: r.tscl }));

  const viewSwitch = (value: string, set: (v: string) => void, opts: [string, string][]) => (
    <Segmented size="xs" ariaLabel="View" value={value} onChange={(v) => set(String(v))} options={opts.map(([v, label]) => ({ value: v, label }))} />
  );

  return (
    // On a desktop window the tab fills the screen and does not scroll (as Sales Pulse 2.0);
    // a card too short for its content scrolls inside, and ⤢ opens it full size.
    <Flex direction="column" gap={3} h={fit ? '100%' : undefined} minH={0}>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', xl: 'repeat(6, minmax(0, 1fr))' }} gap={3} flexShrink={0} className="sp-stagger">
        {tiles.map((t) => (
          <KpiTile key={t.label} {...t} />
        ))}
      </Grid>

      {/* Row 1, in 1.0's order: Sales, then Inventory, then Forecast vs Budget. As tall as its
          tables (header, Total and the five classes), so there is no empty space under them;
          the accuracy cards below take the rest of the screen. */}
      <Grid templateColumns={{ base: '1fr', lg: 'minmax(0, 1.08fr) minmax(0, 1.3fr) minmax(0, .9fr)' }} gap={3} h={{ lg: '318px' }} flexShrink={0}>
        <ChartCard
          title="Sales Summary"
          help={helpFor('RV-13')}
          colSpan={1}
          isLoading={sSales.isLoading}
          variant={salesView === 'table' ? 'table' : salesView === 'bars' ? 'rows' : 'bar'}
          headerRight={viewSwitch(salesView, setSalesView, [['table', 'Table'], ['bars', 'Bars'], ['pie', 'Pie']])}
        >
          {/* The same rows, three views, as Sales Pulse 2.0's Business breakdown. */}
          {salesView === 'pie' ? (
            <SharePie rows={breakdown} fmt={fmt} onPick={(n) => openClass(clsOf(n))} />
          ) : salesView === 'bars' ? (
            <BreakdownBars rows={breakdown} fmt={fmt} showTarget={p.single} showPrior={COMPARE_ON} periods={{ a: aTag, b: bTag }} onPick={(n) => openClass(clsOf(n))} />
          ) : (
            <BreakdownTable
              rows={breakdown}
              timeGonePct={daysPct}
              showTarget={p.single}
              showGrowth={COMPARE_ON}
              fmt={fmt}
              countLabel="SKUs"
              nameMark={(n) => <ClassBadge cls={clsOf(n)} />}
              saleLabel={aTag}
              priorLabel={COMPARE_ON ? bTag : undefined}
              onPick={(n) => openClass(clsOf(n))}
              maxHeight="100%"
            />
          )}
        </ChartCard>

        <ChartCard
          title={`Benchmark & cover days ${basis}`}
          help={helpFor('IN-14')}
          colSpan={1}
          isLoading={sStock.isLoading}
          variant={stockView === 'table' ? 'table' : 'bar'}
          headerRight={
            <Flex gap={2}>
              {viewSwitch(stockView, setStockView, [['table', 'Table'], ['chart', 'Chart']])}
              <Segmented size="xs" ariaLabel="Valuation" value={basis} onChange={(v) => setBasis(v as 'TP' | 'EFP')} options={[{ value: 'TP', label: 'TP' }, { value: 'EFP', label: 'EFP' }]} />
            </Flex>
          }
        >
          {stockView === 'chart' ? (
            <BarChart
              data={coverChart}
              xKey="name"
              bars={[
                { key: 'cover', label: 'Cover days', color: colors.current, cellColor: (e) => clsColor(String(e.cls)) },
                { key: 'benchmark', label: 'Benchmark', color: colors.borderStrong },
                { key: 'threshold', label: 'Threshold', color: colors.prior },
              ]}
              labelKeys={['cover']}
              showLabels
              compact
              orientation="vertical"
              labelFormatter={(v) => `${fmt1(v)} d`}
              onBarClick={(n) => openClass(clsOf(n))}
              height="100%"
            />
          ) : (
            <StockByClass d={st} basis={basis} onPick={openClass} />
          )}
        </ChartCard>

        <ChartCard
          title="Forecast vs budget by class"
          help={helpFor('RV-11')}
          colSpan={1}
          isLoading={status(d, 'ibl').isLoading}
          variant={fvbView === 'table' ? 'table' : 'rows'}
          headerRight={viewSwitch(fvbView, setFvbView, [['bars', 'Bars'], ['table', 'Table']])}
        >
          {fvbView === 'table' ? (
            <BreakdownTable rows={fvbRows} timeGonePct={100} showTarget showGrowth={false} fmt={fmt} saleLabel="IBL Target" targetLabel="Budget" showShare={false} nameMark={(n) => <ClassBadge cls={clsOf(n)} />} onPick={(n) => detail.open({ kind: 'alignClass', cls: clsOf(n) })} maxHeight="100%" />
          ) : (
            <BreakdownBars rows={fvbRows} fmt={fmt} showTarget showPrior={false} targetLabel="Budget" periods={{ a: 'IBL Target', b: '' }} onPick={(n) => detail.open({ kind: 'alignClass', cls: clsOf(n) })} />
          )}
        </ChartCard>
      </Grid>

      {/* Row 2: the 1.0 accuracy cards, each with its donut against days gone. */}
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }} gap={3} flex={fit ? '1 1 0' : undefined} minH={fit ? 0 : '380px'}>
        <AccuracyCard
          title="Budget Accuracy TSCL"
          help={helpFor('RV-15')}
          noun="budget"
          monthPlan={p.B}
          planToDate={p.Btd}
          achieved={p.Se}
          monthPct={p.gaugeBud}
          toDatePct={p.attBud}
          projectedPct={p.single && p.includesToday ? projectedMonthEnd(p.Se, p.days.daysGone, p.days.totalDays, p.B) : null}
          required={p.runRateBud.required}
          current={p.runRateBud.current}
          daysPct={daysPct}
          daysText={daysText}
          history={histBud}
          loading={status(d, 'fay', 'catY0', 'catY1').isLoading}
          onPick={openClass}
          days={daysOf('amount_efp')}
          dailyLoading={status(d, 'daily').isLoading}
          basis="EFP"
        />
        <AccuracyCard
          title="Forecast Accuracy IBL"
          help={helpFor('RV-14')}
          noun="target"
          monthPlan={p.T}
          planToDate={p.Ttd}
          achieved={p.S}
          monthPct={p.gaugeIbl}
          toDatePct={p.attIbl}
          projectedPct={p.single && p.includesToday ? p.projected : null}
          required={p.runRate.required}
          current={p.runRate.current}
          daysPct={daysPct}
          daysText={daysText}
          history={histIbl}
          loading={status(d, 'fam', 'cat0', 'cat1').isLoading}
          onPick={openClass}
          days={daysOf('amount_tp')}
          dailyLoading={status(d, 'daily').isLoading}
          basis="TP"
        />
      </Grid>
    </Flex>
  );
}
