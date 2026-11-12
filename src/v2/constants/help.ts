// Plain-language help for every number on Supply Chain Pulse 2.0.
//
// One entry per PRD item (EX-, RV-, IN-, OP-, DH- IDs from
// "Supply-Chain-Pulse-2.0-Executive-Dashboard-PRD-v2.md", section 4).
// `what` says what the number means; `source` gives the formula, the endpoint
// it comes from and, for KPIs, the RAG band (see features/kpiThresholds.ts).
// The ? icons across the 2.0 screens read from this one place.

export interface HelpText {
  what: string;
  source: string;
}

const h = (what: string, source: string): HelpText => ({ what, source });

export const KPI_HELP: Record<string, HelpText> = {
  // ── Executive Overview ──
  'EX-01': h(
    'Are we selling at the pace the plan needs today? Sales so far as a share of the IBL target prorated to today.',
    'Sales (TP) ÷ target to date × 100. Sales: /forecast-accuracy-monthly amount. Target to date: /forecast-accuracy-monthly/daysgone. Band: Green ≥ 100%, Amber 90–99.9%, Red < 90%.',
  ),
  'EX-02': h(
    'Where the month will land if the current daily run-rate holds.',
    '(Sales ÷ days gone × total days) ÷ full-month IBL target × 100. Shown only for a single-month window that includes today; a finished month shows the final figure. Band: Green ≥ 100%, Amber 95–99.9%, Red < 95%.',
  ),
  'EX-03': h(
    'Are we on pace against the budget? EFP sales so far as a share of the budget prorated to the elapsed days.',
    'EFP sales ÷ budget to date × 100, from /forecast-accuracy-yearly (amount, target_to_date). Band: Green ≥ 100%, Amber 90–99.9%, Red < 90%.',
  ),
  'EX-04': h(
    'Do we hold the right amount of stock? Total cover days as a share of the benchmark.',
    'Total cover days ÷ target-weighted benchmark × 100. Weighted benchmark = Σ(benchmark × daily target) ÷ Σ daily target, classes with a benchmark only. Sources: /cover-days/total, /cover-days, /cover-days/benchmarks. Band: Green 80–120%, Amber 60–79% or 121–150%, Red outside.',
  ),
  'EX-05': h(
    'What share of our range is adequately stocked across the network?',
    'SKUs above threshold ÷ all SKUs × 100, from /above-below-threshold. Lowest branch from /service-measure. Band: Green ≥ 90%, Amber 80–89.9%, Red < 80%.',
  ),
  'EX-06': h(
    'Are customers receiving what they order? Measured in quantity.',
    'Σ delivered quantity ÷ Σ ordered quantity × 100, from /dispatch-vs-order. Band: Green ≥ 95%, Amber 90–94.9%, Red < 90%.',
  ),
  'EX-07': h(
    'How much cash is tied up in finished goods, work in progress and raw and packing material.',
    'Finished goods at cost (/cover-days/total inv_val_efp) + Σ WIP Value (/wip) + Σ total_val (/rpm). No target: judged on its trend.',
  ),
  'EX-08': h(
    'How much cash could be released by bringing stock back to benchmark.',
    'Per class: max(0, cover days − benchmark) × daily target × (inventory at cost ÷ inventory at TP). Total over classes; % of finished goods at cost. Band on %: Green ≤ 10%, Amber 10.1–20%, Red > 20%.',
  ),
  'EX-09': h(
    'Do we have current visibility of stock at our regional distributors?',
    'RDs that reported stock today ÷ all active RDs × 100, from /rd-status. Band: Green ≥ 90%, Amber 75–89.9%, Red < 75%.',
  ),
  'EX-10': h(
    'What needs attention right now: the most severe problems and the biggest opportunities, ranked.',
    'Rule-based on the data already loaded: red KPIs, branch × class service below 80%, classes below threshold or above 1.5× benchmark, channels below 90% fill rate, RDs silent over 3 days, material on hold over 10%, plan alignment outside 90–110%, classes above 110% of target.',
  ),
  'EX-11': h(
    'How current the stock figures are, and when the screen last loaded.',
    'Stock snapshot date from /cover-days/closing-inv. Band (days old): Green ≤ 1, Amber 2, Red > 2.',
  ),

  // ── Revenue & Plan ──
  'RV-01': h('How much we sold in the period, at trade price.', 'Σ amount from /sales-summary. Compared with the previous period or the same period last year.'),
  'RV-05': h(
    'How much we must sell per remaining day to hit the month target, compared with what we sell now.',
    'Required = (full-month target − sales) ÷ days left. Current = sales ÷ days gone.',
  ),
  'RV-06': h(
    'Is attainment against the IBL target improving or getting worse, and in which class?',
    'pct per class per month from /forecast-accuracy-category-monthly, called twice for 6 months. Total = Σ amount ÷ Σ target per month. Band: as EX-01.',
  ),
  'RV-07': h('The same trend, against the TSCL budget.', 'pct per class per month from /forecast-accuracy-category-yearly, called twice for 6 months.'),
  'RV-08': h(
    'Which classes explain the gap to plan so far this month.',
    'Per class: sales − month target × days gone ÷ total days, from /forecast-accuracy-category-monthly (current month). Steps run from the prorated target to actual sales.',
  ),
  'RV-09': h('Is our revenue mix shifting between classes?', 'Each class’s sales ÷ total sales, this period and the comparison period, from /sales-summary.'),
  'RV-10': h(
    'How much of our product range actually sold in the period.',
    'SKUs that sold (/sales-summary sku) ÷ SKUs in the range (/total-sku count) × 100, per class.',
  ),
  'RV-11': h(
    'Is the sales forecast (IBL target) consistent with the budget (TSCL), and where does it disagree?',
    'ibl_vs_tscl_pct per class and Total from /ibl-vs-tscl. Band: Green 95–105%, Amber 90–94.9% or 105.1–110%, Red outside.',
  ),
  'RV-12': h('Which classes are beating plan this month, and which are behind.', 'Classes ranked by current-month attainment (RV-06).'),
  'RV-13': h(
    'What sold, in how many SKUs, and in what share. The 1.0 Sales Summary card.',
    '/sales-summary: SKUs sold, sales (TP), share = class sales ÷ total × 100 (1 decimal).',
  ),
  'RV-14': h(
    'How much of the month’s IBL sales target has been achieved. The 1.0 Forecast Accuracy IBL gauge.',
    '/forecast-accuracy-monthly pct × 100 (1 decimal), with achieved sales, full-month target and the days-gone target (/forecast-accuracy-monthly/daysgone). A target of 0 shows “—”.',
  ),
  'RV-15': h(
    'How much of the month’s TSCL budget has been achieved. The 1.0 Budget Accuracy TSCL gauge.',
    '/forecast-accuracy-yearly pct × 100, with EFP sales, budget and target_to_date.',
  ),
  'RV-16': h('How far through the period we are. The 1.0 Days Gone pill.', 'round(days gone ÷ total days × 100). Total days run from the 1st of the From month to the end of the To month.'),

  // ── Inventory & Working Capital ──
  'IN-02': h('What our finished-goods stock is worth at cost.', '/cover-days/total inv_val_efp. Trade-price value in the caption.'),
  'IN-05': h(
    'How much planned revenue current stock cannot cover up to the threshold: revenue exposed to stock-outs.',
    'Per class below threshold: (threshold − cover days) × daily target. Red when any class A shortfall exists.',
  ),
  'IN-06': h('What share of the range is under-stocked.', 'SKUs below threshold ÷ all SKUs × 100, from /above-below-threshold. Band: Green ≤ 10%, Amber 10.1–20%, Red > 20%.'),
  'IN-07': h(
    'Which classes are under- or over-stocked compared with their benchmark.',
    'Bar = cover days (/cover-days). Tick = benchmark, shaded zone = below threshold (/cover-days/benchmarks).',
  ),
  'IN-08': h('Where the excess cash sits, by class.', 'Finished goods at cost, less each class’s excess (EX-08), gives the right-sized inventory. Shortfall classes shown separately.'),
  'IN-09': h(
    'Is cash in the supply chain growing or shrinking, and in which stage?',
    'For each of the last 6 month-ends: /cover-days/total (inv_val_efp), /wip (Σ WIP Value) and /rpm (Σ total_val).',
  ),
  'IN-10': h(
    'Which branches are failing which classes.',
    'Share of SKUs above threshold, per branch and class, from /service-measure (all branches). Band: as EX-05.',
  ),
  'IN-11': h('Which branches need intervention first.', 'Simple average of each branch’s class percentages (not SKU-weighted).'),
  'IN-12': h('Is stock spread sensibly across branches?', 'Average cover days of each class’s SKUs per branch, from /inventory-days. Coloured against the class benchmark.'),
  'IN-13': h(
    'What each class is judged against, and how big each class’s range is. The 1.0 Benchmark card and threshold banner.',
    '/cover-days/benchmarks days, threshold, effective_date; /total-sku count (whole range, not filtered). 0 or missing shows “—”.',
  ),
  'IN-14': h(
    'How many days of stock each class holds, worth how much, in what quantity. The 1.0 Cover Days card.',
    '/cover-days and /cover-days/total: cover_days (TP) or cover_days_efp (EFP), inv_val or inv_val_efp, quantity.',
  ),
  'IN-15': h('Is each class above its threshold? The 1.0 Threshold vs Actual chart.', '/tgt-vs-actual: cover_days_tgt (threshold) and cover_days.'),
  'IN-16': h('How many SKUs in each class are under-stocked. The 1.0 SKUs Against Threshold chart.', '/above-below-threshold: counts above and below threshold.'),
  'IN-17': h(
    'Cover of each SKU in each branch. The 1.0 Inventory Days table.',
    '/inventory-days. Class rows average their SKUs. Total column = simple average of branches with a value, not stock-weighted.',
  ),

  // ── Fulfilment & Operations ──
  'OP-02': h('How big the order backlog not delivered is, in units.', 'Σ (ordered − delivered) where positive, from /dispatch-vs-order.'),
  'OP-03': h('Which channels are under-served.', 'Σ delivered ÷ Σ ordered per channel_type. Band: as EX-06.'),
  'OP-04': h('How widespread the fulfilment problem is.', 'Materials whose delivery % is below 90, out of all materials.'),
  'OP-05': h('Which few products cause most of the shortfall.', 'Top 10 materials by unfulfilled quantity, with cumulative share of all unfulfilled quantity.'),
  'OP-06': h('How much cash is in production.', 'Σ WIP Value from /wip. Dates only: other filters are not applied.'),
  'OP-07': h(
    'Are production orders being completed and received?',
    'Σ good received quantity ÷ Σ item quantity × 100, from /wip. Band: Green ≥ 90%, Amber 75–89.9%, Red < 75%.',
  ),
  'OP-08': h('How many production orders are still open.', 'Distinct order numbers whose received quantity is below the item quantity.'),
  'OP-09': h('Where production cash is concentrated.', 'Σ WIP Value by plant, stacked by material type.'),
  'OP-10': h('How much cash is in raw and packing material.', 'Σ total_val from /rpm. Dates only.'),
  'OP-11': h(
    'How much material cannot be used today.',
    '(blocked + quality inspection + restricted + returns) ÷ total value × 100, from /rpm. Band: Green ≤ 5%, Amber 5.1–10%, Red > 10%.',
  ),
  'OP-12': h('Where unusable material is, and in what state.', 'RMPM value by plant, split by stock state.'),
  'OP-14': h('Ordered and delivered quantity per material and channel. The 1.0 Dispatch Vs Order table.', '/dispatch-vs-order, all fields.'),
  'OP-15': h('Production orders in progress. The 1.0 WIP table.', '/wip, all fields. Detail by plant and material type.'),
  'OP-16': h('Material held, by stock state. The 1.0 RMPM table.', '/rpm, all fields. Detail by plant.'),

  // ── Distribution & Data Health ──
  'DH-02': h('How much distributor stock we can see as of today.', 'Σ stock_value where stock_qty > 0, from /rd-status.'),
  'DH-03': h('How much distributor stock we are blind to today: value known only from older reports.', 'Σ last_stock_value for RDs that have not reported today. Band on share of total: Green 0%, Amber ≤ 10%, Red > 10%.'),
  'DH-04': h('How old our distributor data is.', 'RDs grouped by days since their last report (day_diff): 0 · 1 · 2–3 · 4–7 · > 7.'),
  'DH-05': h('Which branch teams need to follow up with their distributors.', 'RDs that reported today ÷ RDs per branch × 100.'),
  'DH-06': h('Which distributors need escalation.', 'RDs silent for more than 7 days, largest last-reported stock first.'),
  'DH-07': h('Is the stock data current?', 'Today − stock snapshot date (/cover-days/closing-inv). Band: Green ≤ 1 day, Amber 2 days, Red > 2 days.'),
  'DH-08': h(
    'Are this month’s targets, budget and benchmarks loaded?',
    'IBL target > 0 (/forecast-accuracy-monthly), budget > 0 (/forecast-accuracy-yearly), and every class has a benchmark and threshold (/cover-days/benchmarks).',
  ),
  'DH-09': h('Is the item master complete enough for class-level figures?', 'Others (unclassified) sales ÷ total sales × 100, from /sales-summary. Band: Green ≤ 2%, Amber 2.1–5%, Red > 5%.'),
  'DH-10': h('Which benchmark version the figures are judged against.', 'effective_date per class from /cover-days/benchmarks.'),
  'DH-11': h('Stock RDs reported today. The 1.0 Current Stock in Hand box.', 'Σ stock_qty and Σ stock_value from /rd-status; share of the total.'),
  'DH-12': h('Stock in the RDs’ last earlier reports. The 1.0 Previous Stock in Hand box.', 'Σ last_stock_qty and Σ last_stock_value; share of the total.'),
  'DH-13': h('Current plus previous stock. The 1.0 Total Stock in Hand box. Includes earlier reports.', 'Current + previous stock in hand.'),
  'DH-14': h('Each distributor’s reporting status. The 1.0 RD table.', '/rd-status, all fields. Uploaded when today’s stock_qty > 0.'),
};

