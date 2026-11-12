// Every derived figure on Supply Chain Pulse 2.0, as pure functions.
//
// Formulas are the PRD v2 section 4 definitions. The backend owns every base
// metric (BR-MET-…); these functions only combine fields the existing
// endpoints already return. Each function names the PRD ID it serves.

import {
  INV_BRANCHES,
  n0,
  num,
  RATED_CLASSES,
  type BenchmarkRow,
  type CategoryAccuracyRow,
  type CoverDaysRow,
  type DispatchVsOrderRow,
  type RdStatusRow,
  type RpmRow,
  type SalesSummaryRow,
  type ServiceMeasureRow,
  type ThresholdRow,
  type TotalSkuRow,
  type WipRow,
} from '@/v2/api/types';
import { monthKeyFromLabel } from './period';
import { rag, riskRules, type Rag } from './kpiThresholds';

const pct = (a: number | null, b: number | null) => (a == null || b == null || b <= 0 ? null : (a / b) * 100);
const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);
const normClass = (c: string | null | undefined) => {
  const t = (c ?? '').trim();
  return t === '' || t === 'Others' || t === 'Other' ? 'Others' : t;
};

// ── Plan (EX-01, EX-02, EX-03, RV-05) ─────────────────────────────────────

/** EX-01 / EX-03: sales ÷ target to date × 100. */
export const attainmentToDate = (sales: number | null, targetToDate: number | null) => pct(sales, targetToDate);

/** EX-02: (sales ÷ days gone × total days) ÷ full target × 100. */
export function projectedMonthEnd(sales: number | null, daysGone: number, totalDays: number, target: number | null) {
  if (sales == null || target == null || target <= 0 || daysGone <= 0) return null;
  return ((sales / daysGone) * totalDays / target) * 100;
}

/** RV-05: PKR per remaining day needed vs current run-rate. */
export function runRate(target: number | null, sales: number | null, daysGone: number, totalDays: number) {
  const left = totalDays - daysGone;
  return {
    required: target == null || sales == null || left <= 0 ? null : Math.max(0, target - sales) / left,
    current: sales == null || daysGone <= 0 ? null : sales / daysGone,
  };
}

/** RV-14 / RV-15 (1.0 rule BR-SUM-002): ratio → %, 1 decimal; target ≤ 0 → null. */
export function gaugePct(ratio: number | null, target: number | null) {
  if (ratio == null || target == null || target <= 0) return null;
  return Math.round(ratio * 1000) / 10;
}

// ── Category history (RV-06, RV-07, RV-08, RV-12, rule F1) ───────────────

export interface MonthClass { month: string; cls: string; amount: number; target: number }

