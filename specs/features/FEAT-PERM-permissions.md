---
id: FEAT-PERM
title: Permissions and tab gating
type: feature
area: PERM
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Permissions and Tab Gating

## Overview

The authenticator says what each user may see. A user with no permission on
Supply Chain Pulse sees a *No access* screen. Everyone else sees only the tabs
they hold `VIEW` on, and the app sends no requests for the other tabs. This is a
**critical domain**, because it controls data exposure in the UI.

## Goals and Scope

**Goals**: show each user exactly the sections they are entitled to; never
flash forbidden tabs; never spend a request on a tab the user cannot open.

**In scope**: reading permission codes, the dashboard-level gate, tab
visibility, query gating, and falling back to the first permitted tab.

**Out of scope**: server-side enforcement. `scorecard-be` does not check
sections (GAP-002). Role administration belongs to the authenticator.

## Actors

| Actor | Description |
|---|---|
| Dashboard user | Holds zero or more `ONE_THU.DASHBOARD.SUPPLYCHAIN_PULSE.<SECTION>.VIEW` codes |
| `authenticator-be` | Source of permission codes |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-PERM-001 | After sign-in, the app reads the user's codes from `GET {AUTH_API}/me/permissions` (`data.permissions[]`) with the Bearer token. It caches them for 5 minutes and retries once. | Baseline | `src/api/permissions.ts#fetchPermissions`, `src/api/permissions.ts#usePermissions` | TC-PERM-001 |
| FR-PERM-002 | While the codes load, the dashboard shows "Checking your access…" and nothing else. | Baseline | `src/components/no-access/PermissionGate.tsx#PermissionGate` | TC-PERM-001 |
| FR-PERM-003 | A user holding no code that starts with `ONE_THU.DASHBOARD.SUPPLYCHAIN_PULSE.` sees the *No access* screen, with a link back to the portal dashboard. | Baseline | `src/components/no-access/PermissionGate.tsx#hasAnyInResource`, `src/components/no-access/NoAccess.tsx` | TC-PERM-002 |
| FR-PERM-004 | A tab is shown only if the user holds `ONE_THU.DASHBOARD.SUPPLYCHAIN_PULSE.<SECTION>.VIEW` for it. The tab-to-section mapping is the single list `MAIN_TABS`. | Baseline | `src/features/salesDashboard/tabs.ts#MAIN_TABS`, `src/components/header-actions/HeaderActions.tsx#visibleTabs` | TC-PERM-003 |
| FR-PERM-005 | Queries for a tab are enabled only when the user can see that tab. The cover-day benchmarks and the SKU/branch filter options need `SUMMARY` or `SERVICE_MEASURE`. No query fires before the codes have loaded. | Baseline | `src/features/salesDashboard/tabs.ts#useCanSeeTab`, `src/components/filter-bar/FilterBar.tsx#needsSkuAndBranchOptions` | TC-PERM-004 |
| FR-PERM-006 | If the remembered tab is not permitted (for example after a role change, or the initial `supplyChain`), the app switches to the first permitted tab. | Baseline | `src/components/header-actions/HeaderActions.tsx#visibleTabs` | TC-PERM-003 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-PERM-001 | Permission codes are `PROJECT.MODULE.RESOURCE.SECTION.ACTION`, with `ONE_THU`, `DASHBOARD`, `SUPPLYCHAIN_PULSE`. Sections: Summary `SUMMARY`, Service Measure `SERVICE_MEASURE`, Dispatch & WIP `DISPATCH_WIP`, RD Data Status `RD_DATA_STATUS`. Action: `VIEW`. | Baseline | `src/api/permissions.ts#permissionCode`, `src/features/salesDashboard/tabs.ts#MAIN_TABS` | TC-PERM-003 |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-PERM-001 | `/me/permissions` returns `{ success, data: { roles[], permissions: string[] } }`. Only `permissions` is used. | Baseline | `src/api/permissions.ts#PermissionsResponse` | — |

## API / Interface Contracts

- `GET {AUTH_API}/me/permissions`. See operation `getMyPermissions` in
  [`authenticator-be.openapi.json`](../api/authenticator-be.openapi.json).
- Hooks: `usePermissions()` → `{ isReady, hasAnyInResource, has(code), … }`;
  `useCanSeeTab()` → `(tab) => boolean`.

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-PERM-001 | If the permission request fails (after one retry), the *No access* screen is shown. An outage currently cannot be told apart from a denial (GAP-021). | Baseline | `src/components/no-access/PermissionGate.tsx#isError` | TC-PERM-005 |
| ERR-PERM-002 | If the token disappears before the call, the permission set is empty, so the gate fails closed. | Baseline | `src/api/permissions.ts#fetchPermissions` | — |

## Security Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| SEC-PERM-001 | Gating in the browser only hides UI and saves requests. It is **not** access control. Any valid JWT can still call every `scorecard-be` endpoint (GAP-002). | Baseline | `src/api/permissions.ts` | — |
| SEC-PERM-002 | Codes are read live on each load rather than carried in the token, so a revoked role takes effect on the next load. | Baseline | `src/api/permissions.ts#fetchPermissions` | — |

## Non-Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| NFR-PERM-001 | Forbidden tabs never flash on screen: tabs render only once the codes are ready (`isReady`). | Baseline | `src/api/permissions.ts#isReady` | TC-PERM-003 |

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-PERM-001 | Given a user with only `…SUMMARY.VIEW`, when the dashboard loads, then only the Summary tab is visible, and no request is sent to `/inventory-days`, `/dispatch-vs-order`, `/wip`, `/rpm` or `/rd-status`. | FR-PERM-004, FR-PERM-005 |
| AC-PERM-002 | Given a user with no Supply Chain Pulse codes, when the dashboard loads, then the *No access* screen is shown and no `scorecard-be` request is sent. | FR-PERM-003 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-PERM-001 | Throttle `/me/permissions` | "Checking your access…" until it returns. One request | FR-PERM-001, FR-PERM-002 | Manual |
| TC-PERM-002 | User with no codes for the resource | *No access* screen with a portal link | FR-PERM-003 | Manual |
| TC-PERM-003 | For each subset of the 4 sections | Exactly those tabs are visible. The first visible tab is selected | FR-PERM-004, FR-PERM-006, BR-PERM-001, NFR-PERM-001 | Manual |
| TC-PERM-004 | `DISPATCH_WIP` only: watch the network | Only `/dispatch-vs-order`, `/wip`, `/rpm` (no `/filters`) | FR-PERM-005 | Manual |
| TC-PERM-005 | `/me/permissions` returns 500 | *No access* screen after one retry | ERR-PERM-001 | Manual |

## Dependencies

- [FEAT-AUTH](FEAT-AUTH-session-handoff.md) (needs a token).
- [FEAT-LOAD](FEAT-LOAD-load-queue.md) combines the permission gate with load ordering.

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-002 | No server-side section enforcement |
| GAP-021 | A permissions outage shows *No access* |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
