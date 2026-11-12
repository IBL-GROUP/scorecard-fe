---
id: PRD-GLOSSARY
title: Supply Chain Pulse glossary
type: product
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Supply Chain Pulse Glossary

One shared vocabulary for product owners, developers and AI agents. When a
spec, ticket or prompt uses one of these words, it means what this page says.

**Sources.** Every definition comes from the repository:
- the end-user manual in `src/features/userManual/manualData.ts` (most
  business definitions; "manual §N" below means its section N);
- the specs under `specs/`;
- `TECHNICAL_DOCUMENT.md` (backend formulas, shared with `scorecard-be`);
- code comments and API field names.

Nothing here is invented. Where the repository does not explain a term, or
explains it in two conflicting ways, the entry says **Unconfirmed** and cites
the GAP that holds the open question. Do not fill those in from general
knowledge. Ask the product owner.

**Status.** `Baseline`. Definitions describe current (as-built) usage. They
become authoritative once the product owner reviews this page (GAP-028).

**Columns.**
- *Term*: the word as users and specs use it.
- *Meaning*: what it means in Supply Chain Pulse.
- *Code / API*: the field, query param, table or symbol it maps to.
- *See*: the governing spec or GAP.

---

## 1. Product, company and systems

| Term | Meaning | Code / API | See |
|---|---|---|---|
| Searle | The company whose supply chain the dashboard reports. Its logo is in the header; the manual page names it "The Searle Company Limited". | `src/pages/UserManual.tsx` | manual §3 |
| OneThunder | The family of dashboards that Supply Chain Pulse belongs to. Users reach every OneThunder dashboard through one portal and one browser origin. | — | [system-context.md](../architecture/system-context.md) |
| Supply Chain Pulse (1.0) | This dashboard. It answers "can we supply what we are selling?". Shown in the header as "Supply Chain Pulse 1.0". | `MANUAL_TITLE`, usage name `DASHBOARD` | [product-overview.md](product-overview.md), BR-USG-001 |
| Scorecard | The repository and backend name for Supply Chain Pulse (`scorecard-fe`, `scorecard-be`, the `/scorecard-dashboard/` path). Users never see the word. | — | [README](../README.md) |
| Sales Pulse / Distribution Pulse | Sibling OneThunder dashboards. Sales Pulse reports what was sold, Distribution Pulse how widely it reached. Reached from the user menu. | — | manual §1, FR-NAV-002 |
| scorecard-fe | This repository: the Supply Chain Pulse front end. Served under `/scorecard-dashboard/`. | Vite `base` | [system-context.md](../architecture/system-context.md) |
| scorecard-be | The backend that computes every metric (SQL on PostgreSQL). This repo only formats its figures. | `VITE_API_BASE_URL` | [supply-chain-metrics.md](../domains/supply-chain-metrics.md) |
| authenticator-be | The backend that redeems handoff tickets, serves permissions, profile and the dashboard list, and records usage. | `VITE_AUTH_API_URL` | [access-and-identity.md](../domains/access-and-identity.md) |
| Portal | The OneThunder login and launch page. Users sign in there and are sent here with a ticket. It owns login, logout and Settings. | `VITE_AUTH_PORTAL_URL` | FR-AUTH-006 |
| SAP | The ERP that stock, WIP, raw-material and item data come from. | `sap_items_detail`, `sap_wip_data`, `sap_tpkg_traw_data` | manual §5 |
| TSCL | A prefix on the budget and its accuracy card ("Budget Accuracy TSCL", `mv_tscl_budget`). It also appears in table names that are **not** the TSCL side (`mv_tscl_spl_targets`, `vw_mv_tscl_data_`, see §8). **What TSCL stands for is Unconfirmed** (GAP-026). | `tscl_*` fields | GAP-026 |
| IBL | The prefix on the target and its accuracy card ("Forecast Accuracy IBL"); the target table `mv_tscl_spl_targets` is called "IBL targets". Also the distributor code (`ibl_distributor_code`). **What IBL stands for is Unconfirmed** (GAP-026). | `ibl_*` fields | GAP-026 |

## 2. Products and classification

