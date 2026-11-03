---
id: ADR-0001
title: Adopt specification-first development
type: adr
status: In Review
owner: Unassigned
last-reviewed: 2026-11-03
---

# ADR-0001: Adopt Specification-First Development

## Context

The dashboard's behaviour lived in code comments, a README and a technical
document shared with the backend. The documents drifted within weeks: the
Division filter, multi-select classification, backend prorating and the user
menu were all undocumented, and several defects were only visible by reading
the code. There were no tests to pin behaviour down, and AI coding agents
working in the repo had no written contract to work against.

## Decision

`specs/` is the source of truth for intended behaviour. A change to behaviour
updates the relevant spec **in the same PR**, and the spec is reviewed before,
or together with, the code. Requirements carry stable IDs, link to the code
and tests that realise them, and are checked automatically in CI.

Existing behaviour is captured as `Baseline`: a description, not a commitment.
Questionable behaviour goes to `gaps.md` rather than being promoted to a
requirement.

## Consequences

- Every behaviour change costs a spec edit, and gains a reviewable statement of intent.
- Renaming a cited symbol breaks validation until the spec is updated. This is intended.
- Baseline specs need stakeholder review before they become `Approved`.
- TECHNICAL_DOCUMENT.md remains the backend formula reference, shared with
  `scorecard-be`. The specs link to it rather than duplicate the SQL.

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| Keep README and TECHNICAL_DOCUMENT only | Already drifting. Not checkable. No requirement IDs |
| External wiki or Confluence | Not versioned with the code. Agents cannot read it in the repo |
| A spec framework with dependencies (Spectral, Redocly) | More tooling than a 22-endpoint consumer contract needs. Can be added later |
