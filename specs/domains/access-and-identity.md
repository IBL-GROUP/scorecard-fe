---
id: DOM-ACC
title: Access and identity
type: domain
area: ACC
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Access and Identity Domain

## Purpose

This domain covers who the user is, whether they may use Supply Chain Pulse,
which sections they may see, and how their session moves between OneThunder
dashboards. Identity, roles and permissions are **owned by
`authenticator-be`**. This app only consumes them.

## Responsibilities

| Responsibility | Spec |
|---|---|
| Ticket handoff, token storage, cross-app sign-out, `401` handling | [FEAT-AUTH](../features/FEAT-AUTH-session-handoff.md) |
| Dashboard and tab gating, query gating | [FEAT-PERM](../features/FEAT-PERM-permissions.md) |
| Display name, dashboard switching, logout | [FEAT-NAV](../features/FEAT-NAV-user-menu.md) |
| Usage and export telemetry | [FEAT-USG](../features/FEAT-USG-usage-tracking.md) |

## Boundaries

- **Inside this app**: handling tokens in the browser and hiding UI.
- **`authenticator-be`**: issues tickets and JWTs, stores roles and
  permissions, records usage.
- **`scorecard-be`**: verifies the JWT on every request. It does **not** check
  sections (GAP-002).
- **The portal**: login, logout and the `ot_session_user` cookie.

```
Portal ──?t=ticket──> scorecard-fe ──POST /auth/ticket/redeem──> authenticator-be
                          │  GET /me/permissions, /profile, /dashboards/user-reports
                          │  POST /usage/heartbeat, /usage/export, /auth/ticket
                          └──Bearer JWT──> scorecard-be (verifies signature)
```

## Related Specifications

- [`authenticator-be.openapi.json`](../api/authenticator-be.openapi.json)
- [System context](../architecture/system-context.md)

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-002 | Section permissions are enforced only in the browser |
| GAP-021 | A permissions outage is shown as *No access* |
