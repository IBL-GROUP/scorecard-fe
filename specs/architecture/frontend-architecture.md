---
id: ARCH-002
title: Frontend architecture
type: architecture
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Frontend Architecture

## Component tree

```
main.tsx
└─ QueryProvider (TanStack Query)
   └─ Redux Provider (store: salesDashboard, counter*)
      └─ ChakraProvider
         └─ AuthGate ............ FEAT-AUTH: no session → portal; starts usage tracking (FEAT-USG)
            └─ PermissionGate .. FEAT-PERM: no codes → NoAccess
               └─ App (router, basename /scorecard-dashboard)
                  ├─ /            ScorecardDashboard (lazy)
                  │   ├─ HeaderActions (tabs, FEAT-PERM) · UserMenu (FEAT-NAV)
                  │   ├─ FilterBar (FEAT-FILT)
                  │   └─ SupplyChainTab | ServiceMeasureTab | DispatchWipTab | RegionalDistributorTab
                  ├─ /usermanual  UserManual (lazy, own chunk)
                  └─ *            NotFoundPage
* counter is template residue (GAP-015)
```

## Layers

| Layer | Location | Rules |
|---|---|---|
| HTTP client | `src/config/axios.ts` | Adds the Bearer token; unwraps `response.data`; on `401` → portal |
| Endpoint registry | `src/api/endpoints.ts` | Every `scorecard-be` path. Checked against the contract by validator rule S13 |
| Data hooks | `src/api/<name>.ts` | One `useGet<Name>(params, { enabled })` per endpoint (DR-LOAD-001) |
| Query keys | `src/utils/enum.ts` | `ApiKey` enum |
| UI state | `src/features/salesDashboard/salesDashboardSlice.ts` | Tab, display mode, filters |
| Tab list and load queue | `src/features/salesDashboard/tabs.ts` | The single source for tab ↔ section ↔ load order |
| Composition | `src/pages/ScorecardDashboard.tsx` | Declares every query, derives the display rows, renders the tabs |
| Components | `src/components/*` | Presentational, with co-located Chakra recipes |

## Data flow for one figure

```
FilterBar (stage → Apply) → Redux filters → ScorecardDashboard builds params
  → useGet<X>(params, { enabled: shouldLoad(tab) })  ── track(tab) ──▶ load queue
  → axios GET /api/x (Bearer) → { success, data } → derive (round, "—", %) → component
```

## Architectural decisions

- [ADR-0001](adr/ADR-0001-specification-first.md): specifications are the
  source of truth.
- Decisions recorded in code comments, and worth an ADR if revisited: the
  ticket handoff instead of a token in the URL, `sessionStorage` over
  `localStorage`, live permission reads, tab-by-tab loading, and Division
  applied through SKU expansion.