/** Flatten one or more category-accuracy responses into month × class cells (deduplicated). */
export function categoryCells(responses: CategoryAccuracyRow[][]): MonthClass[] {
  const map = new Map<string, MonthClass>();
  for (const rows of responses)
    for (const r of rows) {
      const month = monthKeyFromLabel(r.month);
      const cls = normClass(r.classification);
      map.set(`${month}|${cls}`, { month, cls, amount: n0(r.amount), target: n0(r.target_value) });
    }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** RV-06/07: attainment % per month per class plus Total. */
export function attainmentTrend(cells: MonthClass[]) {
  const months = [...new Set(cells.map((c) => c.month))].sort();
  return months.map((m) => {
    const row: Record<string, number | string | null> = { month: m };
    const inMonth = cells.filter((c) => c.month === m);
    for (const c of inMonth) row[c.cls] = pct(c.amount, c.target);
    row.Total = pct(sum(inMonth, (c) => c.amount), sum(inMonth, (c) => c.target));
    return row;
  });
}

/** Rule F1: attainment over several months = Σ amount ÷ Σ target over the window's months. */
export function multiMonthAttainment(cells: MonthClass[], months: string[]) {
  const inWindow = cells.filter((c) => months.includes(c.month));
  return { amount: sum(inWindow, (c) => c.amount), target: sum(inWindow, (c) => c.target), pct: pct(sum(inWindow, (c) => c.amount), sum(inWindow, (c) => c.target)) };
}

/**
 * RV-08: variance to plan per class in a month. `share` is the part of each
 * cell's target that the sales are compared with: 1 when the target already
 * runs to the same day as the sales (IBL targets are daily), less when the
 * target covers more days than the sales do.
 */
export function varianceByClass(cells: MonthClass[], month: string, share: number) {
  const rows = cells.filter((c) => c.month === month);
  const prorated = sum(rows, (c) => c.target * share);
  return {
    prorated,
    actual: sum(rows, (c) => c.amount),
    steps: rows.map((c) => ({ cls: c.cls, variance: c.amount - c.target * share })),
  };
}

/** RV-12: classes ranked by attainment in a month. */
export function classRanking(cells: MonthClass[], month: string) {
  return cells
    .filter((c) => c.month === month && c.target > 0)
    .map((c) => ({ cls: c.cls, pct: (c.amount / c.target) * 100 }))
    .sort((a, b) => b.pct - a.pct);
}

// ── Sales (RV-09, RV-10, RV-13, DH-09) ───────────────────────────────────

/** RV-13 / RV-09: per-class sales, SKUs and share (1 decimal, BR-SUM-003). */
export function salesSummary(rows: SalesSummaryRow[]) {
  const total = sum(rows, (r) => n0(r.amount));
  return {
    total,
    rows: rows.map((r) => ({
      cls: normClass(r.classification),
      skus: n0(r.sku),
      amount: n0(r.amount),
      share: total > 0 ? Math.round((n0(r.amount) / total) * 1000) / 10 : 0,
    })),
  };
}

/** RV-10: SKUs sold ÷ SKUs in range × 100, per class and total. */
export function rangeActivation(sales: SalesSummaryRow[], range: TotalSkuRow[]) {
  const rows = RATED_CLASSES.map((cls) => {
    const sold = n0(sales.find((r) => normClass(r.classification) === cls)?.sku);
    const inRange = n0(range.find((r) => normClass(r.classification) === cls)?.count);
    return { cls, sold, inRange, pct: pct(sold, inRange) };
  });
  return { rows, total: pct(sum(rows, (r) => r.sold), sum(rows, (r) => r.inRange)) };
}

/** DH-09: Others sales ÷ total sales × 100. */
export function unclassifiedShare(rows: SalesSummaryRow[]) {
  const total = sum(rows, (r) => n0(r.amount));
  return pct(sum(rows.filter((r) => normClass(r.classification) === 'Others'), (r) => n0(r.amount)), total);
}

// ── Inventory (EX-04, EX-08, IN-05, IN-07, IN-08) ─────────────────────────

export interface ClassStock {
  cls: string;
  cd: number | null;
  cdEfp: number | null;
  invTp: number;
  invCost: number;
  qty: number;
  dailyTarget: number;
  bm: number | null;
  th: number | null;
}

/** Join cover-days rows with benchmark rows; 0 or missing benchmark = not set (BR-MET-003). */
export function classStock(cover: CoverDaysRow[], bench: BenchmarkRow[]): ClassStock[] {
  return cover.map((r) => {
    const cls = normClass(r.classification);
    const b = bench.find((x) => normClass(x.classification) === cls);
    const bm = num(b?.days ?? null);
    const th = num(b?.threshold ?? null);
    return {
      cls,
      cd: num(r.cover_days),
      cdEfp: num(r.cover_days_efp),
      invTp: n0(r.inv_val),
      invCost: n0(r.inv_val_efp),
      qty: n0(r.quantity),
      dailyTarget: n0(r.daily_target),
      bm: bm && bm > 0 ? bm : null,
      th: th && th > 0 ? th : null,
    };
  });
}

/** EX-04: Σ(bm × dt) ÷ Σ dt over classes with a benchmark (Others is left out, PRD Q4). */
export function weightedBenchmark(rows: ClassStock[]) {
  const rated = rows.filter((r) => r.bm != null && r.dailyTarget > 0);
  const dt = sum(rated, (r) => r.dailyTarget);
  return dt > 0 ? sum(rated, (r) => (r.bm as number) * r.dailyTarget) / dt : null;
}

/** EX-04: total cover days ÷ weighted benchmark × 100. */
export const coverageIndex = (totalCoverDays: number | null, wBenchmark: number | null) => pct(totalCoverDays, wBenchmark);

/** EX-08: per-class excess at cost = max(0, cd − bm) × dt × (cost ÷ TP). */
export function excessByClass(rows: ClassStock[]) {
  return rows
    .filter((r) => r.bm != null && r.cd != null)
    .map((r) => ({
      cls: r.cls,
      value: Math.max(0, (r.cd as number) - (r.bm as number)) * r.dailyTarget * (r.invTp > 0 ? r.invCost / r.invTp : 0),
    }));
}

export function excessTotal(rows: ClassStock[]) {
  const value = sum(excessByClass(rows), (r) => r.value);
  const fgCost = sum(rows, (r) => r.invCost);
  return { value, pct: pct(value, fgCost), fgCost };
}

/** IN-05: per class below threshold, (th − cd) × dt (TP value of demand not covered). */
export function shortfallByClass(rows: ClassStock[]) {
  return rows
    .filter((r) => r.th != null && r.cd != null && (r.cd as number) < (r.th as number))
    .map((r) => ({ cls: r.cls, value: ((r.th as number) - (r.cd as number)) * r.dailyTarget }));
}

/** IN-05 status: Green when no shortfall, Red when any class A shortfall, else Amber. */
export function shortfallRag(rows: { cls: string; value: number }[]): Rag {
  if (rows.length === 0) return 'green';
  return rows.some((r) => r.cls === 'A' && r.value > 0) ? 'red' : 'amber';
}

/** Coverage of one class: cd ÷ bm × 100. */
export const classCoverage = (r: ClassStock) => pct(r.cd, r.bm);

// ── Service (EX-05, IN-06, IN-10, IN-11, IN-12) ──────────────────────────

/** EX-05 / IN-06: network service level and stock-out risk. */
export function serviceLevel(rows: ThresholdRow[]) {
  const above = sum(rows, (r) => n0(r['No Of SKUs > Threshold']));
  const below = sum(rows, (r) => n0(r['No Of SKUs < Threshold']));
  return { above, below, level: pct(above, above + below), risk: pct(below, above + below) };
}

/** IN-10 / IN-11: branch × class matrix, sorted worst-first by simple row average. */
export function serviceMatrix(rows: ServiceMeasureRow[]) {
  return rows
    .map((r) => {
      const cells = RATED_CLASSES.map((c) => num(r[`SKU-${c}%` as const]));
      const vals = cells.filter((v): v is number => v != null);
      return { branch: r.branch, cells, avg: vals.length ? sum(vals, (v) => v) / vals.length : null };
    })
    .sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0));
}

