// Response rows of the scorecard-be endpoints Supply Chain Pulse 2.0 reads.
// Shapes follow specs/api/scorecard-be.openapi.json. Numbers may arrive as
// strings (PostgreSQL numerics; BigQuery NUMERIC in 2.0), so every consumer
// coerces with num().

export type Num = number | string | null;

export interface Envelope<T> {
  success: boolean;
  count?: number;
  data: T[];
}

// DC is a classification too and always listed (user, 26 Nov 2026); Other is the optional
// bucket, offered only when it holds something.
export type ClassCode = 'A' | 'B' | 'C' | 'N' | 'DC' | 'Others';
export const CLASSES: ClassCode[] = ['A', 'B', 'C', 'N', 'DC', 'Others'];
export const RATED_CLASSES: Exclude<ClassCode, 'Others' | 'DC'>[] = ['A', 'B', 'C', 'N'];

/**
 * Class order everywhere: A, B, C, N, then any other code the data brings
 * (e.g. DC) A→Z, and Others last. An unknown code used to sort first.
 */
/** The classifications every per-class view lists, in order. Other is not here: it is optional. */
export const ALL_CLASSES = ['A', 'B', 'C', 'N', 'DC'] as const;

/**
 * `rows` with an empty row for every classification it lacks (DC is a class even with nothing
 * in it — user, 26 Nov 2026). `picked` is the Class filter: only classes it allows are added.
 */
export function withEveryClass<T>(rows: T[], clsOf: (r: T) => string, empty: (cls: string) => T, picked: readonly string[] = []): T[] {
  const have = new Set(rows.map(clsOf));
  const add = ALL_CLASSES.filter((c) => !have.has(c) && (!picked.length || picked.includes(c)));
  return [...rows, ...add.map((c) => empty(c))];
}

export const byClassCode = (a: string, b: string) => {
  const rank = (c: string) => (c === 'Others' ? 2 : (RATED_CLASSES as string[]).includes(c) ? 0 : 1);
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  return ra === 0 ? (RATED_CLASSES as string[]).indexOf(a) - (RATED_CLASSES as string[]).indexOf(b) : a.localeCompare(b);
};

export interface SalesSummaryRow { classification: string; sku: Num; amount: Num }
/** /sales-summary/by-sales-type: sales split by the view's sales type ('Rd to trade', 'Ibl to trade', 'Pharma Healthcare to trade'). */
export interface SalesTypeRow { sales_type: string; amount: Num }
export interface TotalSkuRow { classification: string; count: Num }
export interface CoverDaysRow {
  classification: string;
  inv_val: Num;
  inv_val_efp: Num;
  quantity: Num;
  trg_value: Num;
  daily_target: Num;
  cover_days: Num;
  cover_days_efp: Num;
}
export interface ClosingInvRow { closing_date: string }
export interface BenchmarkRow { classification: string; days: Num; threshold: Num; effective_date: string }
export interface AccuracyRow { amount: Num; target_value: Num; pct: Num }
export interface BudgetAccuracyRow extends AccuracyRow { target_to_date: Num }
export interface DaysGoneRow { target_value: Num }
export interface CategoryAccuracyRow { classification: string; month: string; amount: Num; target_value: Num; pct: Num }
/** /forecast-accuracy-daily: one billing day, sales at TP (IBL card) and at EFP (TSCL card). */
export interface DailyAccuracyRow { day: string; amount_tp: Num; amount_efp: Num }
export interface IblVsTsclRow { classification: string; ibl_target: Num; tscl_target: Num; ibl_vs_tscl_pct: Num }
export type InventoryDaysRow = { classification: string; item_desc: string; total: Num } & Record<string, Num | string>;
export interface ThresholdRow { classification: string; 'No Of SKUs > Threshold': Num; 'No Of SKUs < Threshold': Num }
export type ServiceMeasureRow = { branch: string } & Record<'SKU-A%' | 'SKU-B%' | 'SKU-C%' | 'SKU-N%', Num>;
export interface TgtVsActualRow { classification: string; cover_days_tgt: Num; cover_days: Num }
export interface DispatchVsOrderRow {
  material_name: string;
  channel_type: string;
  total_order_qty: Num;
  total_delivery_qty: Num;
  delivery_pct: Num;
}
export interface WipRow {
  storage_loc: string;
  storage_loc_desc: string;
  plant: string;
  plnt_desc: string;
  material_type_description: string;
  'Material Name': string;
  order_number: string;
  item_qty: Num;
  good_received_qty: Num;
  Quantity: Num;
  'WIP Value': Num;
}
export interface RpmRow {
  materialname: string;
  producttype: string;
  plant: string;
  plantname: string;
  storagelocation: string;
  storagelocationname: string;
  unrestricted_val: Num;
  quality_inspection_val: Num;
  blocked_val: Num;
  restricted_val: Num;
  returns_val: Num;
  stock_in_transit_val: Num;
  total_val: Num;
  unrestricted_qty: Num;
  total_qty: Num;
  // The rest of 1.0's RMPM Details columns (scorecard-be /rpm sends them all).
  gr_blocked_val?: Num;
  storage_location_val?: Num;
  stock_transfer_plant_val?: Num;
  tied_empties_val?: Num;
  restricted_qty?: Num;
  qualityinspection_qty?: Num;
  blocked_qty?: Num;
  return_qty?: Num;
  stockintransit_qty?: Num;
  stocktransferplant_qty?: Num;
  stocktransferstoragelocation_qty?: Num;
  tiedempties_qty?: Num;
}
export interface RdStatusRow {
  ibl_distributor_code: Num;
  distributor_desc: string | null;
  branch_code: Num;
  branch_desc: string | null;
  stock_qty: Num;
  stock_value: Num;
  last_stock_qty: Num;
  last_stock_value: Num;
  last_stock_date: string | null;
  day_diff: Num;
}
export interface FilterItemRow {
  item_code: string;
  item_description: string;
  classification: string | null;
  division: string | null;
  business_unit: string | null;
  team: string | null;
  brands: string | null;
}
export interface FilterBranchRow { hub_branch_code: Num; hub_branch_desc: string; storage_location_code: Num; zone?: string; market?: string; region?: string }

/** The 14 fixed Inventory Days / Service Measure branches (BR-SVC-001). */
export const INV_BRANCHES = [
  { key: 'bahawalpur', label: 'Bahawalpur' },
  { key: 'dss_korangi', label: 'DSS Korangi' },
  { key: 'faisalabad', label: 'Faisalabad' },
  { key: 'gujranwala', label: 'Gujranwala' },
  { key: 'hyderabad', label: 'Hyderabad' },
  { key: 'islamabad', label: 'Islamabad' },
  { key: 'karachi', label: 'Karachi' },
  { key: 'korangi', label: 'Korangi' },
  { key: 'lahore', label: 'Lahore' },
  { key: 'mingora', label: 'Mingora' },
  { key: 'multan', label: 'Multan' },
  { key: 'peshawar', label: 'Peshawar' },
  { key: 'quetta', label: 'Quetta' },
  { key: 'sukkur', label: 'Sukkur' },
] as const;

/** Coerce an API number; null/''/NaN → null. */
export function num(v: Num | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
/** Coerce, treating missing as 0 (for sums). */
export const n0 = (v: Num | undefined) => num(v) ?? 0;
