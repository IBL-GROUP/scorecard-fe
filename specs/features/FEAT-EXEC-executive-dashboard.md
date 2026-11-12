---
id: FEAT-EXEC
title: Supply Chain Pulse 2.0 executive dashboard
type: feature
area: EXEC
status: Draft
owner: Unassigned
last-reviewed: 2026-11-11
---

# Supply Chain Pulse 2.0 Executive Dashboard

## Overview

Supply Chain Pulse 2.0 adds an executive layer to the same data: a landing
Executive Overview and four domain tabs (Revenue & Plan, Inventory & Working
Capital, Fulfilment & Operations, Distribution & Data Health). Every 1.0 metric
is kept. The source is *Supply-Chain-Pulse-2.0-Executive-Dashboard-PRD-v2.md*
(PRD v2) and story S1 in *Supply-Chain-Pulse-2.0-User-Stories.md*. PRD item IDs
(EX-, RV-, IN-, OP-, DH-) are quoted in the rows below.

This spec covers the **S1 clickable prototype** and its **production build in
stories S3 and S4**. The app uses the new design system copied from
`DSR-test-fe`. In demo mode it runs on generated data in the browser. In live
mode it signs in through the portal, reads permissions from the authenticator
and reads data from scorecard-be v2 (BigQuery, read-only, story S2). Every row
is `Proposed` until the product owner signs it off.

## Goals and Scope

**Goals**

- Let sponsors approve layout, KPIs and RAG bands before development (S1).
- Show every PRD v2 item (74 rows, 65 distinct) and all 36 retained 1.0 metrics.

**In scope**

- The 2.0 shell, five tabs, drill paths, demo data and demo controls.
- The browser-side KPI formulas and RAG evaluation (PRD v2 section 4).

**Out of scope**

- The BigQuery back end itself (story S2, `scorecard-be/v2`) and production
  performance and UAT (S5).
- The 1.0 app, which is unchanged and remains the default build until 2.0 is
  signed off (decision of 11 Nov 2026: 1.0 is removed after the side-by-side
  checks, not before).

## Actors