/** IN-12: class rows of /inventory-days = average of each class's SKUs per branch (1.0 rule). */
export function inventoryClassRows(rows: Record<string, unknown>[]) {
  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const cls = normClass(r.classification as string);
    grouped.set(cls, [...(grouped.get(cls) ?? []), r]);
  }
  return ['A', 'B', 'C', 'N', 'Others']
    .filter((c) => grouped.get(c)?.length)
    .map((cls) => {
      const g = grouped.get(cls)!;
      const vals = INV_BRANCHES.map((b) => sum(g, (r) => Number(r[b.key] ?? 0)) / g.length);
      const withValue = vals.filter((v) => v > 0);
      return {
        cls,
        vals,
        total: withValue.length ? sum(withValue, (v) => v) / withValue.length : 0,
        skus: g.map((r) => ({
          sku: String(r.item_desc ?? ''),
          vals: INV_BRANCHES.map((b) => Number(r[b.key] ?? 0)),
          total: Number(r.total ?? 0),
        })),
      };
    });
}

// ── Fulfilment (EX-06, OP-01 … OP-05) ─────────────────────────────────────

export function fillRate(rows: DispatchVsOrderRow[]) {
  const ordered = sum(rows, (r) => n0(r.total_order_qty));
  const delivered = sum(rows, (r) => n0(r.total_delivery_qty));
  return { ordered, delivered, pct: pct(delivered, ordered), unfulfilled: sum(rows, (r) => Math.max(0, n0(r.total_order_qty) - n0(r.total_delivery_qty))) };
}

/** OP-03: fill rate per channel, worst first. */
export function fillByChannel(rows: DispatchVsOrderRow[]) {
  const channels = [...new Set(rows.map((r) => r.channel_type))];
  return channels
    .map((ch) => ({ channel: ch, ...fillRate(rows.filter((r) => r.channel_type === ch)) }))
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
}

/** OP-04: materials whose delivery % is below the rule threshold. */
export function materialsBelow(rows: DispatchVsOrderRow[], below: number = riskRules.materialFillBelow) {
  const byMat = new Map<string, DispatchVsOrderRow[]>();
  for (const r of rows) byMat.set(r.material_name, [...(byMat.get(r.material_name) ?? []), r]);
  const all = [...byMat.values()].map((g) => fillRate(g).pct ?? 0);
  return { below: all.filter((p) => p < below).length, total: all.length };
}

