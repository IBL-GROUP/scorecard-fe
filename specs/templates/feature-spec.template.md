---
id: FEAT-<AREA>
title: <Feature name>
type: feature
area: <AREA>
status: Draft
owner: <person or team>
last-reviewed: <YYYY-MM-DD>
---

<!--
How to use this template
1. Copy to specs/features/FEAT-<AREA>-<short-name>.md.
2. Register <AREA> in specs/CONVENTIONS.md §3, in the same PR.
3. Keep every "##" heading below. The validator requires all of them. Write
   "Not applicable — <reason>" rather than deleting a section.
4. Run `npm run specs:matrix` and `npm run specs:validate` before opening the PR.
-->

# <Feature name>

## Overview

What the feature is, who it is for, and why it exists. Two or three sentences.

## Goals and Scope

**Goals**

- <outcome this feature must achieve>

**In scope**

- <behaviour covered by this spec>

**Out of scope**

- <related behaviour deliberately excluded, and where it is specified instead>

## Actors

| Actor | Description |
|---|---|
| <Dashboard user> | <who they are and what they need> |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-<AREA>-001 | <The app does X when Y.> | Proposed | `src/<path>#<symbol>` | TC-<AREA>-001 |

## Business Rules

| ID | Rule | Status | Implementation | Verified by |
|---|---|---|---|---|
| BR-<AREA>-001 | <Calculation, threshold or policy, with its formula.> | Proposed | `src/<path>` | — |

## Data Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| DR-<AREA>-001 | <Field, format, source or unit the feature relies on.> | Proposed | `src/<path>` | — |

## API / Interface Contracts

- Endpoints consumed or exposed, with a link to the operation in
  `specs/api/*.openapi.json` (add `x-requirements` there).
- Props, hooks or events exposed to other modules.

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-<AREA>-001 | <What the user sees, and what the app does, when X fails.> | Proposed | `src/<path>` | — |

## Security Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| SEC-<AREA>-001 | <Authentication, authorisation or data-exposure rule.> | Proposed | `src/<path>` | — |

## Non-Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| NFR-<AREA>-001 | <Performance, reliability or usability target, with a measurable value.> | Proposed | `src/<path>` | — |

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-<AREA>-001 | Given <context>, when <action>, then <observable outcome>. | FR-<AREA>-001 |

## Testing Requirements

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-<AREA>-001 | <Steps or inputs> | <Expected outcome> | FR-<AREA>-001 | Manual |

Describe any test data, environments or mocks the tests need.

## Dependencies

- Other specs (`FEAT-…`), services, environment variables and libraries this
  feature depends on.

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-<NNN> | <Link each ambiguity or suspected defect to specs/gaps.md> |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| <YYYY-MM-DD> | Initial draft | <name> | <#> |
