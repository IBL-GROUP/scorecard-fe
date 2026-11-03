---
id: ASM-001
title: Repository assessment (spec-first migration baseline)
type: assessment
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Repository Assessment

A snapshot of `scorecard-fe` at commit `2da4904` (branch `sandbox`,
2026-11-03), made before the spec-first migration. It inventories what exists,
so the specs can be checked against the code and gaps can be tracked.

## 1. What the repository is

The frontend of **Supply Chain Pulse 1.0**, one of the OneThunder BI
dashboards. It is a single-page React app served under `/scorecard-dashboard/`.
It has no backend of its own. It reads metrics from `scorecard-be`, and
identity, permissions and usage from `authenticator-be`.

| Aspect | Finding |
|---|---|
| Language / build | TypeScript 5.7, React 18, Vite 6 (`base: /scorecard-dashboard/`, dev port 5175) |
| UI / state | Chakra UI v3; TanStack Query v5 (server state); Redux Toolkit (tab and filter state) |
| Routing | React Router v7: `/` (dashboard), `/usermanual`, `*` (404) |
| Size | ~12,000 lines in `src/`. `src/pages/ScorecardDashboard.tsx` alone is ~2,600 |
| Deployment | Multi-stage Docker → nginx on `:3004`. Image `iblgroup/searle-scorecard-fe` |
| Source control | GitHub `IBL-GROUP/scorecard-fe`; branches `main`, `sandbox`; Dependabot enabled |
| CI/CD | **None** before this migration (no `.github/workflows`) |
| Tests | **None.** `npm run build` (tsc + vite) is the only automated check |
| Lint | `npm run lint` **fails**: ESLint 9 with a legacy `.eslintrc.cjs` (GAP-013) |

## 2. Modules and domain boundaries

| Module | Path | Responsibility | Domain / spec |
|---|---|---|---|
| Entry and providers | `src/main.tsx`, `src/providers/` | Query → Redux → Chakra → AuthGate → PermissionGate → App | [Frontend architecture](../architecture/frontend-architecture.md) |
| Session | `src/utils/session.ts`, `src/components/AuthGate.tsx` | Ticket handoff, token lifecycle | ACC → FEAT-AUTH |
| Permissions | `src/api/permissions.ts`, `src/components/no-access/` | Dashboard and tab gating | ACC → FEAT-PERM |
| Account and menu | `src/api/account.ts`, `src/components/user-menu/` | Display name, dashboard switcher, logout | ACC → FEAT-NAV |
| Usage | `src/utils/usage.ts` | Heartbeats, export events | ACC → FEAT-USG |
| Data hooks | `src/api/*.ts`, `src/api/endpoints.ts`, `src/utils/enum.ts` | One React Query hook per endpoint | DASH → FEAT-LOAD |
| Tabs and queue | `src/features/salesDashboard/` | Tab list, load queue, filter slice | DASH → FEAT-LOAD, FEAT-FILT |
| Dashboard page | `src/pages/ScorecardDashboard.tsx` | All queries, derivations, the four tabs | DASH → FEAT-SUM/SVC/DSP/RD |
| Filter bar | `src/components/filter-bar/` | Staged filters, options | DASH → FEAT-FILT |
| Tables | `src/components/data-table/` | Search, sort, paging, Excel | DASH → FEAT-TBL |
| Dialogs | `src/dialog/` | WIP and RMPM drill-downs | DASH → FEAT-DSP |
| User manual | `src/pages/UserManual.tsx`, `src/features/userManual/` | Searchable in-app manual | DASH → FEAT-NAV |
| UI kit | `src/components/{button,input,select,…}`, `src/theme/` | Presentational components | Out of scope for specs |

## 3. External interfaces

### 3.1 `scorecard-be` (22 endpoints consumed)

All are `GET` with a Bearer JWT, returning `{ success, count, data[] }`. The
full inventory, with parameters and fields, is
[`scorecard-be.openapi.json`](../api/scorecard-be.openapi.json).