| Term | Meaning | Code / API | See |
|---|---|---|---|
| Classification / Class | The A / B / C / N split almost every figure is organised by. Each class has its own benchmark and threshold, so classes are never compared against each other's numbers. **What each letter means, and how its benchmark was set, is Unconfirmed** (GAP-025). | `classification` (repeated param), `vw_items_class.classification` | BR-MET-001, BR-FILT-001 |
| Others | The bucket for products with no classification. Grouped, not dropped, so class rows add up to the total. Labelled "Other" on the Inventory Days table. A large Others figure means the item master is incomplete, not that cover is bad. | `classification IS NULL` | BR-MET-001, manual T1 |
| Class colours | Each of A, B, C and N has one colour used on every card, chart and table. Total and unrecognised classes are grey. | — | manual T1 |
| SKU | Stock-keeping unit: one product. Stock and sales are matched on its mapping code. The SKU filter allows several. | param `sku`, `mapping_code` | FR-FILT-003 |
| Mapping code | The product code stock and sales share. SAP item codes resolve to it through `sap_items_detail` (`mapping_code`, or `matnr` when that is blank). | `vw_items_class.mapping_code` | BR-MET-001 |
| Item code / matnr | A SAP item (material) number, before it is resolved to a mapping code. `/filters` returns options as `item_code` and `item_description`. | `item_code`, `matnr` | DR-FILT-002 |
| Item master | The product reference carrying classification and mapping code. | `vw_items_class` | manual §1 |
| Division | A product grouping offered as a filter. It is **never sent** to an endpoint: choosing divisions (and no SKUs) sends those divisions' SKU codes as `sku`. Also limits the Classification and SKU options. | `filters.division`, `useEffectiveSku` | FR-FILT-005, FR-FILT-006 |
| Effective SKU | The SKU list actually sent: the hand-picked SKUs, or, if none, the chosen divisions' SKUs. | `useEffectiveSku` | FR-FILT-006 |
| Business line | A product line code. Stock figures cover only `P01, P07, P08, P12, P35`. Why those five is not documented (manual §6). | — | BR-MET-008 |
| Material | What Dispatch & WIP calls a product or an input ("Material Name"). | `materialname` | FR-DSP-001 |

## 3. Stock, locations and distributors

| Term | Meaning | Code / API | See |
|---|---|---|---|
| Stock / inventory | Quantity on hand, from the daily stock ledger. Only business lines `P01, P07, P08, P12, P35` and sub-inventories `80%`, `8206`, `8210` count. | `daily_stock_movement_history` | BR-MET-008 |
| Sub-inventory / warehouse code | The storage location stock is recorded in. Codes starting `80`, plus `8206` and `8210`, are in scope; anything else is invisible to the dashboard. The business reason for that set is not documented (manual §6). | `subinventory_code`, `inv_sloc` | BR-MET-008 |
| Stock snapshot | Stock is taken from the **most recent** count inside the date window, not averaged across it. The Summary tab reads the closing count and Service Measure the opening count; whether that difference is intended is not recorded (manual §6). | `stock_closing_date`, `stock_opening_date` | BR-MET-008 |
| Inventory value | What the stock is worth: `qty × trade_price` (TP) or `qty × item_cost` (EFP). | `inv_val`, `inv_val_efp` | BR-MET-002 |
| Branch (Summary, Service Measure) | The **warehouse** the stock sits in, not the branch that made the sale. Options come from `/filters/branches`, de-duplicated by hub branch code. | param `branch`, `sales_inv_locations.inv_sloc`, `hub_branch_code` | FR-FILT-004, manual §3 |
| The 14 branches | The fixed set of branch columns on Inventory Days and Service Measure: Bahawalpur, DSS Korangi, Faisalabad, Gujranwala, Hyderabad, Islamabad, Karachi, Korangi, Lahore, Mingora, Multan, Peshawar, Quetta, Sukkur. Hard-coded in the backend SQL and the front end; a new branch does not appear (manual §6). | `INV_API_BRANCHES` | BR-SVC-001 |
| Hub branch code | The key the branch filter options are de-duplicated on. | `hub_branch_code` | FR-FILT-004 |
| RD | Regional distributor: a distributor that reports its own stock. Only RDs in the active list appear on RD Data Status. | `active_rds_list` | [FEAT-RD](../features/FEAT-RD-rd-data-status-tab.md) |
| Distributor code / RD Code | The identifier of an RD. | `ibl_distributor_code` | DR-RD-001 |
| RD branch (Branch Code / Branch) | The branch serving a distributor, from the distributor (franchise) data. **Not** the warehouse branch above, but it shares the same `filters.branch` state (GAP-020). In 2.0 (BigQuery) it is the **hub branch** (one of the 14) of the distributor's sub-inventory, from `hub_mapping` (decided 12 Nov 2026, data-team question F3). | `branch_code`, `branch_desc` | FR-RD-002, GAP-020 |
| Plant | A production site. A filter inside the WIP and RMPM detail dialogs. | `plant`, `plantname` | FR-DSP-002 |

