---
id: REG-GAPS
title: Known gaps, ambiguities and defects
type: register
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Gaps Register

This register lists current behaviour that is wrong, ambiguous, undocumented or
unconfirmed. Specs link these entries instead of treating the behaviour as a
requirement. An entry is closed by a stakeholder decision, recorded in the
`Resolution` column and in the spec it affects.

**Types:** `Defect` (confirmed wrong), `Suspected defect` (looks wrong and needs
confirmation), `Ambiguity` (intent unknown), `Doc drift` (documentation
disagrees with code), `Tech debt`, `Security`.

**Statuses:** `Open`, `Needs decision`, `Accepted` (known and tolerated),
`Resolved`.

| ID | Type | Area | Summary | Current behaviour (evidence) | Question / intended behaviour | Status | Resolution |
|---|---|---|---|---|---|---|---|
| GAP-001 | Defect | SVC | Inventory Days and Service Measure ignore the selected dates for stock | `scorecard-be` hard-codes the stock snapshot to April 2026 (`2026-04-01`–`04-21` / `04-30`). See TECHNICAL_DOCUMENT §6.7, §6.10 and §12 #1 | Stock should follow the selected window, as cover days do. Confirm with the backend owner | Open | — |
| GAP-002 | Security | PERM | Tab permissions are enforced only in the browser | `scorecard-be` serves every `/api` endpoint to any valid JWT. The frontend hides tabs and skips their queries (`src/api/permissions.ts`) | Should `scorecard-be` enforce `SUPPLYCHAIN_PULSE.<SECTION>.VIEW` per endpoint? | Needs decision | — |
| GAP-003 | Tech debt | LOAD | One slow query holds back every later tab | The load queue releases a tab only after every query of earlier tabs has settled (`src/features/salesDashboard/tabs.ts`) | Is per-query release, or a timeout, acceptable? | Accepted | Documented limitation (README Known Issues) |
| GAP-004 | Ambiguity | SUM | Budget Accuracy (TSCL) excludes the last selected day's sales | `/forecast-accuracy-yearly` sums sales from `startDate` to `endDate − 1 day` (`scorecard-be` `routes/routes.forcast.accuracy.yearly.js`) | Is the one-day lag intentional (for example, EFP data lands a day late)? | Needs decision | — |
| GAP-005 | Ambiguity | FILT | Some sections ignore filters the bar lets the user set | `/above-below-threshold` ignores `classification` (filtered client-side). `/dispatch-vs-order` is sent `branch` but ignores it. `/wip` and `/rpm` get dates only. `/total-sku` and `/filters` ignore filters | Should those sections honour the filters, or should the bar hide them on those sections? | Needs decision | — |
| GAP-006 | Ambiguity | RD | RD Data Status cannot show past dates | The frontend sends `date` (the To date, capped at today), but `/rd-status` ignores it and always reports today (`src/api/rdStatus.ts#rdStatusDate`) | Should a past "As of" date be supported, or should the date picker be removed on this tab? | Needs decision | — |
| GAP-007 | Defect | MET | Backend does not validate dates and has a stale default | `startDate`/`endDate` are not validated. `/forecast-accuracy-monthly` defaults to March 2026 when they are omitted (TECHNICAL_DOCUMENT §12 #7) | Dates must be required and validated (`400` on bad input) | Open | — |
| GAP-008 | Suspected defect | FILT | **Clear** can leave the filter bar out of step with the applied filters | `handleClear` sets the local From/To dates to `''`, while `resetFilters` restores this month's dates in Redux. The re-sync effect fires only if the Redux values changed, so the pickers can stay blank. A later **Apply** then sends no dates. Clear also never resets the local Branch name, Distributor name or Upload-count selections (`src/components/filter-bar/FilterBar.tsx#handleClear`) | Should Clear restore the default dates and reset every RD filter? | Needs decision | — |
| GAP-009 | Suspected defect | FILT | "Today" is computed in UTC in some places and in local time in others | Default filter dates use local time (`salesDashboardSlice.ts#formatLocal`). The days-gone cap, the RD date cap and the benchmark fallback use `new Date().toISOString()` (UTC) (`src/pages/ScorecardDashboard.tsx#todayIso`, `src/api/rdStatus.ts#rdStatusDate`). In Pakistan (UTC+5) "today" is yesterday between 00:00 and 05:00 | All "today" calculations should use one time zone. Which one, local or Asia/Karachi? | Open | — |
| GAP-010 | Doc drift | SUM | TECHNICAL_DOCUMENT says the Budget Accuracy days-gone target is prorated in the browser | The backend now returns `target_to_date`, prorated across every month the window touches, and the frontend displays it (`ScorecardDashboard.tsx#iblDaysGoneInfo`). The frontend also sends a `date` parameter that the backend does not read | Update TECHNICAL_DOCUMENT §7. Drop the unused `date` parameter? | Open | — |
| GAP-011 | Doc drift | FILT | README and TECHNICAL_DOCUMENT miss recent features | Not documented: the Division filter (`src/api/filters.ts#useEffectiveSku`); Classification is now **multi**-select; the `/usermanual` route; the user menu and dashboard switcher (`src/api/account.ts`); export tracking (`/usage/export`); env vars `VITE_DASHBOARD_ORIGIN`, `VITE_DASHBOARD_URLS`, `VITE_USER_MANUAL_URL` | Update README and TECHNICAL_DOCUMENT, or point them at these specs | Open | — |
| GAP-012 | Doc drift | SUM | "Days gone / total days" is defined differently in the docs and the code | TECHNICAL_DOCUMENT §7 says the window is the end date's month. The code's `totalDays` covers every month the window touches (`ScorecardDashboard.tsx#getDaysGone`) | Confirm the code's multi-month definition is intended | Needs decision | — |
| GAP-013 | Tech debt | SPEC | `npm run lint` fails | ESLint 9 is installed but the config is still the legacy `.eslintrc.cjs` (exit code 2) | Migrate to `eslint.config.js`. Until then lint cannot run in CI | Open | — |
| GAP-014 | Tech debt | SPEC | No automated tests for application code | There is no unit, component or end-to-end suite. Every application TC in `specs/features` is `Manual` | Choose a test runner (Vitest fits the Vite stack) and automate the critical-domain TCs first (see migration plan) | Needs decision | — |
| GAP-015 | Tech debt | DASH | Dead code | `src/api/dailySalesAvg.ts` calls `/daily-sales-avg`, which does not exist. `ApiEndpoints.auth` and `users` list routes that do not exist. The TP/EFP toggle is commented out. `src/pages/HomePage.tsx` is unrouted. The store registers the template `counter` slice. `bm`/`rd` numbers in `DAYS_BENCHMARKS` are unused | Remove in a separate, behaviour-neutral PR | Open | — |
| GAP-016 | Doc drift | DASH | `STRUCTURE.md` and `API_GUIDE.md` are template boilerplate | They describe a sales CRUD template, not this app | Delete them, or replace them with a pointer to `specs/` | Open | — |
| GAP-017 | Tech debt | DASH | Verbose console logging and no request timeout | `src/config/axios.ts` logs every request (with params) and every response, and sets `timeout: 0` | Should production builds log less? What timeout fits the ~1-minute stock queries? | Needs decision | — |
| GAP-018 | Ambiguity | DASH | `.env` and `.env.sandbox` are committed | They hold only public, build-time URLs (baked into the bundle anyway), but commit `c96f022` "remove the env file" suggests they were meant to be untracked | Keep tracked, or ignore them and ship `.env.example`? | Needs decision | — |
| GAP-019 | Doc drift | RD | A code comment says `/rd-status` fires on mount | `src/api/rdStatus.ts` says the query "fires on mount, not on tab switch". It is actually last in the load queue, and the filter bar fetches it only while RD Data Status is open | Fix the comment | Open | — |
| GAP-020 | Suspected defect | FILT | RD Data Status and the other tabs share one `branch` filter | `filters.branch` holds sales branch IDs on Summary and Service Measure, but franchise branch codes on RD Data Status (`salesDashboardSlice.ts`, `FilterBar.tsx`). A selection made on one tab is applied, with the wrong meaning, on the other | Should each tab keep its own branch selection? | Needs decision | — |
| GAP-021 | Ambiguity | PERM | A permissions outage looks like "no access" | If `GET /me/permissions` fails (after one retry), `PermissionGate` shows the same *No access* screen as a user with no permissions (`src/components/no-access/PermissionGate.tsx`) | Should an outage show a distinct "try again" message? | Needs decision | — |
| GAP-022 | Tech debt | DASH | `ScorecardDashboard.tsx` is ~2,600 lines | Every query, derived value and tab lives in one file | Split by tab when each tab is next changed. The specs give the seams | Accepted | Incremental, see migration plan |
| GAP-023 | Tech debt | DASH | Docker build installs non-reproducibly | `Dockerfile` uses `npm install` instead of `npm ci` and has an unused `development` stage | Switch to `npm ci`, and drop the stage | Open | — |
| GAP-024 | Suspected defect | TBL | Excel export leaves out total and pinned rows | `DataTable` exports only the body rows (after search and sort) plus their sub-rows. Rows marked `isTotal` or `pinnedTop` are excluded (`src/components/data-table/DataTable.tsx#handleExport`) | Should exported sheets include the Total row shown on screen? | Needs decision | — |
