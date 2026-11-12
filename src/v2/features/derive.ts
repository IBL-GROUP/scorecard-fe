// Turns a tab's query results into the figures its screens show. Overview and
// the domain tabs call the same functions, so a KPI repeated on two tabs
// (e.g. EX-01 = RV-02) is always the same number.

import {
  num,
  type AccuracyRow,
  type BenchmarkRow,
  type BudgetAccuracyRow,
  type CategoryAccuracyRow,
  type ClosingInvRow,
  type CoverDaysRow,
  type DaysGoneRow,
  type DispatchVsOrderRow,
  type IblVsTsclRow,
  type RdStatusRow,
  type RpmRow,
  type SalesSummaryRow,
  type ServiceMeasureRow,
  type ThresholdRow,
  type WipRow,
} from '@/v2/api/types';
import { anyError, anyLoading, anyPending, firstOf, rowsOf, type Result, type TabData } from './data';

/** A card's failure state: a real error, or 'pending' when the source isn't in BigQuery yet. */
export type LoadError = boolean | 'pending';
import * as K from './kpis';
import { daysInMonth, getDaysGone, isSingleMonth, lastMonthEnds, monthsIn, parse, todayIso, type Window } from './period';
import type { Section } from './tabs';

/** Combined status of a set of results, for one tile or card. */
export function status(d: TabData, ...names: string[]) {
  const rs = names.map((n) => d[n]).filter(Boolean) as Result[];
  return {
    isLoading: anyLoading(...rs),
    // A source that isn't available yet outranks other errors: it explains the gap.
    error: (anyPending(...rs) ? 'pending' : anyError(...rs)) as LoadError,
    locked: (rs.find((r) => r.locked)?.section ?? null) as Section | null,
  };
}

// ── Plan ──────────────────────────────────────────────────────────────────

