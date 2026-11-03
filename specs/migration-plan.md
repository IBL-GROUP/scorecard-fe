---
id: PLAN-001
title: Incremental spec-first migration plan
type: plan
status: In Review
owner: Unassigned
last-reviewed: 2026-11-03
---

# Incremental Migration Plan

The migration adds documentation and tooling only. **No application code was
changed**, and the application build was verified before and after.

## Phase 0 — Foundation ✅ (this change)

- [x] `specs/` structure, conventions, templates, index
- [x] Repository assessment and gap register (24 gaps)
- [x] Baseline specs for every domain and feature: 3 domains and 11 features
- [x] OpenAPI consumer contracts for `scorecard-be` (22 operations) and `authenticator-be` (7)
- [x] Validator, its tests, the generated traceability matrix, CI workflow, PR template
- [x] `AGENTS.md` and `CLAUDE.md`

## Phase 1 — Confirm the baseline (next 2–4 weeks)

Priority goes to **critical domains** first, ordered by risk × usage:

| # | Spec | Why first | Action |
|---|---|---|---|
| 1 | FEAT-PERM, FEAT-AUTH | Security and access. GAP-002 is a policy decision | Security owner reviews; decide GAP-002, GAP-021 |
| 2 | supply-chain metrics (BR-MET) | Every figure depends on it | Business owner confirms each BR-MET row; decide GAP-004, GAP-012 |
| 3 | FEAT-SUM | Most-used tab | Product owner approves; decide GAP-010 |
| 4 | FEAT-FILT | Suspected defects (GAP-008, GAP-009, GAP-020) | Confirm intent, then fix in a separate PR |
| 5 | FEAT-SVC, FEAT-DSP, FEAT-RD | Known backend defects | Backend owner plans GAP-001, GAP-005, GAP-006, GAP-007 |
| 6 | FEAT-LOAD, FEAT-TBL, FEAT-USG, FEAT-NAV | Lower risk | Engineer review |

Exit: every spec's status is `Approved`, and every gap is `Accepted`,
`Resolved` or scheduled.

## Phase 2 — Make the specs executable (in parallel)

1. Fix lint (GAP-013) and add `npm run lint` to CI.
2. Add an application test runner (proposed: Vitest with Testing Library,
   which fits Vite; GAP-014). **This needs a decision.**
3. Automate test cases in this order, naming each test after its `TC-…` ID:
   - pure logic first: `getDaysGone` (TC-SUM-004), `rdStatusDate` (TC-RD-001),
     `useEffectiveSku` (TC-FILT-005), `isQuerySettled` and the queue (TC-LOAD-001…005),
     `getToken` (TC-AUTH-005);
   - then components: PermissionGate (TC-PERM-002, TC-PERM-005), FilterBar Apply/Clear (TC-FILT-002, TC-FILT-008).
   These may require small, behaviour-neutral refactors (exporting pure
   functions from `ScorecardDashboard.tsx`). Each one goes in its own PR.
4. Track progress with the "Automated" column of the [traceability matrix](traceability.md).

## Phase 3 — Retire duplicate documentation

1. Replace `STRUCTURE.md` and `API_GUIDE.md` with pointers to `specs/` (GAP-016).
2. Trim the README's "How It Works" section to a summary that links the specs (GAP-011).
3. Agree with `scorecard-be` whether TECHNICAL_DOCUMENT.md stays the shared
   formula reference, or the backend repo adopts the same `specs/` layout and
   owns BR-MET.

## Rules for all new work (effective now)

- New features follow the [spec-first workflow](standards/spec-first-workflow.md).
- Touching an area's code means checking its spec. If the spec is `Baseline`
  and you notice it is wrong, fix it or raise a gap in the same PR.
- Never change application behaviour as part of a documentation PR.
