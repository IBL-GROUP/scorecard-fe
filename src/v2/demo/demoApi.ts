// Demo API for the Supply Chain Pulse 2.0 prototype.
//
// An axios adapter that answers all 22 scorecard-be endpoints in the browser,
// with the response shapes in specs/api/scorecard-be.openapi.json. Plugged in
// by config/api.ts only when VITE_DEMO_DATA=true: no request leaves the
// browser (AC-S1-1). It assumes the gaps the PRD treats as fixed: stock follows
// the dates (GAP-001), budget accuracy includes the last day (GAP-004) and
// /rd-status honours `date` (GAP-006).

import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { addDays, addMonths, daysInMonth, daysInclusive, monthEnd, monthStart, parse } from '@/v2/features/period';
import { BENCHMARK_EFFECTIVE, BENCHMARKS, BRANCHES, between, DemoModel, EFP_RATIO, pick, rnd, SKUS, type Sku } from './demoData';
import { readScenario } from './scenario';

type Params = Record<string, unknown>;
const list = (v: unknown): string[] => (v == null ? [] : (Array.isArray(v) ? v : [v]).map(String).filter(Boolean));
const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;
const CLASS_ORDER = ['A', 'B', 'C', 'N', 'Others'] as const;

function scope(m: DemoModel, p: Params) {
  const classes = list(p.classification);
  const skus = list(p.sku);
  const branches = list(p.branch);
  const rows = SKUS.filter((s) => (!classes.length || classes.includes(s.cls)) && (!skus.length || skus.includes(s.code)));
  const share = branches.length ? BRANCHES.filter((b) => branches.includes(b.code)).reduce((t, b) => t + b.weight, 0) : 1;
  const end = String(p.endDate ?? m.today);
  const start = String(p.startDate ?? monthStart(end));
  return { rows, share, start, end, branches };
}

const byClass = <T>(rows: Sku[], f: (cls: string, g: Sku[]) => T | null) =>
  CLASS_ORDER.map((c) => {
    const g = rows.filter((s) => s.cls === c);
    return g.length ? f(c, g) : null;
  }).filter((x): x is T => x != null);