/** OP-05: top materials by unfulfilled quantity with cumulative share. */
export function paretoUnfulfilled(rows: DispatchVsOrderRow[], top = 10) {
  const byMat = new Map<string, number>();
  for (const r of rows) byMat.set(r.material_name, (byMat.get(r.material_name) ?? 0) + Math.max(0, n0(r.total_order_qty) - n0(r.total_delivery_qty)));
  const total = sum([...byMat.values()], (v) => v);
  let cum = 0;
  return [...byMat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([material, qty]) => {
      cum += qty;
      return { material, qty, cumPct: total > 0 ? (cum / total) * 100 : 0 };
    });
}

// ── Production (OP-06 … OP-12, EX-07) ────────────────────────────────────

export function wipSummary(rows: WipRow[]) {
  const items = sum(rows, (r) => n0(r.item_qty));
  const received = sum(rows, (r) => n0(r.good_received_qty));
  const open = new Set(rows.filter((r) => n0(r.good_received_qty) < n0(r.item_qty)).map((r) => r.order_number)).size;
  return { value: sum(rows, (r) => n0(r['WIP Value'])), completion: pct(received, items), openOrders: open };
}

/** OP-09: WIP value by plant × material type. */
export function wipByPlant(rows: WipRow[]) {
  const types = [...new Set(rows.map((r) => r.material_type_description))].sort();
  const plants = [...new Set(rows.map((r) => r.plnt_desc))].sort();
  return {
    types,
    rows: plants.map((p) => {
      const row: Record<string, number | string> = { plant: p };
      for (const t of types) row[t] = sum(rows.filter((r) => r.plnt_desc === p && r.material_type_description === t), (r) => n0(r['WIP Value']));
      return row;
    }),
  };
}

export const RMPM_STATES = [
  { key: 'unrestricted_val', label: 'Unrestricted', held: false },
  { key: 'stock_in_transit_val', label: 'In transit', held: false },
  { key: 'quality_inspection_val', label: 'Quality inspection', held: true },
  { key: 'blocked_val', label: 'Blocked', held: true },
  { key: 'restricted_val', label: 'Restricted', held: true },
  { key: 'returns_val', label: 'Returns', held: true },
] as const;

export function rmpmSummary(rows: RpmRow[]) {
  const total = sum(rows, (r) => n0(r.total_val));
  const held = sum(rows, (r) => n0(r.blocked_val) + n0(r.quality_inspection_val) + n0(r.restricted_val) + n0(r.returns_val));
  const blockedQi = sum(rows, (r) => n0(r.blocked_val) + n0(r.quality_inspection_val));
  return { total, held, onHoldPct: pct(held, total), blockedQiPct: pct(blockedQi, total) };
}

/** OP-12: share of each stock state per plant (100% stacked). */
export function rmpmByPlant(rows: RpmRow[]) {
  const plants = [...new Set(rows.map((r) => r.plantname))].sort();
  return plants.map((p) => {
    const g = rows.filter((r) => r.plantname === p);
    const total = sum(g, (r) => n0(r.total_val));
    const row: Record<string, number | string> = { plant: p, total };
    for (const s of RMPM_STATES) row[s.label] = total > 0 ? (sum(g, (r) => n0(r[s.key])) / total) * 100 : 0;
    return row;
  });
}

/** EX-07: finished goods at cost + WIP + RMPM. */
export function workingCapital(fgCost: number | null, wip: number | null, rmpm: number | null) {
  if (fgCost == null && wip == null && rmpm == null) return null;
  return { fg: fgCost ?? 0, wip: wip ?? 0, rmpm: rmpm ?? 0, total: (fgCost ?? 0) + (wip ?? 0) + (rmpm ?? 0) };
}

// ── Distributors (EX-09, DH-01 … DH-06, DH-11 … DH-13) ────────────────────

export const uploaded = (r: RdStatusRow) => n0(r.stock_qty) > 0; // BR-RD-001

export function rdSummary(rows: RdStatusRow[]) {
  const reporting = rows.filter(uploaded);
  const silent = rows.filter((r) => !uploaded(r));
  const curQty = sum(rows, (r) => n0(r.stock_qty));
  const curVal = sum(rows, (r) => n0(r.stock_value));
  const prevQty = sum(rows, (r) => n0(r.last_stock_qty));
  const prevVal = sum(rows, (r) => n0(r.last_stock_value));
  const totVal = curVal + prevVal;
  const staleValue = sum(silent, (r) => n0(r.last_stock_value));
  return {
    count: rows.length,
    reporting: reporting.length,
    compliance: pct(reporting.length, rows.length),
    reportedToday: sum(reporting, (r) => n0(r.stock_value)),
    staleValue,
    staleValuePct: pct(staleValue, totVal),
    current: { qty: curQty, value: curVal, share: pct(curVal, totVal) },
    previous: { qty: prevQty, value: prevVal, share: pct(prevVal, totVal) },
    total: { qty: curQty + prevQty, value: totVal },
  };
}

