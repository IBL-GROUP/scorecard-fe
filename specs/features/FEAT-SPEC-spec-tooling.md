---
id: FEAT-SPEC
title: Specification tooling and validation
type: feature
area: SPEC
status: Draft
owner: Unassigned
last-reviewed: 2026-11-03
---

# Specification Tooling and Validation

## Overview

`scripts/validate-specs.mjs` keeps `specs/` consistent with the conventions,
with the code and with itself. It runs locally (`npm run specs:validate`) and
in CI on every push and PR. It has no dependencies beyond Node.js 20.

## Goals and Scope

**Goals**: malformed or contradictory specs fail fast with a precise message;
renamed code breaks the specs that cite it; the traceability matrix cannot
silently go stale.

**In scope**: rules S01–S15 below, matrix generation and CI reporting.
**Out of scope**: judging whether a requirement is *correct*. That is human
review (see the [workflow](../standards/spec-first-workflow.md)).

## Actors

| Actor | Description |
|---|---|
| Contributor / AI agent | Runs the validator before pushing |
| CI (GitHub Actions) | Runs it on every push and PR |
| Reviewer | Reads the generated matrix in the PR diff |

## Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| FR-SPEC-001 | **S01**: fail when a required directory or index file is missing (`REQUIRED_PATHS`). | Approved | `scripts/validate-specs.mjs#REQUIRED_PATHS` | TC-SPEC-001 |
| FR-SPEC-002 | **S02**: every non-template spec has front matter with `id`, `title`, `type`, `status`, `owner` and `last-reviewed`, using known values, plus `area` for features and domains. Document IDs are unique. | Approved | `scripts/validate-specs.mjs#FRONT_MATTER_KEYS` | TC-SPEC-008 |
| FR-SPEC-003 | **S03**: every area is registered once in CONVENTIONS §3 and points at the spec that declares it. | Approved | `scripts/validate-specs.mjs#registry` | TC-SPEC-003 |
| FR-SPEC-004 | **S04**: feature specs **and the feature template** contain every mandatory section. Domain specs contain theirs. | Approved | `scripts/validate-specs.mjs#FEATURE_SECTIONS`, `scripts/validate-specs.mjs#DOMAIN_SECTIONS` | TC-SPEC-002 |
| FR-SPEC-005 | **S05/S06**: IDs match `<TYPE>-<AREA>-<NNN>` (gaps `GAP-NNN`), are defined only in feature/domain specs (gaps only in the register) under the spec's own area, and are unique. | Approved | `scripts/validate-specs.mjs#ID_RE` | TC-SPEC-003 |
| FR-SPEC-006 | **S07/S08**: requirement rows have a valid status. Every `Baseline`/`Approved` row cites at least one implementation path that exists. A `path#symbol` citation must name a symbol present in that file. | Approved | `scripts/validate-specs.mjs#asRepoPath` | TC-SPEC-004 |
| FR-SPEC-007 | **S09**: every ID or gap referenced anywhere in `specs/`, the OpenAPI files or `AGENTS.md` resolves to a definition. A malformed reference is an error. | Approved | `scripts/validate-specs.mjs#scanRefs` | TC-SPEC-005 |
| FR-SPEC-008 | **S10/S11**: "Verified by" lists only test cases, and those test cases list the requirement back. AC and TC "Covers" lists only requirements. An automated TC's test file exists and names the TC ID. | Approved | `scripts/validate-specs.mjs#S10`, `scripts/validate-specs.mjs#S11` | TC-SPEC-005, TC-SPEC-010 |
| FR-SPEC-009 | **S12/S13**: OpenAPI files are valid JSON, OpenAPI 3.x, with unique `operationId`s, responses on every operation and resolvable local `$ref`s. Every path the client calls appears in its contract (or in `x-client-paths-not-served`). | Approved | `scripts/validate-specs.mjs#CONTRACT_DRIFT` | TC-SPEC-006 |
| FR-SPEC-010 | **S14**: `specs/traceability.md` equals what `--write-matrix` would generate from the current specs. | Approved | `scripts/validate-specs.mjs#buildMatrix` | TC-SPEC-007 |
| FR-SPEC-011 | **S15**: gap rows have a valid status and a registered area. | Approved | `scripts/validate-specs.mjs#GAP_STATUSES` | TC-SPEC-003 |
| FR-SPEC-012 | Each finding prints as `ERROR <file>:<line> [<rule>] <message>`. Under GitHub Actions it is also emitted as an `::error` annotation. Any error makes the exit code 1. | Approved | `scripts/validate-specs.mjs#main` | TC-SPEC-011 |
| FR-SPEC-013 | The repository's own `specs/` tree passes validation. | Approved | `specs/README.md` | TC-SPEC-009 |

## Business Rules

