---
id: ARCH-001
title: System context
type: architecture
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# System Context

```
                        ┌──────────────────────────────┐
  user ──login──────────▶  OneThunder portal (auth-fe)  │ sets cookie ot_session_user
                        └──────────────┬───────────────┘
                                       │ /scorecard-dashboard/?t=<ticket>
                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ scorecard-fe (this repo) — React SPA, nginx :3004, /scorecard-dashboard/ │
└──────┬───────────────────────────────────────────────┬──────────────┘
       │ redeem ticket, /me/permissions, /profile,     │ GET /api/* (Bearer JWT)
       │ /dashboards/user-reports, /usage/*            │
       ▼                                               ▼
┌────────────────────────┐                  ┌────────────────────────┐
│ authenticator-be :4002 │                  │ scorecard-be :3005     │──▶ PostgreSQL
│ (identity, RBAC, usage)│                  │ (verifies JWT locally) │    primary_secondary_sales_db
└────────────────────────┘                  └────────────────────────┘
```

| System | Owner repo | Relationship | Contract |
|---|---|---|---|
| OneThunder portal | `searle-authenticator-fe` | Sends users in with a ticket; owns login, logout and `ot_session_user` | URL and cookie conventions ([FEAT-AUTH](../features/FEAT-AUTH-session-handoff.md)) |
| `authenticator-be` | `searle-authenticator-be` | Tickets, JWTs, permissions, profile, dashboard list, usage | [`authenticator-be.openapi.json`](../api/authenticator-be.openapi.json) |
| `scorecard-be` | `scorecard-be` | All metrics | [`scorecard-be.openapi.json`](../api/scorecard-be.openapi.json); formulas in TECHNICAL_DOCUMENT.md |
| Other OneThunder dashboards | `DSR-fe`, … | Share the origin. Reached through ticket handoff | [FEAT-NAV](../features/FEAT-NAV-user-menu.md) |

## Environments

| Environment | Dashboard | scorecard-be | authenticator-be |
|---|---|---|---|
| Local | `http://localhost:5175/scorecard-dashboard/` | `http://localhost:3005/api` | `http://localhost:4002/api` |
| Dev / sandbox | `https://dev.onethunder.iblgrp.com/scorecard-dashboard/` | `https://dev-scorecard.onethunder.iblgrp.com/api` | `https://dev-login.onethunder.iblgrp.com/api` |

URLs are baked in at build time (`VITE_*`). Changing one means rebuilding the
image (see README → Deployment).

## Cross-repository ownership rule

When a change crosses a boundary (a new field, a parameter that starts being
honoured, a permission enforced server-side), the **owning** repo changes its
behaviour, and this repo updates the matching contract in `specs/api/` in the
PR that consumes it.
