# Searle Scorecard — Frontend (Supply Chain Pulse 1.0)

The **Supply Chain Pulse 1.0** dashboard. It covers sales and cover days by
classification, forecast and budget accuracy, inventory days and service
measure per branch, dispatch vs order, WIP and RMPM stock, and regional
distributor (RD) stock upload status.

It is one of the OneThunder dashboards. It has **no login of its own**: users
arrive from the authenticator portal with a single-use ticket. It reads data
from `scorecard-be`, and reads permissions and usage tracking from
`authenticator-be`.

## Tech Stack

- **React 18** + **TypeScript**, built with **Vite 6**
- **Chakra UI v3** — components and theming
- **TanStack Query v5** — server state; **Redux Toolkit** — tab and filter state
- **React Router v7** — one route, served under `/scorecard-dashboard/`
- **Axios**, **Recharts** (bar, line, gauge), **react-select**, **react-datepicker**
- **xlsx** — Excel export from tables

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5175/scorecard-dashboard/
npm run build    # tsc + vite build → dist/
npm run lint
npm run preview
```

Requirements: Node.js 20, plus a running `scorecard-be` (`:3005`) and
`authenticator-be` (`:4002`). To sign in locally you also need the
authenticator front end (`:5173`), which issues the handoff ticket.

There is no test suite.

The dev server is pinned to **5175** with `strictPort`, and the app is built
with `base: '/scorecard-dashboard/'` (the router uses the same basename). The
portal links to dashboards by that fixed path.

### Environment

Build-time Vite variables. Local values go in `.env`; production values are
Docker build args.

| Variable | Local | Server | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3005/api` | `https://dev-scorecard.onethunder.iblgrp.com/api` | `scorecard-be` base URL, **including** `/api` |
| `VITE_AUTH_API_URL` | `http://localhost:4002/api` | `https://dev-login.onethunder.iblgrp.com/api` | `authenticator-be` — ticket redemption, permissions, usage heartbeats |
| `VITE_AUTH_PORTAL_URL` | `http://localhost:5173/` | `https://dev.onethunder.iblgrp.com/` | Portal to bounce to (`/login?redirect=…`) and link back to |

Values are baked into the bundle at build time. Changing one means rebuilding
the image.

## How It Works

### Session, permissions and usage

These work the same way as in the other OneThunder dashboards (`dsr-fe`).

- **Session** (`utils/session.ts`, `components/AuthGate.tsx`):
  - On arrival, a `?t=<ticket>` is exchanged at
    `{AUTH_API}/auth/ticket/redeem` for a JWT, stored in sessionStorage as
    `searle_token_scorecard`.
  - With no valid session, the browser goes to
    `{PORTAL}/login?redirect=<url>`.
  - The token is dropped when it expires, or when the portal's
    `ot_session_user` cookie is empty (the user logged out) or names a
    different user.
  - The session is re-checked every 60 s and when the tab becomes visible. Any
    `401` from the API redirects to the portal.
- **Permissions** (`api/permissions.ts`, `PermissionGate`):
  - They are read from `{AUTH_API}/me/permissions`, as codes of the form
    `ONE_THU.DASHBOARD.SUPPLYCHAIN_PULSE.<SECTION>.VIEW`.
  - A user with none sees the *No access* screen.
  - Tabs appear only for sections the user holds.
- **Usage** (`utils/usage.ts`): while the tab is visible, the app sends
  `POST {AUTH_API}/usage/heartbeat` every 30 s, plus an `end` beat when the
  tab is hidden or closed.

### Tabs

| Tab | `mainTab` | Section | Contents | Endpoints |
|---|---|---|---|---|
| Summary | `supplyChain` | `SUMMARY` | Sales summary and SKU counts by classification, cover days vs benchmark, Budget Accuracy TSCL, Forecast Accuracy IBL, Forecast vs Budget % | `/sales-summary`, `/total-sku`, `/cover-days` (+ `/total`, `/closing-inv`, `/benchmarks`), `/forecast-accuracy-monthly` (+ `/daysgone`), `/forecast-accuracy-yearly`, `/forecast-accuracy-category-monthly`, `/forecast-accuracy-category-yearly`, `/ibl-vs-tscl` |
| Service Measure | `serviceMeasure` | `SERVICE_MEASURE` | Inventory Days table (classification → SKU, one column per branch), Service Measure by Branch, Cover Days Threshold vs Actual, SKUs Against Threshold | `/inventory-days`, `/service-measure`, `/tgt-vs-actual`, `/above-below-threshold`, `/cover-days/benchmarks` |
| Dispatch & WIP | `dispatchWip` | `DISPATCH_WIP` | Dispatch vs Order, WIP and RMPM tables, with detail dialogs (`dialog/wip-details.tsx`, `dialog/rmpm-details.tsx`) | `/dispatch-vs-order`, `/wip`, `/rpm` |
| RD Data Status | `regionalDistributor` | `RD_DATA_STATUS` | Each active RD's current stock upload vs its last one (`RegionalDistributorTab`) | `/rd-status` |

