---
id: DOM-DASH
title: Dashboard experience
type: domain
area: DASH
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Dashboard Experience Domain

## Purpose

This domain covers how users explore the metrics: the tabs, the filter bar,
the order in which data loads, tables and exports.

## Responsibilities

| Responsibility | Spec |
|---|---|
| Summary tab | [FEAT-SUM](../features/FEAT-SUM-summary-tab.md) |
| Service Measure tab | [FEAT-SVC](../features/FEAT-SVC-service-measure-tab.md) |
| Dispatch & WIP tab | [FEAT-DSP](../features/FEAT-DSP-dispatch-wip-tab.md) |
| RD Data Status tab | [FEAT-RD](../features/FEAT-RD-rd-data-status-tab.md) |
| Filters and their mapping to request parameters | [FEAT-FILT](../features/FEAT-FILT-filter-bar.md) |
| Load order and query conventions | [FEAT-LOAD](../features/FEAT-LOAD-load-queue.md) |
| Tables, search, sort, Excel export | [FEAT-TBL](../features/FEAT-TBL-data-tables.md) |

## Boundaries

- **Inside**: React components, Redux UI state (`salesDashboard`) and the
  shaping of API rows for display.
- **Outside**: metric definitions ([supply-chain metrics](supply-chain-metrics.md))
  and access ([access & identity](access-and-identity.md)).

## Related Specifications

- [Frontend architecture](../architecture/frontend-architecture.md)
- [Frontend standards](../standards/frontend-standards.md)

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-015 | Dead code |
| GAP-016 | Stale `STRUCTURE.md` / `API_GUIDE.md` |
| GAP-017 | Verbose logging, no request timeout |
| GAP-018 | `.env` files committed |
| GAP-022 | `ScorecardDashboard.tsx` is ~2,600 lines |
| GAP-023 | Non-reproducible Docker install |