const monthLabel = (ym: string) => `${parse(`${ym}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} `; // trailing space, as the API sends

function coverRows(m: DemoModel, rows: Sku[], share: number, end: string) {
  const snap = m.snapshot(end);
  return byClass(rows, (cls, g) => {
    const dt = g.reduce((t, s) => t + m.dailyTarget(s, end), 0) * share;
    if (!snap) return null;
    const inv = g.reduce((t, s) => t + m.skuCover(s, snap) * m.dailyTarget(s, end), 0) * share;
    const efp = g.reduce((t, s) => t + m.skuCover(s, snap) * m.dailyTarget(s, end) * s.costRatio, 0) * share;
    const qty = g.reduce((t, s) => t + (m.skuCover(s, snap) * m.dailyTarget(s, end)) / s.tradePrice, 0) * share;
    return {
      classification: cls,
      inv_val: r2(inv),
      inv_val_efp: r2(efp),
      quantity: Math.round(qty),
      trg_value: r2(g.reduce((t, s) => t + m.target(s, end.slice(0, 7)), 0) * share),
      daily_target: r2(dt),
      cover_days: dt > 0 ? r1(inv / dt) : null,
      cover_days_efp: dt > 0 ? r1(efp / dt) : null,
    };
  });
}

function categoryRows(m: DemoModel, p: Params, efp: boolean) {
  const { rows, share, end } = scope(m, p);
  const out: Record<string, unknown>[] = [];
  for (let i = 2; i >= 0; i--) {
    const ms = addMonths(monthStart(end), -i);
    const ym = ms.slice(0, 7);
    const me = i === 0 ? end : monthEnd(ms);
    for (const row of byClass(rows, (cls, g) => {
      const amount = g.reduce((t, s) => t + m.sales(s, ms, me), 0) * share * (efp ? EFP_RATIO : 1);
      // IBL targets are daily rows, so like scorecard-be the current month's target runs to endDate;
      // the budget is one row per month (full month).
      const toDate = !efp && i === 0 ? Number(end.slice(8, 10)) / Number(monthEnd(ms).slice(8, 10)) : 1;
      const target = g.reduce((t, s) => t + (efp ? m.budget(s, ym) : m.target(s, ym)), 0) * (efp ? 1 : share) * toDate;
      if (target <= 0 && amount <= 0) return null;
      return { classification: cls, month: monthLabel(ym), amount: r2(amount), target_value: r2(target), pct: target > 0 ? r2((amount / target) * 100) : 0 };
    }))
      out.push(row);
  }
  return out;
}

const CHANNELS = [
  { name: 'Retail', fill: 0.972 },
  { name: 'Distributor', fill: 0.958 },
  { name: 'Institutions', fill: 0.868 },
  { name: 'Hospital', fill: 0.934 },
  { name: 'Export', fill: 0.912 },
];

const PLANTS = [
  { code: 'P101', name: 'Karachi Plant' },
  { code: 'P102', name: 'Lahore Plant' },
  { code: 'P103', name: 'Hattar Plant' },
];
const WIP_TYPES = ['TSCL – Semi Finished', 'Mfg Finished Goods', 'Export FG'];
const RD_BRANCHES = ['Karachi South', 'Karachi North', 'Lahore', 'Islamabad', 'Faisalabad', 'Multan', 'Peshawar', 'Hyderabad', 'Quetta', 'Sukkur', 'Gujranwala', 'Sialkot'];
const RD_NAMES = ['Al-Noor', 'Crescent', 'Unity', 'Prime', 'Medline', 'Shifa', 'Hilal', 'Zam Zam', 'Falcon', 'Indus', 'Saba', 'Royal', 'Pak Star', 'Habib', 'Nova', 'Sitara'];

const ENDPOINTS: Record<string, (m: DemoModel, p: Params) => unknown[]> = {
  '/sales-summary': (m, p) => {
    const { rows, share, start, end } = scope(m, p);
    return byClass(rows, (cls, g) => {
      const per = g.map((s) => m.sales(s, start, end) * share);
      const amount = per.reduce((a, b) => a + b, 0);
      return amount > 0 ? { classification: cls, sku: per.filter((v) => v > 0).length, amount: r2(amount) } : null;
    });
  },
  '/total-sku': () => byClass(SKUS, (cls, g) => (cls === 'Others' ? null : { classification: cls, count: g.length })),
  '/cover-days': (m, p) => {
    const { rows, share, end } = scope(m, p);
    return coverRows(m, rows, share, end);
  },
  '/cover-days/total': (m, p) => {
    const { rows, share, end } = scope(m, p);
    const c = coverRows(m, rows, share, end);
    if (!c.length) return [];
    const sum = (k: 'inv_val' | 'inv_val_efp' | 'quantity' | 'trg_value' | 'daily_target') => c.reduce((t, r) => t + Number(r[k]), 0);
    const dt = sum('daily_target');
    return [{ classification: 'Total', inv_val: r2(sum('inv_val')), inv_val_efp: r2(sum('inv_val_efp')), quantity: sum('quantity'), trg_value: r2(sum('trg_value')), daily_target: r2(dt), cover_days: dt > 0 ? r1(sum('inv_val') / dt) : null, cover_days_efp: dt > 0 ? r1(sum('inv_val_efp') / dt) : null }];
  },
  '/cover-days/closing-inv': (m) => [{ closing_date: m.stockAsOf }],
  '/cover-days/benchmarks': () =>
    (Object.keys(BENCHMARKS) as (keyof typeof BENCHMARKS)[]).map((c) => ({ classification: c, days: BENCHMARKS[c].days, threshold: BENCHMARKS[c].threshold, effective_date: BENCHMARK_EFFECTIVE })),
  '/forecast-accuracy-monthly': (m, p) => {
    const { rows, share, start, end } = scope(m, p);
    const amount = rows.reduce((t, s) => t + m.sales(s, start, end), 0) * share;
    const target = rows.reduce((t, s) => t + m.target(s, end.slice(0, 7)), 0) * share;
    return [{ amount: r2(amount), target_value: r2(target), pct: target > 0 ? amount / target : 0 }];
  },
  '/forecast-accuracy-monthly/daysgone': (m, p) => {
    const { rows, share, start, end } = scope(m, p);
    const d = parse(end);
    const dim = daysInMonth(d.getFullYear(), d.getMonth());
    const days = Math.min(dim, daysInclusive(start < monthStart(end) ? monthStart(end) : start, end));
    const target = rows.reduce((t, s) => t + m.target(s, end.slice(0, 7)), 0) * share;
    return [{ target_value: r2((target * days) / dim) }];
  },
  '/forecast-accuracy-yearly': (m, p) => {
    const { rows, share, start, end } = scope(m, p);
    const amount = rows.reduce((t, s) => t + m.sales(s, start, end), 0) * share * EFP_RATIO;
    const budget = rows.reduce((t, s) => t + m.budget(s, end.slice(0, 7)), 0);
    const d = parse(end);
    const dim = daysInMonth(d.getFullYear(), d.getMonth());
    const cap = end < m.today ? end : m.today;
    const gone = Math.max(1, Math.min(dim, daysInclusive(monthStart(end), cap)));
    return [{ amount: r2(amount), target_value: r2(budget), pct: budget > 0 ? r2(amount / budget) : 0, target_to_date: r2((budget * gone) / dim) }];
  },
  '/forecast-accuracy-category-monthly': (m, p) => categoryRows(m, p, false),
  '/forecast-accuracy-category-yearly': (m, p) => categoryRows(m, p, true),
  '/ibl-vs-tscl': (m, p) => {
    const { rows, share, end } = scope(m, p);
    const ym = end.slice(0, 7);
    const per = byClass(rows, (cls, g) => {
      const ibl = g.reduce((t, s) => t + m.target(s, ym), 0) * share;
      const tscl = g.reduce((t, s) => t + m.budget(s, ym), 0);
      return tscl > 0 ? { classification: cls, ibl_target: r2(ibl), tscl_target: r2(tscl), ibl_vs_tscl_pct: r2((ibl / tscl) * 100) } : null;
    });
    if (!per.length) return [];
    const ibl = per.reduce((t, r) => t + r.ibl_target, 0);
    const tscl = per.reduce((t, r) => t + r.tscl_target, 0);
    return [...per, { classification: 'Total', ibl_target: r2(ibl), tscl_target: r2(tscl), ibl_vs_tscl_pct: r2((ibl / tscl) * 100) }];
  },
  '/inventory-days': (m, p) => {
    const { rows, end, branches } = scope(m, p);
    const snap = m.snapshot(end);
    if (!snap) return [];
    const cols = BRANCHES.filter((b) => !branches.length || branches.includes(b.code));
    return rows.map((s) => {
      const row: Record<string, unknown> = { classification: s.cls, item_desc: s.name };
      const vals: number[] = [];
      for (const b of BRANCHES) {
        const v = cols.includes(b) ? r1(m.branchCover(s, b.key, snap)) : 0;
        row[b.key] = v;
        if (v > 0) vals.push(v);
      }
      row.total = vals.length ? r1(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      return row;
    });
  },
  '/above-below-threshold': (m, p) => {
    // Ignores `classification` like 1.0 (GAP-005); the client filters.
    const { end } = scope(m, p);
    const snap = m.snapshot(end);
    if (!snap) return [];
    const skus = list(p.sku);
    const rows = SKUS.filter((s) => s.cls !== 'Others' && (!skus.length || skus.includes(s.code)));
    return byClass(rows, (cls, g) => {
      const th = BENCHMARKS[cls as keyof typeof BENCHMARKS].threshold;
      const above = g.filter((s) => m.skuCover(s, snap) > th).length;
      return { classification: cls, 'No Of SKUs > Threshold': above, 'No Of SKUs < Threshold': g.length - above };
    });
  },
  '/service-measure': (m, p) => {
    const { rows, end, branches } = scope(m, p);
    const snap = m.snapshot(end);
    if (!snap) return [];
    return BRANCHES.filter((b) => !branches.length || branches.includes(b.code)).map((b) => {
      const row: Record<string, unknown> = { branch: b.name };
      for (const cls of ['A', 'B', 'C', 'N'] as const) {
        const g = rows.filter((s) => s.cls === cls);
        const th = BENCHMARKS[cls].threshold;
        row[`SKU-${cls}%`] = g.length ? r2((g.filter((s) => m.branchCover(s, b.key, snap) > th).length / g.length) * 100) : null;
      }
      return row;
    });
  },
  '/tgt-vs-actual': (m, p) => {
    const { rows, share, end } = scope(m, p);
    return coverRows(m, rows, share, end)
      .filter((r) => r.classification !== 'Others')
      .map((r) => ({ classification: r.classification, cover_days_tgt: BENCHMARKS[r.classification as keyof typeof BENCHMARKS].threshold, cover_days: r.cover_days }));
  },
  '/dispatch-vs-order': (m, p) => {
    const { start, end } = scope(m, p);
    const from = start < m.dataStart ? m.dataStart : start;
    const to = end > m.today ? m.today : end;
    if (to < from) return [];
    const days = daysInclusive(from, to);
    const out: Record<string, unknown>[] = [];
    for (const s of SKUS.slice(0, 120)) {
      for (const ch of CHANNELS) {
        if (rnd(`${s.code}${ch.name}has`) > 0.42) continue;
        const ordered = Math.round(between(`${s.code}${ch.name}q`, 20, 260) * days);
        const fill = Math.min(1, ch.fill * between(`${s.code}${ch.name}${end.slice(0, 7)}f`, 0.9, 1.06));
        const delivered = Math.round(ordered * fill);
        out.push({ material_name: s.name, channel_type: ch.name, total_order_qty: ordered, total_delivery_qty: delivered, delivery_pct: r2((delivered / ordered) * 100) });
      }
    }
    return out;
  },
  '/wip': (m, p) => {
    const { end } = scope(m, p);
    if (end < m.dataStart) return [];
    const ym = end.slice(0, 7);
    return Array.from({ length: 48 }, (_, i) => {
      const k = `wip${i}`;
      const plant = pick(k + 'p', PLANTS);
      const item = Math.round(between(k + 'q', 2_000, 40_000));
      const done = Math.min(1, between(`${k}${ym}d`, 0.55, 1.02));
      const received = Math.round(item * done);
      return {
        storage_loc: `${plant.code}-WIP`,
        storage_loc_desc: `${plant.name} WIP store`,
        plant: plant.code,
        plnt_desc: plant.name,
        material_type_description: pick(k + 't', WIP_TYPES),
        'Material Name': pick(k + 'm', SKUS).name,
        order_number: `PO-${700100 + i}`,
        item_qty: item,
        good_received_qty: received,
        Quantity: item - received,
        'WIP Value': r2((item - received) * between(k + 'v', 90, 420) * between(`${k}${ym}vv`, 0.9, 1.1)),
      };
    });
  },
  '/rpm': (m, p) => {
    const { end } = scope(m, p);
    if (end < m.dataStart) return [];
    const ym = end.slice(0, 7);
    return Array.from({ length: 60 }, (_, i) => {
      const k = `rm${i}`;
      const plant = pick(k + 'p', PLANTS);
      const type = rnd(k + 't') < 0.55 ? 'Raw Material' : 'Packing Material';
      const scale = between(k + 's', 400_000, 9_000_000) * between(`${k}${ym}`, 0.9, 1.1);
      const blocked = rnd(k + 'b') < 0.25 ? scale * between(k + 'bb', 0.05, 0.3) : 0;
      const qi = scale * between(k + 'qi', 0, 0.07);
      const restricted = rnd(k + 'r') < 0.15 ? scale * between(k + 'rr', 0.02, 0.1) : 0;
      const returns = scale * between(k + 'rt', 0, 0.02);
      const transit = rnd(k + 'tr') < 0.3 ? scale * between(k + 'tt', 0.05, 0.2) : 0;
      const total = scale + blocked + qi + restricted + returns + transit;
      const price = between(k + 'pp', 40, 900);
      return {
        materialname: `${type === 'Raw Material' ? 'RM' : 'PM'} ${pick(k + 'n', ['Lactose', 'Starch', 'Gelatin', 'API Base', 'Blister Foil', 'Carton', 'PET Bottle', 'Label', 'Cap', 'Leaflet'])} ${100 + i}`,
        producttype: type,
        plant: plant.code,
        plantname: plant.name,
        storagelocation: `${plant.code}-${type === 'Raw Material' ? 'RM' : 'PM'}`,
        storagelocationname: `${plant.name} ${type === 'Raw Material' ? 'raw' : 'packing'} store`,
        unrestricted_val: r2(scale),
        quality_inspection_val: r2(qi),
        blocked_val: r2(blocked),
        restricted_val: r2(restricted),
        returns_val: r2(returns),
        stock_in_transit_val: r2(transit),
        total_val: r2(total),
        unrestricted_qty: Math.round(scale / price),
        total_qty: Math.round(total / price),
      };
    });
  },
  '/rd-status': (m, p) => {
    const date = String(p.date ?? m.today);
    const reportRate = m.s.stale ? 0.6 : 0.88;
    return Array.from({ length: 64 }, (_, i) => {
      const k = `rd${i}`;
      const branchIdx = Math.floor(rnd(k + 'b') * RD_BRANCHES.length);
      const reported = rnd(`${k}${date}`) < reportRate * (RD_BRANCHES[branchIdx] === 'Quetta' ? 0.6 : 1);
      const silentDays = reported ? 0 : Math.ceil(between(`${k}${date}d`, 1, m.s.stale ? 22 : 12));
      const value = between(k + 'v', 1_500_000, 18_000_000);
      const lastValue = value * between(`${k}${date}lv`, 0.85, 1.12);
      const unit = between(k + 'u', 250, 700);
      return {
        ibl_distributor_code: 40100 + i,
        distributor_desc: `${pick(k + 'n', RD_NAMES)} Distributors ${RD_BRANCHES[branchIdx]}`,
        branch_code: 300 + branchIdx,
        branch_desc: RD_BRANCHES[branchIdx],
        stock_qty: reported ? Math.round(value / unit) : 0,
        stock_value: reported ? r2(value) : 0,
        last_stock_qty: Math.round(lastValue / unit),
        last_stock_value: r2(lastValue),
        last_stock_date: addDays(date, reported ? -1 : -silentDays),
        day_diff: silentDays,
      };
    });
  },
  '/filters': () => SKUS.map((s) => ({ item_code: s.code, item_description: s.name, classification: s.cls === 'Others' ? null : s.cls, division: s.division })),
  '/filters/branches': () => BRANCHES.map((b, i) => ({ hub_branch_code: b.code, hub_branch_desc: b.name, storage_location_code: 8200 + i })),
};

/** Paths the demo answers; also the endpoint list for the coverage check. */
export const DEMO_PATHS = Object.keys(ENDPOINTS);

const SLOW: Record<string, number> = { '/service-measure': 1600, '/rd-status': 900, '/inventory-days': 900 };

export const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const scenario = readScenario();
  const path = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '').split('?')[0];
  const handler = Object.prototype.hasOwnProperty.call(ENDPOINTS, path) ? ENDPOINTS[path] : undefined;
  const respond = (status: number, data: unknown): AxiosResponse => ({ data, status, statusText: String(status), headers: {}, config });

  await new Promise((r) => setTimeout(r, (SLOW[path] ?? 250) + Math.random() * 300));
  if (scenario.state === 'loading') await new Promise(() => undefined);

  const fail = scenario.state === 'error' || (scenario.state === 'errorOne' && path === '/dispatch-vs-order');
  if (!handler || fail) {
    const res = respond(handler ? 500 : 404, { success: false, message: handler ? 'Demo: simulated failure' : `Demo: no handler for ${path}` });
    throw new AxiosError(`Request failed with status code ${res.status}`, AxiosError.ERR_BAD_RESPONSE, config, null, res);
  }
  const data = scenario.state === 'empty' ? [] : handler(new DemoModel(scenario), (config.params ?? {}) as Params);
  return respond(200, { success: true, count: data.length, data });
};
