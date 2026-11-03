---
id: FEAT-USG
title: Usage and export tracking
type: feature
area: USG
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Usage and Export Tracking

## Overview

The app reports to the authenticator how long the dashboard is actually being
looked at, per tab, and every Excel download. Both feed the authenticator's
engagement report.

## Goals and Scope

**In scope**: the heartbeat schedule, the payloads and export events.
**Out of scope**: how the authenticator stores or reports the data.

## Actors

| Actor | Description |
|---|---|
| Dashboard user | Tracked implicitly while the tab is visible |
| `authenticator-be` | Receives the beats and export events |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-USG-001 | Once a session is confirmed, the app sends `POST {AUTH_API}/usage/heartbeat` with `event: "ping"` immediately and then every 30 s while the browser tab is visible. | Baseline | `src/utils/usage.ts#startUsageTracking`, `src/utils/usage.ts#HEARTBEAT_MS`, `src/components/AuthGate.tsx#startUsageTracking` | TC-USG-001 |
| FR-USG-002 | When the browser tab is hidden, or the page is hidden or unloaded, the timer stops and one `event: "end"` beat is sent. Becoming visible restarts the beats. | Baseline | `src/utils/usage.ts#onVisibilityChange`, `src/utils/usage.ts#onPageHide` | TC-USG-001 |
| FR-USG-003 | Switching dashboard tabs sends an immediate beat, so time is credited to the right tab. | Baseline | `src/utils/usage.ts#lastTab` | TC-USG-002 |
| FR-USG-004 | Each Excel download sends `POST {AUTH_API}/usage/export` with `{ dashboard, report }`. `report` is the open tab's label, then ` › <table title>` when the table title differs. | Baseline | `src/utils/usage.ts#recordExport`, `src/components/data-table/DataTable.tsx#recordExport` | TC-USG-003 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-USG-001 | The dashboard name is the constant `Supply Chain Pulse`, not taken from the URL, because every dashboard shares one origin. It must match the label in the authenticator's usage report. | Baseline | `src/utils/usage.ts#DASHBOARD` | — |
| BR-USG-002 | Each browser tab has its own usage `session_id` (a UUID in `sessionStorage` under `searle_usage_session_scorecard`). | Baseline | `src/utils/usage.ts#usageSessionId` | TC-USG-001 |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-USG-001 | The heartbeat body is `{ session_id, dashboard, tab, event: "ping" \| "end" }`, where `tab` is the tab's label (for example "Service Measure"). | Baseline | `src/utils/usage.ts#send` | TC-USG-001 |

## API / Interface Contracts

`POST /usage/heartbeat` and `POST /usage/export` (operations `usageHeartbeat`
and `usageExport` in [`authenticator-be.openapi.json`](../api/authenticator-be.openapi.json)).

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-USG-001 | Tracking never shows an error to the user. Failures are swallowed, and nothing is sent without a token. | Baseline | `src/utils/usage.ts#send` | — |

## Security Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| SEC-USG-001 | The user's identity comes from the Bearer token only. The bodies carry no personal data. | Baseline | `src/utils/usage.ts#send` | — |

## Non-Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| NFR-USG-001 | Beats use `keepalive: true`, so the closing `end` beat survives page unload. | Baseline | `src/utils/usage.ts#keepalive` | TC-USG-001 |

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-USG-001 | Given the dashboard is visible for 65 s and then the browser tab is hidden, then three `ping` beats and one `end` beat are sent. | FR-USG-001, FR-USG-002 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-USG-001 | Keep the tab visible for 65 s, then switch browser tabs | Beats at 0, 30 and 60 s, then `end`. Same `session_id` throughout | FR-USG-001, FR-USG-002, BR-USG-002, DR-USG-001, NFR-USG-001 | Manual |
| TC-USG-002 | Switch from Summary to Service Measure | Immediate beat with `tab: "Service Measure"` | FR-USG-003 | Manual |
| TC-USG-003 | Export the Inventory Days table | One `/usage/export` call with the tab label in `report` | FR-USG-004 | Manual |

## Dependencies

- [FEAT-AUTH](FEAT-AUTH-session-handoff.md), [FEAT-TBL](FEAT-TBL-data-tables.md).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-011 | Export tracking is not documented in the README |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Baseline reverse-engineered from code | Spec-first migration | — |
