/**
 * Tests for scripts/validate-specs.mjs — `npm run specs:test`.
 *
 * Each test names the TC-SPEC case it automates (specs/features/FEAT-SPEC-spec-tooling.md);
 * the validator's own S11 rule checks that every automated case is named here.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validate, FEATURE_SECTIONS } from './validate-specs.mjs';

const SCRIPT = fileURLToPath(new URL('./validate-specs.mjs', import.meta.url));
const REPO_ROOT = path.resolve(path.dirname(SCRIPT), '..');
const tmpDirs = [];
after(() => tmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

/* ------------------------------------------------------------- fixture */

const fm = (fields) =>
  ['---', ...Object.entries({ owner: 'Team', 'last-reviewed': '2026-11-03', ...fields }).map(([k, v]) => `${k}: ${v}`), '---', ''].join('\n');

const sectionsExcept = (missing, bodies = {}) =>
  FEATURE_SECTIONS.filter((s) => s !== missing)
    .map((s) => `## ${s}\n\n${bodies[s] ?? 'Not applicable.'}\n`)
    .join('\n');

const REQ_HEADER = '| ID | Requirement | Status | Implementation | Verified by |\n|---|---|---|---|---|';

function featureSpec({ requirements, missing, extra = '' } = {}) {
  return (
    fm({ id: 'FEAT-DEMO', title: 'Demo', type: 'feature', area: 'DEMO', status: 'Baseline' }) +
    '# Demo\n\n' +
    sectionsExcept(missing, {
      'Functional Requirements':
        `${REQ_HEADER}\n` +
        (requirements ?? '| FR-DEMO-001 | Does the thing. | Baseline | `src/demo.ts#demoFn` | TC-DEMO-001, TC-DEMO-002 |') +
        extra,
      'Acceptance Criteria': '| ID | Criterion | Covers |\n|---|---|---|\n| AC-DEMO-001 | Given X, then Y. | FR-DEMO-001 |',
      'Testing Requirements':
        '| ID | Scenario | Expected result | Covers | Automation |\n|---|---|---|---|---|\n' +
        '| TC-DEMO-001 | Do X | Y | FR-DEMO-001 | Manual |\n' +
        '| TC-DEMO-002 | Run it | Passes | FR-DEMO-001 | `scripts/demo.test.mjs` |',
      'Open Questions and Known Gaps': 'See GAP-001.',
    })
  );
}

const openapi = (paths) =>
  JSON.stringify({ openapi: '3.0.3', info: { title: 'Demo', version: '1' }, paths }, null, 2);

const BASE_FILES = {
  'AGENTS.md': '# Agents\n\nRead specs/ first. Example: FR-DEMO-001.\n',
  'specs/README.md': fm({ id: 'IDX', title: 'Index', type: 'index', status: 'Draft' }) + '# Index\n',
  'specs/migration-plan.md': fm({ id: 'PLAN', title: 'Plan', type: 'plan', status: 'Draft' }) + '# Plan\n',
  'specs/CONVENTIONS.md':
    fm({ id: 'STD', title: 'Conventions', type: 'standard', status: 'Draft' }) +
    '# Conventions\n\n```\n| ID | Example |\n|---|---|\n| FR-XX-1 | ignored inside a fence |\n```\n\n' +
    '| Area | Name | Spec |\n|---|---|---|\n| DEMO | Demo feature | `specs/features/FEAT-DEMO.md` |\n',
  'specs/gaps.md':
    fm({ id: 'REG', title: 'Gaps', type: 'register', status: 'Baseline' }) +
    '| ID | Area | Summary | Status |\n|---|---|---|---|\n| GAP-001 | DEMO | Something | Open |\n',
  'specs/templates/feature-spec.template.md': '# Template\n\n' + sectionsExcept(null),
  'specs/features/FEAT-DEMO.md': featureSpec(),
  'specs/api/scorecard-be.openapi.json': openapi({
    '/demo': { get: { operationId: 'getDemo', responses: { 200: { description: 'ok' } }, 'x-requirements': ['FR-DEMO-001'] } },
  }),
  'specs/api/authenticator-be.openapi.json': openapi({
    '/me/permissions': { get: { operationId: 'getPerms', responses: { 200: { description: 'ok' } } } },
  }),
  'src/api/endpoints.ts': "export const ApiEndpoints = { demo: '/demo' } as const;\n",
  'src/demo.ts': 'export function demoFn() {\n  return fetch(`${AUTH_API_URL}/me/permissions`);\n}\n',
  'scripts/demo.test.mjs': "// TC-DEMO-002\n",
};
const DIRS = ['specs/assessment', 'specs/product', 'specs/architecture/adr', 'specs/domains', 'specs/standards'];