| Tab | Endpoints |
|---|---|
| Summary (12 queries) | `/sales-summary`, `/total-sku`, `/cover-days`, `/cover-days/total`, `/cover-days/closing-inv`, `/cover-days/benchmarks`, `/forecast-accuracy-monthly`, `/forecast-accuracy-monthly/daysgone`, `/forecast-accuracy-yearly`, `/forecast-accuracy-category-monthly`, `/forecast-accuracy-category-yearly`, `/ibl-vs-tscl` |
| Service Measure (5) | `/inventory-days`, `/above-below-threshold`, `/service-measure` ×2, `/tgt-vs-actual` |
| Dispatch & WIP (3) | `/dispatch-vs-order`, `/wip`, `/rpm` |
| RD Data Status (1) | `/rd-status` |
| Filters | `/filters`, `/filters/branches` |
| Declared but not served | `/auth/*`, `/users`, `/daily-sales-avg` (GAP-015) |

### 3.2 `authenticator-be` (7 endpoints consumed)

`POST /auth/ticket/redeem`, `POST /auth/ticket`, `GET /me/permissions`,
`GET /profile`, `GET /dashboards/user-reports`, `POST /usage/heartbeat` and
`POST /usage/export`. See [`authenticator-be.openapi.json`](../api/authenticator-be.openapi.json).

### 3.3 Browser and portal

| Interface | Use |
|---|---|
| `sessionStorage.searle_token_scorecard` | JWT |
| `sessionStorage.searle_usage_session_scorecard` | Usage session ID |
| Cookie `ot_session_user` (set by the portal) | Cross-app sign-out |
| `{PORTAL}/login?redirect=`, `/logout`, `/dashboard`, `/dashboard?view=settings` | Navigation |

### 3.4 Build-time configuration

| Variable | Documented in the README? |
|---|---|
| `VITE_API_BASE_URL`, `VITE_AUTH_API_URL`, `VITE_AUTH_PORTAL_URL` | Yes |
| `VITE_DASHBOARD_ORIGIN`, `VITE_DASHBOARD_URLS`, `VITE_USER_MANUAL_URL` | **No** (GAP-011) |

## 4. Data models

There is no client-side persistence beyond `sessionStorage`. The models are API
response rows (see [data models](../api/data-models.md)) and the Redux
`salesDashboard` slice (`mainTab`, `activeTab`, `displayMode`, `filters`).

## 5. Business rules found

- **Backend-owned** metric definitions (classification, cover days, benchmarks,
  accuracy, service measure, stock scope): BR-MET-001 to BR-MET-008.
- **Frontend-owned** presentation rules: days gone (BR-SUM-001), accuracy
  rounding (BR-SUM-002), share % (BR-SUM-003), "—" for missing values
  (BR-SUM-004), upload-count meaning (BR-RD-001), permission code format
  (BR-PERM-001).

## 6. Existing documentation

| Document | State |
|---|---|
| `README.md` | Good and mostly current. Misses the October features (GAP-011) |
| `TECHNICAL_DOCUMENT.md` | Detailed endpoint and formula reference, shared with `scorecard-be`. Last verified on 2026-09-14. Since drifted (GAP-010, GAP-012) |
| `STRUCTURE.md`, `API_GUIDE.md` | Template boilerplate. Wrong (GAP-016) |
| In-code comments | High quality. They explain the *why* and were the main source for the baseline specs |
| User manual (`manualData.ts`) | End-user field dictionary. Not reviewed for accuracy here |

## 7. Test coverage

| Kind | Exists? |
|---|---|
| Unit / component | No |
| End-to-end | No |
| Type check | Yes (`tsc`, part of `npm run build`). Passes at baseline |
| Lint | Configured but broken |
| Spec validation | Added by this migration (`npm run specs:validate`, `npm run specs:test`) |

All application test cases in `specs/features/` are therefore `Manual` (GAP-014).

## 8. Undocumented or ambiguous behaviour found

The full list, with evidence, is in [gaps.md](../gaps.md). The most important:

1. **Server-side authorisation is missing** for sections (GAP-002).
2. **Hard-coded April 2026 stock** in two Service Measure sections (GAP-001).
3. **Filter state issues**: Clear desync (GAP-008), the shared `branch` field
   across tabs (GAP-020), and UTC vs local "today" (GAP-009).
4. **Filters silently ignored** by some endpoints (GAP-005).
5. **Documentation drift** since September (GAP-010, GAP-011, GAP-012, GAP-019).

## 9. Method

The code was read module by module. Claims in the existing docs were checked
against the code, and backend behaviour that the frontend depends on was
spot-checked in the sibling `scorecard-be` repository (for example
`routes/routes.forcast.accuracy.yearly.js`). Nothing was assumed from the
documentation alone where the code disagreed.
