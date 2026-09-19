/**
 * The Supply Chain Pulse user manual, held as DATA rather than as a page of
 * markup.
 *
 * Two readers need it in this shape: the page renders it, and the search box on
 * that page filters every dictionary row at once — which it can only do if the
 * rows are rows rather than paragraphs.
 *
 * WRITTEN FOR THE PEOPLE WHO USE THE DASHBOARD, not for the people who build
 * it. Each tab opens with what it is for and how to read it; the Calculation
 * column says what the figure means in a sentence and then gives the formula.
 * Table and column names are kept — a user who asks "where does this come
 * from?" deserves the real answer — but they never lead a sentence.
 *
 * WHAT MAY GO IN HERE: what the dashboard actually shows today, in the order it
 * shows it. Nothing that is switched off, commented out or invisible to users
 * belongs here — that is development detail, and it does not go in a manual.
 * Where a source or a formula could not be verified, the row is typed `unconf`
 * and says so. Nothing is inferred and no formula is invented — a wrong formula
 * in a manual is worse than an admitted gap.
 *
 * KEEPING IT TRUE: this file is the manual. When a tab gains a column, a chart
 * or a filter, the entry belongs here in the same edit, so the manual and the
 * dashboard never drift apart.
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

export type Block =
  // `html` blocks carry authored markup from this file only — never user input.
  | { kind: 'prose'; html: string }
  | { kind: 'panel'; html: string }
  | { kind: 'callout'; tone: 'warn' | 'neutral'; html: string }
  | { kind: 'layout'; title: string; items: LayoutItem[] }
  | { kind: 'fields'; title?: string; rows: FieldRow[] };

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
export const MANUAL_UPDATED = '18 September 2026';

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
        html: `<p class="lede"><b>Supply Chain Pulse 1.0</b> answers one question: <b>can we supply what we are
        selling?</b> How much stock is on hand, how many days that will last, whether the plan was accurate,
        whether orders were dispatched, and whether distributors are telling us what they hold.</p>
        <p>Where Sales Pulse reports what was sold and Distribution Pulse reports how widely it reached, this
        dashboard reports whether the stock behind those numbers actually exists.</p>`,
      },
      {
        kind: 'panel',
        html: `
        <h4>Who uses it</h4>
        <p>Supply chain and planning management, warehouse and branch operations, demand planning, and the
        commercial managers who need to know whether stock will hold.</p>
        <p><b>You will not all see the same tabs.</b> What you can open depends on what your account has been
        granted. A tab that is missing has not been given to you; it is not a fault.</p>

        <h4>What it answers</h4>
        <ul>
          <li>How many days of cover is each class of product carrying, against the benchmark set for it?</li>
          <li>How accurate did the forecast and the budget turn out to be?</li>
          <li>Which branches are holding enough stock, and which are running short?</li>
          <li>How many products sit above their cover-days threshold, and how many below?</li>
          <li>Were the orders we raised actually dispatched, and what is still in production?</li>
          <li>Which distributors have reported their stock, and how old is the last report?</li>
        </ul>

        <h4>The A / B / C / N classification — read this first</h4>
        <p>Almost every figure on this dashboard is split by product <b>classification</b>. Four classes are used
        throughout — <b>A</b>, <b>B</b>, <b>C</b> and <b>N</b> — and anything not yet classified is grouped as
        <b>Others</b>.</p>
        <p>Each class carries <b>its own benchmark number of cover days</b>, which is the whole point: “good”
        means something different for an A product than for a C. Never compare a class against another class’s
        benchmark. What the letters themselves stand for is a business definition set outside the dashboard —
        see Section 6.</p>

        <h4>Where the numbers come from</h4>
        <ul>
          <li><b><code>${STOCK}</code></b> — the stock ledger: quantity, trade price and item cost, recorded day
          by day. Every inventory and cover-days figure starts here.</li>
          <li><b><code>${ITEMS}</code></b> — the item master, which carries the classification and the product
          code that stock and sales are matched on.</li>
          <li><b><code>${TARGETS}</code></b> — the monthly targets cover days are struck against, and
          <b><code>mv_tscl_budget</code></b> — the budget behind the accuracy gauges.</li>
          <li><b><code>vw_mv_tscl_data_</code></b> — invoiced sales, used by the Sales Summary card.</li>
          <li><b><code>cover_days</code></b> — the benchmark number of days for each classification, each with
          the date it took effect.</li>
          <li><b><code>sales_inv_locations</code></b> — the warehouse locations that become the branch columns
          on the Inventory Days table.</li>
          <li><b><code>vw_dispatch_vs_orders</code></b>, <b><code>sap_wip_data</code></b> and
          <b><code>sap_tpkg_traw_data</code></b> — the Dispatch &amp; WIP tab.</li>
          <li><b><code>primary_secondary_stock</code></b> — the distributor stock reports behind RD Data
          Status.</li>
        </ul>`,
      },
      {
        kind: 'callout',
        tone: 'warn',
        html: `<p><strong>Two things to know before you quote a figure from this dashboard.</strong></p>
        <p><b>1. The Service Measure tab does not respond to the date filter.</b> Its stock figures always
        describe <b>April 2026</b>, whatever dates you pick. Changing the date range at the top of the screen
        will not change anything on that tab.</p>
        <p><b>2. The two accuracy cards on the Summary tab appear to be labelled the wrong way round.</b> The
        card headed “Budget Accuracy TSCL” is showing the IBL figures, and the one headed “Forecast Accuracy
        IBL” is showing the TSCL figures. Do not compare the two until this is settled.</p>
        <p>Both are recorded in Section 6. Neither has been corrected here — this manual describes what the
        dashboard currently does.</p>`,
      },
      {
        kind: 'callout',
        tone: 'neutral',
        html: `<p><strong>How this manual is ordered.</strong> It follows the dashboard exactly. Tabs appear in
        the order of the tab bar, left to right. Inside each tab, items appear in the order you see them — top to
        bottom, then left to right. Nothing has been regrouped to read more neatly, and nothing has been left out
        for being obvious.</p>`,
      },
    ],
  },

  /* ──────────────────────── 2. READING THIS MANUAL ─────────────────────── */
  {
    id: 'legend',
    num: '2',
    title: 'How to Read the Field Tables',
    kicker: 'Section 2',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede">Every field on the dashboard is listed in a table like the ones below. The
        <b>Type</b> tells you at a glance whether a number was read from a system or worked out by the
        dashboard.</p>`,
      },
      {
        kind: 'panel',
        html: `
        <div class="legend">
          <div><span class="chip t-direct">Direct Source</span><span>Read straight from a source system. No arithmetic.</span></div>
          <div><span class="chip t-agg">Aggregated</span><span>Added, counted or averaged from many rows.</span></div>
          <div><span class="chip t-calc">Calculated</span><span>Worked out with a formula — cover days, an accuracy percentage, a variance.</span></div>
          <div><span class="chip t-derived">Derived</span><span>Relabelled or reshaped rather than calculated — a grouping, a fallback, a display format.</span></div>
          <div><span class="chip t-hard">Hardcoded</span><span>Fixed in the dashboard itself, not read from data.</span></div>
          <div><span class="chip t-unconf">Not Confirmed</span><span>On screen, but we could not verify where it comes from or how it is worked out. <b>No formula has been guessed.</b></span></div>
        </div>

        <h4>The one calculation worth learning</h4>
        <p>Almost everything on the first two tabs comes down to this:</p>
        <div class="flow">cover days  =  what the stock is worth  ÷  ( the month's target  ÷  days in the month )</div>
        <p>In plain words: take what is sitting in the warehouse, work out how much we are supposed to sell each
        day, and divide one by the other. The answer is <b>“at this rate, how many days will the stock
        last?”</b></p>
        <p>Then read that answer against the benchmark for its class. <b>Well below</b> the benchmark means you
        risk running out. <b>Well above</b> means money is tied up in stock that is not moving. Both are
        problems; only one of them is obvious.</p>`,
      },
    ],
  },

  /* ─────────────────────── 3. HEADER AND FILTERS ───────────────────────── */
  {
    id: 'chrome',
    num: '3',
    title: 'The Header and Filters',
    kicker: 'Section 3',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede">The header sits above every tab. The filter bar beneath it changes with the tab —
        RD Data Status filters on entirely different things from the other three.</p>`,
      },
      {
        kind: 'layout',
        title: 'What is on the header, left to right',
        items: [
          ['Searle logo', 'brand', 'Top-left corner.'],
          ['“Supply Chain Pulse 1.0”', 'label', 'Under the logo — the dashboard name and version.'],
          ['Tab bar', 'navigation', 'Centre-left. Summary, Service Measure, Dispatch & WIP, RD Data Status — as many as your account has been granted.'],
          ['Your avatar', 'navigation', 'Top-right. Your name, the other dashboards you can open, this manual, Settings and Log out.'],
          ['Filter bar', 'filter', 'Full width, under the header. Its fields change with the tab — see below.'],
        ],
      },
      {
        kind: 'fields',
        title: 'Filters — in screen order',
        rows: [
          ['Classification', 'Product classification', ITEMS, 'classification', 'direct', 'Pick one. Applied to every figure on the first three tabs. On the Service Measure line chart it also reduces the chart to that one class’s line.', 'The A / B / C / N split the whole dashboard is organised around.'],
          ['SKU', 'Stock-keeping unit', ITEMS, 'mapping_code', 'direct', 'Several allowed. Matched on the product code that stock and sales share.', 'Narrows every figure to one or more products.'],
          ['Branches', 'Warehouse location', 'sales_inv_locations', 'inv_sloc', 'direct', 'Several allowed. This is the <b>warehouse</b> the stock sits in, not the branch that made the sale.', 'Which warehouses’ stock is counted.'],
          ['Branch Code / Branch', 'Distributor branch (RD tab only)', 'Franchise data', 'branch_code, branch_desc', 'direct', 'Two lists offering the same branches, one by code and one by name. Shown only on RD Data Status.', 'Which distributor branches are listed.'],
          ['Distributor Code / Distributor', 'Distributor (RD tab only)', 'Franchise data', 'ibl_distributor_code, distributor_desc', 'direct', 'Two lists offering the same distributors, one by code and one by name. Shown only on RD Data Status.', 'Which distributors are listed.'],
          ['Uploaded / Not Uploaded', 'Whether the distributor reported (RD tab only)', 'primary_secondary_stock', '—', 'derived', 'Two options. Narrows the table to distributors who have reported their stock, or to those who have not.', 'The fastest way to build a chase list of who has not reported.'],
          ['Date range', 'The reporting period', 'The dashboard → every report', 'startDate, endDate', 'direct', '<b>Read this carefully, because it does not affect everything equally.</b> Cover days uses the <b>most recent</b> stock count inside your range, not an average across it. Targets always come from the month your <b>end date</b> falls in. And the Service Measure tab ignores these dates altogether — see Section 6.', 'The period every figure is nominally reported for.'],
          ['Apply', 'Commits your changes', '—', '—', 'derived', 'Nothing you choose takes effect until you press this. One button applies the whole bar at once.', 'The dashboard never reloads halfway through your changes.'],
          ['Why a branch selection disappears', 'Filters reset on some tab changes', '—', '—', 'derived', 'Moving to or from RD Data Status clears the branch and distributor selections, and moving to Dispatch &amp; WIP clears the branch.', 'RD branches come from the distributor system and mean nothing to the other tabs. Clearing them stops a filter silently matching nothing.'],
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
        html: `<p class="lede"><b>What this tab is for.</b> The supply position at a glance: the benchmark each
        class is judged against, what has sold, how many days of cover is on hand, and how close the forecast and
        budget turned out to be.</p>
        <p><b>How to read it.</b> Start at the Benchmark card on the left — it tells you what “good” looks like
        for each class. Then read the Cover Days card against it, class by class. A class well under its
        benchmark is a stock-out risk; well over it is capital sitting still. The two cards are meant to be read
        side by side, which is why they sit side by side.</p>`,
      },
      {
        kind: 'layout',
        title: 'What is on screen, top to bottom',
        items: [
          ['Filter bar', 'filter', 'Section 3.'],
          ['Benchmark', 'legend card', 'Row 1, left. Cover Days and No. of SKUs, one row per class: A, B, C, N.'],
          ['Sales Summary', 'card', 'Row 1, centre. One row per class with its SKU count, sales and share, and a Total line.'],
          ['Cover Days', 'card', 'Row 1, right. Total Days plus one row per class, with a TP / EFP switch.'],
          ['Budget Accuracy TSCL', 'gauge + bar chart', 'Row 2, left. A Days Gone / Target panel, a gauge, then a bar chart by class.'],
          ['Forecast Accuracy IBL', 'gauge + bar chart', 'Row 2, centre. The same shape as the card beside it.'],
          ['Forecast Vs Budget %', 'bar chart', 'Row 2, right. One bar per class.'],
        ],
      },
      {
        kind: 'fields',
        title: '2 · Benchmark card',
        rows: [
          ['Class (A / B / C / N)', 'The classification the row describes', ITEMS, 'classification', 'hard', 'The four classes, each with its own colour — the same colour used for that class on every chart and table across the dashboard.', 'Learn these four colours once and every other chart on the dashboard reads faster.'],
          ['Cover Days', 'The benchmark for that class', 'cover_days', 'threshold, effective_date', 'direct', 'The benchmark in force on your selected end date. A class with no benchmark set shows a dash.', 'The bar each class is judged against. An A product is expected to carry different cover from a C, which is why there is no single company-wide number.'],
          ['No. of SKUs', 'How many products are in that class', ITEMS, 'mapping_code, classification', 'agg', 'Counts the products in each class across the <b>whole product range</b>. <code>COUNT(mapping_code)</code> — <b>it is not narrowed by your dates or any filter.</b>', 'The size of each class. Because it ignores the filters, it will not change when you filter the page — unlike the Sales Summary card beside it, which does. See Section 6.'],
        ],
      },
      {
        kind: 'fields',
        title: '3 · Sales Summary card',
        rows: [
          ['Class label', 'The classification the row describes', 'vw_mv_tscl_data_', 'classification', 'direct', 'One row per class, coloured to match the Benchmark card.', 'Ties each sales figure to its class.'],
          ['SKU', 'How many products actually sold', 'vw_mv_tscl_data_', 'item_code', 'agg', 'Counts the distinct products that sold in the period. <code>COUNT(DISTINCT item_code)</code>, ignoring anything that nets to zero.', 'How much of the range moved — a different question from how much money it made. A class can produce good revenue from very few products.'],
          ['Sales', 'Value sold in the period', 'vw_mv_tscl_data_', 'amount, billing_date', 'agg', 'Adds up everything billed in the period for that class. <code>SUM(amount)</code>', 'The revenue each class produced.'],
          ['%', 'That class’s share of the total', 'From the rows above', '—', 'calc', 'The class’s sales as a percentage of the card’s total, to the nearest whole number.', 'The mix — whether the A class is carrying the revenue it is supposed to.'],
          ['Total row', 'The card’s totals', 'From the rows above', '—', 'agg', 'SKU counts and sales added across the rows shown.', 'Lets you check the rows add back up to the whole.'],
        ],
      },
      {
        kind: 'fields',
        title: '4 · Cover Days card',
        rows: [
          ['Total Days', 'Cover days across all classes', `${STOCK} + ${TARGETS}`, 'qty, trade_price; target_value', 'calc', 'What all the stock is worth, divided by what we are meant to sell in a day.', 'How long the whole inventory would last at the planned rate.'],
          ['A / B / C / N / Others — Cover Days', 'Cover days for that class', `${STOCK} + ${TARGETS}`, 'qty, trade_price; target_value', 'calc', 'For each class: what its stock is worth ÷ its daily target, to 1 decimal. <code>SUM(qty × trade_price) ÷ (SUM(target_value) ÷ days in month)</code>. Stock is taken from the <b>most recent count</b> inside your date range, covering business lines <code>P01, P07, P08, P12, P35</code> and warehouse codes starting <code>80</code> plus <code>8206</code> and <code>8210</code>. The target is the month your end date falls in.', 'The headline supply measure. Read each class against its own benchmark on the card to the left — never against another class’s.'],
          ['TP / EFP switch', 'Which value the card uses', STOCK, 'trade_price vs item_cost', 'derived', '<b>TP</b> values the stock at trade price — what it is worth to sell. <b>EFP</b> values the same packs at item cost — what it cost to make. Cover days is reworked against the same daily target either way.', 'The quantity does not change between the two; only what it is worth does. That alone moves the cover-days figure, which surprises people.'],
          ['Inventory value and quantity', 'The figures behind each row', STOCK, 'inv_val, inv_val_efp, quantity', 'agg', 'Shown on each row beside the cover-days number.', 'The actual stock behind the ratio, for when the ratio alone is not enough.'],
          ['Others row', 'Stock with no classification', ITEMS, 'classification IS NULL', 'derived', 'Any stock whose product has not been classified is grouped here rather than dropped, so the class rows and the total still add up.', 'A large Others figure means the product master is incomplete — not that cover is bad. Worth chasing separately.'],
        ],
      },
      {
        kind: 'fields',
        title: '5–6 · The two accuracy cards',
        rows: [
          ['Days Gone', 'How much of the month has passed', 'From your date range', '—', 'calc', 'Days elapsed against the days in the month, shown as <code>gone / total</code>.', 'Makes the gauge readable as ahead or behind. 60% achieved is good on the 18th and poor on the 28th.'],
          ['Target', 'What the gauge is measured against', 'mv_tscl_budget', 'value, target_date', 'agg', 'The budget for the month your end date falls in. <b>There is no fallback</b> — a month with no budget loaded shows 0 rather than borrowing last month’s.', 'A zero here means nothing was loaded, not that the target is zero. Worth checking before reading the gauge as a miss.'],
          ['Gauge value', 'Achievement against target', 'vw_mv_tscl_data_ + mv_tscl_budget', 'sold_qty, amount; value', 'calc', 'Sales achieved against the month’s budget, as a percentage.', 'How close the month is to its number.'],
          ['Bar chart — X axis', 'Classification', ITEMS, 'classification', 'direct', 'One group per class (A, B, C, N), each in its own class colour.', 'Which classes are carrying the accuracy and which are dragging it down.'],
          ['Bar chart — the bars', 'One bar per month', 'Accuracy figures', 'month', 'agg', 'Up to three months side by side, each its own colour. Values print as whole percentages.', 'Accuracy as a trend rather than a single figure — one bad month is not the same as three.'],
          ['Which card is which', 'The two cards appear to be swapped', 'The dashboard', '—', 'unconf', 'The card headed <b>“Budget Accuracy TSCL”</b> is showing the <b>IBL</b> figures, and the card headed <b>“Forecast Accuracy IBL”</b> is showing the <b>TSCL</b> figures.', 'If you compare the two you will read them the wrong way round. Do not quote either until this is settled — see Section 6.'],
        ],
      },
      {
        kind: 'fields',
        title: '7 · Forecast Vs Budget %',
        rows: [
          ['X axis — class', 'Classification, plus a Total', ITEMS, 'classification', 'direct', 'One bar per class in its class colour; Total and anything unrecognised are drawn grey.', 'The class colours stay consistent with every other chart on the page.'],
          ['The bars — “% SKUs”', 'Each class’s contribution', 'Share-of-products figures', '—', 'calc', 'The percentage each class contributes, printed on the bar.', 'How the forecast and the budget compare in shape across the four classes.'],
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
        html: `<p class="lede"><b>What this tab is for.</b> Whether each branch is holding enough stock, class by
        class and product by product. This is the operational heart of the dashboard — a national cover-days
        figure can look healthy while half the branches are empty, and this is the tab that shows it.</p>
        <p><b>How to read it.</b> Work across the Inventory Days table, not down it. Green cells are covered,
        plain ones are not. Then open a class to see which products inside it are thin, and at which branches.</p>`,
      },
      {
        kind: 'callout',
        tone: 'warn',
        html: `<p><strong>This tab does not respond to the date filter.</strong> Every stock figure on it
        describes <b>April 2026</b> and will not change whatever dates you pick at the top of the screen. The
        Service Measure chart and the Inventory Days table are also struck nine days apart from one another.</p>
        <p>Treat this tab as a fixed snapshot until it is corrected. It is recorded in Section 6.</p>`,
      },
      {
        kind: 'layout',
        title: 'What is on screen, top to bottom',
        items: [
          ['Filter bar', 'filter', 'Section 3.'],
          ['Inventory Days Threshold', 'legend card', 'Row 1, left. Each class’s threshold — the same shape as the Summary tab’s Benchmark card.'],
          ['Inventory Days', 'table', 'Row 1, right. Class rows across 14 branch columns plus a Total; each class opens into its products. The first column stays put while the rest scroll.'],
          ['Service Measure by Branch', 'line chart', 'Row 2, left. One line per class across the branches.'],
          ['Cover Days Threshold vs Actual', 'bar chart', 'Row 2, centre. Two bars per class — target and actual.'],
          ['SKUs VS Threshold', 'bar chart', 'Row 2, right. Two bars per class — above and below.'],
        ],
      },
      {
        kind: 'fields',
        title: '2 · Inventory Days Threshold card',
        rows: [
          ['Class (A / B / C / N)', 'The classification the row describes', ITEMS, 'classification', 'hard', 'The same four classes and colours as the Summary tab’s Benchmark card.', 'The key to the colour coding across this tab.'],
          ['Threshold days', 'The benchmark for that class', 'cover_days', 'threshold, effective_date', 'direct', 'The benchmark in force on your selected end date. <b>The same number is used in three places on this tab</b> — this card, the green cells in the table, and the target bar in the chart below.', 'One threshold used everywhere, so the three cannot disagree with each other.'],
        ],
      },
      {
        kind: 'fields',
        title: '3 · Inventory Days table',
        rows: [
          ['Column 1 — Class', 'The classification, or a product when opened', `${ITEMS} + sap_items_detail`, 'classification; matnr_desc', 'direct', 'A class row shows a coloured badge (A, B, C, N) or “Other”. Open it to list that class’s products. The column stays put while the branch columns scroll.', 'Takes you from “class C is thin” to exactly which products are thin, and where.'],
          ['Branch columns (14)', 'Cover days for that class at that branch', `${STOCK} + sales_inv_locations + ${TARGETS}`, 'qty × trade_price; inv_sloc; target_value', 'calc', 'What that branch holds ÷ that branch’s daily target, as a whole number. The table lists a fixed set of 14 branches: Bahawalpur, DSS Korangi, Faisalabad, Gujranwala, Hyderabad, Islamabad, Karachi, Korangi, Lahore, Mingora, Multan, Peshawar, Quetta and Sukkur.', 'Where the cover actually sits. This is the reason the tab exists — a national average hides an empty branch.'],
          ['Total column', 'The row’s average across the branches', 'From the branch columns', '—', 'calc', 'The 14 branch figures added together and divided by 14 — <b>a plain average of the branches</b>, not the cover days of all the stock combined.', 'Two branches at 60 days and twelve at 5 average to about 13 — a figure no branch actually has. Read the branch columns; treat this one as a rough indicator only.'],
          ['Product sub-rows', 'The products inside a class', 'sap_items_detail', 'matnr_desc', 'direct', 'Shown when you open a class row, with the same branch columns.', 'The product-level detail behind the class figure.'],
          ['Green cells', 'A product at or above its threshold', 'From the threshold', '—', 'derived', 'On a product row, a branch cell turns green when it reaches that class’s threshold. Class rows are not coloured.', 'Scan it as a heat map: green is covered, plain is not.'],
          ['Total row', 'The pinned totals line', 'From the rows above', '—', 'calc', 'Printed after the last A/B/C/N row and before the Others row, on a grey band.', 'Separates the classified position from the unclassified tail.'],
          ['Others row', 'Stock with no classification', ITEMS, 'classification IS NULL', 'derived', 'Labelled “Other” and placed after the Total row.', 'A large Others row means the product master is incomplete.'],
        ],
      },
      {
        kind: 'fields',
        title: '4–6 · The three charts',
        rows: [
          ['Service Measure by Branch — X axis', 'Branch', 'sales_inv_locations', 'inv_sloc_desc', 'direct', 'One point per branch.', 'Reads left to right across the branch network.'],
          ['Service Measure by Branch — the lines', 'One line per class', `${STOCK} + ${ITEMS}`, 'classification', 'calc', 'Four lines — one for each of A, B, C and N — in their class colours. <b>Selecting a Classification in the filter bar reduces the chart to that one line.</b>', 'Compares how well each class is served across the branches, rather than blending them into one number that hides the problem.'],
          ['Cover Days Threshold vs Actual — X axis', 'Classification', ITEMS, 'classification', 'direct', 'One pair of bars per class.', 'Benchmark against reality, class by class.'],
          ['Cover Days Threshold vs Actual — target bar', 'The benchmark', 'cover_days', 'threshold', 'direct', 'The same threshold as the card above, drawn first.', 'What the class should be carrying.'],
          ['Cover Days Threshold vs Actual — actual bar', 'The cover actually held', `${STOCK} + ${TARGETS}`, 'qty × trade_price; target_value', 'calc', 'What the class holds ÷ its daily target, drawn second. Both bars print as whole numbers.', '<b>The gap between the two bars is the action.</b> A short actual is a supply risk; a tall one is money tied up.'],
          ['SKUs VS Threshold — X axis', 'Classification', ITEMS, 'classification', 'direct', 'One pair of bars per class.', 'Counts of products rather than days.'],
          ['SKUs VS Threshold — Above / Below', 'How many products clear their threshold', `${STOCK} + ${ITEMS} + cover_days`, 'mapping_code; threshold', 'agg', 'Each product’s cover days is compared with its class threshold and counted as <b>Above</b> (green) or <b>Below</b> (red).', 'A class can show healthy cover days while most of its individual products sit below threshold — a few overstocked lines carry the average. This chart is what catches that.'],
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
        html: `<p class="lede"><b>What this tab is for.</b> The production and fulfilment side: whether what was
        ordered was actually delivered, what is still being made, and what raw and packaging material is held.
        Three tables, no charts.</p>
        <p><b>How to read it.</b> The <b>%</b> column on the first table is the one to scan. A low percentage on
        a large order is the most actionable line on this tab — it means demand was raised and not met.</p>`,
      },
      {
        kind: 'layout',
        title: 'What is on screen, top to bottom',
        items: [
          ['Filter bar', 'filter', 'Section 3. The branch selection is cleared when you open this tab.'],
          ['Dispatch Vs Order', 'table', 'Material Name · Order Qty · Delivery Qty · %'],
          ['WIP', 'table', 'Material Name · WIP Qty · Value'],
          ['RMPM', 'table', 'Material Name · Total Qty · Total Cost'],
        ],
      },
      {
        kind: 'fields',
        title: '2 · Dispatch Vs Order',
        rows: [
          ['Material Name', 'The product ordered', `vw_dispatch_vs_orders + ${ITEMS}`, 'material description', 'direct', 'One row per material, matched to the product master so the page filters apply.', 'What was asked for.'],
          ['Order Qty', 'Quantity ordered', 'vw_dispatch_vs_orders', 'so_quantity', 'agg', 'Adds up the quantity ordered for that material. <code>SUM(so_quantity)</code>', 'Demand raised on the plant.'],
          ['Delivery Qty', 'Quantity actually delivered', 'vw_dispatch_vs_orders', 'deliverd_qty', 'agg', 'Adds up the quantity delivered for that material.', 'Supply that reached the branch.'],
          ['%', 'Delivery against order', 'From the two columns above', '—', 'calc', 'Delivered ÷ ordered, as a percentage.', 'The fill rate. Sort by it and look at the low percentages on large orders first — that is where the unmet demand is.'],
        ],
      },
      {
        kind: 'fields',
        title: '3 · WIP (work in progress)',
        rows: [
          ['Material Name', 'The product being made', 'sap_wip_data', 'material description', 'direct', 'One row per material currently in production.', 'What is being made right now.'],
          ['WIP Qty', 'Quantity in production', 'sap_wip_data', 'quantity', 'agg', 'Taken from the <b>most recent</b> record inside your date range — a snapshot of what is in production now, not a total across the period.', 'Stock that exists but cannot be sold yet. Read it beside a short cover-days figure: relief may already be on its way.'],
          ['Value', 'What that work is worth', 'sap_wip_data', 'value', 'agg', 'From the same snapshot.', 'Capital sitting on the production floor.'],
        ],
      },
      {
        kind: 'fields',
        title: '4 · RMPM (raw and packaging material)',
        rows: [
          ['Material Name', 'The raw or packaging material', 'sap_tpkg_traw_data', 'material description', 'direct', 'One row per material. Where no storage location is recorded it shows <code>NA</code>.', 'The inputs held for production.'],
          ['Total Qty', 'Quantity held', 'sap_tpkg_traw_data', 'quantity columns', 'agg', 'Added across every stock state the material sits in.', 'How much input material is on hand.'],
          ['Total Cost', 'What that material is worth', 'sap_tpkg_traw_data', 'valueunrestricted, valuatedgrblocked, valuequalityinspection, valuereturns, valuestktransferstloc, valuestocktransferplant, valuestockintransit, valueblocked', 'agg', 'Adds up every stock state: freely available, awaiting goods receipt, in quality inspection, returns, moving between storage locations, moving between plants, in transit and blocked. <b>Restricted, blocked and in-transit material is included.</b>', 'This total is <b>not</b> what is available to use. A large blocked or quality-inspection balance inflates it while none of that material can go into production — worth investigating separately.'],
          ['Filters do not apply to this table', 'Why it never changes', '—', '—', 'unconf', 'The branch, SKU and classification filters are not applied to this table.', 'Changing a filter will not change these rows. Recorded rather than corrected — see Section 6.'],
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
        html: `<p class="lede"><b>What this tab is for.</b> Whether distributors are reporting their stock at
        all, and how old the last report is. It answers a data-quality question rather than a supply one — but
        every distributor-stock figure anywhere in OneThunder depends on the answer.</p>
        <p><b>How to read it.</b> Go straight to <b>Days Difference</b> and sort it largest first. That is the
        list of distributors whose figures are stale, and by how much. Use the Uploaded / Not Uploaded filter to
        turn it into a chase list.</p>`,
      },
      {
        kind: 'layout',
        title: 'What is on screen, top to bottom',
        items: [
          ['Filter bar', 'filter', 'Section 3 — this tab swaps in Branch Code, Branch, Distributor Code, Distributor and the Uploaded / Not Uploaded filter.'],
          ['Total Current Stock in Hand', 'stat box', 'Row 1, first of three.'],
          ['Total Previous Stock in Hand', 'stat box', 'Row 1, second.'],
          ['Total Stock in Hand', 'stat box', 'Row 1, third.'],
          ['RD stock table', 'table', 'Fills the rest of the tab. Ten columns, with Export.'],
        ],
      },
      {
        kind: 'fields',
        title: '2–4 · The three stat boxes',
        rows: [
          ['Total Current Stock in Hand', 'Value reported today', 'primary_secondary_stock', 'stock_value, dated', 'agg', 'Adds up what distributors reported <b>today</b>.', 'What distributors have confirmed they are holding right now.'],
          ['Total Previous Stock in Hand', 'Value last reported before today', 'primary_secondary_stock', 'stock_value, dated', 'agg', 'Adds up the most recent report from distributors who have not reported today.', 'The standing position from earlier reports — which, for a distributor who has gone quiet, is the only figure there is.'],
          ['Total Stock in Hand', 'The two together', 'From the two boxes beside it', '—', 'agg', 'The current and previous figures added together.', 'The best available view of distributor stock. Remember part of it is stale — the table below tells you how much.'],
        ],
      },
      {
        kind: 'fields',
        title: '5 · RD stock table — columns in screen order',
        rows: [
          ['RD Name', 'Distributor name', 'primary_secondary_stock', 'distributor_desc', 'direct', 'The name leads the code, because the name is what a reader recognises.', 'Who the row is about.'],
          ['RD Code', 'Distributor identifier', 'primary_secondary_stock', 'ibl_distributor_code', 'direct', '—', 'The code to match against the distributor master.'],
          ['Branch Name', 'The branch serving the distributor', 'primary_secondary_stock', 'branch_desc', 'direct', '—', 'Who is responsible for chasing this distributor.'],
          ['Branch Code', 'Branch identifier', 'primary_secondary_stock', 'branch_code', 'direct', '—', 'The branch code.'],
          ['Current Stock in Hand Units', 'Units reported today', 'primary_secondary_stock', 'stock_qty, dated', 'agg', 'The quantity reported today; 0 if they have not reported.', 'What they say they are holding today.'],
          ['Current Stock in Hand Value', 'Value reported today', 'primary_secondary_stock', 'stock_value, dated', 'agg', 'The value reported today; 0 if they have not reported.', 'The same in money.'],
          ['Previous Stock Date', 'When they last reported before today', 'primary_secondary_stock', 'dated', 'direct', 'The date of the most recent earlier report; blank if they reported today.', 'The date the stale figures actually belong to.'],
          ['Previous Stock Units', 'Units at that earlier date', 'primary_secondary_stock', 'stock_qty', 'agg', 'The quantity from that earlier report.', 'The last known quantity.'],
          ['Previous Stock Value', 'Value at that earlier date', 'primary_secondary_stock', 'stock_value', 'agg', 'The value from that earlier report.', 'The last known value.'],
          ['Days Difference', 'How old the last report is', 'From the date above', 'dated', 'calc', 'Days between today and the last report. <b>0</b> means they reported today.', '<b>The column this tab exists for.</b> A large number means every distributor-stock figure that includes this distributor — anywhere in OneThunder — is out of date by that many days.'],
          ['Uploaded / Not Uploaded', 'How the table is narrowed', '—', '—', 'derived', 'Splits the list into distributors who have reported and those who have not.', 'Turns the table into a chase list in one click.'],
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        html: `<p><strong>This tab always means “today”.</strong> “Current” means today’s date, and Days
        Difference counts back from today. Changing the date range at the top of the screen does not move that
        anchor. That is correct for a “who has reported?” question, but it does mean you cannot use this tab to
        review how things stood on a past date.</p>`,
      },
    ],
  },

  /* ─────────────────────────── 5. DATA FLOW ────────────────────────────── */
  {
    id: 'lineage',
    num: '5',
    title: 'Where Each Number Comes From',
    kicker: 'Section 5',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede">Each line traces one figure from its source system to what you see on screen:
        <b>source → table → field → what happens to it → what you see</b>.</p>`,
      },
      {
        kind: 'panel',
        html: `
        <h4>Cover days — the dashboard’s central measure</h4>
        <div class="flow">SAP stock  →  ${STOCK}  →  qty, trade_price (or item_cost for EFP)
           →  the most recent stock count in your range
           →  business lines P01/P07/P08/P12/P35, warehouses 80* + 8206 + 8210
           →  add up quantity × price                     →  what the stock is worth
Targets    →  ${TARGETS}  →  target_value  →  month of your END date
           →  target ÷ days in the month                  →  what we must sell each day
           →  stock value ÷ daily target                  →  COVER DAYS</div>

        <h4>Benchmarks and thresholds</h4>
        <div class="flow">cover_days  →  the benchmark for each class, in force on your end date
            →  the Benchmark card, the target bar, and the green cells in Inventory Days</div>

        <h4>Classification — used by everything</h4>
        <div class="flow">${ITEMS}  →  product code + classification
                →  matched to stock on the product code
                →  A / B / C / N, unclassified grouped as Others</div>

        <h4>Sales Summary</h4>
        <div class="flow">vw_mv_tscl_data_  →  amount, item_code, classification, billing_date
                  →  add up sales and count distinct products per class
                  →  class ÷ total  →  the % column</div>

        <h4>Accuracy gauges</h4>
        <div class="flow">mv_tscl_budget    →  value  →  month of your end date (no fallback)  →  Target
vw_mv_tscl_data_  →  sold_qty, amount  →  achieved ÷ budget  →  the gauge</div>

        <h4>Branch columns</h4>
        <div class="flow">${STOCK}.subinventory_code  →  sales_inv_locations.inv_sloc
                                    →  the branch name  →  one column per branch</div>

        <h4>Dispatch &amp; WIP</h4>
        <div class="flow">vw_dispatch_vs_orders  →  ordered, delivered  →  delivered ÷ ordered  →  %
sap_wip_data           →  the most recent record            →  WIP quantity and value
sap_tpkg_traw_data     →  every stock-state value column    →  RMPM total cost</div>

        <h4>RD Data Status</h4>
        <div class="flow">primary_secondary_stock  →  stock_qty, stock_value, dated
                         →  split on reported today or not  →  current vs previous
                         →  today − last report date        →  Days Difference</div>`,
      },
    ],
  },

  /* ────────────────────── 6. NOT CONFIRMED REGISTER ────────────────────── */
  {
    id: 'open-items',
    num: '6',
    title: 'Open Questions',
    kicker: 'Section 6',
    blocks: [
      {
        kind: 'prose',
        html: `<p class="lede">Everything on the dashboard is documented above. These are the points where a
        figure does not do what its label implies, or where we could not confirm how it is worked out — and where
        <b>nothing has been guessed</b>. The first two change what the numbers mean and should be treated as
        urgent.</p>`,
      },
      {
        kind: 'fields',
        title: 'Needs confirmation — most important first',
        rows: [
          ['The Service Measure tab ignores your dates', 'The whole of Tab 2', STOCK, 'stock_opening_date', 'unconf', 'Both the Inventory Days table and the Service Measure chart always read <b>April 2026</b> stock, whatever date range you pick. The two are also struck nine days apart from each other.', 'Every figure on that tab describes April 2026. It cannot be used to review any other period, and its two halves need not agree with each other. This is a fault, not a design decision.'],
          ['The two accuracy cards look swapped', 'The gauge cards on Tab 1', 'The dashboard', '—', 'unconf', 'The card headed <b>“Budget Accuracy TSCL”</b> shows the IBL figures; the card headed <b>“Forecast Accuracy IBL”</b> shows the TSCL figures. Either the headings or the figures behind them are the wrong way round.', 'Anyone comparing IBL against TSCL is reading them in reverse. Neither should be quoted until it is settled.'],
          ['Two tabs read different stock counts', 'Summary vs Service Measure', STOCK, 'stock_opening_date vs stock_closing_date', 'unconf', 'The Summary tab’s Cover Days card reads the <b>closing</b> stock count; the Service Measure tab reads the <b>opening</b> one. Whether that difference is intended is not recorded anywhere.', 'The two tabs can show different cover days for the same class on the same day, and both are “right”. Worth aligning or explaining.'],
          ['The Benchmark SKU count ignores the filters', 'The “No. of SKUs” column on Tab 1', ITEMS, 'mapping_code', 'unconf', 'Counted across the whole product range, with no date, class, SKU or branch narrowing applied.', 'It sits beside the Sales Summary card, which <i>does</i> respond to the filters. Reading the two side by side gives a misleading picture of how much of the range sold.'],
          ['The Inventory Days Total is a plain average', 'The Total column on Tab 2', '—', '—', 'unconf', 'Worked out as the 14 branch figures added and divided by 14, so a branch holding almost nothing counts as much as the largest. A stock-weighted figure would divide total stock value by total daily target instead.', 'The Total can sit a long way from every branch it is summarising. Which behaviour is wanted has not been confirmed.'],
          ['The branch list is fixed', 'The 14 columns on Tab 2', '—', '—', 'unconf', 'The table lists a fixed set of 14 branches rather than reading them from the location master.', 'A branch opened upstream will not appear on this table, and the Total still divides by 14.'],
          ['The RMPM table ignores the filters', 'Tab 3', '—', '—', 'unconf', 'The branch, SKU and classification filters are not applied to this table.', 'It shows everything whatever the filter bar says, which reads as a filter that silently failed.'],
          ['RMPM Total Cost includes unusable material', 'The Total Cost column on Tab 3', 'sap_tpkg_traw_data', 'valueblocked, valuequalityinspection, valuestockintransit', 'unconf', 'Blocked, quality-inspection and in-transit material is added into the same total as freely available stock. Whether the business wants one figure or a split could not be determined.', 'Total Cost overstates what is actually available to put into production.'],
          ['What A / B / C / N mean', 'The classification the whole dashboard is built on', ITEMS, 'classification', 'unconf', 'The dashboard passes the letter straight through as a filter. What each class stands for, and how its benchmark was set, is a business definition held outside the dashboard.', 'The entire dashboard is organised around these four letters. Users should be told what they mean before relying on them.'],
          ['Which warehouses count as stock', 'The scope of every inventory figure', STOCK, 'subinventory_code', 'unconf', 'Confirmed as warehouse codes beginning <code>80</code>, plus <code>8206</code> and <code>8210</code>. The business reason for that particular set is not documented.', 'Stock held anywhere else is invisible to this dashboard and will never appear in cover days.'],
          ['Which month the cover-days target comes from', 'Every cover-days figure', TARGETS, 'target_date', 'unconf', 'Confirmed: the target is always taken from the month your <b>end date</b> falls in, whatever range you select.', 'A range crossing a month boundary produces a cover-days figure whose stock and target cover different periods. Keep ranges inside one month where you can.'],
        ],
      },
    ],
  },
];
