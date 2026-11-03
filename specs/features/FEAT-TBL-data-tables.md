---
id: FEAT-TBL
title: Data tables and Excel export
type: feature
area: TBL
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Data Tables and Excel Export

## Overview

`DataTable` is the shared table used across the tabs. It provides search,
sorting, pagination, collapsible rows and an Excel export.

## Goals and Scope

**In scope**: generic table behaviour. **Out of scope**: what each table shows.
See the tab specs.

## Actors

| Actor | Description |
|---|---|
| Dashboard user | Searches, sorts and exports tables |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-TBL-001 | Search (on by default) keeps the rows where any cell contains the query, ignoring case. | Baseline | `src/components/data-table/DataTable.tsx#searchable` | TC-TBL-001 |
| FR-TBL-002 | Clicking a header sorts by that column, ascending first, and a second click reverses it. Values that parse as numbers (ignoring formatting) sort numerically; the rest sort alphabetically. Sorting returns to page 1. | Baseline | `src/components/data-table/DataTable.tsx#compareValues`, `src/components/data-table/DataTable.tsx#handleSort` | TC-TBL-002 |
| FR-TBL-003 | Body rows are paginated at 15 per page by default. Total and pinned-top rows stay visible outside pagination and sorting. | Baseline | `src/components/data-table/DataTable.tsx#pageSize`, `src/components/data-table/DataTable.tsx#pinnedRows` | TC-TBL-003 |
| FR-TBL-004 | Export writes `<exportName or title or "export">.xlsx` (one sheet) with every body row matching the current search, in the current sort order and across all pages, plus their sub-rows. Each export is recorded (FR-USG-004). | Baseline | `src/components/data-table/DataTable.tsx#handleExport` | TC-TBL-004 |

## Business Rules

Not applicable. The table applies no business rules.

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-TBL-001 | Rows pass their display strings as `cells[]`. Search, sort and export read these strings, not the raw numbers. | Baseline | `src/components/data-table/DataTable.tsx#getCellValue` | — |

## API / Interface Contracts

Props: `DataTableProps` (`title`, `exportName`, `headers`, `pageSize`,
`searchable`, `collapsible`, `rowCollapsible`, …).

## Error Handling

Not applicable. The table renders whatever rows it is given, and `isLoading`
shows a loading state.

## Security Requirements

Not applicable.

## Non-Functional Requirements

Not applicable.

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-TBL-001 | Given a 40-row table filtered by search to 20 rows, when exported, then the sheet has those 20 rows (and their sub-rows), not 15. | FR-TBL-004 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-TBL-001 | Search for "lah" | Only rows containing "Lahore" (any case) | FR-TBL-001 | Manual |
| TC-TBL-002 | Sort a column with values like "1,200" and "900" | Numeric order | FR-TBL-002 | Manual |
| TC-TBL-003 | Table with more than 15 rows and a total row | Pagination appears. The total row stays | FR-TBL-003 | Manual |
| TC-TBL-004 | Search, then export | The sheet matches the search across pages. No total row (GAP-024) | FR-TBL-004 | Manual |

## Dependencies

- `xlsx` (SheetJS) 0.18; [FEAT-USG](FEAT-USG-usage-tracking.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-024 | Export leaves out total and pinned rows |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