Benchmark cover days and inventory-days thresholds are **not hard-coded**.
They come from the versioned `cover_days` table via `/cover-days/benchmarks`,
as of the selected end date. A missing value shows as "—".

### Filters (`components/filter-bar/FilterBar.tsx`)

Filter state lives in Redux (`salesDashboardSlice`). The default window is the
1st of this month to today.

| Filter | Sent as | Applies to |
|---|---|---|
| Date from / to | `startDate`, `endDate` | Every data tab |
| Classification | `classification` | Summary, Service Measure. Dispatch vs Order ignores it |
| SKU (multi) | `sku` | Summary, Service Measure. Dispatch vs Order ignores it |
| Branches (multi) | `branch` | Summary, Service Measure. Also sent to Dispatch vs Order, but the API ignores it |
| Branch Code, Branch, Distributor Code, Distributor, Upload count | — | **RD Data Status only**, applied client-side to the `/rd-status` rows |

- WIP and RMPM send dates only.
- `/forecast-accuracy-monthly/daysgone` and the RD status date are capped at
  today.
- The "Service Measure by Branch" chart makes a second request without the
  branch filter, so it can always show every branch.
- SKU and branch options come from `/filters` and `/filters/branches`.
- The RD dropdown options are built from the `/rd-status` response itself.

### Data fetching

Each endpoint has a hook in `src/api/`. Queries use a 5-minute `staleTime` and
`keepPreviousData`, so charts keep their last values while new filters load.

**Queries are gated by permission.** Every hook takes an optional second
argument, `{ enabled }` (`src/api/queryOptions.ts`). The dashboard and filter
bar pass `useCanSeeTab()` from `src/features/salesDashboard/tabs.ts` — the same
tab list the header uses — so a tab the user holds no `VIEW` permission on
never sends a request:

| Permission | Queries it unlocks |
|---|---|
| `SUMMARY` | sales summary, total SKU, cover days (+ total, closing inv), forecast accuracy ×5, IBL vs TSCL |
| `SERVICE_MEASURE` | inventory days, above/below threshold, service measure (×2), target vs actual |
| `DISPATCH_WIP` | dispatch vs order, WIP, RPM |
| `RD_DATA_STATUS` | RD status (tab and filter-bar options) |
| `SUMMARY` or `SERVICE_MEASURE` | cover-day benchmarks, SKU and branch filter options |

Nothing fires until the permission codes have loaded.

**Tabs load one at a time** (`useTabLoadQueue` / `useReleaseNextTab` in
`tabs.ts`). The page loads the permitted tabs in tab order, whichever tab is
on screen:

1. All of Summary's queries run together.
2. When every one of them has finished (or failed), Service Measure's run.
3. Then Dispatch & WIP, then RD Data Status.

- **The tab on screen always loads immediately**, so opening Dispatch & WIP
  while Summary is still loading does not wait.
- **Tabs without permission are skipped.**
- **Changing a filter restarts the queue** from Summary.
- **The filter bar's RD dropdowns** request `/rd-status` only while RD Data
  Status is open.

**Adding a query:**

- Pass the matching `enabled` flag, e.g. `{ enabled: loadServiceMeasure }`,
  or it will run for everyone, outside the queue.
- Wrap the result in that tab's `track` helper (`summary(...)`,
  `serviceMeasure(...)`, `dispatchWip(...)`), or the next tab won't wait for it.

The axios instance adds the Bearer token and unwraps `response.data`. Tables
export to Excel through `DataTable` (`xlsx`).

## Project Structure

