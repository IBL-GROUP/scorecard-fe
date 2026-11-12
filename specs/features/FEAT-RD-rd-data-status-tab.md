---
id: FEAT-RD
title: RD Data Status tab
type: feature
area: RD
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# RD Data Status Tab (`regionalDistributor`)

## Overview

The RD Data Status tab shows whether each active regional distributor (RD) has
uploaded today's stock, next to its last earlier upload. It needs
`RD_DATA_STATUS.VIEW`, and it is last in the load queue.

## Goals and Scope

**In scope**: the totals, the RD table and the browser-side RD filters.
**Out of scope**: how the backend picks active RDs and uploads.

## Actors

| Actor | Description |
|---|---|
| Distribution / data-ops user | Chases RDs who have not uploaded stock |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-RD-001 | The tab requests `GET /rd-status?date=<To date, capped at today>`. The dashboard and the filter bar use the same parameters, so they share one cache entry. | Baseline | `src/api/rdStatus.ts#rdStatusDate`, `src/api/rdStatus.ts#useGetRdStatus` | TC-RD-001 |
| FR-RD-002 | Branch Code, Branch, Distributor Code, Distributor and Upload Count are applied **in the browser** to the `/rd-status` rows. All the filters that are set must match. | Baseline | `src/pages/ScorecardDashboard.tsx#rdStatusRows` | TC-RD-002 |
| FR-RD-003 | Stat boxes show the total current stock, total previous stock and the overall total (units and value), each with its share of the overall total. | Baseline | `src/components/regional-distributor/RegionalDistributorTab.tsx#totalCurrent`, `src/components/regional-distributor/RegionalDistributorTab.tsx#grandTotal` | TC-RD-003 |
| FR-RD-004 | The table lists distributor, branch name and code, current stock units and value, previous stock date, units and value, and days difference. | Baseline | `src/components/regional-distributor/RegionalDistributorTab.tsx#RegionalDistributorTab` | TC-RD-003 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-RD-001 | Upload Count = *uploaded* when current `stock_qty > 0`, and *not uploaded* when it is `0`. | Baseline | `src/pages/ScorecardDashboard.tsx#matchesUploadCount`, `src/features/salesDashboard/salesDashboardSlice.ts#UploadCountFilter` | TC-RD-002 |
| BR-RD-002 | Card value totals are shown in whole rupees. | Baseline | `src/components/regional-distributor/RegionalDistributorTab.tsx#fmtWhole` | TC-RD-003 |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-RD-001 | Each row has `ibl_distributor_code`, `distributor_desc`, `branch_code`, `branch_desc`, `stock_qty`, `stock_value`, `last_stock_qty`, `last_stock_value`, `last_stock_date` and `day_diff`. Numbers may arrive as strings and are coerced (`NaN` → 0). | Baseline | `src/api/rdStatus.ts#RdStatusApiRow` | — |

## API / Interface Contracts

`GET /rd-status` (operation `getRdStatus`).

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-RD-001 | A failed request leaves the table empty (or showing its previous rows), and the totals at 0. | Baseline | `src/pages/ScorecardDashboard.tsx#rdStatusRows` | — |

## Security Requirements

Not applicable beyond FR-PERM-005.

## Non-Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| NFR-RD-001 | The `/rd-status` query takes about 12 s. It is loaded in the background (last in the queue) so the tab usually opens with a warm cache. | Baseline | `src/api/rdStatus.ts#useGetRdStatus` | — |

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-RD-001 | Given Upload Count = *not uploaded*, then only RDs with current stock 0 are listed, and the totals add up over just those rows. | FR-RD-002, FR-RD-003, BR-RD-001 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-RD-001 | Set To to a future date | Request `date` = today | FR-RD-001 | Manual |
| TC-RD-002 | Combine a Branch Code with Upload Count | Rows match both | FR-RD-002, BR-RD-001 | Manual |
| TC-RD-003 | Sum the table columns by hand | Matches the stat boxes | FR-RD-003, FR-RD-004, BR-RD-002 | Manual |

## Dependencies

- [FEAT-FILT](FEAT-FILT-filter-bar.md) (RD filters), [FEAT-LOAD](FEAT-LOAD-load-queue.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-006 | `date` is ignored. The tab always shows today |
| GAP-009 | The date cap uses the UTC date |
| GAP-019 | The "fires on mount" code comment is stale |
| GAP-020 | The `branch` filter is shared with the other tabs |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
| 2026-11-11 | 2.0 (story S4) shows these figures on Distribution & Data Health (FR-EXEC-009). With scorecard-be v2, `/rd-status` answers "not available yet" until distributor stock with branch is in BigQuery (FR-EXEC-020). No requirement here changed | Claude Code (stories S3, S4) | — |
