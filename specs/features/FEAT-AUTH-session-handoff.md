---
id: FEAT-AUTH
title: Session handoff and sign-out
type: feature
area: AUTH
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Session Handoff and Sign-out

## Overview

Supply Chain Pulse has no login of its own. The OneThunder authenticator
portal sends the user here with a single-use ticket in the URL. The app swaps
that ticket for a JWT, keeps it for the browser tab, and drops it as soon as the
portal session ends. This is a **critical domain**: if it fails, nobody can use
the dashboard, or a signed-out user keeps their access.

## Goals and Scope

**Goals**

- A user who arrives from the portal is signed in without typing anything.
- The JWT never appears in a URL.
- Signing out of the portal, or switching portal users, ends this app's
  session too.

**In scope**: ticket redemption, token storage and expiry, cross-app sign-out
detection, the redirect to portal login, and handling of `401` responses.

**Out of scope**: permission checks ([FEAT-PERM](FEAT-PERM-permissions.md)),
switching to another dashboard and logout links
([FEAT-NAV](FEAT-NAV-user-menu.md)), and issuing tickets and JWTs (owned by
`authenticator-be`).

## Actors

| Actor | Description |
|---|---|
| Dashboard user | A OneThunder employee signed in on the portal |
| Authenticator portal (`searle-authenticator-fe`) | Issues the ticket and owns the `ot_session_user` cookie |
| `authenticator-be` | Redeems tickets for JWTs |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-AUTH-001 | When the URL carries `?t=<ticket>`, the app removes the ticket from the address bar without adding a history entry, then exchanges it at `POST {AUTH_API}/auth/ticket/redeem` with body `{ ticket }`. | Baseline | `src/utils/session.ts#performRedeem`, `src/utils/session.ts#stripTicketFromUrl` | TC-AUTH-001 |
| FR-AUTH-002 | A successful redemption stores `response.token` in `sessionStorage` under `searle_token_scorecard`. | Baseline | `src/utils/session.ts#TOKEN_KEY` | TC-AUTH-001 |
| FR-AUTH-003 | A ticket in the URL always wins: it is redeemed even when the tab already holds a token. | Baseline | `src/components/AuthGate.tsx#redeemTicketFromUrl` | TC-AUTH-002 |
| FR-AUTH-004 | Concurrent redemption calls share one in-flight request, so React StrictMode's double mount does not cause a redirect loop. | Baseline | `src/utils/session.ts#pendingRedeem` | TC-AUTH-003 |
| FR-AUTH-005 | Nothing below `AuthGate` renders, and no API call fires, until a valid session is confirmed. Meanwhile the screen shows "Signing you in…". | Baseline | `src/components/AuthGate.tsx#AuthGate` | TC-AUTH-004 |
| FR-AUTH-006 | With no valid session after redemption, the browser is sent to `{PORTAL}/login?redirect=<current URL>`, with "Redirecting to sign in…" shown. | Baseline | `src/utils/session.ts#redirectToPortal` | TC-AUTH-004 |
| FR-AUTH-007 | A stored token is discarded when it has expired (`exp`), when it cannot be decoded, when the `ot_session_user` cookie is empty (the portal signed out), or when the cookie names a different user than the token's `sub`. | Baseline | `src/utils/session.ts#getToken`, `src/utils/session.ts#isExpired` | TC-AUTH-005 |
| FR-AUTH-008 | While the app is open, the session is re-checked every 60 s and whenever the tab becomes visible. An invalid session redirects to the portal. | Baseline | `src/components/AuthGate.tsx#recheck` | TC-AUTH-006 |
| FR-AUTH-009 | Every `scorecard-be` request carries `Authorization: Bearer <token>`. | Baseline | `src/config/axios.ts#Authorization` | — |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-AUTH-001 | A token without a readable `exp` claim counts as expired. It is better to bounce the user to the portal than to fail on the first API call. | Baseline | `src/utils/session.ts#isExpired` | TC-AUTH-005 |
| BR-AUTH-002 | A missing `ot_session_user` cookie (as opposed to an empty one) does **not** end the session. Local development has no portal cookie. | Baseline | `src/utils/session.ts#portalUserId` | TC-AUTH-005 |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-AUTH-001 | The JWT payload provides `exp` (seconds), `sub` (`organization.user_login.user_login_id`), `user_name`, and optionally `email_id`. The client decodes it, but **does not verify** it. | Baseline | `src/utils/session.ts#decodeTokenPayload` | — |
| DR-AUTH-002 | `VITE_AUTH_API_URL` (including `/api`) and `VITE_AUTH_PORTAL_URL` are baked in at build time. Each defaults to the dev host. | Baseline | `src/utils/session.ts#AUTH_API_URL`, `src/utils/session.ts#portalBase` | — |

