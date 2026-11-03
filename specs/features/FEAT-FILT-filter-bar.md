---
id: FEAT-FILT
title: Filter bar
type: feature
area: FILT
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Filter Bar

## Overview

One filter bar above every tab narrows the data by date window, division,
classification, SKU and branch, or, on RD Data Status, by RD attributes. The
user stages selections locally and applies them together.

## Goals and Scope

**In scope**: which filters each tab shows, staging/Apply/Clear, where options
come from, how filters turn into request parameters, and the Division → SKU
expansion.

**Out of scope**: how each endpoint uses a parameter. See
[`scorecard-be.openapi.json`](../api/scorecard-be.openapi.json) and the tab specs.

## Actors

| Actor | Description |
|---|---|
| Dashboard user | Chooses filters and presses Apply |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-FILT-001 | The default window runs from the 1st of the current month to today, in local time. | Baseline | `src/features/salesDashboard/salesDashboardSlice.ts#initialState` | TC-FILT-001 |
| FR-FILT-002 | Selections are staged locally and reach the store (and so the queries) only on **Apply**. | Baseline | `src/components/filter-bar/FilterBar.tsx#handleApply` | TC-FILT-002 |
| FR-FILT-003 | Summary and Service Measure show Division, Classification (multi), SKU (multi), Branches (multi), From and To. Dispatch & WIP shows only From and To. RD Data Status shows Branch Code, Branch, Distributor Code, Distributor, Upload Count and a single "As of" date. | Baseline | `src/components/filter-bar/FilterBar.tsx#hideBranchAndSku`, `src/components/filter-bar/FilterBar.tsx#isRdStatus` | TC-FILT-003 |
| FR-FILT-004 | Division, Classification and SKU options come from `GET /filters`. Branch options come from `GET /filters/branches`, de-duplicated by `hub_branch_code`. Both are fetched only for users who can see Summary or Service Measure. | Baseline | `src/components/filter-bar/FilterBar.tsx#useGetFilters`, `src/components/filter-bar/FilterBar.tsx#useGetFilterBranches` | TC-FILT-004 |
| FR-FILT-005 | Classification and SKU options are limited to the staged divisions. Changing divisions drops any classification or SKU that falls outside them. | Baseline | `src/components/filter-bar/FilterBar.tsx#divisionRows` | TC-FILT-005 |
| FR-FILT-006 | Division is never sent to an endpoint. With divisions chosen and no SKUs, every query receives the divisions' SKU codes as `sku`. SKUs picked by hand win. | Baseline | `src/api/filters.ts#useEffectiveSku` | TC-FILT-005 |
| FR-FILT-007 | Parameters by query: Summary and Service Measure send `startDate`, `endDate`, `classification[]`, `branch[]`, `sku[]` (only the ones set). Dispatch vs Order sends dates and `branch`. WIP and RMPM send dates only. `/forecast-accuracy-monthly/daysgone` caps `endDate` at today. The category accuracy and benchmark calls fall back to today's date for `endDate`. | Baseline | `src/pages/ScorecardDashboard.tsx#params`, `src/pages/ScorecardDashboard.tsx#dispatchParams`, `src/pages/ScorecardDashboard.tsx#dateOnlyParams`, `src/pages/ScorecardDashboard.tsx#daysGoneParams` | TC-FILT-006 |
| FR-FILT-008 | On RD Data Status, the RD dropdown options are built from the `/rd-status` response, which the filter bar fetches only while that tab is open. Choosing Branch Codes drops any distributors outside those branches. | Baseline | `src/components/filter-bar/FilterBar.tsx#isRdStatus` | TC-FILT-007 |
| FR-FILT-009 | **Clear** empties the staged selections and resets the store to the defaults (FR-FILT-001). See GAP-008 for inconsistencies. | Baseline | `src/components/filter-bar/FilterBar.tsx#handleClear`, `src/features/salesDashboard/salesDashboardSlice.ts#resetFilters` | TC-FILT-008 |
| FR-FILT-010 | The To picker cannot be set earlier than From (except on RD Data Status). | Baseline | `src/components/filter-bar/FilterBar.tsx#minDate` | TC-FILT-001 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-FILT-001 | Classifications are `A`, `B`, `C`, `N` and `Others`. They are sent as a repeated parameter (`IN (...)`). | Baseline | `src/features/salesDashboard/salesDashboardSlice.ts#classification` | TC-FILT-006 |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-FILT-001 | Dates are `YYYY-MM-DD` strings. Filter state lives in the Redux slice `salesDashboard.filters`. | Baseline | `src/features/salesDashboard/salesDashboardSlice.ts#Filters` | — |
| DR-FILT-002 | `/filters` rows provide `item_code`, `item_description`, `classification` and `division`. | Baseline | `src/api/filters.ts#FilterItemRow` | — |

## API / Interface Contracts

- `GET /filters`, `GET /filters/branches` (operations `getFilters`,
  `getFilterBranches`).
- Redux actions `setFilter({ key, value })` and `resetFilters()`.

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-FILT-001 | If the option requests fail, the dropdowns are empty, and the rest of the dashboard still works. | Baseline | `src/components/filter-bar/FilterBar.tsx#rows` | — |

## Security Requirements

Not applicable. Option requests are permission-gated per FR-PERM-005.

## Non-Functional Requirements

Not applicable. No specific targets have been agreed.

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-FILT-001 | Given the user changes Classification but does not press Apply, then no request is sent. On Apply, every visible section refetches with `classification` set. | FR-FILT-002, FR-FILT-007 |
| AC-FILT-002 | Given a Division is chosen and no SKU, when Apply is pressed, then report requests carry exactly that division's SKU codes as `sku`. | FR-FILT-006 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-FILT-001 | Open the dashboard. Try a To date before From | From = 1st of the month, To = today. To cannot go before From | FR-FILT-001, FR-FILT-010 | Manual |
| TC-FILT-002 | Change filters without Apply, then Apply | No request until Apply | FR-FILT-002 | Manual |
| TC-FILT-003 | Visit each tab | The filter set matches FR-FILT-003 | FR-FILT-003 | Manual |
| TC-FILT-004 | User with only `DISPATCH_WIP` | No `/filters` or `/filters/branches` request | FR-FILT-004 | Manual |
| TC-FILT-005 | Choose a Division | Classification and SKU options narrow. Requests carry the division's SKUs | FR-FILT-005, FR-FILT-006 | Manual |
| TC-FILT-006 | Apply classification, branch and SKU. Inspect the request query strings | They match FR-FILT-007 | FR-FILT-007, BR-FILT-001 | Manual |
| TC-FILT-007 | On RD Data Status, choose a Branch Code | Distributor options and selection narrow to that branch | FR-FILT-008 | Manual |
| TC-FILT-008 | Set filters, Apply, then Clear | The store returns to the defaults (watch GAP-008) | FR-FILT-009 | Manual |

## Dependencies

- [FEAT-LOAD](FEAT-LOAD-load-queue.md) (a filter change restarts the queue),
  [FEAT-RD](FEAT-RD-rd-data-status-tab.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-005 | Some endpoints ignore filters the bar offers |
| GAP-008 | Clear can desync the staged and applied filters |
| GAP-009 | UTC vs local "today" |
| GAP-011 | Division and multi-select classification are undocumented in README / TECHNICAL_DOCUMENT |
| GAP-020 | RD Data Status shares the `branch` filter with the other tabs |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
