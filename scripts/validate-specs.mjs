#!/usr/bin/env node
/**
 * Validates the specification tree under specs/ against specs/CONVENTIONS.md.
 *
 *   node scripts/validate-specs.mjs                 validate, exit 1 on any error
 *   node scripts/validate-specs.mjs --write-matrix  regenerate specs/traceability.md, then validate
 *   node scripts/validate-specs.mjs --root <dir>    validate another tree (used by the tests)
 *
 * No dependencies on purpose: it runs on a bare `node` in CI before (or
 * without) `npm ci`, and nothing here is worth a package.
 *
 * Every finding carries a rule code (S01…S15) so a failure can be looked up in
 * specs/features/FEAT-SPEC-spec-tooling.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---------------------------------------------------------------- config */

export const REQUIRED_PATHS = [
  'AGENTS.md',
  'specs/README.md',
  'specs/CONVENTIONS.md',
  'specs/gaps.md',
  'specs/traceability.md',
  'specs/migration-plan.md',
  'specs/assessment',
  'specs/product',
  'specs/architecture',
  'specs/architecture/adr',
  'specs/domains',
  'specs/features',
  'specs/api',
  'specs/api/scorecard-be.openapi.json',
  'specs/api/authenticator-be.openapi.json',
  'specs/standards',
  'specs/templates',
  'specs/templates/feature-spec.template.md',
];

export const FEATURE_SECTIONS = [
  'Overview',
  'Goals and Scope',
  'Actors',
  'Functional Requirements',
  'Business Rules',
  'Data Requirements',
  'API / Interface Contracts',
  'Error Handling',
  'Security Requirements',
  'Non-Functional Requirements',
  'Acceptance Criteria',
  'Testing Requirements',
  'Dependencies',
  'Open Questions and Known Gaps',
  'Change History',
];

export const DOMAIN_SECTIONS = [
  'Purpose',
  'Responsibilities',
  'Boundaries',
  'Related Specifications',
  'Open Questions and Known Gaps',
];

const DOC_TYPES = [
  'index', 'standard', 'assessment', 'product', 'architecture', 'adr',
  'domain', 'feature', 'api', 'register', 'plan', 'generated',
];
const DOC_STATUSES = ['Draft', 'In Review', 'Baseline', 'Approved', 'Deprecated'];
const REQ_STATUSES = ['Baseline', 'Proposed', 'Approved', 'Deprecated'];
const GAP_STATUSES = ['Open', 'Needs decision', 'Accepted', 'Resolved'];
const FRONT_MATTER_KEYS = ['id', 'title', 'type', 'status', 'owner', 'last-reviewed'];

/** Requirement types — everything except acceptance criteria and test cases. */
const REQ_TYPES = ['FR', 'NFR', 'BR', 'DR', 'SEC', 'ERR', 'INT'];
const ALL_TYPES = [...REQ_TYPES, 'AC', 'TC'];
/** Areas whose implementation lives outside this repo (scorecard-be). */
const EXTERNAL_AREAS = ['MET'];

const TYPE_ALT = ALL_TYPES.join('|');
const ID_RE = new RegExp(`^(${TYPE_ALT})-([A-Z]{2,6})-(\\d{3})$`);
const CANDIDATE_RE = new RegExp(`^(${TYPE_ALT})-`, 'i');
const REF_RE = new RegExp(`\\b(?:${TYPE_ALT})-[A-Z]{2,6}-\\d{3}\\b`, 'g');
const LOOSE_REF_RE = new RegExp(`\\b(?:${TYPE_ALT})-[A-Za-z0-9]+-\\d+\\b`, 'g');
const GAP_RE = /\bGAP-\d{3}\b/g;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** OpenAPI contracts and where the client's calls to them are found. */
const CONTRACT_DRIFT = [
  {
    contract: 'specs/api/scorecard-be.openapi.json',
    sources: ['src/api/endpoints.ts'],
    patterns: [/['"](\/[a-z][^'"]*)['"]/g],
  },
  {
    contract: 'specs/api/authenticator-be.openapi.json',
    sources: 'src',
    patterns: [/\$\{AUTH_API_URL\}(\/[^`$]+)`/g, /authGet<[^>]*>\('(\/[^']+)'\)/g],
  },
];

const MATRIX_PATH = 'specs/traceability.md';
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options'];

/* --------------------------------------------------------------- helpers */

const toPosix = (p) => p.split(path.sep).join('/');

function walk(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...walk(full, filter));
    } else if (filter(entry.name)) {
      out.push(full);
    }
  }
  return out.sort();
}