## API / Interface Contracts

- `POST {AUTH_API}/auth/ticket/redeem` → `{ token }`. See operation
  `redeemTicket` in [`authenticator-be.openapi.json`](../api/authenticator-be.openapi.json).
- Exported helpers used across the app: `getToken`, `hasValidSession`,
  `redirectToPortal`, `clearSession`, `getSessionUser`, `joinPortalPath`,
  `AUTH_API_URL`.

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-AUTH-001 | A failed or non-OK redemption, or a response with no `token`, is treated as "no session". The error is logged to the console, and the user is redirected to the portal (FR-AUTH-006). | Baseline | `src/utils/session.ts#performRedeem` | TC-AUTH-007 |
| ERR-AUTH-002 | Any `401` from `scorecard-be` clears the session and redirects to the portal. | Baseline | `src/config/axios.ts#redirectToPortal` | TC-AUTH-008 |

## Security Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| SEC-AUTH-001 | The JWT is never put in a URL. Only the single-use ticket travels in the query string, and it is stripped before redemption. | Baseline | `src/utils/session.ts#stripTicketFromUrl` | TC-AUTH-001 |
| SEC-AUTH-002 | The token lives in `sessionStorage` (per tab, cleared when the tab closes) under a key namespaced to this dashboard, because every OneThunder dashboard shares one origin. | Baseline | `src/utils/session.ts#TOKEN_KEY` | — |
| SEC-AUTH-003 | Token signatures are verified by `scorecard-be` (`JWT_ACCESS_SECRET`), never in the browser. The client-side decode only drives UX decisions. | Baseline | `src/utils/session.ts#decodeTokenPayload` | — |

## Non-Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| NFR-AUTH-001 | A signed-out visitor never sees dashboard chrome before being redirected. | Baseline | `src/components/AuthGate.tsx#AuthGate` | TC-AUTH-004 |

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-AUTH-001 | Given a fresh ticket from the portal, when the user opens the dashboard link, then the dashboard loads, the address bar has no `t` parameter, and `sessionStorage.searle_token_scorecard` holds a JWT. | FR-AUTH-001, FR-AUTH-002, SEC-AUTH-001 |
| AC-AUTH-002 | Given an open dashboard, when the user signs out on the portal in another tab, then within 60 s (or on returning to the tab) the dashboard redirects to portal login. | FR-AUTH-007, FR-AUTH-008 |
| AC-AUTH-003 | Given no ticket and no token, when the user opens the dashboard, then they are redirected to `/login?redirect=…` without the dashboard rendering. | FR-AUTH-005, FR-AUTH-006, NFR-AUTH-001 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-AUTH-001 | Open `/scorecard-dashboard/?t=<valid ticket>` | Ticket stripped. One `POST /auth/ticket/redeem`. Token stored | FR-AUTH-001, FR-AUTH-002, SEC-AUTH-001 | Manual |
| TC-AUTH-002 | With a token already stored, open the link with a new ticket | The new ticket's token replaces the old one | FR-AUTH-003 | Manual |
| TC-AUTH-003 | Run in dev (StrictMode) with a ticket | Exactly one redeem request. No redirect loop | FR-AUTH-004 | Manual |
| TC-AUTH-004 | Open with no ticket and no token | "Redirecting to sign in…", then portal login with `redirect` set. No API calls in the network tab | FR-AUTH-005, FR-AUTH-006, NFR-AUTH-001 | Manual |
| TC-AUTH-005 | Stored token that is expired / malformed / for another `sub`. The cookie set to empty, or absent | Expired, malformed, other user and empty cookie: redirect. Absent cookie with a valid token: stays signed in | FR-AUTH-007, BR-AUTH-001, BR-AUTH-002 | Manual |
| TC-AUTH-006 | Sign out on the portal while the dashboard is open | Redirect within 60 s, or on refocusing the tab | FR-AUTH-008 | Manual |
| TC-AUTH-007 | Redeem returns 4xx, or the network fails | Redirect to the portal. Console logs `[session] ticket redemption failed` on a network error | ERR-AUTH-001 | Manual |
| TC-AUTH-008 | Make `scorecard-be` return 401 | Session cleared. Redirect to the portal | ERR-AUTH-002 | Manual |

Automating these needs a browser test runner and a stubbed authenticator (see
GAP-014).

## Dependencies

- `authenticator-be` (`VITE_AUTH_API_URL`) and the portal (`VITE_AUTH_PORTAL_URL`).
- Domain: [Access & identity](../domains/access-and-identity.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-014 | No automated tests. Every TC above is manual |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