## 4. Periods, prices and plans

| Term | Meaning | Code / API | See |
|---|---|---|---|
| Date window (From / To) | The reporting period. Default: the 1st of this month to today, local time. To cannot be earlier than From (except on RD Data Status). | `dateFrom`/`dateTo`; params `startDate`, `endDate` | FR-FILT-001, FR-FILT-010 |
| End-date month | The calendar month the To date falls in. Targets and budgets always come from this month, whatever the From date. A window crossing a month boundary mixes periods (manual §6). | — | BR-MET-002 |
| As of date | The single date on RD Data Status. The backend ignores it and always reports today (GAP-006). | param `date` | FR-RD-001 |
| Today | Computed in local time in some places and UTC in others (GAP-009). | `todayIso`, `formatLocal` | GAP-009 |
| Staged / Apply / Clear | Filter changes are staged locally until **Apply** commits them all at once. **Clear** resets to the defaults (GAP-008). | `handleApply`, `handleClear` | FR-FILT-002, FR-FILT-009 |
| TP (trade price) | Stock valued at what it is worth to sell (`qty × trade_price`). Also the basis of IBL sales (`SUM(amount)`). The default on the Cover Days switch. | `trade_price`, display mode `TP` | BR-MET-002, BR-MET-004 |
| EFP | **Two meanings in the repository.** On the Cover Days switch, stock valued at item cost ("what it cost to make", `qty × item_cost`). In Budget Accuracy, sales valued at the `"SALE E.F.P"` price (`sold_qty × SALE E.F.P`). **The expansion of EFP, and whether the two are the same price, are Unconfirmed** (GAP-026). | `item_cost`, `inv_val_efp`; `tscl_efp."SALE E.F.P"` | BR-MET-002, BR-MET-005 |
| Sales | Invoiced sales value in the window. | `vw_mv_tscl_data_.amount` | FR-SUM-002 |
| Target / IBL target | The monthly sales target, per SKU. Cover days and Forecast Accuracy IBL are measured against it. | `mv_tscl_spl_targets.target_value` | BR-MET-002, BR-MET-004 |
| Daily target | The end-date month's target ÷ days in that month. | `daily_target` | BR-MET-002 |
| Budget / TSCL budget | The monthly budget behind Budget Accuracy TSCL. **No fallback**: a month with no budget loaded shows 0, not last month's. It has no branch. | `mv_tscl_budget` | BR-MET-005 |
| Days Gone | The share of the period that has passed, shown as a % pill on each accuracy gauge. `daysGone` runs from From to min(To, today); `totalDays` spans every month the window touches. The docs and the manual describe a single month instead (GAP-012). | `getDaysGone`, `SHOW_DAYS_GONE_COUNT` | BR-SUM-001, FR-SUM-008 |
| Days-gone target / target to date | The target prorated to the days gone, shown beside each gauge. | `target_to_date`, `/forecast-accuracy-monthly/daysgone` | FR-SUM-004, FR-SUM-005 |

## 5. Supply-chain measures

