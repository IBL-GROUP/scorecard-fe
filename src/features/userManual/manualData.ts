/**
 * The Supply Chain Pulse user manual, held as DATA rather than as a page of
 * markup.
 *
 * Two readers need it in this shape: the page renders it, and the search box on
 * that page filters every dictionary row at once — which it can only do if the
 * rows are rows rather than paragraphs.
 *
 * WHAT MAY GO IN HERE: what the dashboard actually shows today, in the order it
 * shows it, with the source table and the real calculation behind each field.
 * Where a source or a formula could not be verified in scorecard-fe /
 * scorecard-be, the row is typed `unconf` and says so. Nothing is inferred and
 * no formula is invented — a wrong formula in a manual is worse than an admitted
 * gap.
 *
 * KEEPING IT TRUE: this file is the manual. When a tab gains a column, a chart
 * or a filter, the entry belongs here in the same edit — the reconciliation
 * checklist at the end is what says the two still agree.
 */

/** How a value on screen came to exist. */
export type FieldType =
  | 'direct' // read straight out of a source column
  | 'agg' // SUM / COUNT / AVG / DISTINCT over source rows
  | 'calc' // a formula or business rule
  | 'derived' // transformed or re-labelled rather than computed
  | 'hard' // fixed in the dashboard, not read from data
  | 'unconf'; // visible, but its source or logic could not be verified

/**
 * One row of a field dictionary, in the column order the table renders:
 * field, what it represents, data source, source field, type, calculation,
 * business explanation.
 */
export type FieldRow = [
  field: string,
  represents: string,
  source: string,
  sourceField: string,
  type: FieldType,
  calculation: string,
  business: string,
];

/** One numbered entry in a tab's "what is on screen, in order" list. */
export type LayoutItem = [name: string, kind: string, where: string];

/** One line of the dashboard-to-manual reconciliation table. */
export type CheckRow = [
  element: string,
  visible: boolean,
  documented: boolean,
  sourceIdentified: boolean,
  logicIdentified: boolean,
  status: string,
];

export type Block =
  // `html` blocks carry authored markup from this file only — never user input.
  | { kind: 'prose'; html: string }
  | { kind: 'panel'; html: string }
  | { kind: 'callout'; tone: 'warn' | 'neutral'; html: string }
  | { kind: 'layout'; title: string; items: LayoutItem[] }
  | { kind: 'fields'; title?: string; rows: FieldRow[] }
  | { kind: 'checklist'; rows: CheckRow[] };

export interface Section {
  id: string;
  /** Shown in the contents rail — "1", "T3", and so on. */
  num: string;
  title: string;
  kicker: string;
  blocks: Block[];
}

export const TYPE_LABEL: Record<FieldType, string> = {
  direct: 'Direct Source',
  agg: 'Aggregated',
  calc: 'Calculated',
  derived: 'Derived',
  hard: 'Hardcoded',
  unconf: 'Not Confirmed',
};

/** The stock table nearly every inventory figure is cut from. */
const STOCK = 'daily_stock_movement_history';
/** The item master carrying classification and the mapped SKU code. */
const ITEMS = 'vw_items_class';
/** The monthly SKU targets cover days are struck against. */
const TARGETS = 'mv_tscl_spl_targets';

export const MANUAL_TITLE = 'Supply Chain Pulse 1.0';
export const MANUAL_UPDATED = '16 September 2026';
export const MANUAL_TABS_NOTE = '4 tabs';