Not applicable. The rules are the conventions in [CONVENTIONS.md](../CONVENTIONS.md).

## Data Requirements

Not applicable. The validator reads only Markdown and JSON under the repository root.

## API / Interface Contracts

```
node scripts/validate-specs.mjs [--write-matrix] [--root <dir>]
npm run specs:validate | specs:matrix | specs:test
export function validate(root, { writeMatrix }) → { errors, warnings, stats, matrix }
```

## Error Handling

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| ERR-SPEC-001 | An OpenAPI file that is not valid JSON is reported as S12 with the parser's message, and validation continues with the other files. | Approved | `scripts/validate-specs.mjs#JSON.parse` | TC-SPEC-006 |

## Security Requirements

Not applicable. The validator reads repository files only and makes no network calls.

## Non-Functional Requirements

| ID | Requirement | Status | Implementation | Verified by |
|---|---|---|---|---|
| NFR-SPEC-001 | No npm dependencies. It runs with a bare Node.js ≥ 20 before `npm ci`. | Approved | `scripts/validate-specs.mjs#node:fs` | TC-SPEC-009 |

## Acceptance Criteria

| ID | Criterion | Covers |
|---|---|---|
| AC-SPEC-001 | Given a spec with a duplicated or malformed requirement ID, when the validator runs, then it exits 1 and names the file, line and rule. | FR-SPEC-005, FR-SPEC-012 |
| AC-SPEC-002 | Given a requirement citing a function that has been renamed, then validation fails with S08. | FR-SPEC-006 |
| AC-SPEC-003 | Given the repository as committed, then `npm run specs:validate` exits 0. | FR-SPEC-013 |

## Testing Requirements

All automated in `scripts/validate-specs.test.mjs` (`npm run specs:test`).
Each test builds a minimal valid tree in a temporary directory, breaks one
thing, and asserts the expected rule fires.

| ID | Scenario | Expected result | Covers | Automation |
|---|---|---|---|---|
| TC-SPEC-001 | Delete `specs/features/` and `specs/README.md` | S01 for each | FR-SPEC-001 | `scripts/validate-specs.test.mjs` |
| TC-SPEC-002 | Remove "## Security Requirements" from a feature spec, and from the template | S04 for both | FR-SPEC-004 | `scripts/validate-specs.test.mjs` |
| TC-SPEC-003 | Define one ID twice; add an ID with a one-digit number; use an unregistered area; give a gap a bad status | S06, S05, S03/S05, S15 | FR-SPEC-003, FR-SPEC-005, FR-SPEC-011 | `scripts/validate-specs.test.mjs` |
| TC-SPEC-004 | Cite a missing file; cite `file#missingSymbol`; omit the implementation on a Baseline row | S08 for each | FR-SPEC-006 | `scripts/validate-specs.test.mjs` |
| TC-SPEC-005 | Reference a requirement ID and a gap ID that are not defined; list a TC that does not cover the requirement back | S09, S09, S10 | FR-SPEC-007, FR-SPEC-008 | `scripts/validate-specs.test.mjs` |
| TC-SPEC-006 | Break the OpenAPI JSON; duplicate an operationId; add a dangling `$ref`; call an undocumented client path | S12 ×3, S13 | FR-SPEC-009, ERR-SPEC-001, DR-SUM-001 | `scripts/validate-specs.test.mjs` |
| TC-SPEC-007 | Edit a requirement without regenerating the matrix; then regenerate | S14, then clean | FR-SPEC-010 | `scripts/validate-specs.test.mjs` |
| TC-SPEC-008 | Drop `owner`; use status `Done`; use date `03/11/2026` | S02 for each | FR-SPEC-002 | `scripts/validate-specs.test.mjs` |
| TC-SPEC-009 | Validate the real repository | No errors | FR-SPEC-013, NFR-SPEC-001 | `scripts/validate-specs.test.mjs` |
| TC-SPEC-010 | An automated TC whose test file does not mention it | S11 | FR-SPEC-008 | `scripts/validate-specs.test.mjs` |
| TC-SPEC-011 | Run the CLI on a broken tree, with and without `GITHUB_ACTIONS=true` | Exit 1, `ERROR file:line [Sxx]`, plus `::error` in CI | FR-SPEC-012 | `scripts/validate-specs.test.mjs` |

## Dependencies

- Node.js ≥ 20 (`node:test`), GitHub Actions (`.github/workflows/specs.yml`).

## Open Questions and Known Gaps

| Gap | Summary |
|---|---|
| GAP-013 | Lint is broken, so CI cannot run `npm run lint` yet |
| GAP-014 | No application test runner, so application TCs stay manual |

## Change History

| Date | Change | Author | PR |
|---|---|---|---|
| 2026-11-03 | Initial version, with the validator | Spec-first migration | — |