| Term | Meaning | Code / API | See |
|---|---|---|---|
| Cover days | How many days the stock would last at the planned rate: inventory value ÷ daily target, to 1 decimal in the API, shown as whole days. `null` (no target loaded) shows "—", which differs from a real 0. | `cover_days`, `/cover-days` | BR-MET-002, BR-SUM-004 |
| Total cover days | Cover days across all classes, from `/cover-days/total`. If that row is missing, `round(Σ inv_val ÷ Σ daily_target)`. | `/cover-days/total` | FR-SUM-003, BR-SUM-003 |
| Inventory Days | The Service Measure table of cover days per class (and per SKU) per branch. Its **Total** column is a plain average of the 14 branches, not stock-weighted (manual §6). Also used loosely as a synonym for cover days. | `/inventory-days` | FR-SVC-001 |
| Benchmark | The expected cover days for a class, shown on the Summary Benchmark card. Stored in the `days` column of `cover_days`, versioned by `effective_date`; the value in force on the To date applies. `0` or missing means "not set" ("—"). | `cover_days.days`, `benchmarkDays` | BR-MET-003, FR-SUM-001 |
| Threshold | The cover-days line a class's SKUs are judged against on Service Measure (the threshold card, green cells, target bar, above/below counts). Stored in the `threshold` column of `cover_days`, versioned like the benchmark. **A separate number from the benchmark.** | `cover_days.threshold`, `thresholdDays`, `cover_days_tgt` | BR-MET-003, BR-SVC-002 |
| Above / Below threshold | Whether a SKU's cover days exceed its class threshold. Cover days ≥ 9999 do not count as above. | `No Of SKUs > Threshold`, `No Of SKUs < Threshold` | DR-SVC-001, BR-MET-007 |
| Service measure | Per branch: SKUs above their class threshold ÷ targeted SKUs × 100. Also the name of the tab. | `/service-measure` | BR-MET-007, FR-SVC-002 |
| Cover Days Threshold vs Actual | Per class, the threshold beside actual cover days. | `/tgt-vs-actual` | FR-SVC-003 |
| No. of SKUs (Benchmark card) | Products in each class across the **whole range**; not narrowed by any filter (manual §6). | `/total-sku` | FR-SUM-001 |
| SKU count (Sales Summary) | Distinct products that sold in the window, ignoring any that net to zero. Narrowed by the filters. | `COUNT(DISTINCT item_code)` | FR-SUM-002 |
| Share % | A class's sales ÷ total sales × 100, to 1 decimal. | — | BR-SUM-003 |
| Forecast accuracy (IBL) | TP sales in the window ÷ IBL target, as a ratio; the gauge shows it as a %. | `/forecast-accuracy-monthly`, `tsclAccuracy` (sic, see §8) | BR-MET-004, FR-SUM-004 |
| Budget accuracy (TSCL) | EFP sales ÷ TSCL budget, as a ratio. Sales stop the day before the To date (GAP-004). | `/forecast-accuracy-yearly`, `iblAccuracy` (sic, see §8) | BR-MET-005, FR-SUM-005 |
| Category accuracy | The accuracy bars under each gauge: accuracy per class for the three calendar months ending in the To date's month. | `/forecast-accuracy-category-monthly`, `/forecast-accuracy-category-yearly` | FR-SUM-006 |
| Forecast Vs Budget % | Per class plus Total: IBL target ÷ TSCL budget × 100. The manual describes the bars as "% SKUs", each class's contribution; that wording conflicts with the formula (GAP-027). | `/ibl-vs-tscl`, `ibl_vs_tscl_pct` | BR-MET-006, FR-SUM-007 |

## 6. Production and fulfilment (Dispatch & WIP)

| Term | Meaning | Code / API | See |
|---|---|---|---|
| Dispatch Vs Order | Per material: quantity ordered, quantity delivered and delivered ÷ ordered %. | `/dispatch-vs-order`, `so_quantity`, `deliverd_qty` | FR-DSP-001 |
| Delivery % / fill rate | Delivered ÷ ordered, as a percentage. | — | FR-DSP-001 |
| WIP | Work in progress: material currently in production, with quantity and value, from the most recent record in the window. | `/wip`, `sap_wip_data` | FR-DSP-002 |
| Material type | The WIP detail-dialog filter, for example TSCL – Semi Finished, Mfg Finished Goods, Export FG. | `MATERIAL_TYPE_OPTIONS` | FR-DSP-002 |
| RMPM | Raw and packaging (packing) material held for production. The endpoint and file are named `rpm`. | `/rpm`, `src/api/rpm.ts` | FR-DSP-003 |
| Stock type / stock state | The state RMPM stock sits in: unrestricted, awaiting goods receipt, quality inspection, returns, in transfer, in transit, blocked, restricted. Total Cost adds them all, so it is **not** what is available to use (manual §6). | `*_val`, `*_qty`, `total_val` | FR-DSP-003 |
| Date-only queries | WIP and RMPM ignore branch, classification and SKU; they receive only the dates. | `dateOnlyParams` | BR-DSP-001 |

