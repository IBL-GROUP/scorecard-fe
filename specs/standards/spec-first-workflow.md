---
id: STD-WORKFLOW
title: Specification-first development workflow
type: standard
status: In Review
owner: Unassigned
last-reviewed: 2026-11-03
---

# Specification-First Development Workflow

**Spec → review → implement → verify.** The spec says what the system must do.
Code and tests prove that it does.

## 1. When a spec change is required

| Change | Spec work | Review before coding? |
|---|---|---|
| New feature, tab, section or filter | New or extended feature spec, status `Proposed` → `Approved` | **Yes**: spec PR approved first, or the spec reviewed as the first commit of the feature PR |
| Change to existing behaviour (a formula, a rule, what a filter does, what a user sees) | Edit the requirement rows. Bump statuses. Add a Change History row | **Yes** |
| Bug fix that restores **specified** behaviour | None, or add a test case | No |
| Bug fix where the spec is silent or wrong | Fix the spec, or resolve the `GAP-NNN`, in the same PR | With the PR |
| New or changed API field or parameter | Update `specs/api/*.openapi.json` | With the PR |
| Refactor with no behaviour change | Update the `Implementation` paths and symbols if they move (the validator will tell you) | No |
| Styling, copy, dependency bumps | None, unless a requirement mentions them | No |

"Significant" means the first two rows. If in doubt, treat it as significant.

## 2. Creating a feature spec

1. Copy [`templates/feature-spec.template.md`](../templates/feature-spec.template.md)
   to `specs/features/FEAT-<AREA>-<short-name>.md`.
2. Pick an unused `<AREA>` (2–6 capitals) and register it in
   [CONVENTIONS §3](../CONVENTIONS.md#3-area-registry-validated).
3. Fill every section. Write "Not applicable — <reason>" rather than deleting one.
4. Number requirements from `001` per type: `FR-<AREA>-001`, `BR-<AREA>-001`, …
5. For each requirement, add at least one acceptance criterion (`AC-…`) and
   one test case (`TC-…`). List them in each other's `Covers` and
   `Verified by` columns.
6. Set new rows to `Proposed`. Implementation paths may stay `—` until the
   code exists. Only `Baseline` and `Approved` rows must cite code.
7. Record every unknown as a `GAP-NNN` in [`gaps.md`](../gaps.md) with a
   concrete question. **Do not guess a business rule.**
8. Run `npm run specs:matrix && npm run specs:validate`.

## 3. Review

The reviewer checks:

- [ ] Each requirement is testable and states observable behaviour.
- [ ] The business rules were confirmed by the business owner (named in the PR),
      not inferred.
- [ ] Open questions are listed as gaps, not buried in prose.
- [ ] Security implications are covered (who can see or do what).
- [ ] Acceptance criteria and test cases cover every new or changed requirement.
- [ ] API contract changes are agreed with the owning backend.

Approval: the feature's owner (front matter `owner`) and one engineer. On
approval, set the rows and the document to `Approved`.

## 4. Implementing

- Work only from `Approved` requirements, or `Baseline` ones for existing
  behaviour.
- Cite the implementation (`path#symbol`) in each row you realise, and change
  `Proposed` → `Approved`.
- If the code needs behaviour the spec does not state, **stop**. Update the
  spec, or raise a gap, and get it reviewed.

## 5. Verifying

- `npm run build` (type check + bundle) must pass.
- `npm run specs:validate` must pass (CI enforces it).
- Run the spec's test cases. Automated ones name their `TC-…` ID in the test
  title. Manual ones are run by the author and ticked in the PR description.

## 6. Keeping specs, code and tests consistent

| Rule | Enforced by |
|---|---|
| Every cited file and symbol exists | Validator S08 |
| Every referenced ID or gap exists | Validator S09 |
| Requirements and test cases point at each other | Validator S10 |
| Automated test cases are named in their test files | Validator S11 |
| Every client call is in an API contract | Validator S13 |
| The traceability matrix is regenerated | Validator S14 |
| The behaviour described is still the behaviour shipped | **Review**: no tool can check this |

When behaviour changes, update in this order: **spec → contract → code → tests → matrix**.

## 7. Promoting a Baseline spec

Baseline specs describe today's code. To approve one, a stakeholder reads it,
confirms each row (or raises gaps), and decides the linked gaps. Then the
status changes to `Approved`. Record who approved it in Change History.

## 8. Pull requests

The PR template (`.github/pull_request_template.md`) asks for the spec IDs
touched and the gap IDs resolved, and confirms the validation was run. A PR
that changes behaviour without touching `specs/` must say why.