| Actor | Description |
|---|---|
| Executive sponsor | Reviews the prototype; decides layout, KPIs and bands |
| Planner | Uses the Operational Detail tables kept from 1.0; turns on "Planner view" in the user menu |
| Product owner | Records review decisions in the PRD |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-EXEC-001 | With `VITE_APP_VERSION=2` the app starts the 2.0 shell from `src/v2` only; without it the 1.0 app starts unchanged. Each version is its own chunk and neither imports the other's design system. | Proposed | `src/main.tsx#VITE_APP_VERSION`, `src/v2/main.tsx#mount` | TC-EXEC-001 |
| FR-EXEC-002 | With `VITE_DEMO_DATA=true` every request is answered in the browser by the demo adapter, with the response shapes of `scorecard-be.openapi.json` for all 22 operations; no request reaches scorecard-be and no sign-in is needed. Without it the app runs in live mode (FR-EXEC-019). | Proposed | `src/v2/config/api.ts#DEMO_DATA`, `src/v2/demo/demoApi.ts#demoAdapter`, `src/v2/main.tsx#mount` | TC-EXEC-001 |
| FR-EXEC-003 | The shell shows the five tabs of PRD v2 §3.1 that the user may see, a "Stock as of" stamp coloured by data freshness (EX-11), the "All metrics / 1.0 only" switch (FR-EXEC-024), a light/dark switch, the user menu (FR-EXEC-021) and, in demo mode only, a DEMO DATA badge. The tab is kept in the URL so Back returns to the previous tab and scroll position. | Proposed | `src/v2/shell/Shell.tsx#DataAsOf`, `src/v2/features/tabs.ts#TABS`, `src/v2/features/nav.ts#useActiveTab` | TC-EXEC-005 |
| FR-EXEC-004 | The filter bar offers Period presets (MTD, Last month, QTD, YTD, Custom) and Compare to (previous period, same period LY), which apply at once, plus Division, Class and, under More filters, Branch, which are staged and applied with Apply. Dispatch-only and RD tabs hide the product filters. | Proposed | `src/v2/shell/FilterBar.tsx#FilterBar`, `src/v2/features/store.tsx#StoreProvider` | TC-EXEC-008, TC-EXEC-025 |
| FR-EXEC-005 | Executive Overview shows EX-01 to EX-11 in the zones of PRD v2 §5.2: plan and service tiles, cash and visibility tiles, the Top Risks & Opportunities list and two 6-month trends. Every tile opens its detail sheet (FR-EXEC-017), whose "Open in …" button goes to its domain tab at the matching KPI. | Proposed | `src/v2/pages/OverviewPage.tsx#OverviewPage` | TC-EXEC-002, TC-EXEC-005, TC-EXEC-024 |
| FR-EXEC-006 | Revenue & Plan shows RV-01 to RV-16, including the kept 1.0 Forecast Accuracy IBL and Budget Accuracy TSCL gauges, the Days Gone pill and the Sales Summary card. | Proposed | `src/v2/pages/RevenuePage.tsx#RevenuePage` | TC-EXEC-002, TC-EXEC-003 |
| FR-EXEC-007 | Inventory & Working Capital shows IN-01 to IN-17, including the kept 1.0 Benchmark and threshold values, Cover Days card with TP/EFP switch, Threshold vs Actual and SKUs vs Threshold charts, the service measure as a heatmap with a line-chart toggle, and the full Inventory Days table. | Proposed | `src/v2/pages/InventoryPage.tsx#InventoryPage` | TC-EXEC-002, TC-EXEC-003 |
| FR-EXEC-008 | Fulfilment & Operations shows OP-01 to OP-16, including the kept 1.0 Dispatch Vs Order, WIP and RMPM tables with their plant and material-type filters. WIP and RMPM figures carry a "dates only" marker. | Proposed | `src/v2/pages/FulfilmentPage.tsx#FulfilmentPage` | TC-EXEC-002, TC-EXEC-003 |
| FR-EXEC-009 | Distribution & Data Health shows DH-01 to DH-14, including the kept 1.0 current, previous and total stock-in-hand boxes, the RD table with its 1.0 filters, and a Data Trust panel. | Proposed | `src/v2/pages/DistributionPage.tsx#DistributionPage` | TC-EXEC-002, TC-EXEC-003 |
| FR-EXEC-010 | Each KPI tile shows its value, a RAG status as colour plus icon plus word, its variance against target where one exists, a comparison with the chosen period ("No comparison" when there is none) and a help tooltip with what it means, its formula, its source and its band. | Proposed | `src/v2/components/exec/ExecTile.tsx#ExecTile`, `src/v2/components/exec/Rag.tsx#RagBadge`, `src/v2/constants/help.ts#KPI_HELP` | TC-EXEC-004, TC-EXEC-011 |
| FR-EXEC-011 | Each domain tab ends with collapsible Operational Detail sections holding the 1.0 tables, with search, sort and Excel export. "View details" expands and scrolls to the matching section. They start collapsed (executive view), or expanded when the user has turned on Planner view (FR-EXEC-021); each section remembers its own open or closed state per user. Exports from a section are named after it. | Proposed | `src/v2/components/exec/Panels.tsx#OperationalDetail`, `src/v2/features/store.tsx#isZone4Open` | TC-EXEC-006, TC-EXEC-018, TC-EXEC-024, TC-EXEC-026 |
| FR-EXEC-012 | A dismissible chip narrows one tab only; global filters do not change (PRD rule F4). Chips are set from a detail sheet's "Filter … to this" buttons, and by the Distribution branch-compliance bars. | Proposed | `src/v2/features/nav.ts#useNav`, `src/v2/components/exec/Panels.tsx#ChipBar` | TC-EXEC-005, TC-EXEC-024 |
| FR-EXEC-013 | A tab or tile whose section the user lacks is hidden (tab) or shows a locked placeholder (tile), and its data is never requested. | Proposed | `src/v2/features/data.ts#useDashboardData`, `src/v2/features/tabs.ts#SECTION_OF` | TC-EXEC-009, TC-EXEC-027 |
| FR-EXEC-014 | Queries load tab by tab in tab order, the tab on screen first; a filter change restarts the queue. Each query is enabled only when its tab is released and its section is held. | Proposed | `src/v2/features/data.ts#useDashboardData` | TC-EXEC-012 |
| FR-EXEC-015 | A demo control panel switches the demo scenario (sales ahead/behind/mixed; normal, loading, empty, all-fail or one-fails; fresh or stale; 24 or 6 months of history), acts as another user, and counts which PRD items and retained 1.0 metrics are on the current tab. | Proposed | `src/v2/shell/DemoPanel.tsx#DemoPanel`, `src/v2/demo/scenario.ts#DemoScenario`, `src/v2/features/catalog.ts#PRD_ITEMS` | TC-EXEC-002, TC-EXEC-004, TC-EXEC-007 |
| FR-EXEC-017 | Clicking any item opens its detail in the design-system sheet that slides in from the right (SheetStack): KPI tiles, Top Risks rows, class bars and rows, heatmap cells, channel and Pareto bars, and the rows of the Operational Detail tables. Items are KPI, class, branch, SKU, channel, material, production order, raw or packing material, and distributor. A row inside a sheet opens a deeper sheet on top, with the earlier ones visible to the left and a breadcrumb; Esc or Back goes back one level and a click on the page closes all. Sheets read data already loaded, so they make no extra request, and are full width on phones. | Proposed | `src/v2/features/detail.tsx#DetailProvider`, `src/v2/components/detail/DetailSheets.tsx#DetailLayer`, `src/v2/components/drill/SheetStack.tsx#SheetStack`, `src/v2/components/exec/ExecTile.tsx#openSheet` | TC-EXEC-013, TC-EXEC-024 |
| FR-EXEC-018 | A short message (design-system Notify) confirms when filters are applied and when the demo scenario changes, and says once when any figure fails to load. A rendering error in a tab shows the design-system error screen instead of a blank page; the header and filters stay usable. | Proposed | `src/v2/shell/Shell.tsx#NotifyHost`, `src/v2/shell/FilterBar.tsx#notify`, `src/v2/components/ErrorBoundary.tsx#ErrorBoundary` | TC-EXEC-014 |
| FR-EXEC-016 | When data freshness, plan data loaded or unclassified share is Red, the Overview shows a warning banner linking to Data Health. | Proposed | `src/v2/pages/OverviewPage.tsx#trustRed` | TC-EXEC-010 |
| FR-EXEC-019 | Live mode (S3): nothing renders and no request fires until a portal session exists (the handoff ticket is redeemed, or the stored token is still valid); otherwise the browser goes to the portal to sign in. The user's sections come from the authenticator's permission codes `ONE_THU.DASHBOARD.SUPPLYCHAIN_PULSE.<SECTION>.VIEW`, as in 1.0 (FEAT-AUTH, FEAT-PERM). No permission on the dashboard shows a no-access screen; a permission without any of the four sections shows a no-sections screen. Every API request carries the token; a 401 returns the user to the portal. | Proposed | `src/v2/auth/AuthGate.tsx#AuthGate`, `src/v2/auth/AuthGate.tsx#PermissionGate`, `src/v2/main.tsx#LiveStore`, `src/v2/config/api.ts#redirectToPortal` | TC-EXEC-015, TC-EXEC-023 |
| FR-EXEC-020 | When scorecard-be answers `503` with `code: SOURCE_PENDING` (the source table is not in BigQuery yet), the tiles and cards that need it say "Not available yet" in neutral colours. It is not retried and not reported as a failure; every other figure keeps working. | Proposed | `src/v2/features/data.ts#isSourcePending`, `src/v2/features/derive.ts#LoadError`, `src/v2/components/exec/Panels.tsx#PENDING_TEXT` | TC-EXEC-016 |
| FR-EXEC-021 | The user menu shows who is signed in, a "Planner view" switch that opens Operational Detail expanded on every tab (remembered per user), the other dashboards the user may open (opened with a session ticket) and Sign out. The session carries no executive or planner role, so the user chooses (decision of 11 Nov 2026). Demo mode shows the demo user and the switch only. | Proposed | `src/v2/shell/UserMenu.tsx#UserMenu`, `src/v2/features/store.tsx#setPersona` | TC-EXEC-018 |
| FR-EXEC-022 | Usage tracking as in 1.0 (FEAT-USG): a heartbeat every 30 s while the page is visible, named "Supply Chain Pulse" with the tab on screen, and an export event for every Excel download. Exports include the Total row the table shows (GAP-024). Off in demo mode. | Proposed | `src/v2/features/usage.ts#startUsageTracking`, `src/v2/features/usage.ts#recordExport`, `src/v2/components/data-table/DataTable.tsx#handleExport` | TC-EXEC-019, TC-EXEC-026 |
| FR-EXEC-023 | Shift-click on a cell of the service-level or cover-days heatmap expands Inventory Days, showing only that branch and class (with "Show all"); a plain click opens the branch sheet. A click on a Top 10 Unfulfilled bar sets a material chip and expands Dispatch Vs Order filtered to it. | Proposed | `src/v2/pages/InventoryPage.tsx#focusInvDays`, `src/v2/pages/FulfilmentPage.tsx#openDetail` | TC-EXEC-020, TC-EXEC-024 |
| FR-EXEC-024 | The header has an "All metrics / 1.0 only" switch. "All metrics" (the default) shows every 2.0 item. "1.0 only" keeps the 2.0 layout and tabs but shows only the tiles, cards and Operational Detail sections whose PRD item carries one of the 36 retained 1.0 metrics (PRD v2 §2.4, the `RETAINED_1_0` list). 2.0-only items are hidden, including Top Risks, the Data trust panel and the Overview data-trust banner (FR-EXEC-016). A zone or tile row with nothing left is hidden, and a tile row narrows to the tiles left in it. A tab with no 1.0 item would be hidden; every tab has one today. The choice is remembered per user in the browser. It changes what is shown, not what is loaded (FR-EXEC-014) or who may see it (FR-EXEC-013). Decided by the user on 12 Nov 2026. | Proposed | `src/v2/shell/Shell.tsx#MetricModeSwitch`, `src/v2/features/store.tsx#setMetricMode`, `src/v2/features/catalog.ts#isShown`, `src/v2/features/catalog.ts#anyShown`, `src/v2/components/exec/Panels.tsx#Zone` | TC-EXEC-030, TC-EXEC-031 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-EXEC-001 | Attainment to date (EX-01, EX-03) = sales ÷ target (or budget) prorated to today × 100. Projected month-end (EX-02) = (sales ÷ days gone × total days) ÷ full-month target × 100, for a single month that includes today; a finished month shows the final figure. | Proposed | `src/v2/features/kpis.ts#attainmentToDate`, `src/v2/features/kpis.ts#projectedMonthEnd` | TC-EXEC-004, TC-EXEC-021 |
| BR-EXEC-002 | Windows longer than one month build attainment month by month from the category-accuracy endpoints (PRD rule F1); the running month follows BR-EXEC-010. A multi-month sales total is never divided by one month's target. | Proposed | `src/v2/features/derive.ts#plan`, `src/v2/features/period.ts#categoryCallEnds` | TC-EXEC-008, TC-EXEC-022, TC-EXEC-025 |
| BR-EXEC-003 | Comparison windows (PRD rule F2): previous period = the same length immediately before, or the same days of the previous month for a window inside one month that starts on the 1st; same period last year = both dates minus 12 months. | Proposed | `src/v2/features/period.ts#comparisonWindow` | TC-EXEC-008, TC-EXEC-022, TC-EXEC-025 |
| BR-EXEC-004 | Coverage index (EX-04) = total cover days ÷ target-weighted benchmark × 100, where the weighted benchmark = Σ(benchmark × daily target) ÷ Σ daily target over classes with a benchmark. Others has no benchmark and is left out (GAP-031). | Proposed | `src/v2/features/kpis.ts#weightedBenchmark`, `src/v2/features/kpis.ts#coverageIndex` | TC-EXEC-021 |
| BR-EXEC-005 | Excess inventory (EX-08) per class = max(0, cover days − benchmark) × daily target × (inventory at cost ÷ inventory at TP). Cover shortfall (IN-05) per class below threshold = (threshold − cover days) × daily target. | Proposed | `src/v2/features/kpis.ts#excessByClass`, `src/v2/features/kpis.ts#shortfallByClass` | TC-EXEC-021 |
| BR-EXEC-006 | Service level (EX-05) = SKUs above threshold ÷ all SKUs × 100; stock-out risk (IN-06) is its complement. Fill rate (EX-06) = Σ delivered ÷ Σ ordered quantity. Material on hold (OP-11) = (blocked + quality inspection + restricted + returns) ÷ total RMPM value. Production completion (OP-07) = Σ good received ÷ Σ item quantity. RD compliance (EX-09) = RDs with today's stock > 0 ÷ all RDs. | Proposed | `src/v2/features/kpis.ts#serviceLevel`, `src/v2/features/kpis.ts#fillRate`, `src/v2/features/kpis.ts#rmpmSummary`, `src/v2/features/kpis.ts#wipSummary`, `src/v2/features/kpis.ts#rdSummary` | TC-EXEC-021 |
| BR-EXEC-007 | Working capital (EX-07) = finished goods at cost + Σ WIP value + Σ RMPM total value, at each of the last 6 month-ends. | Proposed | `src/v2/features/kpis.ts#workingCapital`, `src/v2/features/derive.ts#workingCapitalTrend` | — |
| BR-EXEC-008 | RAG bands are the PRD v2 §4.0 proposed defaults, held only in one configuration; no component hard-codes a band. They are not approved business rules (GAP-031). | Proposed | `src/v2/features/kpiThresholds.ts#kpiThresholds`, `src/v2/features/kpiThresholds.ts#ragOf` | TC-EXEC-011, TC-EXEC-021 |
| BR-EXEC-009 | Top Risks & Opportunities (EX-10) applies rules R1–R8 and O1–O2 of PRD v2 §4.1 to data already loaded, lists problems by severity and keeps up to 2 places for opportunities, at most 7 rows. | Proposed | `src/v2/features/kpis.ts#buildRisks`, `src/v2/features/kpiThresholds.ts#riskRules` | TC-EXEC-005, TC-EXEC-021 |
| BR-EXEC-010 | The 6-month attainment trends and the variance by class judge the running month against the plan for the same days as its sales. IBL targets are daily rows and the category call already sums them to endDate, so they are cut only when endDate is after today (days to today ÷ days to endDate). The TSCL budget is one row per month, so the running month's budget is scaled by days gone ÷ days in the month. (Corrected in S3: the prototype's demo data had monthly targets, which hid a double proration on live data.) | Proposed | `src/v2/features/derive.ts#iblShare`, `src/v2/features/derive.ts#budShare`, `src/v2/features/kpis.ts#varianceByClass` | TC-EXEC-017 |
| BR-EXEC-012 | When a plan is not loaded (target or budget 0 or missing), its attainment, variance ("vs pace") and plan alignment show "—" or are left out; they are never shown as 0% or as the full sales amount. | Proposed | `src/v2/features/derive.ts#varBud`, `src/v2/pages/RevenuePage.tsx#alignment` | TC-EXEC-021 |
| BR-EXEC-011 | Class series colours are A blue, B cyan, C magenta, N violet, Others grey, distinct from the RAG colours (GAP-029). | Proposed | `src/v2/constants/classColors.ts#CLS_COLOR` | — |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-EXEC-001 | Every figure comes from the 22 existing scorecard-be operations; comparisons, trends and multi-month plans are extra calls to the same operations with other dates. Numbers may arrive as strings and are coerced; `null` shows "—", never 0. | Proposed | `src/v2/api/types.ts#num`, `src/v2/features/data.ts#buildSpecs` | — |
| DR-EXEC-003 | Dates may arrive as a date (`2026-11-10`, 1.0) or a timestamp (`2026-11-10T00:00:00.000Z`, scorecard-be v2); only the date part is used. Month labels may be padded (`March     2026`) and are parsed without relying on the browser's date parser. | Proposed | `src/v2/features/derive.ts#closing_date`, `src/v2/features/period.ts#monthKeyFromLabel` | TC-EXEC-022 |
| DR-EXEC-002 | Demo data is generated from a seeded random model so the same date always gives the same numbers; it contains no real company data. | Proposed | `src/v2/demo/demoData.ts#DemoModel` | — |

