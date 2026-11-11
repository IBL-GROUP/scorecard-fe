---
id: SPEC-INDEX
title: Specification index
type: index
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Supply Chain Pulse — Specifications

This folder is the **source of truth for what the dashboard must do**. Code
implements it, and tests prove it. Start with the
[workflow](standards/spec-first-workflow.md) if you are about to change
behaviour.

```bash
npm run specs:validate   # check specs (also runs in CI)
npm run specs:matrix     # regenerate traceability.md after editing requirements
npm run specs:test       # test the validator itself
```

## Status at a glance

All feature and domain specs are **`Baseline`**: reverse-engineered from the
code on 2026-11-03 and **not yet approved** by stakeholders. They describe
current behaviour. Anything doubtful is in [gaps.md](gaps.md), not in the
requirements. See the [migration plan](migration-plan.md).

## Map

| Category | Document | What it answers |
|---|---|---|
| **Start here** | [CONVENTIONS.md](CONVENTIONS.md) | ID format, statuses, table formats, the area registry |
| | [standards/spec-first-workflow.md](standards/spec-first-workflow.md) | How to create, review and update specs; PR rules |
| | [migration-plan.md](migration-plan.md) | What is done, and what comes next |
| **Assessment** | [assessment/repository-assessment.md](assessment/repository-assessment.md) | Modules, interfaces, tests and doc state at baseline |
| **Product** | [product/product-overview.md](product/product-overview.md) | Users, capabilities, open product questions |
| | [product/glossary.md](product/glossary.md) | What a business, code or API term means (cover days, benchmark, IBL, TSCL, EFP, RD…) |
| **Architecture** | [architecture/system-context.md](architecture/system-context.md) | Systems around the app, environments |
| | [architecture/frontend-architecture.md](architecture/frontend-architecture.md) | Component tree, layers, data flow |
| | [architecture/adr/](architecture/adr/ADR-0001-specification-first.md) | Architecture decision records |
| **Domains** | [domains/access-and-identity.md](domains/access-and-identity.md) | Session, permissions, identity (ACC) |
| | [domains/supply-chain-metrics.md](domains/supply-chain-metrics.md) | Metric definitions, BR-MET rules (MET) |
| | [domains/dashboard-experience.md](domains/dashboard-experience.md) | Tabs, filters, loading, tables (DASH) |
| **Features** | [features/FEAT-AUTH-session-handoff.md](features/FEAT-AUTH-session-handoff.md) | Ticket handoff, sign-out ★ critical |
| | [features/FEAT-PERM-permissions.md](features/FEAT-PERM-permissions.md) | Dashboard and tab gating ★ critical |
| | [features/FEAT-LOAD-load-queue.md](features/FEAT-LOAD-load-queue.md) | Tab-by-tab loading, query conventions |
| | [features/FEAT-FILT-filter-bar.md](features/FEAT-FILT-filter-bar.md) | Filters → request parameters ★ critical |
| | [features/FEAT-SUM-summary-tab.md](features/FEAT-SUM-summary-tab.md) | Summary tab ★ critical |
| | [features/FEAT-SVC-service-measure-tab.md](features/FEAT-SVC-service-measure-tab.md) | Service Measure tab |
| | [features/FEAT-DSP-dispatch-wip-tab.md](features/FEAT-DSP-dispatch-wip-tab.md) | Dispatch & WIP tab |
| | [features/FEAT-RD-rd-data-status-tab.md](features/FEAT-RD-rd-data-status-tab.md) | RD Data Status tab |
| | [features/FEAT-TBL-data-tables.md](features/FEAT-TBL-data-tables.md) | Search, sort, Excel export |
| | [features/FEAT-USG-usage-tracking.md](features/FEAT-USG-usage-tracking.md) | Heartbeats and export events |
| | [features/FEAT-NAV-user-menu.md](features/FEAT-NAV-user-menu.md) | User menu, dashboard switching, manual |
| | [features/FEAT-SPEC-spec-tooling.md](features/FEAT-SPEC-spec-tooling.md) | The validator (rules S01–S15) |
| **API and data contracts** | [api/README.md](api/README.md) | How the contracts work |
| | [api/scorecard-be.openapi.json](api/scorecard-be.openapi.json) | 22 metric endpoints (OpenAPI 3.0) |
| | [api/authenticator-be.openapi.json](api/authenticator-be.openapi.json) | 7 identity and usage endpoints |
| | [api/data-models.md](api/data-models.md) | Redux state, storage, response envelope |
| **Technical standards** | [standards/frontend-standards.md](standards/frontend-standards.md) | Coding conventions for hooks, queries, formatting |
| **Templates** | [templates/feature-spec.template.md](templates/feature-spec.template.md) | New feature spec |
| | [templates/adr.template.md](templates/adr.template.md) | New ADR |
| **Registers** | [gaps.md](gaps.md) | Known defects, ambiguities, doc drift |
| | [traceability.md](traceability.md) | Generated: requirement → code → test → AC |

## Related documents outside `specs/`

- [`../AGENTS.md`](../AGENTS.md): rules for AI coding agents.
- [`../README.md`](../README.md): setup, environment, deployment.
- [`../TECHNICAL_DOCUMENT.md`](../TECHNICAL_DOCUMENT.md): backend SQL and
  formula reference, shared with `scorecard-be`. Where it disagrees with
  these specs, see GAP-010, GAP-011 and GAP-012.
