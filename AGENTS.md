# AGENTS.md — Instructions for AI Coding Agents

This repository is **specification-first**. `specs/` states what the
Supply Chain Pulse dashboard must do. Code implements it. Tests prove it. These
rules apply to every agent (Claude Code, Codex, Copilot and others) and to any
change, however small.

## 1. Before you change anything

1. Read [`specs/README.md`](specs/README.md) and
   [`specs/CONVENTIONS.md`](specs/CONVENTIONS.md).
2. Find the spec(s) for the code you will touch. The **area registry** in
   CONVENTIONS §3 maps areas to specs, and every requirement's `Implementation`
   column names files and symbols. Search `specs/` for the file path you are
   editing.
3. Read the relevant requirements (`FR-`, `BR-`, `SEC-` …), and check
   [`specs/gaps.md`](specs/gaps.md) for open questions in that area.
4. For API work, read the operation in `specs/api/*.openapi.json`.

## 2. Identify missing or conflicting requirements, and stop

Before implementing, check whether the request:

- needs behaviour that **no requirement states**,
- **contradicts** a requirement (especially one marked `Approved`),
- depends on an **open gap** (`GAP-NNN` with status `Open` or `Needs decision`), or
- conflicts with another spec or with the API contract.

If any of these apply, **do not guess**. Tell the user which requirement or gap
is involved and ask. Propose spec wording if helpful, but leave it as `Proposed`
until the user confirms.

## 3. Hard rules

- **Never invent business rules.** Formulas, thresholds, classifications, date
  windows and permission semantics come from the specs or from the user. Never
  infer them from what "seems reasonable".
- **Never silently change an approved requirement.** Changing `Approved`
  behaviour needs the user's explicit agreement and a spec edit in the same
  change.
- **`Baseline` describes current behaviour; it is not a mandate.** Do not "fix"
  baseline behaviour that a gap marks as suspected unless asked. Do not
  preserve it against an explicit instruction either.
- **Do not change application behaviour in a documentation-only change**, and
  do not change documentation to match unreviewed new behaviour.
- **Client-side permission checks are not security.** Do not present them as
  such (SEC-PERM-001).

## 4. While implementing

- Follow [`specs/standards/frontend-standards.md`](specs/standards/frontend-standards.md).
  In particular, every new query passes its tab's `enabled` flag **and** is
  wrapped in that tab's `track` helper (FEAT-LOAD).
- Keep the spec, the contract, the code and the tests aligned **in the same change**:
  1. update or add the requirement rows (new rows start as `Proposed`, and
     become `Approved` once the user confirms);
  2. update `specs/api/*.openapi.json` if a parameter or field changes;
  3. implement, then cite the code as `path#symbol` in `Implementation`;
  4. add or update test cases (`TC-…`). Automated tests must contain the TC ID
     in their name;
  5. add a Change History row to the spec.
- If you move or rename a cited symbol, update the citation. The validator fails otherwise.

## 5. Before you finish

Run, and report the results honestly:

```bash
npm run specs:matrix     # if any requirement table changed
npm run specs:validate   # must exit 0
npm run specs:test       # validator tests
npm run build            # tsc + vite build must pass
```

`npm run lint` is currently broken (GAP-013). Say so rather than reporting a
pass. There is no application test suite yet (GAP-014), so list which manual
test cases from the spec you could not run.

In your summary, list the spec IDs you added or changed and any gaps you opened
or resolved.

## 6. Repository facts agents often get wrong

- The app is served under `/scorecard-dashboard/` (Vite `base` and the router `basename`). Dev port 5175 (`strictPort`).
- There is no login here. Sessions come from the portal ticket handoff (FEAT-AUTH).
- `scorecard-be` owns every metric formula (BR-MET-…). This repo only formats them.
- In `ScorecardDashboard.tsx`, `iblAccuracy` feeds **Budget Accuracy TSCL** and `tsclAccuracy` feeds **Forecast Accuracy IBL**. The names are swapped. The data is correct.
- `TECHNICAL_DOCUMENT.md` is shared with `scorecard-be` and partly stale (GAP-010, GAP-012).