function parseFrontMatter(lines) {
  if (lines[0]?.trim() !== '---') return { data: null, end: 0 };
  const data = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return { data, end: i + 1 };
    const m = lines[i].match(/^([A-Za-z][\w-]*):\s*(.*?)\s*(?:#.*)?$/);
    if (m) data[m[1]] = m[2];
  }
  return { data: null, end: 0 };
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
}

const stripMarkup = (cell) => cell.replace(/[`*]/g, '').trim();
const backticked = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
const refsIn = (text) => text.match(REF_RE) ?? [];

/** A backticked token that names a repo file rather than an endpoint or a word. */
function asRepoPath(token) {
  if (token.startsWith('/') || /\s/.test(token)) return null;
  const [file, symbol] = token.split('#');
  const looksLikePath =
    /^[\w.@-]+(\/[\w.@[\]-]+)+$/.test(file) ||
    /^[\w.-]+\.(ts|tsx|js|mjs|cjs|json|md|css|html|ya?ml|conf)$/.test(file);
  return looksLikePath ? { file, symbol } : null;
}

/**
 * Reads one Markdown file into lines (with code fences and HTML comments
 * blanked so neither defines nor references IDs), headings and tables.
 */
function parseMarkdown(text) {
  const raw = text.split(/\r?\n/);
  const { data, end } = parseFrontMatter(raw);
  const lines = raw.map(() => '');
  let inFence = false;
  let inComment = false;
  for (let i = end; i < raw.length; i++) {
    const line = raw[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (inComment) {
      if (line.includes('-->')) inComment = false;
      continue;
    }
    if (line.includes('<!--') && !line.includes('-->')) {
      inComment = true;
      continue;
    }
    lines[i] = line.replace(/<!--.*?-->/g, '');
  }

  const headings = [];
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(#{1,6})\s+(.*?)\s*$/);
    if (h) {
      headings.push({
        level: h[1].length,
        text: h[2].replace(/^\d+(\.\d+)*\.?\s+/, '').trim(),
        line: i + 1,
      });
      continue;
    }
    if (lines[i].trim().startsWith('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? '')) {
      const header = splitRow(lines[i]);
      const rows = [];
      let j = i + 2;
      for (; j < lines.length && lines[j].trim().startsWith('|'); j++) {
        rows.push({ cells: splitRow(lines[j]), line: j + 1 });
      }
      tables.push({ header, rows, line: i + 1 });
      i = j - 1;
    }
  }
  return { frontMatter: data, lines, headings, tables };
}

/* ------------------------------------------------------------- validator */

/**
 * @param {string} root repository root
 * @param {{ writeMatrix?: boolean }} [options]
 * @returns {{ errors: Finding[], warnings: Finding[], stats: object, matrix: string }}
 */
export function validate(root, options = {}) {
  const errors = [];
  const warnings = [];
  const abs = (rel) => path.join(root, rel);
  const exists = (rel) => fs.existsSync(abs(rel));
  const report = (list) => (rule, file, line, message) =>
    list.push({ rule, file, line, message });
  const error = report(errors);
  const warn = report(warnings);

  /* S01 — structure */
  for (const rel of REQUIRED_PATHS) {
    // --write-matrix is about to create the matrix, so its absence is not an error.
    if (options.writeMatrix && rel === MATRIX_PATH) continue;
    if (!exists(rel)) error('S01', rel, 0, 'required path is missing');
  }

  /* Load every spec document. */
  const specFiles = walk(abs('specs'), (n) => n.endsWith('.md')).map((f) =>
    toPosix(path.relative(root, f))
  );
  const docs = specFiles.map((rel) => ({
    rel,
    isTemplate: rel.startsWith('specs/templates/'),
    ...parseMarkdown(fs.readFileSync(abs(rel), 'utf8')),
  }));

  /* S02 — front matter */
  const docIds = new Map();
  for (const doc of docs) {
    if (doc.isTemplate) continue;
    const fm = doc.frontMatter;
    if (!fm) {
      error('S02', doc.rel, 1, 'missing front matter (see CONVENTIONS §1)');
      continue;
    }
    for (const key of FRONT_MATTER_KEYS) {
      if (!fm[key]) error('S02', doc.rel, 1, `front matter is missing "${key}"`);
    }
    if (fm.type && !DOC_TYPES.includes(fm.type)) {
      error('S02', doc.rel, 1, `unknown type "${fm.type}" (expected one of ${DOC_TYPES.join(', ')})`);
    }
    if (fm.status && !DOC_STATUSES.includes(fm.status)) {
      error('S02', doc.rel, 1, `unknown status "${fm.status}" (expected one of ${DOC_STATUSES.join(', ')})`);
    }
    if (fm['last-reviewed'] && !DATE_RE.test(fm['last-reviewed'])) {
      error('S02', doc.rel, 1, `last-reviewed "${fm['last-reviewed']}" is not YYYY-MM-DD`);
    }
    if ((fm.type === 'feature' || fm.type === 'domain') && !fm.area) {
      error('S02', doc.rel, 1, `a ${fm.type} spec needs an "area"`);
    }
    if (fm.id) {
      if (docIds.has(fm.id)) {
        error('S02', doc.rel, 1, `document id "${fm.id}" is also used by ${docIds.get(fm.id)}`);
      } else {
        docIds.set(fm.id, doc.rel);
      }
    }
  }

  /* S03 — area registry */
  const areas = new Map();
  const conventions = docs.find((d) => d.rel === 'specs/CONVENTIONS.md');
  const registry = conventions?.tables.find((t) => t.header[0] === 'Area' && t.header.includes('Spec'));
  if (conventions && !registry) {
    error('S03', 'specs/CONVENTIONS.md', 0, 'no area registry table (header "| Area | Name | Spec |")');
  }
  for (const row of registry?.rows ?? []) {
    const [area, name, specCell] = row.cells;
    const spec = backticked(specCell)[0] ?? stripMarkup(specCell);
    if (!/^[A-Z]{2,6}$/.test(area)) {
      error('S03', 'specs/CONVENTIONS.md', row.line, `area "${area}" must be 2–6 capital letters`);
      continue;
    }
    if (areas.has(area)) error('S03', 'specs/CONVENTIONS.md', row.line, `area "${area}" is registered twice`);
    if (spec && !exists(spec)) error('S03', 'specs/CONVENTIONS.md', row.line, `area "${area}" points to missing spec ${spec}`);
    areas.set(area, { name, spec });
  }
  for (const doc of docs) {
    const fm = doc.frontMatter;
    if (doc.isTemplate || !fm?.area) continue;
    const entry = areas.get(fm.area);
    if (!entry) error('S03', doc.rel, 1, `area "${fm.area}" is not registered in CONVENTIONS §3`);
    else if (entry.spec !== doc.rel) {
      error('S03', doc.rel, 1, `area "${fm.area}" is registered to ${entry.spec}, not this file`);
    }
  }

  /* S04 — mandatory sections */
  const checkSections = (doc, required) => {
    const present = new Set(doc.headings.filter((h) => h.level === 2).map((h) => h.text.toLowerCase()));
    for (const section of required) {
      if (!present.has(section.toLowerCase())) {
        error('S04', doc.rel, 0, `missing mandatory section "## ${section}"`);
      }
    }
  };
  for (const doc of docs) {
    if (doc.rel === 'specs/templates/feature-spec.template.md') checkSections(doc, FEATURE_SECTIONS);
    else if (doc.isTemplate) continue;
    else if (doc.frontMatter?.type === 'feature') checkSections(doc, FEATURE_SECTIONS);
    else if (doc.frontMatter?.type === 'domain') checkSections(doc, DOMAIN_SECTIONS);
  }

  /* S05–S08, S11, S15 — definitions in tables */
  const defs = new Map();
  const gaps = new Map();
  const col = (table, name) => table.header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  for (const doc of docs) {
    if (doc.isTemplate) continue;
    const fm = doc.frontMatter ?? {};
    for (const table of doc.tables) {
      if (stripMarkup(table.header[0]) !== 'ID') continue;
      for (const row of table.rows) {
        const id = stripMarkup(row.cells[0] ?? '');
        const cell = (name) => {
          const i = col(table, name);
          return i >= 0 ? row.cells[i] ?? '' : null;
        };

        if (/^GAP-/i.test(id)) {
          if (!/^GAP-\d{3}$/.test(id)) {
            error('S05', doc.rel, row.line, `malformed gap id "${id}" (expected GAP-NNN)`);
          } else if (fm.type !== 'register') {
            error('S05', doc.rel, row.line, `${id}: gaps may only be defined in specs/gaps.md`);
          } else if (gaps.has(id)) {
            error('S06', doc.rel, row.line, `duplicate gap id ${id} (first defined on line ${gaps.get(id).line})`);
          } else {
            const status = stripMarkup(cell('Status') ?? '');
            if (!GAP_STATUSES.includes(status)) {
              error('S15', doc.rel, row.line, `${id}: status "${status}" must be one of ${GAP_STATUSES.join(', ')}`);
            }
            const area = stripMarkup(cell('Area') ?? '');
            if (area && !areas.has(area)) error('S15', doc.rel, row.line, `${id}: area "${area}" is not registered`);
            gaps.set(id, { line: row.line, area, status });
          }
          continue;
        }

        if (!CANDIDATE_RE.test(id)) continue;
        const m = id.match(ID_RE);
        if (!m) {
          error('S05', doc.rel, row.line, `malformed requirement id "${id}" (expected <TYPE>-<AREA>-<NNN>, e.g. FR-AUTH-001)`);
          continue;
        }
        const [, type, area] = m;
        if (fm.type !== 'feature' && fm.type !== 'domain') {
          error('S05', doc.rel, row.line, `${id}: requirement ids may only be defined in feature or domain specs`);
          continue;
        }
        if (area !== fm.area) {
          error('S05', doc.rel, row.line, `${id}: area "${area}" does not match this spec's area "${fm.area}"`);
        }
        if (defs.has(id)) {
          const first = defs.get(id);
          error('S06', doc.rel, row.line, `duplicate id ${id} (first defined in ${first.file}:${first.line})`);
          continue;
        }

        const def = { id, type, area, file: doc.rel, line: row.line, status: null, impl: [], verifiedBy: [], covers: [], automation: null };

        if (REQ_TYPES.includes(type)) {
          const status = stripMarkup(cell('Status') ?? '');
          def.status = status;
          if (!REQ_STATUSES.includes(status)) {
            error('S07', doc.rel, row.line, `${id}: status "${status}" must be one of ${REQ_STATUSES.join(', ')}`);
          }
          const implCell = cell('Implementation');
          if (implCell === null) {
            error('S08', doc.rel, row.line, `${id}: table has no "Implementation" column`);
          } else {
            for (const token of backticked(implCell)) {
              const p = asRepoPath(token);
              if (!p) continue;
              def.impl.push(token);
              if (!exists(p.file)) {
                error('S08', doc.rel, row.line, `${id}: implementation path ${p.file} does not exist`);
              } else if (p.symbol && fs.statSync(abs(p.file)).isFile()) {
                if (!fs.readFileSync(abs(p.file), 'utf8').includes(p.symbol)) {
                  error('S08', doc.rel, row.line, `${id}: symbol "${p.symbol}" not found in ${p.file}`);
                }
              }
            }
            const needsImpl = (status === 'Baseline' || status === 'Approved') && !EXTERNAL_AREAS.includes(area);
            if (needsImpl && def.impl.length === 0) {
              error('S08', doc.rel, row.line, `${id}: ${status} requirement needs at least one implementation path`);
            }
          }
          def.verifiedBy = refsIn(cell('Verified by') ?? '');
        } else if (type === 'AC') {
          def.covers = refsIn(cell('Covers') ?? '');
          if (def.covers.length === 0) error('S10', doc.rel, row.line, `${id}: acceptance criterion covers no requirement`);
        } else if (type === 'TC') {
          def.covers = refsIn(cell('Covers') ?? '');
          if (def.covers.length === 0) error('S10', doc.rel, row.line, `${id}: test case covers no requirement`);
          const automation = cell('Automation') ?? '';
          const files = backticked(automation).map(asRepoPath).filter(Boolean);
          if (files.length > 0) {
            def.automation = files.map((f) => f.file);
            for (const f of files) {
              if (!exists(f.file)) {
                error('S11', doc.rel, row.line, `${id}: automated test ${f.file} does not exist`);
              } else if (!fs.readFileSync(abs(f.file), 'utf8').includes(id)) {
                error('S11', doc.rel, row.line, `${id}: ${f.file} does not mention ${id} — name the test after its case`);
              }
            }
          } else if (stripMarkup(automation) !== 'Manual') {
            error('S11', doc.rel, row.line, `${id}: Automation must be "Manual" or a backticked test file`);
          }
        }
        defs.set(id, def);
      }
    }
  }

  /* S09 — every reference resolves */
  const scanRefs = (rel, lines) => {
    lines.forEach((line, i) => {
      for (const ref of line.match(REF_RE) ?? []) {
        if (!defs.has(ref)) error('S09', rel, i + 1, `reference to undefined id ${ref}`);
      }
      for (const loose of line.match(LOOSE_REF_RE) ?? []) {
        if (!ID_RE.test(loose)) error('S05', rel, i + 1, `malformed id reference "${loose}"`);
      }
      for (const ref of line.match(GAP_RE) ?? []) {
        if (!gaps.has(ref)) error('S09', rel, i + 1, `reference to undefined gap ${ref}`);
      }
    });
  };
  for (const doc of docs) if (!doc.isTemplate) scanRefs(doc.rel, doc.lines);
  if (exists('AGENTS.md')) {
    scanRefs('AGENTS.md', parseMarkdown(fs.readFileSync(abs('AGENTS.md'), 'utf8')).lines);
  }

  /* S10 — the links between requirements, criteria and tests agree */
  for (const def of defs.values()) {
    if (REQ_TYPES.includes(def.type)) {
      for (const ref of def.verifiedBy) {
        const tc = defs.get(ref);
        if (!tc) continue; // already an S09
        if (tc.type !== 'TC') {
          error('S10', def.file, def.line, `${def.id}: "Verified by" lists ${ref}, which is not a test case`);
        } else if (!tc.covers.includes(def.id)) {
          error('S10', def.file, def.line, `${def.id}: verified by ${ref}, but ${ref} does not list ${def.id} under Covers`);
        }
      }
    } else {
      for (const ref of def.covers) {
        const target = defs.get(ref);
        if (!target) continue;
        if (!REQ_TYPES.includes(target.type)) {
          error('S10', def.file, def.line, `${def.id}: covers ${ref}, which is not a requirement`);
        } else if (def.type === 'TC' && !target.verifiedBy.includes(def.id)) {
          warn('S10', def.file, def.line, `${def.id} covers ${ref}, but ${ref} does not list ${def.id} under "Verified by"`);
        }
      }
    }
  }

  /* S12, S13 — API contracts */
  const operationsByReq = new Map();
  for (const file of walk(abs('specs/api'), (n) => n.endsWith('.json'))) {
    const rel = toPosix(path.relative(root, file));
    const text = fs.readFileSync(file, 'utf8');
    scanRefs(rel, text.split(/\r?\n/));
    let spec;
    try {
      spec = JSON.parse(text);
    } catch (e) {
      error('S12', rel, 0, `invalid JSON: ${e.message}`);
      continue;
    }
    if (!/^3\.\d+\.\d+$/.test(String(spec.openapi ?? ''))) error('S12', rel, 0, '"openapi" must be a 3.x.y version');
    if (!spec.info?.title || !spec.info?.version) error('S12', rel, 0, '"info.title" and "info.version" are required');
    if (!spec.paths || typeof spec.paths !== 'object' || Object.keys(spec.paths).length === 0) {
      error('S12', rel, 0, '"paths" must be a non-empty object');
      continue;
    }

    const resolveRef = (ref) =>
      ref.startsWith('#/')
        ? ref.slice(2).split('/').reduce((node, key) => node?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], spec)
        : undefined;
    const visit = (node, where) => {
      if (Array.isArray(node)) node.forEach((n, i) => visit(n, `${where}/${i}`));
      else if (node && typeof node === 'object') {
        if (typeof node.$ref === 'string' && resolveRef(node.$ref) === undefined) {
          error('S12', rel, 0, `unresolved $ref "${node.$ref}" at ${where}`);
        }
        for (const [k, v] of Object.entries(node)) visit(v, `${where}/${k}`);
      }
    };
    visit(spec, '#');

    const operationIds = new Set();
    for (const [route, item] of Object.entries(spec.paths)) {
      if (!route.startsWith('/')) error('S12', rel, 0, `path "${route}" must start with "/"`);
      for (const method of HTTP_METHODS) {
        const op = item?.[method];
        if (!op) continue;
        const where = `${method.toUpperCase()} ${route}`;
        if (!op.operationId) error('S12', rel, 0, `${where}: missing operationId`);
        else if (operationIds.has(op.operationId)) error('S12', rel, 0, `${where}: duplicate operationId "${op.operationId}"`);
        else operationIds.add(op.operationId);
        if (!op.responses || Object.keys(op.responses).length === 0) error('S12', rel, 0, `${where}: no responses`);
        for (const req of op['x-requirements'] ?? []) {
          if (!operationsByReq.has(req)) operationsByReq.set(req, []);
          operationsByReq.get(req).push(op.operationId ?? where);
        }
      }
    }

    const drift = CONTRACT_DRIFT.find((d) => d.contract === rel);
    if (!drift) continue;
    const sources = Array.isArray(drift.sources)
      ? drift.sources.filter(exists)
      : walk(abs(drift.sources), (n) => /\.(ts|tsx)$/.test(n)).map((f) => toPosix(path.relative(root, f)));
    const documented = new Set([
      ...Object.keys(spec.paths),
      ...(spec['x-client-paths-not-served'] ?? []).map((p) => p.path),
    ]);
    for (const source of sources) {
      const lines = fs.readFileSync(abs(source), 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const pattern of drift.patterns) {
          for (const match of line.matchAll(pattern)) {
            const route = match[1].split('?')[0];
            if (!documented.has(route)) {
              error('S13', source, i + 1, `client calls ${route}, which ${rel} does not document`);
            }
          }
        }
      });
    }
  }

  /* S14 — traceability matrix */
  const matrix = buildMatrix({ defs, gaps, areas, docs, operationsByReq });
  if (options.writeMatrix) {
    fs.mkdirSync(path.dirname(abs(MATRIX_PATH)), { recursive: true });
    fs.writeFileSync(abs(MATRIX_PATH), matrix);
  } else if (exists(MATRIX_PATH)) {
    const current = fs.readFileSync(abs(MATRIX_PATH), 'utf8').replace(/\r\n/g, '\n');
    if (current !== matrix) {
      error('S14', MATRIX_PATH, 0, 'out of date — run `npm run specs:matrix` and commit the result');
    }
  }

  const reqs = [...defs.values()].filter((d) => REQ_TYPES.includes(d.type));
  const stats = {
    specs: docs.filter((d) => !d.isTemplate).length,
    requirements: reqs.length,
    withTests: reqs.filter((d) => d.verifiedBy.length > 0).length,
    acceptanceCriteria: [...defs.values()].filter((d) => d.type === 'AC').length,
    testCases: [...defs.values()].filter((d) => d.type === 'TC').length,
    automatedTestCases: [...defs.values()].filter((d) => d.type === 'TC' && d.automation).length,
    gaps: gaps.size,
  };
  return { errors, warnings, stats, matrix };
}

