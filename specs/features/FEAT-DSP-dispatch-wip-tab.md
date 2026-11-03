---
id: FEAT-DSP
title: Dispatch & WIP tab
type: feature
area: DSP
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Dispatch & WIP Tab (`dispatchWip`)

## Overview

The Dispatch & WIP tab shows order fulfilment (dispatch vs order),
work-in-progress orders and raw/packing material (RMPM) stock. WIP and RMPM
have drill-down dialogs. It needs `DISPATCH_WIP.VIEW`.

## Goals and Scope

**In scope**: the three tables, their parameters and the two detail dialogs.
**Out of scope**: the backend SQL.

## Actors

| Actor | Description |
|---|---|
| Supply / production planner | Tracks delivery against orders and stock in the pipeline |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-DSP-001 | **Dispatch Vs Order**: material, channel, ordered qty, delivered qty and delivery %, from `/dispatch-vs-order`. The request sends the From/To dates and `branch` (which the backend ignores, GAP-005). | Baseline | `src/pages/ScorecardDashboard.tsx#dispatchParams`, `src/api/dispatchVsOrder.ts` | TC-DSP-001 |
| FR-DSP-002 | **WIP**: a table from `/wip`, using dates only. A detail dialog filters by plant and by material type (for example TSCL – Semi Finished, Mfg Finished Goods, Export FG). | Baseline | `src/dialog/wip-details.tsx#WipDetails`, `src/dialog/wip-details.tsx#MATERIAL_TYPE_OPTIONS` | TC-DSP-002 |
| FR-DSP-003 | **RMPM**: a table from `/rpm`, using dates only, with value and quantity by stock type. A detail dialog filters by plant. | Baseline | `src/dialog/rmpm-details.tsx#RmpmDetails` | TC-DSP-003 |
| FR-DSP-004 | The filter bar on this tab shows only the dates (FR-FILT-003). | Baseline | `src/components/filter-bar/FilterBar.tsx#isDispatchWip` | TC-DSP-001 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-DSP-001 | WIP and RMPM ignore branch, classification and SKU by design (the code comment says "intentionally excluded"). | Baseline | `src/pages/ScorecardDashboard.tsx#dateOnlyParams` | TC-DSP-002 |

## Data Requirements

Fields consumed are listed in `scorecard-be.openapi.json` (tag `DispatchWip`).

## API / Interface Contracts

`/dispatch-vs-order`, `/wip` and `/rpm`.

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-DSP-001 | A failed request leaves its table empty, or showing its previous values. | Baseline | `src/pages/ScorecardDashboard.tsx#isLoadingDispatch` | — |

## Security Requirements

Not applicable beyond FR-PERM-005.

## Non-Functional Requirements

Not applicable. No agreed targets.

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-DSP-001 | Given any classification, SKU or branch filter, then `/wip` and `/rpm` are called with only `startDate` and `endDate`. | FR-DSP-002, FR-DSP-003, BR-DSP-001 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-DSP-001 | Open the tab and inspect `/dispatch-vs-order` | Dates and `branch` sent. Only date pickers visible | FR-DSP-001, FR-DSP-004 | Manual |
| TC-DSP-002 | Open the WIP dialog, filter by plant and material type | Rows narrow. Request carries dates only | FR-DSP-002, BR-DSP-001 | Manual |
| TC-DSP-003 | Open the RMPM dialog, filter by plant | Rows narrow | FR-DSP-003 | Manual |

## Dependencies

- [FEAT-TBL](FEAT-TBL-data-tables.md), [FEAT-LOAD](FEAT-LOAD-load-queue.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-005 | `branch` is sent to `/dispatch-vs-order` but ignored |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
