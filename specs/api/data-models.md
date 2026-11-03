---
id: API-DATA
title: Data models
type: api
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Data Models

## Client state

### Redux `salesDashboard` (`src/features/salesDashboard/salesDashboardSlice.ts`)

| Field | Type | Default | Notes |
|---|---|---|---|
| `mainTab` | `'supplyChain' \| 'serviceMeasure' \| 'dispatchWip' \| 'regionalDistributor'` | `supplyChain` | Falls back to the first permitted tab (FR-PERM-006) |
| `activeTab` | `'visualizations' \| 'tables'` | `visualizations` | Not used by the current UI |
| `displayMode` | `'TP' \| 'EFP'` | `TP` | The toggle is commented out (GAP-015) |
| `filters.dateFrom` / `dateTo` | `YYYY-MM-DD` | 1st of the month / today (local) | FR-FILT-001 |
| `filters.division` | `string[]` | `[]` | Expanded to SKUs (FR-FILT-006) |
| `filters.classification` | `string[]` | `[]` | A, B, C, N, Others |
| `filters.sku` | `string[]` | `[]` | |
| `filters.branch` | `string[]` | `[]` | Sales branch IDs, **or** RD branch codes on RD Data Status (GAP-020) |
| `filters.distributor`, `branchName`, `distributorName` | `string[]` | `[]` | RD Data Status only |
| `filters.uploadCount` | `'' \| 'uploaded' \| 'not-uploaded'` | `''` | BR-RD-001 |

### Browser storage

| Key | Store | Content |
|---|---|---|
| `searle_token_scorecard` | sessionStorage | Access JWT (SEC-AUTH-002) |
| `searle_usage_session_scorecard` | sessionStorage | Usage session UUID (BR-USG-002) |
| `ot_session_user` | cookie (read-only here) | Portal user ID, or empty after logout |

### JWT claims read (DR-AUTH-001)

`exp`, `sub` (`user_login_id`), `user_name` and `email_id`.

## Response envelope (`scorecard-be`)

```json
{ "success": true, "count": 4, "data": [ { "classification": "A", "amount": "1234.5" } ] }
{ "success": false, "message": "…", "error": "…" }      // HTTP 500 (400 for /rd-status bad date)
```

Numeric columns from PostgreSQL may arrive as **strings**. Every consumer
coerces with `Number(…)`, and treats `null` as "no value" ("—"), not 0.

## Response rows

The per-endpoint row schemas are in
[`scorecard-be.openapi.json`](scorecard-be.openapi.json) under
`components.schemas`, for example `CoverDaysRow`, `BenchmarkRow` and
`RdStatusRow`. Source tables and views are listed in TECHNICAL_DOCUMENT.md §11.