export function plan(d: TabData, w: Window) {
  const today = todayIso();
  const fam = firstOf<AccuracyRow>(d.fam);
  const famCmp = firstOf<AccuracyRow>(d.famCmp);
  const dg = firstOf<DaysGoneRow>(d.daysgone);
  const dgCmp = firstOf<DaysGoneRow>(d.daysgoneCmp);
  const fay = firstOf<BudgetAccuracyRow>(d.fay);
  const fayCmp = firstOf<BudgetAccuracyRow>(d.fayCmp);
  const days = getDaysGone(w, today);
  const single = isSingleMonth(w);
  const includesToday = w.start <= today && w.end >= today;

  const S = num(fam?.amount ?? null);
  const T = num(fam?.target_value ?? null);
  const Ttd = num(dg?.target_value ?? null);
  const Se = num(fay?.amount ?? null);
  const B = num(fay?.target_value ?? null);
  const Btd = num(fay?.target_to_date ?? null);

  // Rule F1: windows over one month sum month by month.
  const months = monthsIn(w);
  const f1 = (prefix: string) => {
    const responses = Object.keys(d).filter((k) => k.startsWith(prefix)).map((k) => rowsOf<CategoryAccuracyRow>(d[k]));
    const cells = K.categoryCells(responses);
    const lastYm = months[months.length - 1];
    const cap = w.end < today ? w.end : today;
    const lastFraction = cap.slice(0, 7) === lastYm ? Number(cap.slice(8, 10)) / daysInMonth(parse(cap).getFullYear(), parse(cap).getMonth()) : 1;
    let amount = 0;
    let target = 0;
    for (const c of cells.filter((x) => months.includes(x.month))) {
      amount += c.amount;
      target += c.month === lastYm ? c.target * lastFraction : c.target;
    }
    return { amount, target, pct: target > 0 ? (amount / target) * 100 : null };
  };
  const multiIbl = single ? null : f1('f1m');
  const multiBud = single ? null : f1('f1y');

  const attIbl = single ? K.attainmentToDate(S, Ttd) : multiIbl!.pct;
  const attBud = single ? K.attainmentToDate(Se, Btd) : multiBud!.pct;
  const attIblCmp = K.attainmentToDate(num(famCmp?.amount ?? null), num(dgCmp?.target_value ?? null));
  const attBudCmp = K.attainmentToDate(num(fayCmp?.amount ?? null), num(fayCmp?.target_to_date ?? null));

  // EX-02: projection only for a single month that includes today; a finished month is "Final".
  const projected = single ? (includesToday ? K.projectedMonthEnd(S, days.daysGone, days.totalDays, T) : K.attainmentToDate(S, T)) : null;

  const cells = K.categoryCells([rowsOf<CategoryAccuracyRow>(d.cat1), rowsOf<CategoryAccuracyRow>(d.cat0)]);
  // The current month is still running: compare its sales with the plan for the
  // same days (pace-adjusted), so it is comparable with completed months.
  // - IBL targets (mv_tscl_spl_targets) are DAILY rows, and the category call
  //   sums them up to endDate, so they already run to endDate. Only the days
  //   between today and a future endDate need taking out.
  // - The TSCL budget (mv_tscl_budget) is ONE row per month, so the current
  //   month's budget is scaled by days gone ÷ days in the month.
  const curDay = w.end < today ? w.end : today;
  const curYm = curDay.slice(0, 7);
  const dayNum = (s: string) => Number(s.slice(8, 10));
  const iblShare = w.end.slice(0, 7) === curYm && w.end > curDay ? dayNum(curDay) / dayNum(w.end) : 1;
  const budShare = dayNum(curDay) / daysInMonth(parse(curDay).getFullYear(), parse(curDay).getMonth());
  const trend = K.attainmentTrend(iblShare < 1 ? cells.map((c) => (c.month === curYm ? { ...c, target: c.target * iblShare } : c)) : cells);
  const iblRows = rowsOf<IblVsTsclRow>(d.ibl);
  const total = iblRows.find((r) => r.classification === 'Total');

  return {
    days,
    single,
    includesToday,
    S,
    T,
    Ttd,
    Se,
    B,
    Btd,
    Scmp: num(famCmp?.amount ?? null),
    attIbl,
    attBud,
    attIblCmp,
    attBudCmp,
    // No plan loaded (0 or missing) → no variance: it would only repeat the sales.
    varIbl: single ? (S != null && Ttd != null && Ttd > 0 ? S - Ttd : null) : multiIbl && multiIbl.target > 0 ? multiIbl.amount - multiIbl.target : null,
    varBud: single ? (Se != null && Btd != null && Btd > 0 ? Se - Btd : null) : multiBud && multiBud.target > 0 ? multiBud.amount - multiBud.target : null,
    projected,
    projectedFinal: single && !includesToday,
    runRate: K.runRate(T, S, days.daysGone, days.totalDays),
    fam,
    fay,
    gaugeIbl: K.gaugePct(num(fam?.pct ?? null), T),
    gaugeBud: K.gaugePct(num(fay?.pct ?? null), B),
    cells,
    trend,
    /** Share of the current month's IBL target (from the category call) that sales are compared with. */
    iblShare,
    /** Share of the current month's TSCL budget that sales are compared with. */
    budShare,
    /** `YYYY-MM` of the month that is still running (or the window's last month). */
    paceMonth: curYm,
    spark: trend.map((r) => r.Total as number | null),
    currentMonth: w.end.slice(0, 7),
    iblRows,
    // No TSCL budget loaded → no alignment (the API sends 0, which would read as a Red 0%).
    alignment: (num(total?.tscl_target ?? null) ?? 0) > 0 ? num(total?.ibl_vs_tscl_pct ?? null) : null,
    classRank: K.classRanking(cells, w.end.slice(0, 7)),
  };
}

// ── Stock & service ──────────────────────────────────────────────────────

