---
id: FEAT-SUM
title: Summary tab
type: feature
area: SUM
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Summary Tab (`supplyChain`)

## Overview

The Summary tab gives the headline supply-chain position by classification:
SKU counts against benchmarks, sales, inventory cover days, and forecast and
budget accuracy. It is the first tab and the first in the load queue. It needs
`SUMMARY.VIEW`.

## Goals and Scope

**In scope**: what each Summary section shows, and every calculation the
browser does on top of the API figures.

**Out of scope**: the SQL behind each figure. That is owned by `scorecard-be`
and summarised in [supply-chain metrics](../domains/supply-chain-metrics.md).

## Actors

| Actor | Description |
|---|---|
| Supply-chain / sales manager | Reviews classification health for the selected window |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-SUM-001 | **Benchmark card**: for each of A, B, C and N, shows the SKU count from `/total-sku` and the benchmark cover days from `/cover-days/benchmarks` in force on the To date (or today). A missing or 0 benchmark shows "—". | Baseline | `src/pages/ScorecardDashboard.tsx#benchmarkDays`, `src/pages/ScorecardDashboard.tsx#skuCounts` | TC-SUM-001 |
| FR-SUM-002 | **Sales Summary**: one row per classification from `/sales-summary`, with SKU count, sales (whole numbers, `en-US` grouping) and share of total, plus a 100% total row. | Baseline | `src/pages/ScorecardDashboard.tsx#salesRows`, `src/components/sales-summary/SalesSummaryCard.tsx` | TC-SUM-002 |
| FR-SUM-003 | **Cover Days**: cards for Total, A, B, C, N and Others, each with TP and EFP cover days, inventory value and quantity. Total comes from `/cover-days/total`. If that row is missing, it is computed from the class rows (BR-SUM-003). The "as of" date is `/cover-days/closing-inv`. | Baseline | `src/pages/ScorecardDashboard.tsx#coverDaysRows`, `src/pages/ScorecardDashboard.tsx#CoverDaysSection` | TC-SUM-003 |
| FR-SUM-004 | **Forecast Accuracy IBL**: the gauge shows `/forecast-accuracy-monthly` accuracy (BR-SUM-002), with achieved sales and target. The days-gone target is `/forecast-accuracy-monthly/daysgone` with `endDate` capped at today. | Baseline | `src/pages/ScorecardDashboard.tsx#tsclAccuracy`, `src/pages/ScorecardDashboard.tsx#tsclDaysGoneInfo` | TC-SUM-004 |
| FR-SUM-005 | **Budget Accuracy TSCL**: the gauge shows `/forecast-accuracy-yearly` accuracy (BR-SUM-002), with EFP sales and budget. The days-gone target is the response's `target_to_date`, which the backend prorates. | Baseline | `src/pages/ScorecardDashboard.tsx#iblAccuracy`, `src/pages/ScorecardDashboard.tsx#iblDaysGoneInfo` | TC-SUM-004 |
| FR-SUM-006 | Under each gauge, bars show accuracy % per classification per month for the three calendar months ending with the To date's month. IBL uses `/forecast-accuracy-category-monthly`, TSCL uses `/forecast-accuracy-category-yearly`. Months are sorted in time order, and values are rounded to 1 decimal. | Baseline | `src/pages/ScorecardDashboard.tsx#forecastBarData`, `src/pages/ScorecardDashboard.tsx#iblBarData` | TC-SUM-005 |
| FR-SUM-007 | **Forecast Vs Budget %**: bars for Total plus each class from `/ibl-vs-tscl`, rounded to whole percent. A class filter limits the bars to the selected classes, and classes with no row are dropped. Total always stays. | Baseline | `src/pages/ScorecardDashboard.tsx#pctSkusData` | TC-SUM-006 |
| FR-SUM-008 | Each gauge shows a "Days Gone" pill, `round(daysGone ÷ totalDays × 100)`%. The raw count is hidden (`SHOW_DAYS_GONE_COUNT = false`). | Baseline | `src/pages/ScorecardDashboard.tsx#DaysGone` | TC-SUM-004 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-SUM-001 | `totalDays` = days from the 1st of the From date's month to the last day of the To date's month. `daysGone` = days from From to min(To, today), clamped to `[1, totalDays]` (GAP-012). | Baseline | `src/pages/ScorecardDashboard.tsx#getDaysGone` | TC-SUM-004 |
| BR-SUM-002 | Gauge accuracy % = `round(pct × 100, 1 decimal)`, where `pct` is the API's ratio. When the target is ≤ 0, accuracy is `null` (no value) and the target reads "—". | Baseline | `src/pages/ScorecardDashboard.tsx#fmtTarget`, `src/pages/ScorecardDashboard.tsx#tsclAccuracy` | TC-SUM-004 |
| BR-SUM-003 | Sales share % = `amount ÷ Σ amount × 100`, to 1 decimal. Fallback total cover days = `round(Σ inv_val ÷ Σ daily_target)`, or 0 when Σ daily_target = 0. | Baseline | `src/pages/ScorecardDashboard.tsx#totalSales`, `src/pages/ScorecardDashboard.tsx#totalCoverDays` | TC-SUM-002 |
| BR-SUM-004 | Cover days are shown rounded to whole days. `null` (no target loaded) shows "—", which is different from a real 0. | Baseline | `src/pages/ScorecardDashboard.tsx#fmtCoverDays` | TC-SUM-003 |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-SUM-001 | The response fields used are listed per operation in `scorecard-be.openapi.json` (tagged `Summary`). | Baseline | `specs/api/scorecard-be.openapi.json` | TC-SPEC-006 |