// Items repeated on more than one tab share the Overview's text.
const SAME_AS: Record<string, string> = {
  'RV-02': 'EX-01',
  'RV-03': 'EX-02',
  'RV-04': 'EX-03',
  'IN-01': 'EX-07',
  'IN-03': 'EX-04',
  'IN-04': 'EX-08',
  'OP-01': 'EX-06',
  'OP-13': 'EX-05',
  'DH-01': 'EX-09',
};

export function helpFor(id: string): HelpText | undefined {
  return KPI_HELP[id] ?? KPI_HELP[SAME_AS[id] ?? ''];
}

/**
 * Help keys used by the reusable design-system cards copied from DSR-test-fe
 * (BreakdownTable, BranchHighlights, InventoryHighlights). The "what" text is
 * the design system's; the source line is generic because each scorecard
 * screen that uses a card supplies its own data.
 */
export const HELP = {
  behindTarget: h(
    'How many are below 100% of target, and which one is furthest behind.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  bestTarget: h(
    'The highest sales as a % of target.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  biggestDrop: h(
    'The largest fall in sales value against B. If nothing fell, the one that grew least.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  colAch: h(
    'Sales as a % of target. 100% = on target.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  colGrowth: h(
    'Change against the comparison period (B).',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  colSales: h(
    'Sales in the selected days (A).',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  colShare: h(
    'This row’s part of the total sales shown.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  colTarget: h(
    'Target (TP) or budget (EFP) for the selected days.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  deadStock: h(
    'Items we hold stock of but did not sell at all in the selected days.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  fastestGrowing: h(
    'The biggest % growth against the comparison period (B).',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  overstock: h(
    'Items holding more than 90 days of sales. The value is cash tied up in stock.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  stockOnHand: h(
    'The value of stock we hold right now, and how many days it lasts at the current sales rate.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  stockOutRisk: h(
    'Items that will run out within 7 days if they keep selling at today’s rate.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  topBySales: h(
    'The one with the highest sales in the selected days, and its share of all sales.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
  whereStock: h(
    'How stock value splits between our branches and distributors (RDs), and who holds the most.',
    'Worked out by the card that shows it, from the data already on the screen.',
  ),
} satisfies Record<string, HelpText>;

/** Help shown on table column headers by the shared DataTable. */
export const TABLE_HEADER_HELP: Record<string, HelpText> = {
  'Days Difference': h('Days since the distributor last reported stock. 0 = reported today.', '/rd-status day_diff.'),
  'Delivery %': h('Delivered quantity ÷ ordered quantity.', '/dispatch-vs-order delivery_pct.'),
  'WIP Value': h('Value of the production order in progress.', '/wip WIP Value.'),
};