## 7. RD Data Status

| Term | Meaning | Code / API | See |
|---|---|---|---|
| Stock upload / report | A distributor's stock submission. | `primary_secondary_stock` (`data_flag = 'SD'`) | FR-RD-001 |
| Current stock in hand | Stock an RD reported **today**; 0 if it has not. | `stock_qty`, `stock_value` | DR-RD-001 |
| Previous stock in hand | The RD's most recent report before today. | `last_stock_qty`, `last_stock_value`, `last_stock_date` | DR-RD-001 |
| Total stock in hand | Current plus previous. Part of it can be stale. | — | FR-RD-003 |
| Days Difference | Days between today and the RD's last report; 0 means it reported today. | `day_diff` | FR-RD-004 |
| Upload Count (Uploaded / Not Uploaded) | *Uploaded* when today's `stock_qty > 0`, *not uploaded* when it is 0. Applied in the browser. | `uploadCount` | BR-RD-001 |

## 8. Terms that are easy to confuse

| Pair | The difference |
|---|---|
| **Benchmark** vs **Threshold** | Two columns of the same `cover_days` table. Benchmark (`days`) is on the Summary tab; Threshold (`threshold`) drives everything on Service Measure. The manual cites `threshold` for the Benchmark card; the code reads `days` (GAP-027). |
| **IBL** vs **TSCL** | IBL = target (`mv_tscl_spl_targets`), TP sales. TSCL = budget (`mv_tscl_budget`), EFP sales. A `tscl` in a table name does not mean the TSCL side. |
| **`iblAccuracy`** vs **`tsclAccuracy`** | Variable names in `ScorecardDashboard.tsx` are swapped: `iblAccuracy` feeds **Budget Accuracy TSCL** and `tsclAccuracy` feeds **Forecast Accuracy IBL**. The specs say the data matches the card titles; the manual says the figures are swapped (GAP-027). |
| **Target** vs **Budget** | Target is the IBL plan (`mv_tscl_spl_targets`), used by cover days too. Budget is the TSCL plan (`mv_tscl_budget`). Loaded separately; Forecast Vs Budget % compares them. |
| **TP** vs **EFP** | Same quantity, different price. EFP itself has two meanings (§4, GAP-026). |
| **Branch** (warehouse) vs **RD branch** | Warehouse location on Summary and Service Measure; distributor branch on RD Data Status. They share one filter key (GAP-020). |
| **Cover days** vs **Inventory Days** | The measure vs the Service Measure table of it. The Inventory Days Total is a plain branch average, not the cover days of all stock. |
| **No. of SKUs** vs **SKU** count | Whole range, unfiltered (Benchmark card) vs products that sold in the window, filtered (Sales Summary). |
| **Service Measure** (tab) vs **service measure** (figure) | The second tab vs the per-branch % of SKUs above threshold. |
| **RMPM** vs **`rpm`** | The same thing. `rpm` is the endpoint and file name. |
| **Forecast** in names | `forecast-accuracy-yearly` and `forcastAccuracy…` files serve **Budget** accuracy. "Yearly" and "monthly" in endpoint names do not describe the period. |
| **Tab** (dashboard) vs **tab** (browser) | Dashboard tabs are Summary, Service Measure, Dispatch & WIP, RD Data Status. Sessions and usage are per **browser** tab. |
| Tab labels vs ids vs sections | Summary = `supplyChain` = `SUMMARY`; Service Measure = `serviceMeasure` = `SERVICE_MEASURE`; Dispatch & WIP = `dispatchWip` = `DISPATCH_WIP`; RD Data Status = `regionalDistributor` = `RD_DATA_STATUS`. |

## 9. Access, session and dashboard mechanics

