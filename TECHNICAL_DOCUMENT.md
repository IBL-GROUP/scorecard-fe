# Technical Document — Searle Scorecard (Supply Chain Pulse 1.0)

**Project:** SEARLE Supply Chain Scorecard
**Components:** `scorecard-be` (API) · `scorecard-fe` (dashboard)
**Last updated:** September 14, 2026 — verified against the code
**Prepared by:** Development Team

> The same document is kept at the project root (`searle-scorecard/`) and in
> `scorecard-fe/`. Setup, environment variables and deployment steps live in
> each component's `README.md`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Access Control](#4-access-control)
5. [Shared Business Rules](#5-shared-business-rules)
6. [Backend API Endpoints](#6-backend-api-endpoints)
7. [Frontend Dashboard](#7-frontend-dashboard)
8. [Filter Bar](#8-filter-bar)
9. [Backend ↔ Frontend Mapping](#9-backend--frontend-mapping)
10. [Branch Reference](#10-branch-reference)
11. [Database Objects](#11-database-objects)
12. [Known Issues](#12-known-issues)

---

## 1. Overview

**Supply Chain Pulse 1.0** is one of the OneThunder BI dashboards. It reports
supply-chain health for the TSCL / IBL business:

- Sales and SKU counts by product classification (A / B / C / N / Others)
- Inventory **cover days** against a monthly target and versioned benchmarks
- **Forecast accuracy** (sales vs IBL target) and **budget accuracy** (EFP
  sales vs TSCL budget)
- Inventory days and **service measure** per branch
- **Dispatch vs order**, **WIP** and **RMPM** (raw & packing material) stock
- **RD Data Status** — whether each regional distributor has uploaded stock
  today

The dashboard has no login of its own. Users sign in on the authenticator
portal and are handed over with a single-use ticket.

---

## 2. Tech Stack

### Backend — `scorecard-be`

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js (ES modules) | 20 (Docker `node:20-alpine`) |
| Framework | Express | ^4.18.2 |
| Database access | Sequelize — raw parameterised SQL only | ^6.35.2 |
| Database | PostgreSQL (`primary_secondary_sales_db`) | — |
| Auth | jsonwebtoken (verify only) | ^9.0.3 |
| Port | `3005` | — |
| Base URL | `/api` | — |

### Frontend — `scorecard-fe`

| Layer | Technology | Version |
|---|---|---|
| UI framework | React | 18.3.1 |
| Language | TypeScript | 5.7.3 |
| Build tool | Vite (`base: /scorecard-dashboard/`) | 6.0.7 |
| Component library | Chakra UI | 3.31.0 |
| Server state | TanStack React Query | 5.62.12 |
| UI state | Redux Toolkit | 2.11.2 |
| HTTP client | Axios | 1.7.9 |
| Routing | React Router | 7.1.3 |
| Charts | Recharts (bar, line, gauge) | 3.7.0 |
| Date picker | React DatePicker | 9.1.0 |
| Excel export | XLSX (SheetJS) | 0.18.5 |
| Serving | nginx (container port `3004`, local dev `5175`) | — |

---

## 3. Architecture

```
Browser ──(ticket ?t=)──> scorecard-fe  /scorecard-dashboard/
   │                          │
   │  redeem ticket, read     │  GET /api/*  (Bearer JWT)
   │  permissions, heartbeat  ▼
   └────────────────> authenticator-be          scorecard-be ──> PostgreSQL
                      (/auth, /me, /usage)      (verifies JWT     primary_secondary_sales_db
                                                 locally)         schema primary_secondary_sales_schm
```

| Host (dev server) | Component |
|---|---|
| `https://dev.onethunder.iblgrp.com/scorecard-dashboard/` | Dashboard (host nginx → container `:3004`) |
| `https://dev-scorecard.onethunder.iblgrp.com/api` | `scorecard-be` (host nginx → `127.0.0.1:3005`) |
| `https://dev-login.onethunder.iblgrp.com/api` | `authenticator-be` |

### Backend

- Every route is a single inline SQL statement run through
  `db.sequelize.query`. There are no ORM models and no response cache.
- `config/create-sequelize.js` wraps each connection:
  - a concurrency limiter (`DB_QUERY_CONCURRENCY`, default 8);
  - slow-query logging (`DB_SLOW_QUERY_MS`, default 5 s);
  - `search_path` pinned on every connection;
  - a 120 s `statement_timeout`.
- A second connection (`DB2_*`, `franchise_db`) is configured and tested at
  startup, but **no route uses it**.
- `GET /` lists every endpoint; `GET /health` is the container healthcheck.

### Frontend

- `main.tsx` nests the providers as QueryProvider → Redux → Chakra →
  `AuthGate` → `PermissionGate` → router.
- There is a single route, `ScorecardDashboard.tsx`, which holds every query,
  derived value and tab.
- Each endpoint has a React Query hook in `src/api/` with a 5-minute
  `staleTime` and `keepPreviousData`, so charts keep their last values while
  new filters load.
- Every hook accepts `{ enabled }`. Queries run only for tabs the user holds
  `VIEW` on (`useCanSeeTab` in `features/salesDashboard/tabs.ts`) — see §4.
- **Tab-by-tab loading** (`useTabLoadQueue`, `useReleaseNextTab`): permitted
  tabs load in tab order. Each tab's queries run together, and the next tab
  starts only after all of them have settled — see §7.

---

## 4. Access Control

| Concern | Where | How |
|---|---|---|
| Session handoff | FE `utils/session.ts` | `?t=<ticket>` → `POST {AUTH_API}/auth/ticket/redeem` → JWT in sessionStorage (`searle_token_scorecard`). No valid token → `{PORTAL}/login?redirect=<url>` |
| Cross-app sign-out | FE `utils/session.ts` | The token is dropped when the portal's `ot_session_user` cookie is empty (logout) or names another user. Re-checked every 60 s and on tab focus |
| API authentication | BE `middleware/auth.js` | Bearer JWT verified with the shared `JWT_ACCESS_SECRET`. Tokens flagged `must_change_password` are rejected. Any `401` sends the browser to the portal |
| Dashboard access | FE `PermissionGate` | `GET {AUTH_API}/me/permissions`. No `ONE_THU.DASHBOARD.SUPPLYCHAIN_PULSE.*` code → *No access* screen |
| Tab access | FE `HeaderActions` | A tab is shown only if `ONE_THU.DASHBOARD.SUPPLYCHAIN_PULSE.<SECTION>.VIEW` is held |
| Query access | FE `ScorecardDashboard`, `FilterBar` | Each query is `enabled` only for users holding its tab's section (benchmarks and SKU/branch filter options: `SUMMARY` or `SERVICE_MEASURE`). A tab the user cannot open sends no requests |
| Usage tracking | FE `utils/usage.ts` | `POST {AUTH_API}/usage/heartbeat` every 30 s while the tab is visible, plus an `end` beat |

| Tab | Section code |
|---|---|
| Summary | `SUMMARY` |
| Service Measure | `SERVICE_MEASURE` |
| Dispatch & WIP | `DISPATCH_WIP` |
| RD Data Status | `RD_DATA_STATUS` |

> Tab permissions are enforced **only in the front end**. The API serves every
> endpoint to any valid token.

---

## 5. Shared Business Rules

### 5.1 Classification

Products are classified through `vw_items_class.mapping_code`:

- Values are **A, B, C, N**, and anything unclassified is grouped as
  **Others**.
- SAP item codes are resolved to their mapping code through
  `sap_items_detail`: `mapping_code`, or `matnr` when the mapping is blank.
- In `daily_stock_movement_history`, non-`F` item codes are cast through
  `bigint` before matching.

### 5.2 Stock scope

Inventory figures read `daily_stock_movement_history` with these rules:

- **Business lines** `P07, P08, P12, P01, P35`.
- **Sub-inventories** `80%`, `8206` and `8210`.
- **Snapshot:** the latest `stock_closing_date` (or `stock_opening_date`,
  where noted) inside the date window.
- **Inventory value** = `qty × trade_price` (TP). EFP inventory value =
  `qty × item_cost`.

### 5.3 Cover days

```
daily_target = SUM(target_value for the month of endDate) ÷ days in that month
cover_days   = inventory value ÷ daily_target            (rounded to 1 decimal)
```

Targets come from `mv_tscl_spl_targets` (IBL targets), filtered to the
**calendar month of `endDate`**.

### 5.4 Benchmarks and thresholds

Table `cover_days` holds, per classification, `days` (benchmark cover days)
and `threshold` (inventory-days threshold):

- Rows are **versioned by `effective_date`**. A change is a new row, so a past
  month keeps the figures it was judged by.
- The figure in force for a date is the latest row with
  `effective_date <= endDate`.
- A `0` or missing value means "not set". The UI shows "—", and nothing counts
  as above that threshold.

### 5.5 Accuracy measures

| Measure | Actual | Target | Formula |
|---|---|---|---|
| Forecast accuracy (IBL) | TP sales `SUM(amount)` from `vw_mv_tscl_data_` | IBL target `mv_tscl_spl_targets`, month of `endDate` | `amount ÷ target` |
| Budget accuracy (TSCL) | EFP sales = `sold_qty × latest "SALE E.F.P"` (`tscl_efp`) | TSCL budget `mv_tscl_budget`, month of `endDate` (no fallback to earlier months) | `amount ÷ budget` |
| Forecast vs Budget % | IBL target | TSCL budget | `ibl_target ÷ tscl_target × 100` |

The EFP price is the latest `tscl_efp` row before the window end. The category
(3-month) version prefers the billing month's own non-zero price, then the
previous month's.

---

## 6. Backend API Endpoints

**Base URL:** `/api` · **Auth:** `Authorization: Bearer <JWT>` on every route
**Response:** `{ success: true, count, data }`, or `{ success: false, message, error }` with HTTP `500`

### Common query parameters

| Parameter | Type | Description |
|---|---|---|
| `startDate` | `YYYY-MM-DD` | Window start (inclusive). Not validated |
| `endDate` | `YYYY-MM-DD` | Window end (inclusive). Also selects the **target month** |
| `classification` | `string` / repeated | `A`, `B`, `C`, `N`, `Others` |
| `sku` | `string` / repeated | Mapping / item codes |
| `branch` | `string` / repeated | Branch (location) codes |

"Filters applied" in the sections below lists which of `classification` /
`sku` / `branch` the SQL actually uses. Parameters not listed are accepted but
ignored.

---

### 6.1 Sales Summary — `GET /api/sales-summary`

Sales per classification for the window.

| Output | Description |
|---|---|
| `classification` | A / B / C / N / Others |
| `sku` | Distinct item codes with non-zero sales |
| `amount` | `SUM(amount)` from `vw_mv_tscl_data_` |

Filters applied: `classification`, `sku`, `branch`. The share % is computed in
the front end.

---

### 6.2 Cover Days — `/api/cover-days`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cover-days` | Per classification: `inv_val`, `inv_val_efp`, `quantity`, `trg_value`, `daily_target`, `cover_days`, `cover_days_efp` |
| GET | `/api/cover-days/total` | The same figures for all classifications combined (one row) |
| GET | `/api/cover-days/closing-inv` | `closing_date` — latest `stock_closing_date` in the stock table. No parameters |
| GET | `/api/cover-days/benchmarks` | Per classification: `days`, `threshold`, `effective_date` in force on `endDate` (default today). Also returns `as_of` |

Filters applied (`/` and `/total`): `classification`, `sku`, `branch` (branch
on both stock and targets). Stock uses the latest closing date in the window
(§5.2); cover days follow §5.3.

---

### 6.3 Forecast Accuracy Monthly (IBL) — `/api/forecast-accuracy-monthly`

| Method | Endpoint | Output |
|---|---|---|
| GET | `/api/forecast-accuracy-monthly` | `amount` (TP sales in window), `target_value` (IBL target for the month of `endDate`), `pct` = amount ÷ target (a ratio, not ×100) |
| GET | `/api/forecast-accuracy-monthly/daysgone` | `target_value` — IBL target with `target_date` between `startDate` and `endDate` (the front end caps `endDate` at today) |

Filters applied: `classification`, `sku`, `branch`. Defaults when omitted:
`startDate=2026-03-01`, `endDate=2026-03-31`.

---

### 6.4 Forecast Accuracy Yearly (TSCL budget) — `GET /api/forecast-accuracy-yearly`

Despite the name, this is **one month**: EFP sales against the TSCL budget for
the month of `endDate`.

| Output | Description |
|---|---|
| `amount` | EFP sales, `startDate` to **`endDate − 1 day`** |
| `target_value` | `SUM(value)` from `mv_tscl_budget` where `target_date` = first of `endDate`'s month (0 if none) |
| `pct` | amount ÷ target, rounded to 2 decimals (a ratio) |

Filters applied: `classification`, `sku`, `branch` on sales and EFP prices;
none on the budget.

---

### 6.5 Forecast Accuracy Category Monthly (IBL) — `GET /api/forecast-accuracy-category-monthly`

Uses **`endDate` only**. The window runs from the 1st of the month two months
before `endDate` up to `endDate` (3 calendar months).

| Output | Description |
|---|---|
| `classification`, `month` | e.g. `A`, `July 2026` |
| `amount`, `target_value` | TP sales and IBL target for that class and month |
| `pct` | amount ÷ target × 100 (2 decimals); 0 when either side is 0 |

Filters applied: `classification`, `sku`, `branch`.

---

### 6.6 Forecast Accuracy Category Yearly (TSCL budget) — `GET /api/forecast-accuracy-category-yearly`

Uses **`endDate` only**. It covers 3 full calendar months, ending with
`endDate`'s month.

| Output | Description |
|---|---|
| `classification`, `month` | e.g. `A`, `July 2026` |
| `amount` | EFP sales (`sold_qty × "SALE E.F.P"`, per-row lateral price lookup — §5.5) |
| `target_value` | `SUM(value)` from `mv_tscl_budget` |
| `pct` | amount ÷ budget × 100 (2 decimals) |

Filters applied: `classification`, `sku`, `branch` on sales; `classification`
and `sku` on the budget.

---

### 6.7 Inventory Days — `GET /api/inventory-days`

Cover days per **classification × item × branch**, pivoted with one column per
branch.

| Output | Description |
|---|---|
| `classification`, `item_desc` | Row keys |
| `bahawalpur` … `sukkur` | Cover days at each of the 14 branches (§10) |
| `total` | Average cover days across the branches with a value |

Filters applied: `classification`, `sku`, `branch`. Targets come from the
month of `endDate`.

> ⚠ The stock snapshot is **hard-coded** to the latest `stock_opening_date`
> between `2026-04-01` and `2026-04-21`. The selected dates do not move it
> (§12).

---

### 6.8 Above / Below Threshold — `GET /api/above-below-threshold`

SKU counts per classification, above and below that class's `cover_days`
threshold (§5.4).

| Output | Description |
|---|---|
| `classification` | A / B / C / N |
| `No Of SKUs > Threshold` | SKUs whose cover days exceed the threshold |
| `No Of SKUs < Threshold` | SKUs at or below it |

- **Universe:** every mapping code in `vw_items_class` with classification
  A/B/C/N. Stock is taken at the latest `stock_opening_date` in the window, and
  targets are summed across all branches.
- **Filters applied:** `sku` and `branch` only. The `classification` filter is
  commented out; the front end filters the rows itself.

---

### 6.9 IBL vs TSCL — `GET /api/ibl-vs-tscl`

| Output | Description |
|---|---|
| `classification` | A, B, C, N, Others, plus a `Total` row |
| `ibl_target` | `mv_tscl_spl_targets`, month of `endDate` |
| `tscl_target` | `mv_tscl_budget`, month of `endDate` |
| `ibl_vs_tscl_pct` | ibl ÷ tscl × 100 (2 decimals) |

Filters applied: `classification` and `sku` on both sides. `branch` applies to
the IBL target only, because the budget has no branch.

---

### 6.10 Service Measure — `GET /api/service-measure`

For each of the 14 branches: the % of SKUs whose cover days exceed their
class's threshold.

| Output | Description |
|---|---|
| `branch` | Branch description (`sales_inv_locations`, " SELL" removed) |
| `SKU-A%`, `SKU-B%`, `SKU-C%`, `SKU-N%` | SKUs above threshold ÷ target SKUs × 100 |

- **Rows:** driven from the **targets** side, so every targeted SKU counts even
  with no stock.
- **Excluded:** cover days ≥ 9999 do not count as above threshold.
- **Filters applied:** `classification`, `sku`, `branch`.

> ⚠ The stock snapshot is **hard-coded** to the latest `stock_opening_date`
> between `2026-04-01` and `2026-04-30` (§12).

---

### 6.11 Target vs Actual — `GET /api/tgt-vs-actual`

| Output | Description |
|---|---|
| `classification` | A / B / C / N |
| `cover_days_tgt` | The `threshold` from `cover_days` in force on `endDate` |
| `cover_days` | Actual cover days (§5.3) from the latest closing stock in the window |

Filters applied: `classification`, `sku`, `branch`.

---

### 6.12 Dispatch vs Order — `GET /api/dispatch-vs-order`

| Output | Description |
|---|---|
| `material_name`, `channel_type` | Row keys |
| `total_order_qty` | `SUM(so_quantity)` |
| `total_delivery_qty` | `SUM(deliverd_qty)` |
| `delivery_pct` | delivered ÷ ordered × 100 |

Source: `vw_dispatch_vs_orders`, `actual_gm_date` within the window. Filters
applied: `classification`, `sku`. **`branch` is ignored.**

---

### 6.13 WIP — `GET /api/wip`

Work-in-progress orders from `sap_wip_data`, at the latest
`record_created_date` in the window.

| Output | Description |
|---|---|
| `storage_loc`, `storage_loc_desc`, `plant`, `plnt_desc` | Location |
| `material_type_description`, `Material Name`, `order_number` | Order |
| `item_qty`, `good_received_qty` | Order and received quantity |
| `Quantity`, `WIP Value` | `SUM(wip)`, `SUM(wip_value)` |

Filters applied: **none** (dates only).

---

### 6.14 RPM (RMPM) — `GET /api/rpm`

Raw & packing material stock from `sap_tpkg_traw_data`, at the latest
`executiondate` in the window.

| Output | Description |
|---|---|
| `materialname`, `producttype`, `plant`, `plantname`, `storagelocation`, `storagelocationname` | Keys |
| `unrestricted_val`, `quality_inspection_val`, `blocked_val`, `restricted_val`, `returns_val`, `stock_in_transit_val`, … | Value by stock type |
| `total_val` | Sum of the ten value columns |
| `unrestricted_qty`, `qualityinspection_qty`, …, `total_qty` | Quantity by stock type |

Filters applied: **none** (dates only).

---

### 6.15 RD Status — `GET /api/rd-status`

Stock uploads (`data_flag = 'SD'`) from `primary_secondary_stock` for RDs in
`active_rds_list`, limited to business lines P07/P08/P12/P01/P35.

| Output | Description |
|---|---|
| `ibl_distributor_code`, `distributor_desc`, `branch_code`, `branch_desc` | RD identity |
| `stock_qty`, `stock_value` | Stock dated **today** (else 0) |
| `last_stock_qty`, `last_stock_value`, `last_stock_date` | Stock from an earlier date (else 0 / null) |
| `day_diff` | Days since that stock date (0 when current) |

- `date` is validated (`YYYY-MM-DD`, else `400`) but **not used**. The response
  always describes today and returns `asOf`.
- There is no server-side filtering; the front end filters the rows.

---

### 6.16 Filters — `/api/filters`

| Method | Endpoint | Output |
|---|---|---|
| GET | `/api/filters` | SKU options: `item_code`, `item_description`, `classification` (from `tscl_sap_targets` + `sap_items_detail`) |
| GET | `/api/filters/branches` | Rows of `mv_scoreboard_hub_mapping`, excluding hub branches `8210` and `8206` (one row per storage location; the UI removes duplicates by `hub_branch_code`) |

`classification` / `sku` are accepted but not applied.

---

### 6.17 Total SKU — `GET /api/total-sku`

`classification`, `count` — the number of mapping codes per classification in
`vw_items_class` (includes N). Filters are accepted but not applied.

---

### 6.18 Me — `GET /api/me`

The caller's identity (login, person, employee, organization), active roles and
permission codes, read live from `organization.*`. **Not used by the
dashboard**, which reads permissions from the authenticator instead.

---

### 6.19 Health & Info

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | public | API name, version, environment, and the live endpoint list |
| GET | `/health` | public | `status`, `timestamp`, `environment` |

**Total:** 23 authenticated `/api` endpoints + 2 public.

---

## 7. Frontend Dashboard

**Main component:** `src/pages/ScorecardDashboard.tsx`
**Layout:** header with tab bar → filter bar → active tab

Tabs appear only for sections the user holds, and only those tabs' queries run
(§4).

### Load order

Permitted tabs load **one tab at a time**, in this order, whichever tab is on
screen:

```
Summary (12 queries) ──all settled──> Service Measure (5) ──> Dispatch & WIP (3) ──> RD Data Status (1)
```

| Rule | Behaviour |
|---|---|
| Within a tab | All of its queries run together |
| Between tabs | The next tab is released once every query of the tabs already released has settled — loaded or failed |
| Tab on screen | Always loads straight away, even ahead of its turn |
| No permission | The tab is skipped; its queries never run |
| Filter change | The queue restarts from Summary |
| Shared query | Cover-day benchmarks load with Summary, or with Service Measure if Summary is not permitted |

Summary's 12 queries: sales summary, total SKU, benchmarks, cover days ×3,
forecast accuracy ×5 and IBL vs TSCL.

Implementation:

- `useTabLoadQueue` / `useReleaseNextTab` live in
  `features/salesDashboard/tabs.ts`.
- In `ScorecardDashboard.tsx`, each query is registered to its tab through
  `track()`.
- The filter bar's RD dropdowns request `/rd-status` only while RD Data Status
  is open.

### Tab 1 — Summary (`supplyChain`)

| Section | Component | Data | Notes |
|---|---|---|---|
| Benchmark | inline card | `/total-sku`, `/cover-days/benchmarks` | SKU count and benchmark cover days per class |
| Sales Summary | `SalesSummaryCard` | `/sales-summary` | Sales and SKUs per class; share % computed client-side |
| Cover Days | `CoverDaysSection` / `CoverDaysCard` | `/cover-days`, `/cover-days/total`, `/cover-days/closing-inv` | Total, A, B, C, N, Others — TP and EFP cover days, inventory value, quantity. "As of" date from `closing-inv` |
| Budget Accuracy TSCL | `ChartCard` (gauge + bars) | Gauge: `/forecast-accuracy-yearly`. Bars: `/forecast-accuracy-category-yearly` | EFP sales vs TSCL budget. The "days gone" target is the monthly budget prorated client-side (budget ÷ days in month × days gone) |
| Forecast Accuracy IBL | `ChartCard` (gauge + bars) | Gauge: `/forecast-accuracy-monthly`. Bars: `/forecast-accuracy-category-monthly`. Days-gone target: `/forecast-accuracy-monthly/daysgone` | TP sales vs IBL target |
| Forecast Vs Budget % | `BarChart` | `/ibl-vs-tscl` | Total, A, B, C, N, Others; each class in its own colour |

"Days gone" is the selected end day, capped at today within the current month.

### Tab 2 — Service Measure (`serviceMeasure`)

| Section | Component | Data | Notes |
|---|---|---|---|
| Inventory Days | `DataTable` (collapsible) | `/inventory-days`, `/cover-days/benchmarks` | Classification rows expand to SKU rows, one column per branch plus Total. `BenchmarkBanner` shows each class's threshold |
| Service Measure by Branch | `ServiceMeasureChart` | `/service-measure` (with filters) + a second call without `branch` | % SKUs above threshold per branch, A/B/C/N |
| Cover Days Threshold vs Actual | `DataTable` | `/tgt-vs-actual` | Threshold vs actual cover days per class |
| SKUs Against Threshold | metric table | `/above-below-threshold` | Filtered to the selected class client-side |

### Tab 3 — Dispatch & WIP (`dispatchWip`)

| Section | Component | Data | Notes |
|---|---|---|---|
| Dispatch Vs Order | `DataTable` | `/dispatch-vs-order` | Material, order qty, delivery qty, % |
| WIP | `DataTable` + `WipDetails` dialog | `/wip` | Dialog filters by material type (e.g. TSCL – Semi Finished, Mfg Finished Goods, Export FG) |
| RMPM | `DataTable` + `RmpmDetails` dialog | `/rpm` | Value and quantity by stock type |

### Tab 4 — RD Data Status (`regionalDistributor`)

| Section | Component | Data |
|---|---|---|
| Totals | stat boxes | Total current, previous and overall stock in hand |
| RD table | `RegionalDistributorTab` | `/rd-status` — distributor, branch name/code, current stock units/value, previous stock date/units/value, days difference |

All tables export to Excel through `DataTable` (`xlsx`).

---

## 8. Filter Bar

Component: `src/components/filter-bar/FilterBar.tsx`. State lives in Redux
(`salesDashboardSlice`). The default window is the **1st of the current month
→ today**.

| Filter | Type | Sent as | Applies to |
|---|---|---|---|
| Date From / Date To | Date pickers | `startDate` / `endDate` | Every data tab |
| Classification | Select | `classification` | Summary, Service Measure |
| SKU | Multi-select (`/filters`) | `sku` | Summary, Service Measure |
| Branches | Multi-select (`/filters/branches`) | `branch` | Summary, Service Measure; sent to Dispatch vs Order, but ignored by the API |
| Branch Code · Branch · Distributor Code · Distributor | Multi-select | — | **RD Data Status only**, applied client-side. Options built from the `/rd-status` rows |
| Upload count | Select | — | **RD Data Status only**: *uploaded* (current stock > 0) or *not uploaded* (0) |

Other parameter rules:

- WIP and RMPM send dates only.
- Dispatch vs Order sends dates and branch.
- `/forecast-accuracy-monthly/daysgone` and the RD status date are capped at
  today.
- The category accuracy and benchmark endpoints receive `endDate`, falling back
  to today.

---

## 9. Backend ↔ Frontend Mapping

| Frontend section | Endpoint(s) | FE hook (`src/api/`) |
|---|---|---|
| Benchmark card | `/total-sku`, `/cover-days/benchmarks` | `useGetTotalSku`, `useGetCoverDaysBenchmarks` |
| Sales Summary | `/sales-summary` | `useGetSalesSummary` |
| Cover Days | `/cover-days`, `/cover-days/total`, `/cover-days/closing-inv` | `useGetCoverDays`, `useGetCoverDaysTotal`, `useGetCoverDaysClosingInv` |
| Budget Accuracy TSCL | `/forecast-accuracy-yearly`, `/forecast-accuracy-category-yearly` | `useGetForecastAccuracyYearly`, `useGetForecastAccuracyCategoryYearly` |
| Forecast Accuracy IBL | `/forecast-accuracy-monthly`, `/forecast-accuracy-monthly/daysgone`, `/forecast-accuracy-category-monthly` | `useGetForecastAccuracyMonthly`, `useGetForecastAccuracyMonthlyDaysGone`, `useGetForecastAccuracyCategoryMonthly` |
| Forecast Vs Budget % | `/ibl-vs-tscl` | `useGetIblVsTscl` |
| Inventory Days | `/inventory-days` | `useGetInventoryDays` |
| Service Measure by Branch | `/service-measure` (×2) | `useGetServiceMeasure` |
| Cover Days Threshold vs Actual | `/tgt-vs-actual` | `useGetTgtVsActual` |
| SKUs Against Threshold | `/above-below-threshold` | `useGetAboveBelowThreshold` |
| Dispatch Vs Order | `/dispatch-vs-order` | `useGetDispatchVsOrder` |
| WIP | `/wip` | `useGetWip` |
| RMPM | `/rpm` | `useGetRpm` |
| RD Data Status | `/rd-status` | `useGetRdStatus` |
| Filter options | `/filters`, `/filters/branches` | `useGetFilters`, `useGetFilterBranches` |
| Permissions | authenticator `/me/permissions` | `usePermissions` |

> In `ScorecardDashboard.tsx` the variable names run opposite to the card
> titles. `iblAccuracy` feeds **Budget Accuracy TSCL**, and `tsclAccuracy`
> feeds **Forecast Accuracy IBL**. The data matches the titles; only the names
> are swapped.

---

## 10. Branch Reference

`/inventory-days` and `/service-measure` report these 14 sales branches. They
are hard-coded in the SQL:

| Branch Code | Branch Name |
|---|---|
| 8006 | Bahawalpur |
| 8018 | DSS Korangi |
| 8019 | Faisalabad |
| 8023 | Gujranwala |
| 8028 | Hyderabad |
| 8029 | Islamabad |
| 8035 | Karachi |
| 8044 | Korangi |
| 8046 | Lahore |
| 8056 | Mingora |
| 8059 | Multan |
| 8070 | Peshawar |
| 8072 | Quetta |
| 8085 | Sukkur |

Other branch scopes:

- **Stock queries** include every sub-inventory matching `80%`, plus `8206`
  and `8210`.
- **The branch filter options** come from `mv_scoreboard_hub_mapping`, minus
  `8206` and `8210`.

---

## 11. Database Objects

Database `primary_secondary_sales_db`, schema `primary_secondary_sales_schm`
(plus `organization` for `/me`).

| Table / View | Used by | Description |
|---|---|---|
| `vw_mv_tscl_data_` | Sales Summary, Forecast Accuracy (all four) | Sales facts: `billing_date`, `item_code`, `classification`, `branch_id`, `amount`, `sold_qty` |
| `mv_tscl_spl_targets` | Cover Days, Forecast Accuracy (IBL), IBL vs TSCL, Inventory Days, Threshold, Service Measure, Tgt vs Actual | IBL targets: `target_date`, `loc_code`, `item_code`, `classification`, `target_value` |
| `mv_tscl_budget` | Forecast Accuracy (TSCL), IBL vs TSCL | TSCL budget: `target_date`, `item_code`, `classification`, `value` |
| `tscl_efp` | Forecast Accuracy (TSCL) | EFP price `"SALE E.F.P"` by `item_code` and `first_date` |
| `daily_stock_movement_history` | Cover Days, Inventory Days, Threshold, Service Measure, Tgt vs Actual | Daily stock: `qty`, `trade_price`, `item_cost`, `subinventory_code`, `busline_code`, opening/closing dates |
| `cover_days` | Benchmarks, Threshold, Service Measure, Tgt vs Actual | Versioned benchmark `days` and `threshold` per classification (`effective_date`) |
| `vw_items_class` | Most endpoints, Total SKU | Mapping code → classification, brand |
| `sap_items_detail` | Inventory Days, Threshold, Service Measure, Filters, RD Status | Item master: `matnr`, `matnr_desc`, `mapping_code`, `busline_id` |
| `sales_inv_locations` | Stock endpoints, Service Measure | Sub-inventory → branch (`inv_sloc`, `inv_sloc_desc`) |
| `tscl_sap_targets` | Filters | Target materials (SKU filter options) |
| `mv_scoreboard_hub_mapping` | Filters (branches) | Hub branch mapping |
| `vw_dispatch_vs_orders` | Dispatch vs Order | Sales-order and delivered quantities by material and GM date |
| `sap_wip_data` | WIP | WIP orders snapshot (`record_created_date`) |
| `sap_tpkg_traw_data` | RPM | Raw/packing material stock by stock type (`executiondate`) |
| `primary_secondary_stock` | RD Status | RD stock uploads (`data_flag = 'SD'`, `dated`) |
| `active_rds_list` | RD Status | Active regional distributors |
| `organization.user_login`, `application_user`, `user_role_assignment`, `app_role`, `role_permission`, `permission`, `person`, `employee`, `organization` | Me | Identity and access model shared with the authenticator |

No longer used (listed in earlier versions of this document):
`mv_target_sales_aggregate_25_26`, `frg_sap_items_detail`,
`frg_dist_metric_prod_mapping`, `vw_sap_tpkg_traw_data`, `locations`,
`sap_locations_abr`.

---

## 12. Known Issues

| # | Area | Issue | Impact |
|---|---|---|---|
| 1 | `/inventory-days`, `/service-measure` | Stock snapshot dates are hard-coded to April 2026 (`2026-04-01`–`04-21` and `04-01`–`04-30`) | The Inventory Days table and Service Measure chart show April 2026 stock against the selected month's targets, whatever dates are picked |
| 2 | Frontend | The load queue waits on whole tabs (§7) | One slow query — e.g. the Service Measure stock query — delays every later tab, unless the user opens that tab directly |
| 3 | Security | Permissions are checked only in the browser (tabs are hidden and their queries skipped) | Any valid token can still call every endpoint directly |
| 4 | `/forecast-accuracy-yearly` | Named "yearly" but covers one month; sales window ends at `endDate − 1 day` | The selected last day's sales are excluded from Budget Accuracy TSCL |
| 5 | Filters | `/above-below-threshold` ignores `classification`; `/dispatch-vs-order` ignores `branch`; `/wip`, `/rpm`, `/total-sku`, `/filters` ignore all filters | Picking those filters does not change those sections (Threshold is filtered client-side) |
| 6 | `/rd-status` | `date` is ignored; data is always as of today | Past dates cannot be reviewed |
| 7 | Validation | `startDate` / `endDate` are not validated; `/forecast-accuracy-monthly` defaults to March 2026 | A missing date gives empty results or a 500 |
| 8 | Backend config | `DB2_*` (`franchise_db`) is connected at startup but unused; its warning about RD Status is wrong | Dead configuration |
| 9 | Frontend | `dailySalesAvg` hook targets `/daily-sales-avg`, which does not exist; TP/EFP toggle is commented out | Dead code |