export function stock(d: TabData) {
  const cover = rowsOf<CoverDaysRow>(d.cover);
  const bench = rowsOf<BenchmarkRow>(d.bench);
  const total = firstOf<CoverDaysRow>(d.coverTotal);
  const cls = K.classStock(cover, bench);
  const wBm = K.weightedBenchmark(cls);
  // BR-SUM-003 fallback when the total row is missing.
  const totalCd = num(total?.cover_days ?? null) ?? (cls.reduce((t, r) => t + r.dailyTarget, 0) > 0 ? cls.reduce((t, r) => t + r.invTp, 0) / cls.reduce((t, r) => t + r.dailyTarget, 0) : null);
  const excess = K.excessTotal(cls);
  const shortfall = K.shortfallByClass(cls);
  return {
    cover,
    bench,
    total,
    cls,
    wBm,
    totalCd,
    coverage: K.coverageIndex(totalCd, wBm),
    excess,
    excessByClass: K.excessByClass(cls),
    shortfall,
    shortfallValue: shortfall.reduce((t, r) => t + r.value, 0),
    fgCost: num(total?.inv_val_efp ?? null) ?? excess.fgCost,
    fgTp: num(total?.inv_val ?? null),
  };
}

export function service(d: TabData, classes: string[] = []) {
  const ab = rowsOf<ThresholdRow>(d.aboveBelow).filter((r) => !classes.length || classes.includes(r.classification));
  const matrix = K.serviceMatrix(rowsOf<ServiceMeasureRow>(d.serviceAll));
  return { ab, ...K.serviceLevel(ab), matrix, worst: matrix[0] };
}

// ── Fulfilment & production ──────────────────────────────────────────────

export function fulfilment(d: TabData) {
  const rows = rowsOf<DispatchVsOrderRow>(d.dispatch);
  const cmp = rowsOf<DispatchVsOrderRow>(d.dispatchCmp);
  return { rows, ...K.fillRate(rows), cmpPct: K.fillRate(cmp).pct, cmpUnfulfilled: K.fillRate(cmp).unfulfilled, channels: K.fillByChannel(rows) };
}

export function production(d: TabData) {
  const wip = rowsOf<WipRow>(d.wip);
  const rpm = rowsOf<RpmRow>(d.rpm);
  return { wip, rpm, w: K.wipSummary(wip), r: K.rmpmSummary(rpm), wCmp: K.wipSummary(rowsOf<WipRow>(d.wipCmp)), rCmp: K.rmpmSummary(rowsOf<RpmRow>(d.rpmCmp)) };
}

/** EX-07 / IN-09: working capital at each of the last 6 month-ends. */
export function workingCapitalTrend(d: TabData, end: string) {
  return lastMonthEnds(end, 6).map((me, i) => {
    const fg = num(firstOf<CoverDaysRow>(d[`wcFg${i}`])?.inv_val_efp ?? null);
    const wip = K.wipSummary(rowsOf<WipRow>(d[`wcWip${i}`])).value;
    const rpm = K.rmpmSummary(rowsOf<RpmRow>(d[`wcRpm${i}`])).total;
    return { month: me.slice(0, 7), fg: fg ?? 0, wip, rpm, total: (fg ?? 0) + wip + rpm };
  });
}

// ── Distribution & data trust ────────────────────────────────────────────

export function distribution(d: TabData) {
  const rows = rowsOf<RdStatusRow>(d.rd);
  return { rows, ...K.rdSummary(rows), cmp: K.rdSummary(rowsOf<RdStatusRow>(d.rdCmp)) };
}

export function trust(d: TabData) {
  // scorecard-be v2 sends a timestamp (2026-11-10T00:00:00.000Z), 1.0 a date: keep the date part.
  const closing = firstOf<ClosingInvRow>(d.closing)?.closing_date?.slice(0, 10) ?? null;
  const fam = firstOf<AccuracyRow>(d.fam);
  const fay = firstOf<BudgetAccuracyRow>(d.fay);
  const bench = rowsOf<BenchmarkRow>(d.bench);
  return {
    closing,
    freshness: K.freshnessDays(closing, todayIso()),
    checks: K.planDataLoaded(num(fam?.target_value ?? null), num(fay?.target_value ?? null), bench),
    unclassified: K.unclassifiedShare(rowsOf<SalesSummaryRow>(d.sales)),
    bench,
  };
}