| Term | Meaning | Code / API | See |
|---|---|---|---|
| Handoff ticket | A single-use code the portal adds to the URL (`?t=`). The app strips it and exchanges it for a JWT. | `POST /auth/ticket/redeem` | FR-AUTH-001 |
| Session token (JWT) | The token sent as `Authorization: Bearer` to scorecard-be. Kept in sessionStorage, per browser tab. Never put in a URL. | `searle_token_scorecard` | FR-AUTH-002, SEC-AUTH-002 |
| `ot_session_user` | The portal cookie holding the signed-in user id. Empty means signed out; a different id means another user signed in. Missing (local dev) does not end the session. | — | FR-AUTH-007, BR-AUTH-002 |
| Permission code | `ONE_THU.DASHBOARD.SUPPLYCHAIN_PULSE.<SECTION>.VIEW`. A tab shows only with `VIEW` on its section. | `/me/permissions`, `permissionCode` | BR-PERM-001 |
| Section | The part of a permission code naming a tab: `SUMMARY`, `SERVICE_MEASURE`, `DISPATCH_WIP`, `RD_DATA_STATUS`. | `MAIN_TABS` | FR-PERM-004 |
| No access | The screen for a user with no Supply Chain Pulse code. A permissions outage shows the same screen (GAP-021). | `PermissionGate` | FR-PERM-003 |
| Client-side gating | Hiding tabs and skipping their queries. It is **not** security: any valid JWT can call every endpoint (GAP-002). | — | SEC-PERM-001 |
| Load queue | Permitted tabs load one at a time in tab order; the tab on screen loads at once. A filter change restarts the queue. | `useTabLoadQueue` | FR-LOAD-001, FR-LOAD-005 |
| Released / settled | A tab is *released* when its queries may start; a query is *settled* when it has fetched and is not refetching, success or failure. | `useReleaseNextTab`, `isQuerySettled` | FR-LOAD-002 |
| `track` / `enabled` | Every query is registered to its tab with `track()` and gated by that tab's `enabled` flag. | `track`, `QueryOptions` | FR-LOAD-006, DR-LOAD-001 |
| Heartbeat | The usage ping to authenticator-be every 30 s while the browser tab is visible; an `end` beat when hidden. | `POST /usage/heartbeat` | FR-USG-001, FR-USG-002 |
| Export | Downloads a table to Excel (`.xlsx`) and records the download. Total and pinned rows are left out (GAP-024). | `DataTable#handleExport`, `POST /usage/export` | FR-TBL-004, FR-USG-004 |
| Total / pinned row | A table row kept outside sorting and pagination. | `isTotal`, `pinnedTop` | FR-TBL-003 |
| User menu | The avatar menu: display name, other dashboards, User Manual, Settings, Logout. | `UserMenu` | FR-NAV-001 |
| User manual | The in-app, searchable end-user manual at `/usermanual`. | `manualData.ts` | FR-NAV-005 |

## 10. Specification terms

These are defined in the conventions. They are listed here only for lookup.

| Term | Meaning | See |
|---|---|---|
| FR / NFR / BR / DR / SEC / ERR / INT / AC / TC | Requirement types, acceptance criterion and test case. | [CONVENTIONS §2](../CONVENTIONS.md) |
| GAP | A known gap, defect or open question. | [gaps.md](../gaps.md) |
| ADR | Architecture decision record. | [adr/](../architecture/adr/ADR-0001-specification-first.md) |
| `Baseline` / `Proposed` / `Approved` / `Deprecated` | Requirement statuses. `Baseline` is current behaviour, not yet confirmed as intended. | [CONVENTIONS §4](../CONVENTIONS.md) |
| Area | The 2–6 letter code in a requirement ID (`SUM`, `MET`…), registered in CONVENTIONS §3. | [CONVENTIONS §3](../CONVENTIONS.md) |
| `path#symbol` | How a requirement cites the code that implements it. | [CONVENTIONS §5](../CONVENTIONS.md) |

## 11. Supply Chain Pulse 2.0 (executive dashboard)

Terms introduced by PRD v2 and the S1 prototype ([FEAT-EXEC](../features/FEAT-EXEC-executive-dashboard.md)). All are **Proposed** until the S1 review (GAP-031).

