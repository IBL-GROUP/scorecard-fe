// What each tab must show, for the S1 coverage check (TC-S1-02, TC-S1-03).
// PRD v2 section 4 items per tab, and the 36 retained 1.0 metrics of
// section 2.4 with the 2.0 item(s) that carry each one.

import type { TabKey } from './tabs';

const range = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`);

export const PRD_ITEMS: Record<TabKey, string[]> = {
  overview: range('EX', 11),
  revenue: range('RV', 16),
  inventory: range('IN', 17),
  fulfilment: range('OP', 16),
  distribution: range('DH', 14),
};

export const RETAINED_1_0: { n: number; metric: string; ids: string[] }[] = [
  { n: 1, metric: 'Benchmark cover days per class', ids: ['IN-13', 'IN-07'] },
  { n: 2, metric: 'No. of SKUs per class (whole range)', ids: ['IN-13'] },
  { n: 3, metric: 'Sales per class', ids: ['RV-13'] },
  { n: 4, metric: 'SKUs sold per class', ids: ['RV-13'] },
  { n: 5, metric: 'Sales share % per class + Total', ids: ['RV-13', 'RV-09'] },
  { n: 6, metric: 'Total cover days', ids: ['EX-04', 'IN-14'] },
  { n: 7, metric: 'Cover days per class, TP and EFP', ids: ['IN-14'] },
  { n: 8, metric: 'Inventory value per class, TP and EFP', ids: ['IN-14'] },
  { n: 9, metric: 'Inventory quantity per class', ids: ['IN-14'] },
  { n: 10, metric: 'Stock "as of" closing date', ids: ['EX-11'] },
  { n: 11, metric: 'Forecast Accuracy IBL %', ids: ['RV-14'] },
  { n: 12, metric: 'IBL achieved sales and target', ids: ['RV-14'] },
  { n: 13, metric: 'IBL days-gone target', ids: ['RV-14'] },
  { n: 14, metric: 'Budget Accuracy TSCL %', ids: ['RV-15'] },
  { n: 15, metric: 'TSCL EFP sales and budget', ids: ['RV-15'] },
  { n: 16, metric: 'TSCL days-gone target', ids: ['RV-15'] },
  { n: 17, metric: 'Days Gone % pill', ids: ['RV-16'] },
  { n: 18, metric: 'Accuracy per class per month, IBL', ids: ['RV-06'] },
  { n: 19, metric: 'Accuracy per class per month, TSCL', ids: ['RV-07'] },
  { n: 20, metric: 'Forecast Vs Budget %', ids: ['RV-11'] },
  { n: 21, metric: 'Threshold per class', ids: ['IN-13'] },
  { n: 22, metric: 'Inventory Days per class per branch', ids: ['IN-12'] },
  { n: 23, metric: 'Inventory Days per SKU per branch', ids: ['IN-17'] },
  { n: 24, metric: 'Inventory Days Total column', ids: ['IN-17'] },
  { n: 25, metric: 'Service Measure % by branch × class', ids: ['IN-10'] },
  { n: 26, metric: 'Service Measure % for filtered branches', ids: ['IN-10'] },
  { n: 27, metric: 'Cover Days Threshold vs Actual', ids: ['IN-15'] },
  { n: 28, metric: 'SKUs above / below threshold', ids: ['IN-16'] },
  { n: 29, metric: 'Dispatch Vs Order table', ids: ['OP-14'] },
  { n: 30, metric: 'WIP table and dialog', ids: ['OP-15'] },
  { n: 31, metric: 'RMPM table and dialog', ids: ['OP-16'] },
  { n: 32, metric: 'Current stock in hand', ids: ['DH-11'] },
  { n: 33, metric: 'Previous stock in hand', ids: ['DH-12'] },
  { n: 34, metric: 'Total stock in hand', ids: ['DH-13'] },
  { n: 35, metric: 'Per-RD list', ids: ['DH-14'] },
  { n: 36, metric: 'Upload status per RD', ids: ['DH-14', 'DH-01'] },
];

/** PRD IDs currently rendered in the page (elements carrying data-kpi). */
export function renderedIds(): Set<string> {
  const out = new Set<string>();
  document.querySelectorAll('[data-kpi]').forEach((el) => (el.getAttribute('data-kpi') ?? '').split(/\s+/).forEach((id) => id && out.add(id)));
  return out;
}
