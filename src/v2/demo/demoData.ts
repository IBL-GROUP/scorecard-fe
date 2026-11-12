// Generated demo dataset for the Supply Chain Pulse 2.0 prototype.
//
// Every number is produced from a seeded random generator, so the same date
// always gives the same figures. Nothing here is real company data. The model
// is shaped so every RAG state appears: some classes ahead of plan and some
// behind, one class over-stocked, one under its threshold, a weak channel,
// silent distributors and blocked material.

import { addDays, addMonths, daysInMonth, monthStart, parse, todayIso } from '@/v2/features/period';
import type { DemoScenario } from './scenario';

// ── Seeded randomness ──
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** Uniform [0, 1) from a key. */
export const rnd = (key: string) => {
  let t = hash(key) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const between = (key: string, lo: number, hi: number) => lo + rnd(key) * (hi - lo);
export const pick = <T>(key: string, list: readonly T[]) => list[Math.floor(rnd(key) * list.length)];

// ── Reference data ──
export const DIVISIONS = ['Pharma One', 'Pharma Two', 'Specialty', 'Consumer Health', 'Nutrition', 'OTC'] as const;

export const BRANCHES = [
  { code: '1101', name: 'Bahawalpur', key: 'bahawalpur', weight: 0.04 },
  { code: '1102', name: 'DSS Korangi', key: 'dss_korangi', weight: 0.06 },
  { code: '1103', name: 'Faisalabad', key: 'faisalabad', weight: 0.08 },
  { code: '1104', name: 'Gujranwala', key: 'gujranwala', weight: 0.06 },
  { code: '1105', name: 'Hyderabad', key: 'hyderabad', weight: 0.06 },
  { code: '1106', name: 'Islamabad', key: 'islamabad', weight: 0.08 },
  { code: '1107', name: 'Karachi', key: 'karachi', weight: 0.16 },
  { code: '1108', name: 'Korangi', key: 'korangi', weight: 0.07 },
  { code: '1109', name: 'Lahore', key: 'lahore', weight: 0.14 },
  { code: '1110', name: 'Mingora', key: 'mingora', weight: 0.03 },
  { code: '1111', name: 'Multan', key: 'multan', weight: 0.07 },
  { code: '1112', name: 'Peshawar', key: 'peshawar', weight: 0.07 },
  { code: '1113', name: 'Quetta', key: 'quetta', weight: 0.04 },
  { code: '1114', name: 'Sukkur', key: 'sukkur', weight: 0.04 },
] as const;

/** Branch service bias: a few branches run thin on some classes. */
const BRANCH_STOCK_BIAS: Record<string, number> = { quetta: 0.55, mingora: 0.7, sukkur: 0.8, karachi: 1.15, lahore: 1.1 };

type Cls = 'A' | 'B' | 'C' | 'N' | 'Others';

export interface Sku {
  code: string;
  name: string;
  cls: Cls;
  division: string;
  /** Planned daily sales at TP, PKR. */
  base: number;
  tradePrice: number;
  costRatio: number;
  /** Target cover days for this SKU. */
  cover: number;
}

const CLASS_PLAN: Record<Cls, { count: number; lo: number; hi: number; cover: number }> = {
  A: { count: 28, lo: 180_000, hi: 420_000, cover: 33 },
  B: { count: 36, lo: 60_000, hi: 150_000, cover: 49 },
  C: { count: 44, lo: 15_000, hi: 50_000, cover: 98 },
  N: { count: 24, lo: 5_000, hi: 20_000, cover: 13 },
  Others: { count: 8, lo: 3_000, hi: 12_000, cover: 40 },
};

const STEMS = ['Cardio', 'Neuro', 'Gastro', 'Derma', 'Respi', 'Ortho', 'Pedia', 'Vita', 'Glyco', 'Hepa', 'Immuno', 'Opti'];
const FORMS = ['Tab 10s', 'Tab 20s', 'Cap 14s', 'Syrup 120ml', 'Susp 60ml', 'Inj 1ml', 'Cream 20g', 'Drops 10ml', 'Sachet 10s'];
const STRENGTHS = ['5mg', '10mg', '20mg', '40mg', '100mg', '250mg', '500mg'];

export const SKUS: Sku[] = (() => {
  const out: Sku[] = [];
  let n = 1001;
  (Object.keys(CLASS_PLAN) as Cls[]).forEach((cls) => {
    const p = CLASS_PLAN[cls];
    for (let i = 0; i < p.count; i++) {
      const code = `SKU-${n++}`;
      out.push({
        code,
        name: `${pick(code + 's', STEMS)}${pick(code + 'x', ['ex', 'on', 'ix', 'ol', 'ra', 'cin'])} ${pick(code + 'g', STRENGTHS)} ${pick(code + 'f', FORMS)}`,
        cls,
        division: pick(code + 'd', DIVISIONS),
        base: between(code + 'b', p.lo, p.hi),
        tradePrice: Math.round(between(code + 'p', 150, 1500)),
        costRatio: between(code + 'c', 0.5, 0.65),
        cover: p.cover * between(code + 'v', 0.5, 1.6),
      });
    }
  });
  return out;
})();

export const BENCHMARKS: Record<Exclude<Cls, 'Others'>, { days: number; threshold: number }> = {
  A: { days: 35, threshold: 20 },
  B: { days: 45, threshold: 25 },
  C: { days: 60, threshold: 30 },
  N: { days: 30, threshold: 15 },
};
export const BENCHMARK_EFFECTIVE = '2026-01-01';

/** Sales against plan per class. */
const PERFORMANCE: Record<DemoScenario['performance'], Record<Cls, number>> = {
  mixed: { A: 0.97, B: 1.13, C: 0.86, N: 1.03, Others: 1 },
  ahead: { A: 1.08, B: 1.12, C: 1.06, N: 1.1, Others: 1.05 },
  behind: { A: 0.84, B: 0.86, C: 0.8, N: 0.85, Others: 0.85 },
};
/** Budget relative to target per class (drives Forecast vs Budget %). */
const BUDGET_FACTOR: Record<Cls, number> = { A: 0.99, B: 0.94, C: 1.05, N: 0.86, Others: 1 };
/** Share of SKUs per class that sell nothing in a month. */
const IDLE_RATE: Record<Cls, number> = { A: 0, B: 0.03, C: 0.12, N: 0.2, Others: 0.3 };
/** EFP sales and budget sit on a different price basis to TP. */
export const EFP_RATIO = 0.96;

const season = (ym: string) => 1 + 0.06 * Math.sin((Number(ym.slice(5, 7)) / 12) * 2 * Math.PI);
/** Weekday shape: Sundays are quiet. Targets are calibrated to the same shape. */
const WEEK_SHAPE = (6 + 0.35) / 7;

export class DemoModel {
  readonly today = todayIso();
  readonly dataStart: string;
  readonly stockAsOf: string;

  constructor(readonly s: DemoScenario) {
    this.dataStart = addMonths(monthStart(this.today), -(s.historyMonths - 1));
    this.stockAsOf = addDays(this.today, s.stale ? -4 : -1);
  }

  /** IBL target for a SKU in a month (YYYY-MM). */
  target(sku: Sku, ym: string) {
    if (`${ym}-01` < this.dataStart) return 0;
    const d = parse(`${ym}-01`);
    return sku.base * daysInMonth(d.getFullYear(), d.getMonth()) * season(ym) * WEEK_SHAPE * between(`${sku.code}${ym}t`, 0.95, 1.05);
  }

  budget(sku: Sku, ym: string) {
    return this.target(sku, ym) * BUDGET_FACTOR[sku.cls] * EFP_RATIO;
  }

  /** TP sales of a SKU on a date. */
  daySales(sku: Sku, date: string) {
    if (date < this.dataStart || date > this.today) return 0;
    // Tail SKUs: some do not sell at all in a given month (drives Range Activation, RV-10).
    if (rnd(`${sku.code}${date.slice(0, 7)}idle`) < IDLE_RATE[sku.cls]) return 0;
    const d = parse(date);
    const weekday = d.getDay() === 0 ? 0.35 : 1;
    return sku.base * PERFORMANCE[this.s.performance][sku.cls] * season(date.slice(0, 7)) * weekday * between(`${sku.code}${date}`, 0.85, 1.15);
  }

  sales(sku: Sku, start: string, end: string) {
    let total = 0;
    for (let d = start; d <= end; d = addDays(d, 1)) total += this.daySales(sku, d);
    return total;
  }

  /** Stock snapshot date for a window: latest count inside it (BR-MET-008). */
  snapshot(end: string) {
    const s = end < this.stockAsOf ? end : this.stockAsOf;
    return s < this.dataStart ? null : s;
  }

  /** Network cover days of a SKU on a snapshot date (drifts a little month to month). */
  skuCover(sku: Sku, date: string) {
    return sku.cover * between(`${sku.code}${date.slice(0, 7)}cv`, 0.9, 1.1);
  }

  /** Cover of a SKU in one branch. 0 = no stock there. */
  branchCover(sku: Sku, branchKey: string, date: string) {
    if (rnd(`${sku.code}${branchKey}none`) < 0.05) return 0;
    const bias = BRANCH_STOCK_BIAS[branchKey] ?? 1;
    return this.skuCover(sku, date) * bias * between(`${sku.code}${branchKey}${date.slice(0, 7)}`, 0.45, 1.6);
  }

  dailyTarget(sku: Sku, date: string) {
    const d = parse(date);
    return this.target(sku, date.slice(0, 7)) / daysInMonth(d.getFullYear(), d.getMonth());
  }
}