export const RD_AGE_BUCKETS = [
  { label: '0 days', min: 0, max: 0 },
  { label: '1 day', min: 1, max: 1 },
  { label: '2–3 days', min: 2, max: 3 },
  { label: '4–7 days', min: 4, max: 7 },
  { label: '> 7 days', min: 8, max: Infinity },
] as const;

/** DH-04: RDs per reporting-age bucket. */
export function rdAgeBuckets(rows: RdStatusRow[]) {
  return RD_AGE_BUCKETS.map((b) => ({
    bucket: b.label,
    min: b.min,
    count: rows.filter((r) => {
      const d = n0(r.day_diff);
      return d >= b.min && d <= b.max;
    }).length,
  }));
}

/** DH-05: compliance per branch, worst first. */
export function rdComplianceByBranch(rows: RdStatusRow[]) {
  const branches = [...new Set(rows.map((r) => r.branch_desc ?? '—'))];
  return branches
    .map((b) => {
      const g = rows.filter((r) => (r.branch_desc ?? '—') === b);
      return { branch: b, count: g.length, pct: pct(g.filter(uploaded).length, g.length) ?? 0 };
    })
    .sort((a, b) => a.pct - b.pct);
}

/** DH-06: RDs silent longer than the chronic rule, largest stock first. */
export function chronicNonReporters(rows: RdStatusRow[], days: number = riskRules.chronicRdDays) {
  return rows.filter((r) => n0(r.day_diff) > days).sort((a, b) => n0(b.last_stock_value) - n0(a.last_stock_value));
}

// ── Data trust (DH-07, DH-08) ─────────────────────────────────────────────

