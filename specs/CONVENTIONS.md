---
id: STD-CONVENTIONS
title: Specification conventions — IDs, statuses and traceability
type: standard
status: Draft
owner: Unassigned
last-reviewed: 2026-11-03
---

# Specification Conventions

This file is the rulebook for everything under `specs/`. `npm run specs:validate`
(`scripts/validate-specs.mjs`) enforces the rules marked **[validated]**.

## 1. Front matter [validated]

Every Markdown file in `specs/` (except files in `templates/`) starts with:

```yaml
---
id: FEAT-AUTH            # unique document ID
title: Session handoff and sign-out
type: feature            # see the table below
area: AUTH               # features and domains only — a code from §3
status: Baseline         # see §4.1
owner: Unassigned        # a person or team; "Unassigned" until one is agreed
last-reviewed: 2026-11-03
---
```

| `type` | Folder | Holds requirement IDs? |
|---|---|---|
| `index` | `specs/README.md` | No |
| `standard` | `specs/`, `specs/standards/` | No |
| `assessment` | `specs/assessment/` | No |
| `product` | `specs/product/` | No |
| `architecture` | `specs/architecture/` | No |
| `adr` | `specs/architecture/adr/` | No |
| `domain` | `specs/domains/` | Yes (business rules) |
| `feature` | `specs/features/` | Yes |
| `api` | `specs/api/` | No (contracts reference IDs via `x-requirements`) |
| `register` | `specs/gaps.md` | Gap IDs |
| `plan` | `specs/migration-plan.md` | No |
| `generated` | `specs/traceability.md` | No — written by the validator |

## 2. Requirement IDs [validated]

Format: **`<TYPE>-<AREA>-<NNN>`**, for example `FR-AUTH-001`.

| Type | Meaning |
|---|---|
| `FR` | Functional requirement — what the system does |
| `NFR` | Non-functional requirement — performance, reliability, usability |
| `BR` | Business rule — a calculation, threshold or policy |
| `DR` | Data requirement — a field, format or source the feature depends on |
| `SEC` | Security requirement |
| `ERR` | Error-handling requirement |
| `INT` | Integration requirement — a call to another system |
| `AC` | Acceptance criterion |
| `TC` | Test case |

Rules:

- `AREA` is a registered code from §3 and must match the `area` of the file
  that defines the ID.
- `NNN` is three digits. Numbers are never reused. A removed requirement keeps its row
  with status `Deprecated`.
- An ID is **defined** when it is the first cell of a table row. It is
  **referenced** anywhere else. Every reference must resolve to a definition.
- Gaps use **`GAP-NNN`** and are defined only in [`gaps.md`](gaps.md).
- IDs inside fenced code blocks are ignored, so examples are safe.

## 3. Area registry [validated]

| Area | Name | Spec |
|---|---|---|
| ACC | Access & identity (domain) | `specs/domains/access-and-identity.md` |
| MET | Supply-chain metrics (domain) | `specs/domains/supply-chain-metrics.md` |
| DASH | Dashboard experience (domain) | `specs/domains/dashboard-experience.md` |
| AUTH | Session handoff and sign-out | `specs/features/FEAT-AUTH-session-handoff.md` |
| PERM | Permissions and tab gating | `specs/features/FEAT-PERM-permissions.md` |
| LOAD | Tab-by-tab load queue | `specs/features/FEAT-LOAD-load-queue.md` |
| FILT | Filter bar | `specs/features/FEAT-FILT-filter-bar.md` |
| SUM | Summary tab | `specs/features/FEAT-SUM-summary-tab.md` |
| SVC | Service Measure tab | `specs/features/FEAT-SVC-service-measure-tab.md` |
| DSP | Dispatch & WIP tab | `specs/features/FEAT-DSP-dispatch-wip-tab.md` |
| RD | RD Data Status tab | `specs/features/FEAT-RD-rd-data-status-tab.md` |
| USG | Usage and export tracking | `specs/features/FEAT-USG-usage-tracking.md` |
| NAV | User menu, dashboard switching and user manual | `specs/features/FEAT-NAV-user-menu.md` |
| TBL | Data tables and Excel export | `specs/features/FEAT-TBL-data-tables.md` |
| SPEC | Specification tooling (this system) | `specs/features/FEAT-SPEC-spec-tooling.md` |

A new feature registers its area here **in the same PR** that adds its spec.

## 4. Statuses [validated]

### 4.1 Document status (`status:` in front matter)

| Status | Meaning |
|---|---|
| `Draft` | Being written. Not yet a source of truth |
| `In Review` | Open for stakeholder review in a PR |
| `Baseline` | Reverse-engineered from the code as it is today. Describes **current** behaviour; nobody has confirmed it is **intended** |
| `Approved` | Reviewed and accepted by the responsible stakeholder. This is the source of truth |
| `Deprecated` | No longer applies; kept for history |

### 4.2 Requirement status (the `Status` column) [validated]

| Status | Meaning |
|---|---|
| `Baseline` | Current behaviour, observed in code. Not yet confirmed as intended |
| `Proposed` | Requested change, not yet implemented |
| `Approved` | Confirmed intent (implemented or not) |
| `Deprecated` | Removed or superseded; the row stays for traceability |

> **Current vs intended behaviour.** A `Baseline` row is a description, not a
> commitment. Where current behaviour looks wrong, or may differ from intent,
> the row links a `GAP-NNN` entry. The behaviour is **not** silently promoted
> to a requirement.

## 5. Requirement tables [validated]

Requirements live in Markdown tables whose header row starts with `ID`.

```markdown
| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-AUTH-001 | On arrival with `?t=<ticket>` the app exchanges it ... | Baseline | `src/utils/session.ts#redeemTicketFromUrl` | TC-AUTH-001 |
```

- **Implementation**: one or more backticked paths, relative to the repo root.
  The validator checks that each path exists. `path#symbol` also checks that
  `symbol` appears in that file, so renames are caught. Rows with status
  `Baseline` or `Approved` must have at least one path, except in the `MET`
  domain, where the backend is the implementation. Write `scorecard-be` there.
- **Verified by**: test case IDs (`TC-…`), or `—` when nothing verifies it yet.
- Acceptance-criteria tables use `| ID | Criterion | Covers |`. `Covers` lists
  the requirement IDs the criterion proves.
- Test-case tables use `| ID | Scenario | Expected result | Covers | Automation |`.
  `Automation` is `Manual` or a backticked test file. When it is a file, the
  validator checks that the file contains the TC ID, so every automated test
  names its test case.

## 6. Traceability [validated]

```
Requirement (FR/BR/SEC/…) ──Implementation──> source file#symbol
          │
          └──Verified by──> TC-… ──Automation──> test file (contains the TC ID)
AC-… ──Covers──> Requirement
OpenAPI operation ──x-requirements──> Requirement
```

[`traceability.md`](traceability.md) is **generated** by
`npm run specs:matrix`. The validator fails if it is out of date, so every PR
that changes a requirement also regenerates the matrix.

## 7. Writing requirements

- One behaviour per row, written so it can be tested: *"The app does X when Y."*
- State the **observable** behaviour (what a user or API sees), then cite the
  implementation. Do not paste code.
- Use **must** for approved intent. Baseline rows describe and use the present
  tense ("The app sends…").
- Never invent a rule to fill a hole. Record a `GAP-NNN` with the open question
  instead.