/** A valid tree with its matrix generated, then `changes` applied (null deletes). */
function fixture(changes = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'specs-'));
  tmpDirs.push(root);
  const write = (rel, content) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  };
  DIRS.forEach((d) => fs.mkdirSync(path.join(root, d), { recursive: true }));
  Object.entries(BASE_FILES).forEach(([rel, content]) => write(rel, content));
  validate(root, { writeMatrix: true });
  for (const [rel, content] of Object.entries(changes)) {
    if (content === null) fs.rmSync(path.join(root, rel), { recursive: true, force: true });
    else write(rel, content);
  }
  return root;
}

const run = (root) => validate(root);
const has = (result, rule, text) =>
  result.errors.some((e) => e.rule === rule && (!text || `${e.file} ${e.message}`.includes(text)));
const show = (result) => result.errors.map((e) => `${e.rule} ${e.file}:${e.line} ${e.message}`).join('\n');

/* --------------------------------------------------------------- tests */

test('fixture baseline is valid', () => {
  const result = run(fixture());
  assert.deepEqual(result.errors, [], show(result));
});

test('TC-SPEC-001 missing directories and index files are reported (S01)', () => {
  const result = run(fixture({ 'specs/features': null, 'specs/README.md': null }));
  assert.ok(has(result, 'S01', 'specs/features'), show(result));
  assert.ok(has(result, 'S01', 'specs/README.md'), show(result));
});

test('TC-SPEC-002 a missing mandatory section is reported for specs and the template (S04)', () => {
  const result = run(
    fixture({
      'specs/features/FEAT-DEMO.md': featureSpec({ missing: 'Security Requirements' }),
      'specs/templates/feature-spec.template.md': '# Template\n\n' + sectionsExcept('Security Requirements'),
    })
  );
  assert.ok(has(result, 'S04', 'specs/features/FEAT-DEMO.md'), show(result));
  assert.ok(has(result, 'S04', 'feature-spec.template.md'), show(result));
});

test('TC-SPEC-003 duplicate, malformed and mis-areaed ids and bad gap rows are reported (S03, S05, S06, S15)', () => {
  const dup = run(fixture({ 'specs/features/FEAT-DEMO.md': featureSpec({ extra: '\n| FR-DEMO-001 | Again. | Baseline | `src/demo.ts` | — |' }) }));
  assert.ok(has(dup, 'S06', 'duplicate id FR-DEMO-001'), show(dup));

  const malformed = run(fixture({ 'specs/features/FEAT-DEMO.md': featureSpec({ extra: '\n| FR-DEMO-1 | Bad id. | Baseline | `src/demo.ts` | — |' }) }));
  assert.ok(has(malformed, 'S05', 'malformed requirement id "FR-DEMO-1"'), show(malformed));

  const wrongArea = run(fixture({ 'specs/features/FEAT-DEMO.md': featureSpec({ extra: '\n| FR-OTHER-001 | Wrong area. | Baseline | `src/demo.ts` | — |' }) }));
  assert.ok(has(wrongArea, 'S05', 'does not match'), show(wrongArea));

  const unregistered = run(
    fixture({ 'specs/features/FEAT-DEMO.md': featureSpec().replace('area: DEMO', 'area: NOPE') })
  );
  assert.ok(has(unregistered, 'S03', 'not registered'), show(unregistered));

  const badGap = run(
    fixture({ 'specs/gaps.md': BASE_FILES['specs/gaps.md'].replace('| Open |', '| Done |') })
  );
  assert.ok(has(badGap, 'S15', 'GAP-001'), show(badGap));
});

test('TC-SPEC-004 missing implementation paths and symbols are reported (S08)', () => {
  const missingFile = run(fixture({ 'specs/features/FEAT-DEMO.md': featureSpec({ requirements: '| FR-DEMO-001 | X. | Baseline | `src/gone.ts` | TC-DEMO-001, TC-DEMO-002 |' }) }));
  assert.ok(has(missingFile, 'S08', 'src/gone.ts does not exist'), show(missingFile));

  const missingSymbol = run(fixture({ 'src/demo.ts': 'export function renamedFn() {}\n' }));
  assert.ok(has(missingSymbol, 'S08', 'symbol "demoFn" not found'), show(missingSymbol));

  const noImpl = run(fixture({ 'specs/features/FEAT-DEMO.md': featureSpec({ requirements: '| FR-DEMO-001 | X. | Baseline | — | TC-DEMO-001, TC-DEMO-002 |' }) }));
  assert.ok(has(noImpl, 'S08', 'needs at least one implementation path'), show(noImpl));
});