## API / Interface Contracts

- Consumes the 22 operations of [`scorecard-be.openapi.json`](../api/scorecard-be.openapi.json)
  unchanged. In demo mode they are answered by the demo adapter; in live mode by
  scorecard-be v2 at `VITE_API_BASE_URL`, which may answer `503 SOURCE_PENDING`.
- Entry points: `npm run dev:v2` / `build:v2demo` (demo, file `.env.v2demo`) and
  `npm run dev:v2live` / `build:v2live` (live, local back end, file `.env.v2live`).
- Authenticator: `/me/permissions`, `/profile`, `/dashboards/user-reports`,
  `/auth/ticket`, `/usage/heartbeat`, `/usage/export` (as 1.0).

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-EXEC-001 | A failed request shows "Couldn't load" on the tiles and cards that need it; every other tile keeps working. | Proposed | `src/v2/components/exec/ExecTile.tsx#ExecTile`, `src/v2/components/exec/Panels.tsx#CardState` | TC-EXEC-007 |
| ERR-EXEC-003 | A source that is not in BigQuery yet shows "Not available yet", not an error (FR-EXEC-020). | Proposed | `src/v2/components/exec/Panels.tsx#CardState`, `src/v2/components/exec/ExecTile.tsx#FiClock` | TC-EXEC-016 |
| ERR-EXEC-002 | Empty data shows "No data for this selection"; a missing comparison shows "No comparison"; loading shows skeletons. | Proposed | `src/v2/components/exec/Panels.tsx#CardState` | TC-EXEC-007 |

