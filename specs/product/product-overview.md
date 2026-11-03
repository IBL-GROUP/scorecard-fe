---
id: PRD-001
title: Supply Chain Pulse 1.0 — product overview
type: product
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Supply Chain Pulse 1.0 — Product Overview

> **Baseline.** This describes the product as built and as described in the
> existing README and TECHNICAL_DOCUMENT. Goals and success measures have
> **not** yet been confirmed by a product owner. See the open questions below.

## Problem

The TSCL / IBL supply-chain teams need one place to judge supply-chain health:
whether sales are on target, whether stock covers demand, whether branches are
over- or under-stocked, whether orders are being delivered, and whether
regional distributors are reporting their stock.

## Users

| User | Needs | Section permission |
|---|---|---|
| Supply-chain / sales management | Headline position by classification | `SUMMARY` |
| Inventory planners | Per-branch and per-SKU stock health | `SERVICE_MEASURE` |
| Production / supply planners | Fulfilment, WIP and material stock | `DISPATCH_WIP` |
| Distribution / data operations | RD stock upload compliance | `RD_DATA_STATUS` |

Access is granted per section by the OneThunder authenticator.

## Capabilities

| Capability | Spec |
|---|---|
| Single sign-on handoff from the OneThunder portal | [FEAT-AUTH](../features/FEAT-AUTH-session-handoff.md) |
| Per-section access | [FEAT-PERM](../features/FEAT-PERM-permissions.md) |
| Summary: sales, cover days, forecast and budget accuracy | [FEAT-SUM](../features/FEAT-SUM-summary-tab.md) |
| Service Measure: inventory days, service measure, thresholds | [FEAT-SVC](../features/FEAT-SVC-service-measure-tab.md) |
| Dispatch & WIP: fulfilment, WIP, RMPM | [FEAT-DSP](../features/FEAT-DSP-dispatch-wip-tab.md) |
| RD Data Status | [FEAT-RD](../features/FEAT-RD-rd-data-status-tab.md) |
| Filtering by date, division, classification, SKU and branch | [FEAT-FILT](../features/FEAT-FILT-filter-bar.md) |
| Excel export | [FEAT-TBL](../features/FEAT-TBL-data-tables.md) |
| Usage analytics for the platform team | [FEAT-USG](../features/FEAT-USG-usage-tracking.md) |
| Moving between OneThunder dashboards, in-app user manual | [FEAT-NAV](../features/FEAT-NAV-user-menu.md) |

## Product-level non-functional expectations (observed, not agreed)

- Data is as fresh as the backend's source tables. The client caches for 5
  minutes.
- Some queries are slow (about 12 s for RD status, up to about a minute for
  Service Measure stock). The app loads tab by tab to bound database load
  ([FEAT-LOAD](../features/FEAT-LOAD-load-queue.md)).
- Desktop browsers. The layout is responsive, but there is no stated mobile
  requirement.

## Open questions for the product owner

1. What are the agreed success measures (adoption, decision latency, data freshness)?
2. Is server-side section enforcement required (GAP-002)?
3. Should RD Data Status support past dates (GAP-006)?
4. Should sections ignore filters they cannot honour, or should the filter bar hide them (GAP-005)?
5. Who owns the benchmark and threshold values in `cover_days`?
