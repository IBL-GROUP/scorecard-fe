---
id: API-INDEX
title: API and data contracts
type: api
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# API and Data Contracts

| File | What it is |
|---|---|
| [`scorecard-be.openapi.json`](scorecard-be.openapi.json) | OpenAPI 3.0 **consumer** contract: the 22 `scorecard-be` endpoints this app calls, with the parameters it sends and the fields it reads |
| [`authenticator-be.openapi.json`](authenticator-be.openapi.json) | OpenAPI 3.0 consumer contract for the 7 `authenticator-be` calls |
| [`data-models.md`](data-models.md) | Client-side state and storage, plus a summary of the response rows |

## Conventions

- These are **consumer** contracts. The backends own their behaviour. These
  files record what this app relies on, so a backend change can be checked
  against them.
- Each operation lists the requirements it serves in `x-requirements`, which
  appear in the [traceability matrix](../traceability.md).
- Paths the client declares but no server provides are listed under
  `x-client-paths-not-served`, each with a gap ID.
- The files are JSON so the validator needs no YAML parser. Any OpenAPI
  viewer (Swagger Editor, Redocly) opens them as they are.

## Validation (rules S12, S13)

`npm run specs:validate` checks each file for valid JSON, an OpenAPI 3.x
version, `info`, non-empty `paths`, unique `operationId`s, responses on every
operation and resolvable `$ref`s. It also checks for **drift**: every path in
`src/api/endpoints.ts`, and every `${AUTH_API_URL}/…` call in `src/`, must
appear in the matching contract.

## Changing a contract

1. Update the operation (parameters, response fields) in the same PR as the
   hook or component that relies on it.
2. Update or add `x-requirements`.
3. If the backend must change first, link the backend PR in your PR description.