## Security Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| SEC-EXEC-002 | The token lives only in session storage (shared 1.0 session logic) and travels only in the `Authorization` header to scorecard-be and the authenticator, never in a URL. Other dashboards are opened with a single-use ticket. | Proposed | `src/v2/config/api.ts#getToken`, `src/api/account.ts#openDashboard` | TC-EXEC-015, TC-EXEC-023 |
| SEC-EXEC-001 | Demo mode is off unless `VITE_DEMO_DATA=true`, and is labelled on screen. Hiding tabs and tiles is a convenience, not security (SEC-PERM-001). | Proposed | `src/v2/config/api.ts#DEMO_DATA`, `src/v2/shell/Shell.tsx#Shell` | TC-EXEC-001 |

## Non-Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| NFR-EXEC-001 | The layout follows PRD v2 §5.5: no horizontal page scroll at 1440, 1024 or 390 px; the KPI banner wraps to 3 per row on tablet and 1 on phone. | Proposed | `src/v2/components/exec/Panels.tsx#TileRow` | TC-EXEC-011, TC-EXEC-029 |
| NFR-EXEC-002 | Light and dark modes re-colour every chart, table and tile through the design-system colour variables. | Proposed | `src/v2/constants/theme.ts#themeCss` | TC-EXEC-011 |
| NFR-EXEC-003 | WCAG 2.1 AA on every tab in light and dark mode: no automated (axe) AA violations; every control reachable by keyboard (a KPI tile through its title button; scrollable tables focusable); status never by colour alone (RAG marks carry a word or an accessible name); status colours used as text reach 4.5:1. | Proposed | `src/v2/components/exec/ExecTile.tsx#ExecTile`, `src/v2/components/exec/Rag.tsx#RagBadge`, `src/v2/components/exec/Rag.tsx#RagDot`, `src/v2/components/select/MultiSelect.tsx#MultiSelect`, `src/v2/components/data-table/DataTable.tsx#DataTable`, `src/v2/constants/theme.ts#light` | TC-EXEC-028 |

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-EXEC-001 | Given demo mode, when any tab is opened, then no API request leaves the browser and every PRD item for that tab is on screen. | FR-EXEC-002, FR-EXEC-005, FR-EXEC-006, FR-EXEC-007, FR-EXEC-008, FR-EXEC-009 |
| AC-EXEC-002 | Given the demo scenario "behind", then EX-01 shows Red with the word "Act"; given "ahead", it shows Green with "On track". | FR-EXEC-010, BR-EXEC-001, BR-EXEC-008 |
| AC-EXEC-003 | Given YTD, then Sales attainment to date is built month by month and stays near 100% while the 1.0 gauge, which divides by one month's target, carries a warning. | BR-EXEC-002, FR-EXEC-006 |
| AC-EXEC-004 | Given a user with only Dispatch & WIP, then only Overview and Fulfilment tabs show, and Overview tiles from other sections are locked. | FR-EXEC-013 |
| AC-EXEC-005 | Given live mode and a valid session, when any tab is opened, then every PRD item for that tab is on screen with live data, and items whose source is still missing say "Not available yet". | FR-EXEC-019, FR-EXEC-020 |
| AC-EXEC-006 | Given Planner view on, when the page is reloaded, then Operational Detail sections open expanded; with it off they open collapsed. | FR-EXEC-011, FR-EXEC-021 |
| AC-EXEC-007 | Given "1.0 only" in the header, when any tab is opened, then every item on screen carries a 1.0 metric and every 1.0 item of that tab is there; after a reload the choice is kept; "All metrics" brings every item back. | FR-EXEC-024 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-EXEC-001 | Build with `npm run build` and with `npm run build:v2demo`; open the 2.0 build and watch the network | Both build; 1.0 is the default; in 2.0 no request goes to an API host | FR-EXEC-001, FR-EXEC-002, SEC-EXEC-001 | Manual |
| TC-EXEC-002 | Open each tab; read the coverage count in the demo panel | 11/11, 16/16, 17/17, 16/16, 14/14 PRD items | FR-EXEC-005, FR-EXEC-006, FR-EXEC-007, FR-EXEC-008, FR-EXEC-009, FR-EXEC-015 | Manual |
| TC-EXEC-003 | Use PRD v2 §2.4 as a checklist on each tab (demo panel "1.0 metrics on this tab") | All 36 retained metrics present | FR-EXEC-006, FR-EXEC-007, FR-EXEC-008, FR-EXEC-009 | Manual |
| TC-EXEC-004 | Demo panel: Sales against plan = Ahead, then Behind | EX-01 On track, then Act | FR-EXEC-010, BR-EXEC-001, FR-EXEC-015 | Manual |
| TC-EXEC-005 | Click an Overview tile, then "Open in …" in its sheet; press Back. Click a Top Risks row about a branch. Use "Filter … to this" in a sheet | Correct tab and KPI; Back restores Overview; the branch sheet opens; the chip is set | FR-EXEC-003, FR-EXEC-005, FR-EXEC-012, BR-EXEC-009 | Manual |
| TC-EXEC-006 | Click "View details" on a chart; switch to Planner | The matching table expands; planners see all sections expanded | FR-EXEC-011 | Manual |
| TC-EXEC-007 | Demo panel: Loading, Empty, Error, One fails | Skeletons; empty cards; error cards; only dispatch-based figures fail | ERR-EXEC-001, ERR-EXEC-002, FR-EXEC-015 | Manual |
| TC-EXEC-008 | Choose each period preset and both comparisons; set History = 6 months and compare with LY | Labels and values update; YTD attainment built per month; "No comparison" without history | FR-EXEC-004, BR-EXEC-002, BR-EXEC-003 | Manual |
| TC-EXEC-009 | Demo panel: grant only Dispatch & WIP | Overview and Fulfilment only; other Overview tiles locked; no Summary requests | FR-EXEC-013 | Manual |
| TC-EXEC-010 | Demo panel: Data quality = Stale | Freshness Red; Overview banner shown | FR-EXEC-016 | Manual |
| TC-EXEC-011 | View every tab at 1440, 1024 and 390 px in light and dark; open 10 help icons | No horizontal scroll; readable in both themes; help shows formula, source and band | NFR-EXEC-001, NFR-EXEC-002, FR-EXEC-010, BR-EXEC-008 | Manual |
| TC-EXEC-014 | Demo panel: One fails; then press Apply on a filter change; change the scenario | A message for the failed figures, one for Apply, one for the scenario | FR-EXEC-018 | Manual |
| TC-EXEC-012 | Open Overview and watch requests; change a filter | Overview requests first, other tabs afterwards one by one; queue restarts on change | FR-EXEC-014 | Manual |
| TC-EXEC-015 | Live build (`npm run build:v2live`) with scorecard-be v2: open with a valid session holding all four sections; then one holding no section; then one with no permission | Every tab loads live data; no-sections and no-access screens; no request before the session is confirmed | FR-EXEC-019, SEC-EXEC-002 | Manual |
| TC-EXEC-016 | A `503 SOURCE_PENDING` answer is detected as "not available yet"; other failures stay errors | As stated | FR-EXEC-020, ERR-EXEC-003 | `src/v2/features/data.test.ts` |
| TC-EXEC-017 | The running month's IBL target is not prorated twice; a target covering more days than the sales is cut to the same days | Variance −10 and 40 in the test | BR-EXEC-010 | `src/v2/features/kpis.test.ts` |
| TC-EXEC-018 | Revenue tab as an executive; turn on Planner view in the user menu; reload | Collapsed, then expanded, still expanded after reload | FR-EXEC-011, FR-EXEC-021 | Manual |
| TC-EXEC-019 | Expand Dispatch Vs Order and export it to Excel | File named after the section, ending with the Total row; one export event sent | FR-EXEC-022 | Manual |
| TC-EXEC-020 | Shift-click a heatmap cell; click a Top 10 Unfulfilled bar | Inventory Days expands showing that branch and class; Dispatch Vs Order expands filtered to the material | FR-EXEC-023 | Manual |
| TC-EXEC-021 | KPI engine unit tests: attainment, projection, multi-month YTD, Top Risks ranking, RAG band edges, excess, shortfall, weighted benchmark, fill rate, material on hold, RD compliance and age buckets (the unit cases of stories S3 and S4) | All pass | BR-EXEC-001, BR-EXEC-004, BR-EXEC-005, BR-EXEC-006, BR-EXEC-008, BR-EXEC-009, BR-EXEC-012 | `src/v2/features/kpis.test.ts` |
| TC-EXEC-022 | Period unit tests: comparison windows (rule F2), category calls for QTD and YTD (rule F1), days gone, padded month labels | All pass | BR-EXEC-002, BR-EXEC-003, DR-EXEC-003 | `src/v2/features/period.test.ts` |
| TC-EXEC-023 | End-to-end (story S5): arrive with a portal ticket; arrive with neither session nor ticket | Ticket redeemed once and removed from the URL, Overview loads; otherwise the browser goes to the portal sign-in with a return address | FR-EXEC-019, SEC-EXEC-002 | `e2e/navigation.spec.ts` |
| TC-EXEC-024 | End-to-end (story S5): each Overview tile → "Open in …" → Back; each Top Risks row; heatmap shift-click; Pareto bar; Distribution branch bar and chip; every "View details" | Right tab and KPI on screen, Back returns; chips set and cleared; the matching Operational Detail opens, filtered | FR-EXEC-005, FR-EXEC-011, FR-EXEC-012, FR-EXEC-017, FR-EXEC-023 | `e2e/navigation.spec.ts` |
| TC-EXEC-025 | End-to-end (story S5): every period preset with both comparisons | Current and comparison windows requested (as ranges or month-end calls), comparison label shown, nothing fails, no console errors | FR-EXEC-004, BR-EXEC-002, BR-EXEC-003 | `e2e/data.spec.ts` |
| TC-EXEC-026 | End-to-end (story S5): export every table in every Operational Detail section | Each file downloads; it ends with the Total row whenever the table shows one; one export event per file | FR-EXEC-011, FR-EXEC-022 | `e2e/data.spec.ts` |
| TC-EXEC-027 | End-to-end (story S5): users holding each single section, all four, and none | Right tabs; locked tiles for missing sections; no request for a section not held; no-access screen and no data request with none | FR-EXEC-013 | `e2e/data.spec.ts` |
| TC-EXEC-028 | Accessibility (story S5): axe WCAG 2.1 A/AA on every tab in light and dark; keyboard pass; RAG marks labelled | No violations; tabs, presets and tiles reachable, Enter opens a tile; every RAG mark has a word | NFR-EXEC-003 | `e2e/a11y.spec.ts` |
| TC-EXEC-029 | Layout (story S5) at 1440, 1024 and 390 px, in Chrome and Edge | No horizontal page scroll on any tab; no KPI tile narrower than 140 px (150 px on phone) | NFR-EXEC-001 | `e2e/a11y.spec.ts` |
| TC-EXEC-030 | Metric mode unit tests: which PRD IDs "1.0 only" keeps, "All metrics" keeps everything, every tab keeps a 1.0 item, a zone of 2.0-only items is empty | All pass | FR-EXEC-024 | `src/v2/features/catalog.test.ts` |
| TC-EXEC-031 | End-to-end, on every tab: switch to "1.0 only", reload, switch back to "All metrics" | Only 1.0 items, and all of the tab's 1.0 items, are on screen; five tabs stay; the choice survives the reload; "All metrics" restores every item; no console errors | FR-EXEC-024 | `e2e/metric-mode.spec.ts` |
| TC-EXEC-013 | Click the Service level tile, then a branch row, then a SKU row; press Esc twice; click a WIP row and an RD row; repeat at 390 px | Sheets stack three deep with a breadcrumb; Esc steps back; order and distributor sheets open; full width on phone | FR-EXEC-017 | Manual |

