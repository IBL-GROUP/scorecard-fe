---
id: FEAT-NAV
title: User menu, dashboard switching and user manual
type: feature
area: NAV
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# User Menu, Dashboard Switching and User Manual

## Overview

The avatar menu in the top-right corner shows who is signed in. It lets the
user jump to another OneThunder dashboard without signing in again, open the
user manual, go to portal settings, or sign out everywhere.

## Goals and Scope

**In scope**: the user menu, cross-dashboard handoff, the `/usermanual` route,
and logout. **Out of scope**: the manual's content (`src/features/userManual/manualData.ts`).

## Actors

| Actor | Description |
|---|---|
| Dashboard user | Has access to one or more OneThunder dashboards |
| `authenticator-be` | Supplies the profile and dashboard list, and mints tickets |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-NAV-001 | The menu shows the display name from `GET {AUTH_API}/profile` (`data.display_name`), and the user name and email from the token. | Baseline | `src/api/account.ts#useDisplayName`, `src/utils/session.ts#getSessionUser`, `src/components/user-menu/UserMenu.tsx` | TC-NAV-001 |
| FR-NAV-002 | The menu lists every dashboard the user may open, in menu order, from `GET {AUTH_API}/dashboards/user-reports`. | Baseline | `src/api/account.ts#useUserDashboards` | TC-NAV-002 |
| FR-NAV-003 | Choosing another dashboard mints a single-use ticket (`POST {AUTH_API}/auth/ticket` with `{ target }`) and navigates to `<origin><path>/?t=<ticket>`. If minting fails, the user lands on the portal dashboard instead. | Baseline | `src/api/account.ts#openDashboard` | TC-NAV-003 |
| FR-NAV-004 | Dashboard links use `VITE_DASHBOARD_ORIGIN` (default: this page's origin). For local development, `VITE_DASHBOARD_URLS` (`/path=origin,…`) overrides the origin for each path. | Baseline | `src/api/account.ts#DASHBOARD_ORIGIN`, `src/api/account.ts#DASHBOARD_ORIGIN_BY_PATH` | TC-NAV-003 |
| FR-NAV-005 | **User Manual** opens `<BASE_URL>usermanual` (or `VITE_USER_MANUAL_URL` if set) in a new tab. The route renders a searchable manual from `manualData.ts` in its own lazy-loaded chunk. | Baseline | `src/api/account.ts#USER_MANUAL_URL`, `src/App.tsx#UserManual`, `src/pages/UserManual.tsx` | TC-NAV-004 |
| FR-NAV-006 | **Logout** goes to the portal's `/logout`. The portal empties `ot_session_user`, which ends this session (FR-AUTH-007). **Settings** goes to the portal's `dashboard?view=settings`. | Baseline | `src/api/account.ts#logout`, `src/components/user-menu/UserMenu.tsx#joinPortalPath` | TC-NAV-005 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-NAV-001 | The current dashboard is recognised by comparing its `path` with `import.meta.env.BASE_URL`, ignoring slashes. | Baseline | `src/api/account.ts#isCurrentDashboard` | TC-NAV-002 |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-NAV-001 | Each dashboard entry has `menu_id`, `resource_code`, `label`, `path` (for example `/sales-dashboard`) and `icon`. | Baseline | `src/api/account.ts#UserDashboard` | — |

## API / Interface Contracts

`GET /profile`, `GET /dashboards/user-reports` and `POST /auth/ticket` in
[`authenticator-be.openapi.json`](../api/authenticator-be.openapi.json).

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-NAV-001 | Profile and dashboard-list failures retry once, then degrade quietly: no display name, or no list. | Baseline | `src/api/account.ts#authGet` | — |

## Security Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| SEC-NAV-001 | Cross-dashboard links carry a single-use ticket, never the JWT. | Baseline | `src/api/account.ts#openDashboard` | TC-NAV-003 |
| SEC-NAV-002 | The manual renders authored HTML with `dangerouslySetInnerHTML`. This is safe only while every string comes from `manualData.ts`, with no user input, API data or URL parameters. | Baseline | `src/pages/UserManual.tsx#dangerouslySetInnerHTML` | — |

## Non-Functional Requirements

Not applicable. No agreed targets.

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-NAV-001 | Given access to the Sales dashboard, when the user picks it from the menu, then the Sales dashboard opens signed in, and its URL held only `?t=<ticket>`. | FR-NAV-003, SEC-NAV-001 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-NAV-001 | Open the menu | Display name, user name and email shown | FR-NAV-001 | Manual |
| TC-NAV-002 | User with three dashboards | Three entries in menu order. The current one is marked | FR-NAV-002, BR-NAV-001 | Manual |
| TC-NAV-003 | Pick another dashboard. Repeat with `/auth/ticket` failing | Lands signed in. On failure, lands on the portal dashboard | FR-NAV-003, FR-NAV-004, SEC-NAV-001 | Manual |
| TC-NAV-004 | Click User Manual and search for a term | New tab at `/scorecard-dashboard/usermanual`. Search filters the rows | FR-NAV-005 | Manual |
| TC-NAV-005 | Click Logout, then Settings | Portal logout. Portal settings view | FR-NAV-006 | Manual |

## Dependencies

- [FEAT-AUTH](FEAT-AUTH-session-handoff.md); env vars `VITE_DASHBOARD_ORIGIN`,
  `VITE_DASHBOARD_URLS` and `VITE_USER_MANUAL_URL`.

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-011 | The user menu, manual route and env vars are not in the README |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
| 2026-11-11 | 2.0 (story S3) has its own user menu with a Planner view switch (`src/v2/shell/UserMenu.tsx#UserMenu`, FR-EXEC-021); it reuses `src/api/account.ts`. No requirement here changed | Claude Code (stories S3, S4) | — |