test('TC-SPEC-005 unresolved references and one-way traceability links are reported (S09, S10)', () => {
  const result = run(fixture({ 'AGENTS.md': '# Agents\n\nSee FR-DEMO-999 and GAP-999.\n' }));
  assert.ok(has(result, 'S09', 'FR-DEMO-999'), show(result));
  assert.ok(has(result, 'S09', 'GAP-999'), show(result));

  const oneWay = run(
    fixture({
      'specs/features/FEAT-DEMO.md': featureSpec({
        extra: '\n| FR-DEMO-002 | Other. | Baseline | `src/demo.ts` | TC-DEMO-001 |',
      }),
    })
  );
  assert.ok(has(oneWay, 'S10', 'FR-DEMO-002: verified by TC-DEMO-001'), show(oneWay));
});

test('TC-SPEC-006 invalid OpenAPI and undocumented client paths are reported (S12, S13)', () => {
  const badJson = run(fixture({ 'specs/api/scorecard-be.openapi.json': '{ "openapi": ' }));
  assert.ok(has(badJson, 'S12', 'invalid JSON'), show(badJson));

  const op = { operationId: 'same', responses: { 200: { $ref: '#/components/responses/Missing' } } };
  const badSpec = run(fixture({ 'specs/api/scorecard-be.openapi.json': openapi({ '/demo': { get: op }, '/other': { get: op } }) }));
  assert.ok(has(badSpec, 'S12', 'duplicate operationId'), show(badSpec));
  assert.ok(has(badSpec, 'S12', 'unresolved $ref'), show(badSpec));

  const drift = run(fixture({ 'src/api/endpoints.ts': "export const ApiEndpoints = { demo: '/demo', extra: '/not-documented' };\n" }));
  assert.ok(has(drift, 'S13', '/not-documented'), show(drift));
});

test('TC-SPEC-007 a stale traceability matrix is reported until regenerated (S14)', () => {
  const root = fixture({
    'specs/features/FEAT-DEMO.md': featureSpec().replace('| Does the thing. | Baseline |', '| Does the thing. | Approved |'),
  });
  assert.ok(has(run(root), 'S14'), 'expected S14');
  validate(root, { writeMatrix: true });
  const result = run(root);
  assert.deepEqual(result.errors, [], show(result));
});

test('TC-SPEC-008 incomplete or invalid front matter is reported (S02)', () => {
  const spec = featureSpec()
    .replace('owner: Team\n', '')
    .replace('status: Baseline', 'status: Done')
    .replace('last-reviewed: 2026-11-03', 'last-reviewed: 03/11/2026');
  const result = run(fixture({ 'specs/features/FEAT-DEMO.md': spec }));
  assert.ok(has(result, 'S02', 'missing "owner"'), show(result));
  assert.ok(has(result, 'S02', 'unknown status "Done"'), show(result));
  assert.ok(has(result, 'S02', 'not YYYY-MM-DD'), show(result));
});

test('TC-SPEC-009 the repository specs are valid', () => {
  const result = validate(REPO_ROOT);
  assert.deepEqual(result.errors, [], show(result));
});

test('TC-SPEC-010 an automated test case must be named in its test file (S11)', () => {
  const result = run(fixture({ 'scripts/demo.test.mjs': '// nothing here\n' }));
  assert.ok(has(result, 'S11', 'does not mention TC-DEMO-002'), show(result));
});

test('TC-SPEC-011 the CLI exits 1 with file:line findings and GitHub annotations', () => {
  const root = fixture({ 'specs/features/FEAT-DEMO.md': featureSpec({ extra: '\n| FR-DEMO-001 | Again. | Baseline | `src/demo.ts` | — |' }) });
  const plain = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: '' } });
  assert.equal(plain.status, 1);
  assert.match(plain.stderr, /ERROR specs\/features\/FEAT-DEMO\.md:\d+ \[S06\]/);
  assert.doesNotMatch(plain.stdout, /::error/);

  const ci = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true' } });
  assert.equal(ci.status, 1);
  assert.match(ci.stdout, /::error file=specs\/features\/FEAT-DEMO\.md,line=\d+,title=S06::/);

  const clean = spawnSync(process.execPath, [SCRIPT, '--root', fixture()], { encoding: 'utf8' });
  assert.equal(clean.status, 0, clean.stderr);
});
