---
id: FEAT-SVC
title: Service Measure tab
type: feature
area: SVC
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Service Measure Tab (`serviceMeasure`)

## Overview

The Service Measure tab shows inventory health per branch and SKU: cover days
by branch, the share of SKUs above their class threshold, and actual cover days
against the threshold. It needs `SERVICE_MEASURE.VIEW`.

## Goals and Scope

**In scope**: the four sections and their browser-side shaping.
**Out of scope**: the backend formulas. See [supply-chain metrics](../domains/supply-chain-metrics.md).

## Actors

| Actor | Description |
|---|---|
| Supply-chain planner | Checks which branches and SKUs are over- or under-stocked |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-SVC-001 | **Inventory Days**: a collapsible table from `/inventory-days`. Classification rows expand to SKU rows, with one column per 14 fixed branches plus Total. A banner shows each class's threshold from `/cover-days/benchmarks` ("—" when unset). | Baseline | `src/pages/ScorecardDashboard.tsx#INV_API_BRANCHES`, `src/pages/ScorecardDashboard.tsx#BenchmarkBanner` | TC-SVC-001 |
| FR-SVC-002 | **Service Measure by Branch**: % of SKUs above threshold per branch for A/B/C/N. It is fetched twice: once with every filter, and once without `branch`, so that every branch can always be shown. | Baseline | `src/pages/ScorecardDashboard.tsx#allBranchesServiceMeasureData`, `src/components/service-measure-chart/ServiceMeasureChart.tsx` | TC-SVC-002 |
| FR-SVC-003 | **Cover Days Threshold vs Actual**: a table of `cover_days_tgt` (threshold) against `cover_days` per class, from `/tgt-vs-actual`. | Baseline | `src/pages/ScorecardDashboard.tsx#tgtVsActualData` | TC-SVC-003 |
| FR-SVC-004 | **SKUs Against Threshold**: SKU counts above and below the threshold per class, from `/above-below-threshold`. Rows are filtered to the selected classes **in the browser**, and classes with zero SKUs are dropped. | Baseline | `src/pages/ScorecardDashboard.tsx#skusThresholdData` | TC-SVC-004 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-SVC-001 | The Inventory Days branch columns are fixed: Bahawalpur, DSS Korangi, Faisalabad, Gujranwala, Hyderabad, Islamabad, Karachi, Korangi, Lahore, Mingora, Multan, Peshawar, Quetta and Sukkur (they match the backend pivot). | Baseline | `src/pages/ScorecardDashboard.tsx#INV_API_BRANCHES` | TC-SVC-001 |
| BR-SVC-002 | Thresholds are not hard-coded. They come from the versioned `cover_days` table, as of the To date (BR-MET-003). | Baseline | `src/pages/ScorecardDashboard.tsx#thresholdDays` | TC-SVC-001 |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-SVC-001 | `/above-below-threshold` rows use the literal keys `No Of SKUs > Threshold` and `No Of SKUs < Threshold`. | Baseline | `src/pages/ScorecardDashboard.tsx#ThresholdRow` | — |

## API / Interface Contracts

`/inventory-days`, `/service-measure` (×2), `/tgt-vs-actual`,
`/above-below-threshold` and `/cover-days/benchmarks`. See
[`scorecard-be.openapi.json`](../api/scorecard-be.openapi.json) (tag `ServiceMeasure`).

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-SVC-001 | A failed request leaves its section empty, or showing its previous values. Tables show their loading state while fetching. | Baseline | `src/pages/ScorecardDashboard.tsx#isLoadingInventoryDays` | — |

## Security Requirements

Not applicable beyond FR-PERM-005.

## Non-Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| NFR-SVC-001 | The Service Measure stock query can take about a minute. Requests have no client timeout (GAP-017). | Baseline | `src/config/axios.ts#timeout` | — |

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-SVC-001 | Given the Branches filter = Lahore, then the filtered Service Measure call carries `branch`, and the all-branches call does not. | FR-SVC-002 |
| AC-SVC-002 | Given Classification = A, then SKUs Against Threshold shows only class A, even though the endpoint returns A/B/C/N. | FR-SVC-004 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-SVC-001 | Open Inventory Days and expand class A | 14 branch columns + Total. Threshold banner matches `cover_days` | FR-SVC-001, BR-SVC-001, BR-SVC-002 | Manual |
| TC-SVC-002 | Apply a branch filter. Inspect the two `/service-measure` calls | One with `branch`, one without | FR-SVC-002 | Manual |
| TC-SVC-003 | Compare the table with the `/tgt-vs-actual` response | Values match | FR-SVC-003 | Manual |
| TC-SVC-004 | Classification = A; then a SKU filter that empties B/C/N | Only A is shown | FR-SVC-004 | Manual |

## Dependencies

- [FEAT-LOAD](FEAT-LOAD-load-queue.md), [FEAT-TBL](FEAT-TBL-data-tables.md),
  [supply-chain metrics](../domains/supply-chain-metrics.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-001 | The stock snapshot is hard-coded to April 2026 in the backend |
| GAP-005 | `/above-below-threshold` ignores `classification` |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
| 2026-11-11 | Contract: `TgtVsActualRow.cover_days_tgt` marked nullable (null when no benchmark is in force on endDate). Documents existing behaviour; no requirement changed | Story S2 (BigQuery backend) | — |
| 2026-11-11 | 2.0 (story S4) shows these figures on Inventory & Working Capital (FR-EXEC-007, FR-EXEC-023). No requirement here changed | Claude Code (stories S3, S4) | — |
| 2026-11-12 | Contract: `InventoryDaysRow.total` marked nullable (null when no branch has cover days for the item, i.e. no target). Documents existing behaviour (PostgreSQL `AVG` of no values is also null); no requirement changed. In the 2.0 backend, `sales_inv_locations` is now read from `EDW.hub_mapping` (data team, 12 Nov 2026), so `/inventory-days`, `/service-measure` and the `branch` filter return data | Story S2 (BigQuery backend) | — |