| Term | Meaning | Code / API | See |
|---|---|---|---|
| Attainment to date | Sales (or EFP sales) so far as a share of the target (or budget) prorated to today. 100% = on pace. Windows over one month are built month by month. | `attainmentToDate` | BR-EXEC-001, BR-EXEC-002 |
| Projected month-end | Where the month lands if today's daily run-rate holds: (sales ÷ days gone × total days) ÷ month target. | `projectedMonthEnd` | BR-EXEC-001 |
| Run-rate required | Sales needed per remaining day to reach the month target, beside the current daily run-rate. | `runRate` | RV-05 in PRD v2 |
| Coverage index | Total cover days as a share of the target-weighted benchmark. Too low is stock-out risk, too high is excess. | `coverageIndex` | BR-EXEC-004 |
| Excess inventory value | Stock above benchmark cover, valued at cost: max(0, cover − benchmark) × daily target × cost ÷ TP. | `excessByClass` | BR-EXEC-005 |
| Cover shortfall value | Planned sales (TP) that stock cannot cover up to the threshold: (threshold − cover) × daily target. | `shortfallByClass` | BR-EXEC-005 |
| Service level / stock-out risk | Network share of SKUs above (or below) their class threshold, from the above/below counts. | `serviceLevel` | BR-EXEC-006 |
| Fill rate | Delivered ÷ ordered quantity across materials (quantity-based; dispatch rows carry no price). | `fillRate` | BR-EXEC-006 |
| Material on hold | Raw and packing material that cannot be used today (blocked, quality inspection, restricted, returns) as a share of RMPM value. | `rmpmSummary` | BR-EXEC-006 |
| Production completion | Good received quantity ÷ item quantity across WIP production orders. | `wipSummary` | BR-EXEC-006 |
| Supply-chain working capital | Finished goods at cost + WIP value + RMPM value. | `workingCapital` | BR-EXEC-007 |
| Range activation | SKUs that sold ÷ SKUs in the range, per class. | `rangeActivation` | RV-10 in PRD v2 |
| Plan alignment index | The 1.0 Forecast Vs Budget % (IBL target ÷ TSCL budget) with a RAG band. | `ibl_vs_tscl_pct` | BR-MET-006 |
| RD reporting compliance | RDs that reported stock today ÷ all active RDs. | `rdSummary` | BR-EXEC-006 |
| Stale stock value | Last-reported stock value of RDs that have not reported today: distributor stock we cannot currently see. | `rdSummary` | DH-03 in PRD v2 |
| RAG band | The Green / Amber / Red ranges for a KPI, held in one configuration. Shown as colour plus icon plus word (On track / Watch / Act). | `kpiThresholds` | BR-EXEC-008 |
| Top Risks & Opportunities | The ranked exception list on the Overview, built by rules from loaded data. | `buildRisks` | BR-EXEC-009 |
| Operational Detail | The collapsible section at the foot of each 2.0 tab that keeps the 1.0 tables. | `OperationalDetail` | FR-EXEC-011 |
| Detail sheet | The panel that slides in from the right when an item is clicked, showing its detail. Deeper items stack on top (design-system SheetStack). | `DetailLayer` | FR-EXEC-017 |
| Planner view | A switch in the 2.0 user menu. On, the Operational Detail tables open expanded on every tab; off (the default, "executive view"), they open collapsed. Remembered per user. | `setPersona` | FR-EXEC-021 |
| Not available yet | What a 2.0 tile or card says when scorecard-be answers `503 SOURCE_PENDING`: its source table has not been moved to BigQuery yet. Not an error. | `isSourcePending` | FR-EXEC-020 |
| Live mode / demo mode | 2.0 runs on live data through the portal session and scorecard-be v2 (live), or on generated data in the browser with no sign-in (demo, `VITE_DEMO_DATA=true`). | `DEMO_DATA` | FR-EXEC-002, FR-EXEC-019 |
| Chip (local filter) | A dismissible filter set by clicking a chart; it narrows the current tab only. | `ChipBar` | FR-EXEC-012 |
| Demo data | Generated numbers answered in the browser (VITE_DEMO_DATA=true) for the S1 prototype. Not company data. | `demoAdapter` | FR-EXEC-002 |

## Maintaining this page

- A spec, feature or code change that introduces a new business term adds it
  here in the same change.
- Resolving GAP-025, GAP-026 or GAP-027 updates the matching entries and
  removes their **Unconfirmed** marker.
- Keep definitions sourced. Cite the spec, the manual or the GAP.