/* ---------------------------------------------------------------- matrix */

const TYPE_ORDER = Object.fromEntries(ALL_TYPES.map((t, i) => [t, i]));
const byId = (a, b) =>
  a.area === b.area
    ? TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.id.localeCompare(b.id)
    : a.area.localeCompare(b.area);

function buildMatrix({ defs, gaps, areas, docs, operationsByReq }) {
  const all = [...defs.values()];
  const reqs = all.filter((d) => REQ_TYPES.includes(d.type)).sort(byId);
  const acsFor = (id) => all.filter((d) => d.type === 'AC' && d.covers.includes(id)).map((d) => d.id).sort();
  const tcsFor = (req) =>
    [...new Set([...req.verifiedBy, ...all.filter((d) => d.type === 'TC' && d.covers.includes(req.id)).map((d) => d.id)])].sort();
  const isAutomated = (tcId) => Boolean(defs.get(tcId)?.automation);
  const openGaps = (area) =>
    [...gaps.entries()].filter(([, g]) => g.area === area && g.status !== 'Resolved').map(([id]) => id);
  // Deterministic, so the file only changes when a spec does.
  const reviewed = docs
    .filter((d) => !d.isTemplate && d.rel !== MATRIX_PATH)
    .map((d) => d.frontMatter?.['last-reviewed'] ?? '')
    .filter((v) => DATE_RE.test(v))
    .sort()
    .at(-1) ?? '1970-01-01';

  const out = [
    '---',
    'id: GEN-TRACEABILITY',
    'title: Requirement traceability matrix',
    'type: generated',
    'status: Baseline',
    'owner: Unassigned',
    `last-reviewed: ${reviewed}`,
    '---',
    '',
    '<!-- Generated by `npm run specs:matrix` from the requirement tables. Do not edit by hand. -->',
    '',
    '# Requirement Traceability Matrix',
    '',
    'Requirement → implementation → test case → acceptance criterion, for every',
    'requirement defined under `specs/features` and `specs/domains`. "Automated"',
    'means at least one of its test cases points at a test file.',
    '',
    '## Coverage Summary',
    '',
    '| Area | Requirements | With a test case | Automated | Acceptance criteria | Open gaps |',
    '|---|---|---|---|---|---|',
  ];

  const usedAreas = [...areas.keys()].filter((a) => reqs.some((r) => r.area === a) || openGaps(a).length > 0);
  for (const area of usedAreas) {
    const rs = reqs.filter((r) => r.area === area);
    const withTc = rs.filter((r) => tcsFor(r).length > 0).length;
    const automated = rs.filter((r) => tcsFor(r).some(isAutomated)).length;
    const acs = all.filter((d) => d.type === 'AC' && d.area === area).length;
    out.push(`| ${area} | ${rs.length} | ${withTc} | ${automated} | ${acs} | ${openGaps(area).length} |`);
  }
  out.push(
    `| **Total** | ${reqs.length} | ${reqs.filter((r) => tcsFor(r).length > 0).length} | ${reqs.filter((r) => tcsFor(r).some(isAutomated)).length} | ${all.filter((d) => d.type === 'AC').length} | ${[...gaps.values()].filter((g) => g.status !== 'Resolved').length} |`,
    ''
  );

  for (const area of usedAreas) {
    const rs = reqs.filter((r) => r.area === area);
    const { name, spec } = areas.get(area);
    out.push(`## ${area} — ${name}`, '');
    out.push(`Spec: [${spec.replace(/^specs\//, '')}](${spec.replace(/^specs\//, '')})`, '');
    const gapList = openGaps(area);
    if (gapList.length) out.push(`Open gaps: ${gapList.join(', ')}`, '');
    if (rs.length === 0) {
      out.push('No requirements defined yet.', '');
      continue;
    }
    out.push(
      '| Requirement | Status | Implementation | Test cases | Automated | Acceptance criteria | API operations |',
      '|---|---|---|---|---|---|---|'
    );
    for (const r of rs) {
      const tcs = tcsFor(r);
      out.push(
        `| ${r.id} | ${r.status} | ${r.impl.map((p) => `\`${p}\``).join('<br>') || '—'} | ${tcs.join(', ') || '—'} | ${tcs.some(isAutomated) ? 'Yes' : 'No'} | ${acsFor(r.id).join(', ') || '—'} | ${(operationsByReq.get(r.id) ?? []).join(', ') || '—'} |`
      );
    }
    out.push('');
  }
  return out.join('\n');
}

/* ------------------------------------------------------------------- cli */

function main(argv) {
  const args = argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const root = rootIdx >= 0 ? path.resolve(args[rootIdx + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const writeMatrix = args.includes('--write-matrix');

  const { errors, warnings, stats } = validate(root, { writeMatrix });
  const inCi = process.env.GITHUB_ACTIONS === 'true';
  const print = (level, f) => {
    const where = f.line ? `${f.file}:${f.line}` : f.file;
    console[level === 'error' ? 'error' : 'warn'](`${level.toUpperCase()} ${where} [${f.rule}] ${f.message}`);
    if (inCi) console.log(`::${level === 'error' ? 'error' : 'warning'} file=${f.file},line=${f.line || 1},title=${f.rule}::${f.message}`);
  };
  warnings.forEach((w) => print('warning', w));
  errors.forEach((e) => print('error', e));

  if (writeMatrix) console.log(`Wrote ${MATRIX_PATH}`);
  console.log(
    `\nspecs: ${stats.specs} documents, ${stats.requirements} requirements (${stats.withTests} with test cases), ` +
      `${stats.acceptanceCriteria} acceptance criteria, ${stats.testCases} test cases (${stats.automatedTestCases} automated), ${stats.gaps} gaps`
  );
  if (errors.length) {
    console.error(`\n✖ ${errors.length} error(s), ${warnings.length} warning(s). See specs/CONVENTIONS.md.`);
    return 1;
  }
  console.log(`✔ Specifications valid (${warnings.length} warning(s)).`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv);
}