## Dependencies

- PRD v2 and story S1 (outside the repo, `D:\Arslan Fareed\Docs`).
- Design system copied from `DSR-test-fe` into `src/v2/components`,
  `src/v2/theme` and `src/v2/constants/theme.ts`: every component that does
  not depend on Sales Pulse data or state (35 of 50 files and folders; the
  rest are Sales Pulse screens). Local changes: `ChartCard` (`dataKpi`, hidden by
  "1.0 only" per FR-EXEC-024),
  `DataTable` (`autoTotal`, scorecard header help), `SheetStack` (full width
  on phones). Help keys the copied cards need are in `src/v2/constants/help.ts#HELP`.
- [FEAT-LOAD](FEAT-LOAD-load-queue.md) (same load-queue behaviour),
  [FEAT-PERM](FEAT-PERM-permissions.md) (sections), [FEAT-FILT](FEAT-FILT-filter-bar.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-029 | PRD asks to keep 1.0 class colours and never reuse RAG colours; 1.0's B and C are green and amber |
| GAP-030 | The kept 1.0 accuracy gauges overstate over multi-month windows |
| GAP-031 | RAG bands, risk rules and the Others/benchmark treatment are proposed defaults, not approved |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-11 | S1 prototype: 2.0 shell, five tabs, demo data; all rows Proposed | Claude Code (story S1) | — |
| 2026-11-11 | Reusable design-system components brought in (Select, DatePicker, ErrorBoundary, Notify, charts, search, breakdown, highlights, brand); custom dates, WIP/RMPM filters and the Overview working-capital chart use them (FR-EXEC-018, TC-EXEC-014) | Claude Code (story S1) | — |
| 2026-11-11 | Detail sheets from the new design system: clicking any item opens a stacked right-hand sheet (FR-EXEC-017, TC-EXEC-013); FR-EXEC-005, FR-EXEC-012 and TC-EXEC-005 updated | Claude Code (story S1) | — |
| 2026-11-11 | Stories S3 and S4: live mode (portal session, authenticator permissions, scorecard-be v2), "Not available yet" for missing BigQuery sources, Planner view in a user menu, usage tracking and export events, Total row in exports, heatmap Shift-click and Pareto click to the detail tables, Vitest unit tests. Added FR-EXEC-019…023, BR-EXEC-012, DR-EXEC-003, ERR-EXEC-003, SEC-EXEC-002, AC-EXEC-005…006, TC-EXEC-015…022. Changed FR-EXEC-002, 003, 011 and BR-EXEC-002, 010 (pace rule corrected for daily IBL targets). All Proposed | Claude Code (stories S3, S4) | — |
| 2026-11-12 | Story S5: Playwright end-to-end suite on the live build with stubbed services (TC-EXEC-023 to TC-EXEC-029); NFR-EXEC-003 (WCAG 2.1 AA) added and the axe findings fixed: status colours good/warn/target darkened for 4.5:1 text, KPI tiles keyboard-operable through their title button, labelled filter selects, RAG dots with role img, list markup of Top Risks, focusable table scroll areas. Contract: `Error.error` described (2.0 back end returns a reference, never SQL, for unexpected failures) | Claude Code (story S5) | — |
| 2026-11-12 | "All metrics / 1.0 only" switch in the header (user request; the user chose to hide 2.0-only cards and to remember the choice, default "All metrics"). Added FR-EXEC-024, AC-EXEC-007, TC-EXEC-030 and TC-EXEC-031; FR-EXEC-003 lists the switch. Proposed | Claude Code | — |
