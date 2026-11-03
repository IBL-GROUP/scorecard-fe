---
id: FEAT-LOAD
title: Tab-by-tab load queue and query conventions
type: feature
area: LOAD
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Tab-by-tab Load Queue

## Overview

The dashboard makes about 21 `scorecard-be` queries, and some take up to a
minute. Rather than send them all at once, permitted tabs load one at a time,
in tab order, in the background. The tab on screen always loads straight away.

## Goals and Scope

**Goals**: keep load on the database bounded; make the visible tab fast; warm
up the other tabs in the background.

**In scope**: queue ordering, tab release, restart on filter change, and the
caching and placeholder behaviour shared by every data hook.

**Out of scope**: what each query returns. See the tab specs.

## Actors

| Actor | Description |
|---|---|
| Dashboard user | Switches tabs and changes filters |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-LOAD-001 | Permitted tabs load in `MAIN_TABS` order: Summary → Service Measure → Dispatch & WIP → RD Data Status. A tab's queries all start together. | Baseline | `src/features/salesDashboard/tabs.ts#useTabLoadQueue` | TC-LOAD-001 |
| FR-LOAD-002 | The next tab is released only when every query of the tabs already released has settled (fetched and not refetching, whether it succeeded or failed). | Baseline | `src/features/salesDashboard/tabs.ts#useReleaseNextTab`, `src/features/salesDashboard/tabs.ts#isQuerySettled` | TC-LOAD-001 |
| FR-LOAD-003 | The tab on screen always loads at once, even ahead of its turn. | Baseline | `src/features/salesDashboard/tabs.ts#shouldLoad` | TC-LOAD-002 |
| FR-LOAD-004 | A tab without permission is never loaded, and counts as settled so it does not block later tabs. | Baseline | `src/features/salesDashboard/tabs.ts#useReleaseNextTab` | TC-LOAD-003 |
| FR-LOAD-005 | A change to classification, branch, effective SKU, or From/To date restarts the queue from Summary. The reset happens during render, so no stale tab fetches with the new params. | Baseline | `src/pages/ScorecardDashboard.tsx#restartKey`, `src/features/salesDashboard/tabs.ts#useTabLoadQueue` | TC-LOAD-004 |
| FR-LOAD-006 | Every query is registered to its tab or tabs with `track()`. The cover-day benchmarks count toward both Summary and Service Measure, and load with whichever is released first. | Baseline | `src/pages/ScorecardDashboard.tsx#track` | TC-LOAD-001 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-LOAD-001 | Each tab's query count: Summary 12, Service Measure 5, Dispatch & WIP 3, RD Data Status 1. | Baseline | `src/pages/ScorecardDashboard.tsx#ScorecardDashboard` | TC-LOAD-001 |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-LOAD-001 | Every data hook in `src/api/` keys its query on `[ApiKey.<name>, params]`, uses a 5-minute `staleTime` and `keepPreviousData`, and accepts `{ enabled }` (`QueryOptions`). | Baseline | `src/api/queryOptions.ts#QueryOptions`, `src/utils/enum.ts#ApiKey`, `src/api/salesSummary.ts#keepPreviousData` | — |

## API / Interface Contracts

- `useTabLoadQueue(mainTab, restartKey)` → `{ shouldLoad(tab), released, setState, canSeeTab }`.
- `useReleaseNextTab(queue, settledByTab)`. Call it after every query has been declared.
- Convention for a new query: pass `{ enabled: load<Tab> }` **and** wrap the
  result in the tab's `track` helper. See
  [frontend standards](../standards/frontend-standards.md).

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-LOAD-001 | A failed query counts as settled, so a failure never stalls the queue. Its section shows its last data (placeholder) or empty. | Baseline | `src/features/salesDashboard/tabs.ts#isQuerySettled` | TC-LOAD-005 |

## Security Requirements

Not applicable. Permission gating is specified in [FEAT-PERM](FEAT-PERM-permissions.md) (FR-PERM-005).

## Non-Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| NFR-LOAD-001 | While new filters load, charts keep their previous values (no blank flash). | Baseline | `src/api/salesSummary.ts#keepPreviousData` | TC-LOAD-004 |

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-LOAD-001 | Given all four sections, when the dashboard opens on Summary, then the Service Measure requests start only after the last Summary request completes. | FR-LOAD-001, FR-LOAD-002 |
| AC-LOAD-002 | Given Summary is still loading, when the user opens Dispatch & WIP, then its three requests start immediately. | FR-LOAD-003 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-LOAD-001 | Open the dashboard with every permission. Watch the network waterfall | 12 Summary calls, then 5, then 3, then 1, in that order | FR-LOAD-001, FR-LOAD-002, FR-LOAD-006, BR-LOAD-001 | Manual |
| TC-LOAD-002 | Open Dispatch & WIP while Summary is loading | `/dispatch-vs-order`, `/wip`, `/rpm` start at once | FR-LOAD-003 | Manual |
| TC-LOAD-003 | User without `SERVICE_MEASURE` | Dispatch & WIP starts right after Summary settles | FR-LOAD-004 | Manual |
| TC-LOAD-004 | After everything loads, change the To date and Apply | Queue restarts at Summary. Old values stay visible until the new ones arrive | FR-LOAD-005, NFR-LOAD-001 | Manual |
| TC-LOAD-005 | Force `/sales-summary` to 500 | Service Measure is still released | ERR-LOAD-001 | Manual |

## Dependencies

- TanStack Query v5; [FEAT-PERM](FEAT-PERM-permissions.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-003 | One slow query holds back later tabs |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