```
src/
├── main.tsx                   # Query → Redux → Chakra → AuthGate → PermissionGate → App
├── App.tsx                    # Router (basename /scorecard-dashboard): dashboard + 404
├── pages/
│   └── ScorecardDashboard.tsx # The whole dashboard: every query, section and tab
├── api/                       # One React Query hook per scorecard-be endpoint
│   ├── endpoints.ts
│   ├── permissions.ts         # usePermissions (authenticator /me/permissions)
│   └── salesSummary.ts, coverDays.ts, forecastAccuracyMonthly.ts, rdStatus.ts, …
├── features/salesDashboard/   # Redux slice (tab, filters, dates); tabs.ts — tab list + useCanSeeTab
├── components/
│   ├── AuthGate.tsx           # Session handoff + usage tracking
│   ├── no-access/             # PermissionGate, NoAccess
│   ├── header-actions/        # Tab bar (filtered by permission)
│   ├── filter-bar/            # Shared + RD Status filters
│   ├── sales-summary/, kpi-card/, chart-card/
│   ├── charts/                # BarChart, LineChart, GaugeChart
│   ├── forecast-accuracy-chart/, service-measure-chart/
│   ├── regional-distributor/  # RD Data Status tab
│   ├── data-table/            # Collapsible table with Excel export
│   └── select/, date-picker/, pagination/, table/, button/, input/
├── dialog/                    # WIP and RMPM detail dialogs
├── config/axios.ts
├── utils/                     # session.ts, usage.ts, enum.ts (query keys)
├── app/                       # Redux store + typed hooks
└── providers/, theme/, constants/
```

## Deployment

The multi-stage `Dockerfile` builds the app and copies `dist/` into nginx at
`/usr/share/nginx/html/scorecard-dashboard`. nginx listens on **3004** (bound
to `127.0.0.1`) and serves the SPA under `/scorecard-dashboard/`, with a
history fallback, `/health`, gzip, security headers and one-year caching for
static assets. The host nginx proxies `/scorecard-dashboard/` to it.

The image is `iblgroup/searle-scorecard-fe:<tag>`, and the compose project on
the server lives in `/root/searle-scorecard/fe/`.

```bash
# 1. Copy the compose file to the server (first time, or when it changes)
scp docker-compose.yml root@<server>:/root/searle-scorecard/fe/

# 2. Build with the server URLs and push
docker build -t iblgroup/searle-scorecard-fe:1.0.0 \
  --build-arg VITE_API_BASE_URL=https://dev-scorecard.onethunder.iblgrp.com/api \
  --build-arg VITE_AUTH_PORTAL_URL=https://dev.onethunder.iblgrp.com/ \
  --build-arg VITE_AUTH_API_URL=https://dev-login.onethunder.iblgrp.com/api \
  -f Dockerfile .
docker push iblgroup/searle-scorecard-fe:1.0.0

# 3. On the server, from /root/searle-scorecard/fe
docker compose pull && docker compose up -d
```

## Known Issues

- **The queue waits on whole tabs.** One slow query (e.g. Service Measure's
  ~minute-long stock query) holds back every tab after it, unless the user
  opens that tab directly.
- **`npm run lint` is broken:** ESLint 9 is installed, but the config is still
  the legacy `.eslintrc.cjs`.
- **Tab gating is client-side only.** `scorecard-be` serves every endpoint to
  any signed-in user.
- **Dead code:**
  - `api/dailySalesAvg.ts` calls `/daily-sales-avg`, which the backend doesn't
    have (the hook is unused).
  - `endpoints.ts` lists `/auth/*` and `/users` routes that don't exist.
  - The TP/EFP display-mode toggle is commented out in `HeaderActions`.
  - `pages/HomePage.tsx` is unrouted.
  - The Redux store registers the template's `counter` slice.
- **Inventory Days and Service Measure show April 2026 stock**, whatever
  dates are selected, because the backend hard-codes the snapshot window.
- **Stale docs:** `STRUCTURE.md` and `API_GUIDE.md` are boilerplate. See
  [`TECHNICAL_DOCUMENT.md`](TECHNICAL_DOCUMENT.md) for the up-to-date
  endpoint, formula and section reference.
- **`ScorecardDashboard.tsx` is ~2,400 lines**, and `package.json` is still
  named `react-chakra-redux`.
- **Verbose console:** axios logs every request and response, and requests
  have no timeout.
- **Stray files:** `tsc_errors.log` (untracked) and
  `src/components/date-picker/date-picker.recipe.ts.bak` (committed).
- **Dockerfile:** has an unused `development` stage and uses `npm install`
  rather than `npm ci`.