## API / Interface Contracts

`/total-sku`, `/cover-days/benchmarks`, `/sales-summary`, `/cover-days`,
`/cover-days/total`, `/cover-days/closing-inv`, `/forecast-accuracy-monthly`,
`/forecast-accuracy-monthly/daysgone`, `/forecast-accuracy-yearly`,
`/forecast-accuracy-category-monthly`, `/forecast-accuracy-category-yearly` and
`/ibl-vs-tscl`. See [`scorecard-be.openapi.json`](../api/scorecard-be.openapi.json).

> The variable names in `ScorecardDashboard.tsx` are swapped relative to the
> card titles: `iblAccuracy` feeds **Budget Accuracy TSCL** and `tsclAccuracy`
> feeds **Forecast Accuracy IBL**. The data matches the titles.

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-SUM-001 | A failed or empty response leaves its section empty, or showing its previous values. There is no per-section error message. | Baseline | `src/pages/ScorecardDashboard.tsx#apiRows` | — |

## Security Requirements

Not applicable beyond FR-PERM-005. Queries need `SUMMARY`.

## Non-Functional Requirements

Not applicable. No agreed targets.

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-SUM-001 | Given `/sales-summary` returns A = 600 and B = 400, then the Sales Summary shows A 60.0% and B 40.0%, and the total is 1,000. | FR-SUM-002, BR-SUM-003 |
| AC-SUM-002 | Given `/forecast-accuracy-monthly` returns `pct = 0.8734` with a positive target, then the Forecast Accuracy IBL gauge reads 87.3%. With target 0, it shows no value and the target is "—". | FR-SUM-004, BR-SUM-002 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-SUM-001 | Set a benchmark row to 0 in `cover_days` | That class shows "—" | FR-SUM-001 | Manual |
| TC-SUM-002 | Compare the Sales Summary with the `/sales-summary` response | Share % and totals match BR-SUM-003 | FR-SUM-002, BR-SUM-003 | Manual |
| TC-SUM-003 | A month with no targets loaded | Cover days show "—", not 0 | FR-SUM-003, BR-SUM-004 | Manual |
| TC-SUM-004 | Window 1st–15th of the current month, today = 10th | daysGone 10 of 30/31. Gauges per BR-SUM-002. Daysgone call has `endDate` = today | FR-SUM-004, FR-SUM-005, FR-SUM-008, BR-SUM-001, BR-SUM-002 | Manual |
| TC-SUM-005 | To date in July | Bars show May, June and July in order | FR-SUM-006 | Manual |
| TC-SUM-006 | Filter Classification = A, then a SKU in class B only | Bars: Total + A; then Total + B | FR-SUM-007 | Manual |

The pure calculations (`getDaysGone`, share %, rounding) are the best first
candidates for unit tests once a runner exists (GAP-014).

## Dependencies

- [FEAT-FILT](FEAT-FILT-filter-bar.md), [FEAT-LOAD](FEAT-LOAD-load-queue.md),
  [supply-chain metrics](../domains/supply-chain-metrics.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-004 | Budget Accuracy excludes the last selected day |
| GAP-009 | The days-gone cap uses the UTC date |
| GAP-010 | Prorating moved to the backend. Docs are stale. An unused `date` parameter is sent |
| GAP-012 | Days-gone definition differs between the docs and the code |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