export function freshnessDays(closingDate: string | null | undefined, today: string) {
  if (!closingDate) return null;
  return Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${closingDate.slice(0, 10)}T00:00:00`).getTime()) / 86_400_000);
}

export function planDataLoaded(iblTarget: number | null, budget: number | null, bench: BenchmarkRow[]) {
  const benchOk = RATED_CLASSES.every((c) => {
    const b = bench.find((x) => normClass(x.classification) === c);
    return (num(b?.days ?? null) ?? 0) > 0 && (num(b?.threshold ?? null) ?? 0) > 0;
  });
  return [
    { label: 'IBL target loaded', ok: (iblTarget ?? 0) > 0 },
    { label: 'TSCL budget loaded', ok: (budget ?? 0) > 0 },
    { label: 'Benchmarks and thresholds set', ok: benchOk },
  ];
}

// ── Top Risks & Opportunities (EX-10) ────────────────────────────────────

export type RiskTone = 'red' | 'amber' | 'opportunity';
export interface Risk {
  id: string;
  tone: RiskTone;
  text: string;
  tab: string;
  kpi: string;
  chip?: { key: 'cls' | 'branch' | 'channel'; value: string };
  /** Bigger = more severe; ties keep rule order. */
  weight: number;
}

export interface RiskInput {
  redKpis: { id: string; name: string; value: string; tab: string }[];
  serviceMatrix: ReturnType<typeof serviceMatrix>;
  classStock: ClassStock[];
  channels: ReturnType<typeof fillByChannel>;
  rdRows: RdStatusRow[];
  blockedQiPct: number | null;
  planAlignmentPct: number | null;
  classAttainment: { cls: string; pct: number }[];
  fmtMoney: (n: number) => string;
}

export function buildRisks(i: RiskInput): Risk[] {
  const out: Risk[] = [];
  // R1 — any KPI tile Red
  for (const k of i.redKpis) out.push({ id: `R1-${k.id}`, tone: 'red', text: `${k.name} is ${k.value}: below the Red line`, tab: k.tab, kpi: k.id, weight: 100 });
  // R2 — branch × class service below 80%
  for (const row of i.serviceMatrix)
    row.cells.forEach((v, idx) => {
      if (v != null && v < riskRules.branchServiceBelow)
        out.push({
          id: `R2-${row.branch}-${idx}`,
          tone: v < riskRules.branchServiceBelow - 10 ? 'red' : 'amber',
          text: `${row.branch}: Class ${RATED_CLASSES[idx]} service level ${v.toFixed(0)}% (target 90%)`,
          tab: 'inventory',
          kpi: 'IN-10',
          chip: { key: 'branch', value: row.branch },
          weight: 90 - v / 10,
        });
    });
  // R3 — class below threshold; R4 — class above 1.5× benchmark
  for (const c of i.classStock) {
    if (c.cd != null && c.th != null && c.cd < c.th)
      out.push({ id: `R3-${c.cls}`, tone: 'red', text: `Class ${c.cls}: ${c.cd.toFixed(0)} days of cover, below its ${c.th}-day threshold`, tab: 'inventory', kpi: 'IN-07', chip: { key: 'cls', value: c.cls }, weight: 95 });
    if (c.cd != null && c.bm != null && c.cd > c.bm * riskRules.excessMultiple) {
      const excess = Math.max(0, c.cd - c.bm) * c.dailyTarget * (c.invTp > 0 ? c.invCost / c.invTp : 0);
      out.push({ id: `R4-${c.cls}`, tone: 'red', text: `Class ${c.cls}: cover ${(c.cd / c.bm).toFixed(1)}× benchmark, PKR ${i.fmtMoney(excess)} excess`, tab: 'inventory', kpi: 'IN-08', chip: { key: 'cls', value: c.cls }, weight: 85 });
    }
  }
  // R5 — channel fill rate below 90%
  for (const ch of i.channels)
    if (ch.pct != null && ch.pct < riskRules.channelFillBelow)
      out.push({ id: `R5-${ch.channel}`, tone: 'amber', text: `Channel “${ch.channel}” fill rate ${ch.pct.toFixed(0)}%`, tab: 'fulfilment', kpi: 'OP-03', chip: { key: 'channel', value: ch.channel }, weight: 70 });
  // R6 — RDs silent > 3 days
  const stale = i.rdRows.filter((r) => n0(r.day_diff) > riskRules.staleRdDays);
  if (stale.length)
    out.push({ id: 'R6', tone: 'amber', text: `${stale.length} distributors silent for over ${riskRules.staleRdDays} days, PKR ${i.fmtMoney(sum(stale, (r) => n0(r.last_stock_value)))} of stock unseen`, tab: 'distribution', kpi: 'DH-04', weight: 60 });
  // R7 — blocked + QI over 10%
  if (i.blockedQiPct != null && i.blockedQiPct > riskRules.heldMaterialAbove)
    out.push({ id: 'R7', tone: 'amber', text: `${i.blockedQiPct.toFixed(1)}% of raw and packing material is blocked or in quality inspection`, tab: 'fulfilment', kpi: 'OP-11', weight: 55 });
  // R8 — plan alignment outside 90–110%
  if (i.planAlignmentPct != null && rag(i.planAlignmentPct, 'planAlignment') === 'red')
    out.push({ id: 'R8', tone: 'amber', text: `Forecast is ${i.planAlignmentPct.toFixed(0)}% of budget: plans disagree`, tab: 'revenue', kpi: 'RV-11', weight: 50 });
  // O1 — class above 110% of target
  for (const c of i.classAttainment)
    if (c.pct > riskRules.classUpsideAbove)
      out.push({ id: `O1-${c.cls}`, tone: 'opportunity', text: `Class ${c.cls} at ${c.pct.toFixed(0)}% of target this month`, tab: 'revenue', kpi: 'RV-12', chip: { key: 'cls', value: c.cls }, weight: 20 });
  // O2 — releasable excess
  const releasable = sum(excessByClass(i.classStock), (r) => r.value);
  if (releasable > 0)
    out.push({ id: 'O2', tone: 'opportunity', text: `PKR ${i.fmtMoney(releasable)} of stock above benchmark could be released`, tab: 'inventory', kpi: 'IN-08', weight: 15 });

  // Problems first (red, then amber, by weight); keep up to 2 places for
  // opportunities so the list is never only bad news.
  const toneRank: Record<RiskTone, number> = { red: 3, amber: 2, opportunity: 1 };
  const ranked = out.sort((a, b) => toneRank[b.tone] - toneRank[a.tone] || b.weight - a.weight);
  const opps = ranked.filter((r) => r.tone === 'opportunity').slice(0, 2);
  const problems = ranked.filter((r) => r.tone !== 'opportunity').slice(0, riskRules.maxItems - opps.length);
  return [...problems, ...opps];
}
