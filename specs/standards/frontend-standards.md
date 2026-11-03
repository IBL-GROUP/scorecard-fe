---
id: STD-FRONTEND
title: Frontend technical standards
type: standard
status: Baseline
owner: Unassigned
last-reviewed: 2026-11-03
---

# Frontend Technical Standards

These are the conventions the codebase already follows, written down so that
new code matches them. They are not new rules.

## Data access

1. **One hook per endpoint** in `src/api/<name>.ts`. Add the path to
   `ApiEndpoints` (`src/api/endpoints.ts`) and the key to `ApiKey`
   (`src/utils/enum.ts`), and document the operation in
   `specs/api/scorecard-be.openapi.json` (validator S13 fails otherwise).
2. Hooks take `(params, options: QueryOptions = {})` and set
   `queryKey: [ApiKey.x, params]`, `placeholderData: keepPreviousData`,
   `staleTime: 5 * 60 * 1000` and `enabled: options.enabled ?? true`.
3. In `ScorecardDashboard.tsx`, every new query **must**:
   - pass its tab's flag: `{ enabled: loadSummary }` (or `loadServiceMeasure`, …), and
   - be wrapped in its tab's tracker: `summary(...)`, `serviceMeasure(...)`, `dispatchWip(...)`.

   Without the first, it runs for everyone and outside the queue. Without the
   second, the next tab does not wait for it (FEAT-LOAD).
4. Calls to `authenticator-be` use `fetch` with `AUTH_API_URL` and the Bearer
   token, not the axios instance (which points at `scorecard-be`).

## Values and formatting

- Coerce numbers with `Number(…)`. The API may return numerics as strings.
- A missing value is shown as "—", never as `0` (BR-SUM-004, FR-SUM-001).
- Integers: `toLocaleString('en-US', { maximumFractionDigits: 0 })`.
- Dates in state and parameters are `YYYY-MM-DD`. Build "today" in **local**
  time with the slice's `formatLocal` pattern, not `toISOString()` (GAP-009).

## Access

- Tab visibility and query gating read one list, `MAIN_TABS`, through
  `useCanSeeTab()`. Never hard-code a section check elsewhere.
- Client-side gating is UX, not security (SEC-PERM-001).

## Code style

- TypeScript strict mode. `@/` is the alias for `src/`.
- Prettier settings are in `.prettierrc.json`.
- Comments explain *why*. Keep that standard. Where a comment states a rule,
  the spec should state the same rule.
- Components live in `src/components/<kebab-name>/` with an `index.ts`, and
  Chakra recipes are co-located.

## Builds

- `npm run build` must pass (it runs `tsc` first).
- `npm run lint` is currently broken (GAP-013). Do not rely on it until it is migrated.
