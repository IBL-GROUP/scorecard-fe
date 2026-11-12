// Story S5, TC-S5-11 / AC-S5-5: Overview load time on live data.
//
//   node scripts/perf-overview.mjs --runs 20 [--cold] [--tab overview]
//
// Needs the live 2.0 build served at http://localhost:4175 (`npm run
// build:v2live` then `npx vite preview --port 4175`) and scorecard-be v2 on
// port 3012 with V2_CORS_ORIGINS including http://localhost:4175. The
// authenticator is answered in the browser (permissions: all four sections).
// The JWT is signed by scorecard-be's own secret in a child process and never
// printed.
//
// Each run opens a fresh browser context (no browser or React Query cache).
// --cold also empties the scorecard-be cache before every run (start the
// backend with V2_BQ_QUERY_CACHE=false to make BigQuery cold too).
// Reports, per run and as p50 / p90 / max:
//   first  = first Overview KPI tile shows a value
//   tiles  = every Overview KPI tile is loaded (AC-S5-5: p90 < 5 s warm)
//   full   = nothing on the tab is still loading (AC-S5-5: < 90 s cold)
import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const RUNS = Number(arg('runs', 20));
const COLD = process.argv.includes('--cold');
const TAB = arg('tab', 'overview');
const APP = arg('app', 'http://localhost:4175/scorecard-dashboard/');
const API = arg('api', 'http://localhost:3012/api');
const AUTH = 'http://localhost:4002/api';
const BE = arg('be', '../scorecard-be');

const token = execSync(
  `node -e "import('dotenv').then(d=>{d.config();import('jsonwebtoken').then(j=>process.stdout.write(j.default.sign({sub:'perf',user_name:'perf.user',email_id:'perf@example.test'},process.env.JWT_ACCESS_SECRET,{expiresIn:7200})))})"`,
  { cwd: BE },
).toString();
const PERMS = ['SUMMARY', 'SERVICE_MEASURE', 'DISPATCH_WIP', 'RD_DATA_STATUS'].map((s) => `ONE_THU.DASHBOARD.SUPPLYCHAIN_PULSE.${s}.VIEW`);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const runs = [];
for (let i = 0; i < RUNS; i++) {
  if (COLD) {
    const r = await fetch(`${API}/cache/clear`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`cache clear failed: ${r.status}`);
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(`${AUTH}/**`, (route) => {
    const p = new URL(route.request().url()).pathname;
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const body = p.endsWith('/me/permissions') ? { success: true, data: { roles: [], permissions: PERMS } } : p.endsWith('/profile') ? { data: { display_name: 'Perf' } } : { data: [] };
    return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await ctx.route(/^https:\/\/fonts\./, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.addInitScript((t) => {
    try {
      sessionStorage.setItem('searle_token_scorecard', t);
      // Record when each milestone is first reached, measured from navigation start.
      const marks = (window.__perf = {});
      const tick = () => {
        const tiles = [...document.querySelectorAll('[data-tile]')];
        const loading = (el) => el.querySelector('.chakra-skeleton, [data-scope="skeleton"]');
        const done = tiles.filter((el) => !loading(el));
        if (!marks.first && done.length) marks.first = performance.now();
        if (!marks.tiles && tiles.length && done.length === tiles.length) marks.tiles = performance.now();
        if (marks.tiles && !marks.full && !document.querySelector('.chakra-skeleton, [data-scope="skeleton"]')) marks.full = performance.now();
        if (!marks.full) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      /* about:blank */
    }
  }, token);
  const page = await ctx.newPage();
  const failed = [];
  page.on('response', (r) => r.url().startsWith(API) && r.status() >= 400 && r.status() !== 503 && failed.push(`${r.status()} ${new URL(r.url()).pathname}`));
  await page.goto(`${APP}?tab=${TAB}`);
  await page.waitForFunction(() => window.__perf?.full, null, { timeout: 180_000, polling: 100 });
  const m = await page.evaluate(() => window.__perf);
  runs.push({ first: Math.round(m.first), tiles: Math.round(m.tiles), full: Math.round(m.full), failed });
  process.stderr.write(`run ${i + 1}/${RUNS}: first ${Math.round(m.first)} ms · tiles ${Math.round(m.tiles)} ms · full ${Math.round(m.full)} ms${failed.length ? ' · failed ' + failed.join(',') : ''}\n`);
  await ctx.close();
}
await browser.close();

const stat = (k) => {
  const v = runs.map((r) => r[k]).sort((a, b) => a - b);
  return { p50: v[Math.floor(0.5 * (v.length - 1))], p90: v[Math.ceil(0.9 * (v.length - 1))], max: v[v.length - 1] };
};
const out = { tab: TAB, cache: COLD ? 'cold' : 'warm', runs: RUNS, first_ms: stat('first'), tiles_ms: stat('tiles'), full_ms: stat('full'), failed_requests: runs.flatMap((r) => r.failed) };
console.log(JSON.stringify(out, null, 1));