export const SECTIONS: Section[] = [
  /* ───────────────────────────── 1. OVERVIEW ───────────────────────────── */
  {
    id: 'overview',
    num: '1',
    title: 'Dashboard Overview',
    kicker: 'Section 1',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede"><b>Supply Chain Pulse 1.0</b> is the supply-side dashboard of the OneThunder
        suite. Where Sales Pulse reports what was sold and Distribution Pulse reports how widely it reached,
        this dashboard reports <b>whether we can supply it</b>: how much stock is on hand, how many days of
        cover that represents against the monthly target, how accurate the forecast and budget proved, whether
        orders were dispatched, and whether distributors are reporting their stock at all.</p>`,
      },
      {
        kind: 'panel',
        html: `
        <h4>Intended users</h4>
        <p>Supply chain and planning management, warehouse and branch operations, demand planning, and the
        commercial managers who need to know whether stock will hold. What a user can open is governed by
        permission section codes — <code>SUMMARY</code>, <code>SERVICE_MEASURE</code>,
        <code>DISPATCH_WIP</code> and <code>RD_DATA_STATUS</code> — so two people signed in at the same time
        can see a different set of tabs.</p>

        <h4>Main business questions answered</h4>
        <ul>
          <li>How many days of cover is each product classification carrying, against its benchmark?</li>
          <li>How accurate were the forecast and the budget, by classification and by month?</li>
          <li>Which branches are holding enough stock of the A, B, C and N classes, and which are short?</li>
          <li>How many SKUs sit above their cover-days threshold and how many below?</li>
          <li>Were the orders raised actually dispatched, and what is sitting in work in progress?</li>
          <li>Which distributors have reported their stock, and how stale is the last report?</li>
        </ul>

        <h4>The A / B / C / N classification</h4>
        <p>Almost every figure on this dashboard is cut by product <b>classification</b>, taken from
        <code>vw_items_class.classification</code>. Four classes are named throughout — <b>A</b>, <b>B</b>,
        <b>C</b> and <b>N</b> — and anything unclassified is bucketed as <b>Others</b>. Each class carries its
        own benchmark number of cover days, so “good” means something different for an A product than for a C.
        What the letters themselves denote is a business definition held outside the dashboard.</p>

        <h4>Overall data sources</h4>
        <ul>
          <li><b><code>daily_stock_movement_history</code></b> — the stock ledger. Quantity, trade price and
          item cost, snapshotted by day. Every inventory and cover-days figure comes from here.</li>
          <li><b><code>vw_items_class</code></b> — item master: classification and the mapped SKU code that
          stock and sales are joined on.</li>
          <li><b><code>mv_tscl_spl_targets</code></b> — the monthly SKU targets that cover days are struck
          against, and <b><code>mv_tscl_budget</code></b> — the monthly budget the accuracy gauges use.</li>
          <li><b><code>vw_mv_tscl_data_</code></b> — invoiced sales, used by the Sales Summary card and the
          accuracy calculations.</li>
          <li><b><code>cover_days</code></b> / <b><code>cover_days_detail</code></b> — the benchmark cover-day
          thresholds per classification, carrying an effective date.</li>
          <li><b><code>sales_inv_locations</code></b> — inventory locations, which turn a subinventory code
          into the branch names the Inventory Days table is columned by.</li>
          <li><b><code>vw_dispatch_vs_orders</code></b>, <b><code>sap_wip_data</code></b> and
          <b><code>sap_tpkg_traw_data</code></b> — the Dispatch &amp; WIP tab.</li>
          <li><b><code>primary_secondary_stock</code></b> — distributor stock reports, behind the RD Data
          Status tab.</li>
        </ul>

        <h4>High-level data flow</h4>
        <div class="flow">SAP stock    →  daily_stock_movement_history  →  qty × trade_price  →  inventory value
Item master  →  vw_items_class                →  classification     →  the A / B / C / N split
Targets      →  mv_tscl_spl_targets           →  target ÷ days      →  daily target
                                               →  value ÷ daily target  →  COVER DAYS
Benchmarks   →  cover_days                    →  threshold per class →  above / below
SAP orders   →  vw_dispatch_vs_orders, sap_wip_data, sap_tpkg_traw_data  →  Dispatch &amp; WIP
RD reports   →  primary_secondary_stock       →  RD Data Status</div>`,
      },
      {
        kind: 'callout',
        tone: 'warn',
        html: `<p><strong>Read Section 7 before relying on this dashboard.</strong> Documenting it field by
        field surfaced two defects that change what the numbers mean: the <b>Service Measure</b> and
        <b>Inventory Days</b> queries ignore the date filter and read a hardcoded April 2026 stock snapshot,
        and the two accuracy cards on the Summary tab appear to have their <b>titles swapped</b> against the
        data feeding them. Neither has been corrected here — this manual documents what the dashboard does.</p>`,
      },
      {
        kind: 'callout',
        tone: 'neutral',
        html: `<p><strong>How to read the order of this manual.</strong> Tabs are numbered in the order the tab
        bar shows them, left to right. Inside each tab, items are numbered in the order they appear on screen,
        top to bottom and left to right within a row. Nothing has been re-grouped into a more logical order,
        and nothing visible has been left out for being self-evident.</p>`,
      },
    ],
  },

  /* ──────────────────────── 2. READING THIS MANUAL ─────────────────────── */
  {
    id: 'legend',
    num: '2',
    title: 'How Each Field Is Classified',
    kicker: 'Section 2',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede">Every documented field carries one of six types, describing how the value on
        screen came to exist.</p>`,
      },
      {
        kind: 'panel',
        html: `
        <div class="legend">
          <div><span class="chip t-direct">Direct Source</span><span>Read straight out of a source column with no arithmetic.</span></div>
          <div><span class="chip t-agg">Aggregated</span><span>A SUM, COUNT, AVG or DISTINCT count over source rows.</span></div>
          <div><span class="chip t-calc">Calculated</span><span>Produced by a formula or business rule — cover days, an accuracy percentage, a variance.</span></div>
          <div><span class="chip t-derived">Derived</span><span>Transformed or re-labelled rather than computed — a bucket, a fallback, a formatted display value.</span></div>
          <div><span class="chip t-hard">Hardcoded</span><span>A fixed value written into the dashboard, not read from data.</span></div>
          <div><span class="chip t-unconf">Not Confirmed</span><span>Visible on the dashboard, but its source or logic could not be verified. No formula has been invented for it.</span></div>
        </div>
        <h4>The one formula worth learning</h4>
        <p>Almost everything on the first two tabs reduces to this:</p>
        <div class="flow">cover days  =  inventory value  ÷  ( monthly target value  ÷  days in the month )</div>
        <p>The numerator is stock valued at trade price on one snapshot day. The denominator is the daily run
        rate implied by the month’s target. The answer is “at this rate, how many days will the stock last”.
        Each classification then has a benchmark it is read against.</p>`,
      },
    ],
  },

  /* ─────────────────────── 3. HEADER AND FILTERS ───────────────────────── */
  {
    id: 'chrome',
    num: '3',
    title: 'The Page Header and Filters',
    kicker: 'Section 3',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede">The header sits above every tab. The filter bar beneath it changes with the tab
        selected — the RD Data Status tab filters on entirely different dimensions from the other three.</p>`,
      },
      {
        kind: 'layout',
        title: 'Visual layout — header, left to right',
        items: [
          ['Searle logo', 'brand', 'Top-left corner. Static image.'],
          ['“Supply Chain Pulse 1.0”', 'label', 'Directly beneath the logo. Static text — the dashboard name and version.'],
          ['Main tab bar', 'navigation', 'Centre-left. Four tabs: Summary, Service Measure, Dispatch & WIP, RD Data Status. Only those the user is permitted to open are rendered.'],
          ['User avatar menu', 'navigation', 'Top-right corner. The signed-in user’s name, the other dashboards they may open, this User Manual, Settings and Log out.'],
          ['Filter bar', 'filter', 'Full width, directly under the header row. Its fields change with the tab — see below.'],
        ],
      },
      {
        kind: 'fields',
        title: 'Filters — in screen order',
        rows: [
          ['Classification', 'Product classification', ITEMS, 'classification', 'direct', 'Single select. Sent to every query on the first three tabs and applied as <code>classification IN (:classification)</code>. On the Service Measure line chart it also reduces the chart to that one class’s series.', 'The A / B / C / N split the whole dashboard is organised around.'],
          ['SKU', 'Stock-keeping unit', ITEMS, 'mapping_code', 'direct', 'Multi-select. Applied against the mapped item code, which is the code stock and sales are joined on.', 'Narrows every figure to one or more products.'],
          ['Branches', 'Inventory location', 'sales_inv_locations', 'inv_sloc', 'direct', 'Multi-select. Applied against the inventory storage location, not against the sales branch.', 'Which warehouses’ stock is counted.'],
          ['Branch Code / Branch', 'Distributor branch (RD tab only)', 'Franchise data', 'branch_code, branch_desc', 'direct', 'Two multi-selects offering the same branches by code and by name. Shown only on the RD Data Status tab.', 'Which distributor branches are listed.'],
          ['Distributor Code / Distributor', 'Distributor (RD tab only)', 'Franchise data', 'ibl_distributor_code, distributor_desc', 'direct', 'Two multi-selects offering the same distributors by code and by name. Shown only on the RD Data Status tab.', 'Which distributors are listed.'],
          ['Uploaded / Not Uploaded', 'Whether the distributor reported stock (RD tab only)', 'primary_secondary_stock', '—', 'derived', 'A filter with exactly two options. Narrows the table to distributors who have reported, or to those who have not.', 'The fastest way to find who is failing to report.'],
          ['Date range', 'The reporting window', 'Dashboard front-end → every query', 'startDate, endDate', 'direct', 'Sent to every endpoint. <b>Note which figures actually use it:</b> cover days takes the LATEST stock snapshot inside the range; targets are taken from the month the END date falls in; and two Service Measure queries ignore it entirely (see Section 7).', 'The window every figure is nominally reported for.'],
          ['Apply / clear', 'Commits the staged filters', 'Dashboard front-end', '—', 'derived', 'Filters are staged locally and pushed to the queries on Apply, as on Sales Pulse.', 'One button commits everything staged in the bar.'],
          ['Branch and distributor reset on tab change', 'Why a selection disappears', 'Dashboard front-end', '—', 'derived', 'Moving to or from the RD Data Status tab clears the branch and distributor selections, and moving to Dispatch &amp; WIP clears the branch. RD branch codes come from the franchise database and mean nothing to the other tabs.', 'Prevents a filter from silently matching nothing after a tab change.'],
        ],
      },
    ],
  },

  /* ───────────────────────────── TAB 1: SUMMARY ────────────────────────── */
  {
    id: 'tab-summary',
    num: 'T1',
    title: 'Tab 1: Summary',
    kicker: 'Tab 1 of 4',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede"><b>Purpose.</b> The supply-chain position at a glance: the benchmark each class is
        judged against, what has sold, how many days of cover is on hand, and how accurate the forecast and
        budget proved.</p>`,
      },
      {
        kind: 'layout',
        title: 'Visual layout — top to bottom, left to right',
        items: [
          ['Filter bar', 'filter', 'Section 3.'],
          ['Benchmark', 'legend card', 'Row 1, left. A grey card headed BENCHMARK with a LEGEND badge. Two columns — Cover Days and No. of SKUs — and one row per class: A, B, C, N.'],
          ['Sales Summary', 'card', 'Row 1, centre. One row per classification with its SKU count, sales value and share, and a Total line.'],
          ['Cover Days', 'card', 'Row 1, right. Total Days plus one row per class, with a TP / EFP switch.'],
          ['Budget Accuracy TSCL', 'gauge + bar chart', 'Row 2, left. A Days Gone / Target panel and a gauge, then a bar chart by classification.'],
          ['Forecast Accuracy IBL', 'gauge + bar chart', 'Row 2, centre. The same shape as the card beside it.'],
          ['Forecast Vs Budget %', 'bar chart', 'Row 2, right. One bar per class.'],
        ],
      },
      {
        kind: 'fields',
        title: '2 · Benchmark card',
        rows: [
          ['Class (A / B / C / N)', 'The classification the row describes', ITEMS, 'classification', 'hard', 'The four class rows are written into the dashboard, each with its own colour, which is then used consistently on every chart and table across the dashboard.', 'The key to reading every other colour-coded figure on the page.'],
          ['Cover Days', 'The benchmark number of days for that class', 'cover_days', 'threshold, effective_date', 'direct', 'Read from the benchmark table, taking the row whose <code>effective_date</code> is on or before the selected end date. A class with no benchmark shows an em dash.', 'The bar each class is judged against. An A product is expected to carry different cover from a C.'],
          ['No. of SKUs', 'How many SKUs are in that class', ITEMS, 'mapping_code, classification', 'agg', '<code>COUNT(mapping_code)</code> grouped by classification across the WHOLE item master. <b>It is not narrowed by the date range or by any filter.</b>', 'The size of each class. Because it is unfiltered, it does not change when you filter the page — see Section 7.'],
        ],
      },
      {
        kind: 'fields',
        title: '3 · Sales Summary card',
        rows: [
          ['Class label', 'The classification the row describes', 'vw_mv_tscl_data_', 'classification', 'direct', 'One row per classification returned by the query, coloured to match the Benchmark card.', 'Ties the sales figure to the class it belongs to.'],
          ['SKU', 'Distinct SKUs that sold in the window', 'vw_mv_tscl_data_', 'item_code', 'agg', '<code>COUNT(DISTINCT item_code)</code> per classification, over items whose summed amount is non-zero in the window.', 'How much of the range actually moved — a different question from how much revenue it made.'],
          ['Sales', 'Value sold in the window', 'vw_mv_tscl_data_', 'amount, billing_date', 'agg', '<code>SUM(amount)</code> per classification for <code>billing_date BETWEEN :startDate AND :endDate</code>, excluding items that net to zero.', 'The revenue each class produced.'],
          ['%', 'That class’s share of the total', 'Derived', '—', 'calc', 'The class’s sales as a percentage of the card’s total, rounded to a whole number.', 'The mix: whether the A class is carrying the revenue it is expected to.'],
          ['Total row', 'The card’s totals', 'Derived', '—', 'agg', 'SKU counts and sales summed across the rows shown.', 'The whole filtered set, so the rows can be checked against it.'],
        ],
      },
      {
        kind: 'fields',
        title: '4 · Cover Days card',
        rows: [
          ['Total Days', 'Cover days across all classes', `${STOCK} + ${TARGETS}`, 'qty, trade_price; target_value', 'calc', 'Inventory value ÷ (total monthly target ÷ days in the month).', 'How long the whole inventory would last at the planned run rate.'],
          ['A / B / C / N / Others – Cover Days', 'Cover days for that class', `${STOCK} + ${TARGETS}`, 'qty, trade_price; target_value', 'calc', 'Per class: <code>SUM(qty × trade_price) ÷ (SUM(target_value) ÷ days in month)</code>, rounded to 1 dp. Stock is taken from the LATEST <code>stock_closing_date</code> inside the selected range, restricted to business lines <code>P01, P07, P08, P12, P35</code> and to subinventory codes beginning <code>80</code> plus <code>8206</code> and <code>8210</code>, with zero-quantity rows excluded. Targets are the month the END date falls in.', 'The headline supply measure. Read each class against its benchmark: A well under benchmark is a stock-out risk, well over is capital tied up.'],
          ['TP / EFP switch', 'Which valuation the card uses', STOCK, 'trade_price vs item_cost', 'derived', '<b>TP</b> values stock at <code>qty × trade_price</code>; <b>EFP</b> values the same quantities at <code>qty × item_cost</code>. The cover-days figure is recomputed against the same daily target either way.', 'Trade price is what the stock is worth to sell; item cost is what it cost to make. Cover days differ between them because the value does, not because the quantity does.'],
          ['Inventory value / quantity', 'The figures behind each row', STOCK, 'inv_val, inv_val_efp, quantity', 'agg', 'Carried on each row alongside the cover-days number.', 'The raw stock behind the ratio.'],
          ['Others row', 'Stock that carries no classification', ITEMS, 'classification IS NULL', 'derived', 'Any stock whose item has no classification in the item master is bucketed as <code>Others</code> rather than dropped, so the class rows and the total reconcile.', 'A large Others figure means the item master is incomplete, not that cover is bad.'],
        ],
      },
      {
        kind: 'fields',
        title: '5–6 · The two accuracy cards',
        rows: [
          ['Days Gone', 'How much of the month has passed', 'Derived from the date window', '—', 'calc', 'Days elapsed against total days in the month, shown as <code>gone / total</code>.', 'Lets the gauge be read as ahead or behind rather than just as a number.'],
          ['Target', 'The target the gauge is measured against', 'mv_tscl_budget', 'value, target_date', 'agg', '<code>SUM(value)</code> for the month the end date falls in. <b>No fallback:</b> a month with no budget loaded reports 0 rather than borrowing the previous month’s figure.', 'The budget line. A zero here means nothing was loaded, not that the target is zero.'],
          ['Gauge value', 'Achievement against target', 'vw_mv_tscl_data_ + mv_tscl_budget', 'sold_qty, amount; value', 'calc', 'Sales achieved against the month’s budget, as a percentage of 100.', 'How close the month is to its number.'],
          ['Bar chart — X axis', 'Classification', ITEMS, 'classification', 'direct', 'One group per class (A, B, C, N), each labelled in its own class colour.', 'Which classes are carrying the accuracy and which are dragging it.'],
          ['Bar chart — series', 'One bar per month', 'Forecast accuracy queries', 'month', 'agg', 'Up to three months, each its own series and colour; when no months come back a single “Forecast Accuracy” series is drawn instead. Values print as whole percentages.', 'Accuracy as a trend rather than a single figure.'],
          ['Card titles vs the data feeding them', 'Which card is which', 'Dashboard front-end', '—', 'unconf', 'The card titled <b>“Budget Accuracy TSCL”</b> is rendered from the <b>IBL</b> figures, and the card titled <b>“Forecast Accuracy IBL”</b> is rendered from the <b>TSCL</b> figures. Either the two titles are swapped or the variables are misnamed; the code does not say which.', 'A reader comparing IBL against TSCL may be reading them the wrong way round. This needs settling before either card is quoted — see Section 7.'],
        ],
      },
      {
        kind: 'fields',
        title: '7 · Forecast Vs Budget %',
        rows: [
          ['X axis — class', 'Classification, plus a Total', ITEMS, 'classification', 'direct', 'One bar per class in its class colour; Total and anything unrecognised are drawn grey.', 'Keeps the class colours consistent with every other chart on the page.'],
          ['Series “% SKUs”', 'Share of SKUs in that class', 'Percentage-of-SKUs query', '—', 'calc', 'The percentage each class contributes, labelled on the bar.', 'How the forecast and budget compare in shape across the classes.'],
        ],
      },
    ],
  },

  /* ──────────────────────── TAB 2: SERVICE MEASURE ─────────────────────── */
  {
    id: 'tab-service',
    num: 'T2',
    title: 'Tab 2: Service Measure',
    kicker: 'Tab 2 of 4',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede"><b>Purpose.</b> Whether each branch is holding enough stock, class by class and
        SKU by SKU. This is the operational heart of the dashboard — and the tab most affected by the date
        defect in Section 7.</p>`,
      },
      {
        kind: 'callout',
        tone: 'warn',
        html: `<p><strong>This tab’s stock figures ignore the date filter.</strong> The Service Measure and
        Inventory Days queries select their stock snapshot with a <b>hardcoded April 2026 date range</b>
        (<code>stock_opening_date BETWEEN '2026-04-01' AND '2026-04-30'</code>, and
        <code>… AND '2026-04-21'</code> respectively) instead of the start and end dates the page sends them.
        Changing the date range in the header does not change these figures. Recorded as it stands — see
        Section 7.</p>`,
      },
      {
        kind: 'layout',
        title: 'Visual layout — top to bottom, left to right',
        items: [
          ['Filter bar', 'filter', 'Section 3.'],
          ['Inventory Days Threshold', 'legend card', 'Row 1, left. The same shape as the Summary tab’s Benchmark card, carrying each class’s threshold.'],
          ['Inventory Days', 'table', 'Row 1, right. Class rows across 14 branch columns plus a Total column; each class row expands into its SKUs. The first column is pinned.'],
          ['Service Measure by Branch', 'line chart', 'Row 2, left. One filled line per class across the branches.'],
          ['Cover Days Threshold vs Actual', 'bar chart', 'Row 2, centre. Two bars per class — TGT and Actual.'],
          ['SKUs VS Threshold', 'bar chart', 'Row 2, right. Two bars per class — Above and Below.'],
        ],
      },
      {
        kind: 'fields',
        title: '2 · Inventory Days Threshold card',
        rows: [
          ['Class (A / B / C / N)', 'The classification the row describes', ITEMS, 'classification', 'hard', 'The same four class rows and colours as the Summary tab’s Benchmark card.', 'The key to the colour coding used across this tab.'],
          ['Threshold days', 'The benchmark for that class', 'cover_days', 'threshold, effective_date', 'direct', 'The benchmark whose effective date is on or before the selected end date. It is the same figure the Inventory Days table colours its cells against and the TGT bar in the chart below.', 'One threshold, used in three places on this tab, so they cannot disagree.'],
        ],
      },
      {
        kind: 'fields',
        title: '3 · Inventory Days table',
        rows: [
          ['Column 1 — Class', 'The classification, or a SKU when expanded', `${ITEMS} + sap_items_detail`, 'classification; matnr_desc', 'direct', 'A class row shows a coloured badge (A, B, C, N) or the word “Other”. Expanding it lists that class’s SKUs by description. The column is pinned while the branch columns scroll.', 'Lets you go from “class C is thin” to exactly which products are thin.'],
          ['Branch columns (14)', 'Cover days for that class at that branch', `${STOCK} + sales_inv_locations + ${TARGETS}`, 'qty × trade_price; inv_sloc; target_value', 'calc', 'Inventory value at that branch ÷ that branch’s daily target, truncated to a whole number. The branch list is a <b>fixed set of 14</b> written into the dashboard: Bahawalpur, DSS Korangi, Faisalabad, Gujranwala, Hyderabad, Islamabad, Karachi, Korangi, Lahore, Mingora, Multan, Peshawar, Quetta and Sukkur.', 'Where the cover actually sits. A national average hides a branch that is empty.'],
          ['Total column', 'The row’s average across branches', 'Derived', '—', 'calc', 'The sum of the 14 branch values divided by 14 — <b>an unweighted mean of the branch cover-day figures</b>, not the cover days of the combined stock.', 'Two branches at 60 days and twelve at 5 average to about 13, which no branch actually has. Read the branch columns, not just this one.'],
          ['SKU sub-rows', 'The SKUs inside a class', 'sap_items_detail', 'matnr_desc', 'direct', 'Shown when a class row is expanded, with the same branch columns and total.', 'The product-level detail behind the class figure.'],
          ['Green cell colouring', 'A SKU at or above threshold', 'Derived', '—', 'derived', 'On a SKU sub-row, a branch cell is coloured green when its value is greater than or equal to that class’s threshold. Class rows are not coloured this way.', 'Scans as a heat map: green is covered, plain is not.'],
          ['Total row', 'The pinned totals line', 'Derived', '—', 'calc', 'Printed after the last A/B/C/N row and before the Others row, on a grey band.', 'Separates the classified position from the unclassified tail.'],
          ['Others row', 'Stock with no classification', ITEMS, 'classification IS NULL', 'derived', 'Labelled “Other” and placed after the Total row.', 'A large Others row means the item master is incomplete.'],
        ],
      },
      {
        kind: 'fields',
        title: '4–6 · Charts',
        rows: [
          ['Service Measure by Branch — X axis', 'Branch', 'sales_inv_locations', 'inv_sloc_desc', 'direct', 'One point per branch. The suffix “ SELL” is stripped from the branch description.', 'Reads left to right across the branch network.'],
          ['Service Measure by Branch — series', 'One filled line per class', `${STOCK} + ${ITEMS}`, 'classification', 'calc', 'Four series — SKU-A%, SKU-B%, SKU-C%, SKU-N% — each in its class colour. <b>Selecting a Classification in the filter bar reduces the chart to that one series.</b>', 'Compares how well each class is served across branches, rather than one blended number.'],
          ['Cover Days Threshold vs Actual — X axis', 'Classification', ITEMS, 'classification', 'direct', 'One group per class, labelled in its class colour.', 'Benchmark against reality, class by class.'],
          ['Cover Days Threshold vs Actual — TGT bar', 'The benchmark', 'cover_days', 'threshold', 'direct', 'The same threshold as the card above, drawn as the first bar.', 'What the class should be carrying.'],
          ['Cover Days Threshold vs Actual — Actual bar', 'The cover days actually held', `${STOCK} + ${TARGETS}`, 'qty × trade_price; target_value', 'calc', 'Inventory value ÷ daily target for that class, drawn as the second bar. Both bars print as whole numbers.', 'The gap between the two bars is the action: a short Actual is a supply risk, a tall one is trapped capital.'],
          ['SKUs VS Threshold — X axis', 'Classification', ITEMS, 'classification', 'direct', 'One group per class. The card is titled “SKUs VS Threshold” on screen.', 'Counts of products rather than days.'],
          ['SKUs VS Threshold — Above / Below', 'How many SKUs clear their threshold', `${STOCK} + ${ITEMS} + cover_days`, 'mapping_code; threshold', 'agg', 'Each SKU’s cover days is compared with its class threshold and counted into <b>Above</b> (green) or <b>Below</b> (red).', 'Cover days can look healthy for a class while most of its individual SKUs sit below threshold — this chart is what catches that.'],
        ],
      },
    ],
  },

  /* ───────────────────────── TAB 3: DISPATCH & WIP ─────────────────────── */
  {
    id: 'tab-dispatch',
    num: 'T3',
    title: 'Tab 3: Dispatch & WIP',
    kicker: 'Tab 3 of 4',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede"><b>Purpose.</b> The production and fulfilment side: whether what was ordered was
        actually delivered, what is still in work in progress, and what raw and packaging material is held.
        Three tables, no charts.</p>`,
      },
      {
        kind: 'layout',
        title: 'Visual layout — top to bottom',
        items: [
          ['Filter bar', 'filter', 'Section 3. The branch selection is cleared when this tab is opened.'],
          ['Dispatch Vs Order', 'table', 'Columns: Material Name · Order Qty · Delivery Qty · %'],
          ['WIP', 'table', 'Columns: Material Name · WIP Qty · Value'],
          ['RMPM', 'table', 'Columns: Material Name · Total Qty · Total Cost'],
        ],
      },
      {
        kind: 'fields',
        title: '2 · Dispatch Vs Order',
        rows: [
          ['Material Name', 'The product ordered', `vw_dispatch_vs_orders + ${ITEMS}`, 'material description', 'direct', 'One row per material, joined to the item master for its classification so the page filters apply.', 'What was asked for.'],
          ['Order Qty', 'Quantity ordered', 'vw_dispatch_vs_orders', 'so_quantity', 'agg', '<code>SUM(so_quantity)</code> per material.', 'Demand raised on the plant.'],
          ['Delivery Qty', 'Quantity actually delivered', 'vw_dispatch_vs_orders', 'deliverd_qty', 'agg', '<code>SUM(deliverd_qty)</code> per material. (The source column is spelled <code>deliverd_qty</code>.)', 'Supply that reached the branch.'],
          ['%', 'Delivery against order', 'Derived', '—', 'calc', '<code>delivery qty ÷ order qty × 100</code>, returned by the query as <code>delivery_pct</code>.', 'The fill rate. A low percentage on a high-order material is the most actionable line on this tab.'],
        ],
      },
      {
        kind: 'fields',
        title: '3 · WIP',
        rows: [
          ['Material Name', 'The product in production', 'sap_wip_data', 'material description', 'direct', 'One row per material in work in progress.', 'What is being made.'],
          ['WIP Qty', 'Quantity in work in progress', 'sap_wip_data', 'quantity', 'agg', 'Summed for the LATEST <code>record_created_date</code> inside the selected range, so the figure is a snapshot rather than a sum over the window.', 'Stock that exists but cannot be sold yet.'],
          ['Value', 'Value of that work in progress', 'sap_wip_data', 'value', 'agg', 'Summed from the same snapshot.', 'Capital sitting on the production floor.'],
        ],
      },
      {
        kind: 'fields',
        title: '4 · RMPM (raw and packaging material)',
        rows: [
          ['Material Name', 'The raw or packaging material', 'sap_tpkg_traw_data', 'material description', 'direct', 'One row per material, with the storage location defaulting to <code>NA</code> where none is recorded.', 'The inputs held for production.'],
          ['Total Qty', 'Quantity held', 'sap_tpkg_traw_data', 'quantity columns', 'agg', 'Summed across the stock states the table carries.', 'How much input material is on hand.'],
          ['Total Cost', 'Value of that material', 'sap_tpkg_traw_data', 'valueunrestricted, valuatedgrblocked, valuequalityinspection, valuereturns, valuestktransferstloc, valuestocktransferplant, valuestockintransit, valueblocked', 'agg', 'The sum of every stock-state value column: unrestricted, GR blocked, quality inspection, returns, storage-location transfer, plant transfer, in transit and blocked. <b>Restricted, blocked and in-transit stock is therefore included in the total.</b>', 'Total value tied up in inputs — but not all of it is available to use. A large blocked or quality-inspection balance is worth investigating separately.'],
          ['Filters on this table', 'Which filters apply', 'Dashboard front-end + backend', '—', 'unconf', 'The branch, SKU and classification filter clauses exist in the query but are <b>commented out</b>. This table is therefore not narrowed by the filter bar.', 'Changing a filter will not change this table. Flagged rather than corrected — see Section 7.'],
        ],
      },
    ],
  },

  /* ──────────────────────── TAB 4: RD DATA STATUS ──────────────────────── */
  {
    id: 'tab-rd',
    num: 'T4',
    title: 'Tab 4: RD Data Status',
    kicker: 'Tab 4 of 4',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede"><b>Purpose.</b> Whether distributors are reporting their stock at all, and how
        stale the last report is. This tab answers a data-quality question rather than a supply one — but every
        distributor-stock figure elsewhere in OneThunder depends on it.</p>`,
      },
      {
        kind: 'layout',
        title: 'Visual layout — top to bottom, left to right',
        items: [
          ['Filter bar', 'filter', 'Section 3 — this tab swaps in Branch Code, Branch, Distributor Code, Distributor and the Uploaded / Not Uploaded filter.'],
          ['Total Current Stock in Hand', 'stat box', 'Row 1, first of three.'],
          ['Total Previous Stock in Hand', 'stat box', 'Row 1, second.'],
          ['Total Stock in Hand', 'stat box', 'Row 1, third.'],
          ['RD stock table', 'table', 'Fills the rest of the tab. Ten columns, with an Export button.'],
        ],
      },
      {
        kind: 'fields',
        title: '2–4 · Stat boxes',
        rows: [
          ['Total Current Stock in Hand', 'Value reported today', 'primary_secondary_stock', 'stock_value, dated', 'agg', 'Summed over rows whose <code>dated</code> equals the current date.', 'What distributors have confirmed they are holding right now.'],
          ['Total Previous Stock in Hand', 'Value last reported before today', 'primary_secondary_stock', 'stock_value, dated', 'agg', 'Summed over rows whose <code>dated</code> is not the current date.', 'The standing position from earlier reports — which for a lapsed distributor is the only figure there is.'],
          ['Total Stock in Hand', 'The two together', 'Derived', '—', 'agg', 'The sum of the two boxes beside it.', 'The best available view of distributor stock, current and stale combined.'],
        ],
      },
      {
        kind: 'fields',
        title: '5 · RD stock table — columns in screen order',
        rows: [
          ['RD Name', 'Distributor name', 'primary_secondary_stock', 'distributor_desc', 'direct', 'Left aligned. Name leads the code, deliberately, because the name is what a reader recognises.', 'Who the row is about.'],
          ['RD Code', 'Distributor identifier', 'primary_secondary_stock', 'ibl_distributor_code', 'direct', 'Left aligned.', 'The code to match against the distributor master.'],
          ['Branch Name', 'The branch serving the distributor', 'primary_secondary_stock', 'branch_desc', 'direct', 'Left aligned.', 'Which branch is responsible for chasing this distributor.'],
          ['Branch Code', 'Branch identifier', 'primary_secondary_stock', 'branch_code', 'direct', 'Left aligned.', 'The branch code.'],
          ['Current Stock in Hand Units', 'Units reported today', 'primary_secondary_stock', 'stock_qty, dated', 'agg', '<code>SUM(stock_qty)</code> where <code>dated = CURRENT_DATE</code>, otherwise 0. Right aligned.', 'What they say they are holding today.'],
          ['Current Stock in Hand Value', 'Value reported today', 'primary_secondary_stock', 'stock_value, dated', 'agg', '<code>SUM(stock_value)</code> where <code>dated = CURRENT_DATE</code>, otherwise 0. Right aligned.', 'The same in money.'],
          ['Previous Stock Date', 'When they last reported before today', 'primary_secondary_stock', 'dated', 'direct', 'The <code>dated</code> value where it is not the current date; blank otherwise. Centre aligned.', 'The date the stale figures belong to.'],
          ['Previous Stock Units', 'Units at that previous date', 'primary_secondary_stock', 'stock_qty', 'agg', 'Summed where <code>dated <> CURRENT_DATE</code>. Right aligned.', 'The last known quantity.'],
          ['Previous Stock Value', 'Value at that previous date', 'primary_secondary_stock', 'stock_value', 'agg', 'Summed where <code>dated <> CURRENT_DATE</code>. Right aligned.', 'The last known value.'],
          ['Days Difference', 'How stale the last report is', 'Derived', 'dated', 'calc', '<code>CURRENT_DATE − dated</code> in days; <b>0</b> when the distributor reported today. Right aligned.', 'The column this tab exists for. A large number means every distributor-stock figure that includes this RD is out of date by that many days.'],
          ['Uploaded / Not Uploaded filter', 'How the table is narrowed', 'Derived', '—', 'derived', 'Splits the list into distributors who have reported and those who have not.', 'Turns the table into a chase list.'],
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        html: `<p><strong>This tab is anchored to today, not to the date filter.</strong> “Current” means
        <code>CURRENT_DATE</code> in the database, and Days Difference is measured from today. Changing the
        header’s date range does not move that anchor, which is correct for a “who has reported?” question but
        means this tab cannot be used to review a past date.</p>`,
      },
    ],
  },

  /* ─────────────────────────── 5. DATA FLOW ────────────────────────────── */
  {
    id: 'lineage',
    num: '5',
    title: 'Data Flow & Lineage',
    kicker: 'Section 5',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede">Each line reads <b>source system → table → field → transformation → calculation →
        what you see</b>.</p>`,
      },
      {
        kind: 'panel',
        html: `
        <h4>Cover days — the dashboard's central measure</h4>
        <div class="flow">SAP stock  →  daily_stock_movement_history  →  qty, trade_price (or item_cost for EFP)
           →  latest stock_closing_date in the range
           →  business lines P01/P07/P08/P12/P35, subinventory 80* + 8206 + 8210, qty &lt;&gt; 0
           →  SUM(qty × trade_price)                        →  inventory value
Targets    →  mv_tscl_spl_targets  →  target_value  →  month of the END date
           →  SUM(target_value) ÷ days in month             →  daily target
           →  inventory value ÷ daily target                →  COVER DAYS</div>

        <h4>Benchmarks and thresholds</h4>
        <div class="flow">cover_days  →  threshold per classification, effective_date &lt;= end date
            →  the Benchmark card, the TGT bar, and the green cells in Inventory Days</div>

        <h4>Classification (used by everything)</h4>
        <div class="flow">vw_items_class  →  mapping_code + classification
                →  joined to stock on the mapped item code (F-prefixed codes kept as text)
                →  A / B / C / N, NULL bucketed as Others</div>

        <h4>Sales Summary</h4>
        <div class="flow">vw_mv_tscl_data_  →  amount, item_code, classification, billing_date
                  →  SUM(amount), COUNT(DISTINCT item_code) per class, non-zero only
                  →  class ÷ total  →  the % column</div>

        <h4>Accuracy gauges</h4>
        <div class="flow">mv_tscl_budget    →  value  →  month of the end date (no fallback)  →  Target
vw_mv_tscl_data_  →  sold_qty, amount  →  achieved ÷ budget  →  gauge %</div>

        <h4>Branch columns</h4>
        <div class="flow">daily_stock_movement_history.subinventory_code  →  sales_inv_locations.inv_sloc
                                    →  inv_sloc_desc (" SELL" stripped)  →  one column per branch</div>

        <h4>Dispatch &amp; WIP</h4>
        <div class="flow">vw_dispatch_vs_orders  →  so_quantity, deliverd_qty  →  delivered ÷ ordered  →  %
sap_wip_data           →  latest record_created_date          →  WIP qty and value
sap_tpkg_traw_data     →  every stock-state value column       →  RMPM total cost</div>

        <h4>RD Data Status</h4>
        <div class="flow">primary_secondary_stock  →  stock_qty, stock_value, dated
                         →  split on dated = CURRENT_DATE  →  current vs previous
                         →  CURRENT_DATE − dated            →  Days Difference</div>`,
      },
    ],
  },

  /* ──────────────────────── 6. RECONCILIATION ──────────────────────────── */
  {
    id: 'reconciliation',
    num: '6',
    title: 'Dashboard-to-Manual Reconciliation',
    kicker: 'Section 6',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede">Every element visible on the dashboard, checked off against this document.</p>`,
      },
      {
        kind: 'checklist',
        rows: [
          ['Header — logo, title, tab bar, avatar menu', true, true, true, true, 'Complete'],
          ['Filter bar — Classification, SKU, Branches', true, true, true, true, 'Complete'],
          ['Filter bar — RD tab fields + Uploaded filter', true, true, true, true, 'Complete'],
          ['Filter bar — date range', true, true, true, false, 'Ignored by two Service Measure queries'],
          ['Tab 1 Summary — Benchmark card', true, true, true, false, 'SKU count not filtered'],
          ['Tab 1 Summary — Sales Summary card', true, true, true, true, 'Complete'],
          ['Tab 1 Summary — Cover Days card + TP/EFP switch', true, true, true, true, 'Complete'],
          ['Tab 1 Summary — two accuracy cards', true, true, true, false, 'Titles appear swapped against their data'],
          ['Tab 1 Summary — Forecast Vs Budget %', true, true, true, true, 'Complete'],
          ['Tab 2 Service Measure — Threshold card', true, true, true, true, 'Complete'],
          ['Tab 2 Service Measure — Inventory Days table', true, true, true, false, 'Hardcoded April 2026 snapshot'],
          ['Tab 2 Service Measure — 3 charts', true, true, true, false, 'Service Measure uses hardcoded dates'],
          ['Tab 3 Dispatch & WIP — Dispatch Vs Order', true, true, true, true, 'Complete'],
          ['Tab 3 Dispatch & WIP — WIP', true, true, true, true, 'Complete'],
          ['Tab 3 Dispatch & WIP — RMPM', true, true, true, false, 'Filter clauses commented out'],
          ['Tab 4 RD Data Status — 3 stat boxes + 10-column table', true, true, true, true, 'Complete'],
          ['Visualizations / Tables + TP/EFP header toggles', false, true, true, true, 'Commented out, not rendered'],
        ],
      },
    ],
  },

  /* ────────────────────── 7. NOT CONFIRMED REGISTER ────────────────────── */
  {
    id: 'open-items',
    num: '7',
    title: 'Open Items — Not Confirmed',
    kicker: 'Section 7',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede">Everything visible on the dashboard is documented above. These are the points
        where the dashboard does not do what its labels imply, or where the source could not be verified from
        the dashboard and its API alone. None has been silently corrected. The first two are defects rather than
        ambiguities and should be treated as urgent.</p>`,
      },
      {
        kind: 'fields',
        title: 'Items requiring confirmation — most material first',
        rows: [
          ['Hardcoded April 2026 stock snapshot', 'The whole Service Measure tab', `scorecard-be — ${STOCK}`, 'stock_opening_date', 'unconf', 'Both queries pick their snapshot with literal dates instead of the parameters the page sends: Service Measure uses <code>BETWEEN \'2026-04-01\' AND \'2026-04-30\'</code> and Inventory Days uses <code>BETWEEN \'2026-04-01\' AND \'2026-04-21\'</code>. The <code>startDate</code> / <code>endDate</code> parameters are read into the handler and never used in that clause.', 'Every figure on the Service Measure tab describes April 2026 regardless of the date picked. The two queries also disagree with each other by nine days. This is a defect, not a design decision.'],
          ['Accuracy card titles appear swapped', 'The two gauge cards on the Summary tab', 'scorecard-fe', '—', 'unconf', 'The card titled <b>“Budget Accuracy TSCL”</b> renders <code>iblAccuracy</code>, <code>iblBarData</code>, <code>iblDaysGoneInfo</code> and the IBL loading flag; the card titled <b>“Forecast Accuracy IBL”</b> renders the TSCL equivalents. Either the titles are reversed or the variables are misnamed.', 'Anyone comparing IBL with TSCL accuracy may be reading them the wrong way round. Needs settling before either figure is quoted.'],
          ['Opening vs closing stock date', 'Which snapshot each tab reads', STOCK, 'stock_opening_date vs stock_closing_date', 'unconf', 'The Cover Days card and Threshold-vs-Actual read <code>stock_closing_date</code>; Service Measure, Inventory Days and SKUs-vs-Threshold read <code>stock_opening_date</code>. Whether the difference is deliberate is not recorded.', 'The Summary tab’s cover days and the Service Measure tab’s cover days are struck on different snapshots and need not agree.'],
          ['Benchmark SKU count is unfiltered', 'The “No. of SKUs” column on the Summary tab', ITEMS, 'mapping_code', 'unconf', 'Counted across the whole item master with no date, classification, SKU or branch predicate. The endpoint accepts those parameters and does not apply them.', 'The column does not respond to the filter bar, so it cannot be read alongside the Sales Summary card beside it, which does.'],
          ['Inventory Days Total is an unweighted mean', 'The Total column', 'Dashboard front-end', '—', 'unconf', 'Computed as the sum of the 14 branch values divided by 14, so a branch holding almost no stock counts as much as the largest. A stock-weighted figure would be the sum of values divided by the sum of daily targets.', 'The Total can sit far from every branch it summarises. Which is intended has not been confirmed.'],
          ['Branch list is fixed in the dashboard', 'The 14 Inventory Days columns', 'Dashboard front-end', '—', 'unconf', 'The branch keys and labels are written into the frontend rather than read from <code>sales_inv_locations</code>. A branch added upstream would not appear until the list is edited.', 'The table can silently omit a new branch, and the Total divides by 14 regardless.'],
          ['RMPM filters are commented out', 'The RMPM table on Dispatch & WIP', 'scorecard-be', '—', 'unconf', 'The branch, SKU and classification clauses are present but commented out in the query.', 'The table shows everything whatever the filter bar says, which reads as a filter that silently failed.'],
          ['RMPM total includes unavailable stock', 'The Total Cost column', 'sap_tpkg_traw_data', 'valueblocked, valuequalityinspection, valuestockintransit', 'unconf', 'Blocked, quality-inspection and in-transit values are summed into the same total as unrestricted stock. Whether the business wants one total or a split could not be determined.', 'Total Cost overstates what is actually available for production.'],
          ['Classification values A / B / C / N', 'What the classes mean', ITEMS, 'classification', 'unconf', 'The dashboard passes the letter through as an equality filter. What each class denotes, and how the benchmarks were set, is a business definition held outside the dashboard.', 'The whole dashboard is organised around these four letters; users should be told what they mean.'],
          ['Subinventory scope', 'Which locations count as stock', STOCK, 'subinventory_code', 'unconf', 'Confirmed as codes beginning <code>80</code> plus <code>8206</code> and <code>8210</code>. The business reason for that particular set is not documented.', 'Stock held in any other subinventory is invisible to this dashboard.'],
          ['Cover days target month', 'Which month the denominator comes from', TARGETS, 'target_date', 'unconf', 'Confirmed: the target is always the month the <b>end date</b> falls in, whatever range is selected. A range spanning two months still uses one month’s target.', 'A range crossing a month boundary produces a cover-days figure whose numerator and denominator cover different periods.'],
        ],
      },
    ],
  },
];
