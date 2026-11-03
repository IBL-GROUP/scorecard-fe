---
id: DOM-MET
title: Supply-chain metrics
type: domain
area: MET
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Supply-Chain Metrics Domain

## Purpose

This domain defines the figures the dashboard reports: classification, stock
scope, cover days, benchmarks, accuracy measures and service measure. The
calculations run in **`scorecard-be`** (SQL). This frontend displays them and
must not re-derive them, except for the presentation rules in the tab specs.

## Responsibilities

| Concern | Owner | Notes |
|---|---|---|
| Formulas, filters applied, data sources | `scorecard-be` | Detailed in TECHNICAL_DOCUMENT.md §5–§6, §11 |
| Rounding, "—" for missing values, share %, days-gone pill | `scorecard-fe` | See FEAT-SUM, FEAT-SVC |
| Benchmark and threshold values | Business (the `cover_days` table) | Versioned by `effective_date` |

### Business rules (owned by `scorecard-be`, relied on by this frontend)

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-MET-001 | Products are classified as A, B, C or N through `vw_items_class.mapping_code`. Anything unclassified is **Others**. SAP item codes resolve through `sap_items_detail` (`mapping_code`, else `matnr`). | Baseline | scorecard-be, `TECHNICAL_DOCUMENT.md` | — |
| BR-MET-002 | `daily_target = Σ target_value for the month of endDate ÷ days in that month`. `cover_days = inventory value ÷ daily_target`, rounded to 1 decimal. Inventory value (TP) = `qty × trade_price`, and EFP = `qty × item_cost`. With no target loaded, `cover_days` is `null`. | Baseline | scorecard-be, `TECHNICAL_DOCUMENT.md` | — |
| BR-MET-003 | Benchmarks (`days`) and thresholds (`threshold`) per classification come from `cover_days`, versioned by `effective_date`. The value in force on a date is the latest row with `effective_date ≤ endDate`. `0` or missing means "not set": the UI shows "—", and nothing counts as above that threshold. | Baseline | scorecard-be, `src/api/coverDays.ts#useGetCoverDaysBenchmarks` | — |
| BR-MET-004 | Forecast accuracy (IBL) = TP sales `Σ amount` in the window ÷ IBL target (`mv_tscl_spl_targets`, month of endDate), returned as a ratio. | Baseline | scorecard-be, `TECHNICAL_DOCUMENT.md` | — |
| BR-MET-005 | Budget accuracy (TSCL) = EFP sales (`sold_qty × latest "SALE E.F.P"`) ÷ TSCL budget (`mv_tscl_budget`, month of endDate, no fallback), returned as a ratio. Sales run from startDate to endDate − 1 day (GAP-004). | Baseline | scorecard-be, `TECHNICAL_DOCUMENT.md` | — |
| BR-MET-006 | Forecast vs Budget % = `ibl_target ÷ tscl_target × 100`, per class plus Total. `branch` narrows only the IBL side. | Baseline | scorecard-be, `TECHNICAL_DOCUMENT.md` | — |
| BR-MET-007 | Service measure per branch = SKUs whose cover days exceed their class threshold ÷ targeted SKUs × 100. Cover days ≥ 9999 do not count as above. | Baseline | scorecard-be, `TECHNICAL_DOCUMENT.md` | — |
| BR-MET-008 | Stock scope: business lines `P07, P08, P12, P01, P35`; sub-inventories `80%`, `8206`, `8210`; the snapshot is the latest closing (or opening) date in the window. | Baseline | scorecard-be, `TECHNICAL_DOCUMENT.md` | — |

## Boundaries

- **Inside**: the definitions of every reported figure.
- **Outside**: which filters each endpoint honours (see
  [`scorecard-be.openapi.json`](../api/scorecard-be.openapi.json)), and the UI.
- A change to any BR-MET rule is a **backend** change. It needs a matching
  update here, in TECHNICAL_DOCUMENT.md, and in the contract when fields change.

## Related Specifications

- [FEAT-SUM](../features/FEAT-SUM-summary-tab.md), [FEAT-SVC](../features/FEAT-SVC-service-measure-tab.md),
  [FEAT-DSP](../features/FEAT-DSP-dispatch-wip-tab.md), [FEAT-RD](../features/FEAT-RD-rd-data-status-tab.md).
- [Data models](../api/data-models.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-001 | Inventory Days and Service Measure stock is hard-coded to April 2026 |
| GAP-004 | Budget accuracy drops the last day |
| GAP-007 | Dates are not validated. Stale March 2026 default |
