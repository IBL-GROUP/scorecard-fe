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

export type ClassCode = 'A' | 'B' | 'C' | 'N' | 'Others';
export const CLASSES: ClassCode[] = ['A', 'B', 'C', 'N', 'Others'];
export const RATED_CLASSES: Exclude<ClassCode, 'Others'>[] = ['A', 'B', 'C', 'N'];

export interface SalesSummaryRow { classification: string; sku: Num; amount: Num }
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
export interface FilterItemRow { item_code: string; item_description: string; classification: string | null; division: string | null }
export interface FilterBranchRow { hub_branch_code: Num; hub_branch_desc: string; storage_location_code: Num }

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
