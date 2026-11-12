// Test doubles for the two services the 2.0 app talks to (story S5).
//
// - Authenticator (VITE_AUTH_API_URL): ticket redemption, permissions,
//   profile, other dashboards and usage events.
// - scorecard-be v2 (VITE_API_BASE_URL): answered from the S1 demo data
//   (src/v2/demo/demoApi.ts), which follows the scorecard-be contract.
//
// The app is the real live build: its session handoff, permission gate and API
// client all run unchanged. Only the network answers are made up.
import type { Page, Request } from '@playwright/test';
import type { InternalAxiosRequestConfig } from 'axios';
import { demoAdapter } from '../src/v2/demo/demoApi';
import { ALL_SECTIONS, type Section } from '../src/v2/features/tabs';

export const API = 'http://api.e2e.invalid/api';
export const AUTH = 'http://auth.e2e.invalid/api';
export const TICKET = 'E2ETICKET0000001';
export const USER = { sub: 'e2e-user', user_name: 'e2e.user', email_id: 'e2e.user@example.test' };

const permissionCode = (s: Section) => `ONE_THU.DASHBOARD.SUPPLYCHAIN_PULSE.${s}.VIEW`;

/** An unsigned token the app accepts: it only reads `exp` and `sub` (FEAT-AUTH). The stubs never check it. */
export function fakeToken(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...USER, exp: Math.floor(Date.now() / 1000) + 3600 })}.e2e`;
}

export interface Traffic {
  /** scorecard-be paths requested, in order (e.g. "/sales-summary"). */
  api: string[];
  /** scorecard-be requests with their query, for window checks. */
  apiCalls: { path: string; params: URLSearchParams }[];
  usage: { heartbeat: number; export: { table?: string }[] };
  redeemed: string[];
  /** Console errors and uncaught page errors. */
  errors: string[];
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };

function paramsOf(sp: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const k of new Set(sp.keys())) {
    const all = sp.getAll(k);
    out[k] = all.length > 1 ? all : all[0];
  }
  return out;
}

export interface StubOptions {
  /** Permission sections the user holds (default: all four). */
  sections?: Section[];
  /** Start signed in (token in sessionStorage); false = arrive with a portal ticket instead. */
  signedIn?: boolean;
  colorMode?: 'light' | 'dark';
  /** Planner view on (Zone 4 tables open). */
  planner?: boolean;
}

/** Wires both services and returns the recorded traffic. Call before page.goto. */
export async function stubServices(page: Page, opts: StubOptions = {}): Promise<Traffic> {
  const sections = opts.sections ?? ALL_SECTIONS;
  const t: Traffic = { api: [], apiCalls: [], usage: { heartbeat: 0, export: [] }, redeemed: [], errors: [] };
  page.on('console', (m) => m.type() === 'error' && t.errors.push(m.text()));
  page.on('pageerror', (e) => t.errors.push(String(e)));

  await page.route(`${AUTH}/**`, async (route, req: Request) => {
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const path = new URL(req.url()).pathname.replace(/^\/api/, '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/ticket/redeem') {
      const { ticket } = JSON.parse(req.postData() ?? '{}');
      t.redeemed.push(ticket);
      return ticket === TICKET ? json({ token: fakeToken() }) : json({ message: 'invalid ticket' }, 401);
    }
    if (path === '/me/permissions') return json({ success: true, data: { roles: [], permissions: sections.map(permissionCode) } });
    if (path === '/profile') return json({ data: { display_name: 'E2E User' } });
    if (path === '/dashboards/user-reports') return json({ data: [] });
    if (path === '/usage/heartbeat') return (t.usage.heartbeat++, json({ success: true }));
    if (path === '/usage/export') return (t.usage.export.push(JSON.parse(req.postData() ?? '{}')), json({ success: true }));
    return json({});
  });

  await page.route(`${API}/**`, async (route, req: Request) => {
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, '');
    t.api.push(path);
    t.apiCalls.push({ path, params: url.searchParams });
    const config = { url: path, params: paramsOf(url.searchParams), headers: {} } as unknown as InternalAxiosRequestConfig;
    try {
      const res = await demoAdapter(config);
      return route.fulfill({ status: res.status, headers: CORS, contentType: 'application/json', body: JSON.stringify(res.data) });
    } catch (e) {
      const res = (e as { response?: { status: number; data: unknown } }).response;
      return route.fulfill({ status: res?.status ?? 500, headers: CORS, contentType: 'application/json', body: JSON.stringify(res?.data ?? {}) });
    }
  });

  // Web fonts (index.html): answered empty so the suite runs offline; system fonts are used.
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));

  // Nothing else may leave the browser (no real portal, API or CDN call goes unnoticed).
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1|api\.e2e\.invalid|auth\.e2e\.invalid|fonts\.googleapis\.com|fonts\.gstatic\.com)/, (route) => {
    t.errors.push(`unexpected request ${route.request().url()}`);
    return route.abort();
  });

  await page.addInitScript(
    ([token, colorMode, planner, user]) => {
      try {
        if (token) sessionStorage.setItem('searle_token_scorecard', token);
        localStorage.setItem('chakra-ui-color-mode', colorMode);
        if (planner) localStorage.setItem(`sc2.persona.${user}`, 'planner');
      } catch {
        /* about:blank has no storage */
      }
    },
    [opts.signedIn === false ? '' : fakeToken(), opts.colorMode ?? 'light', opts.planner ? '1' : '', USER.user_name] as const,
  );
  return t;
}

/** Waits until no tile, card or table is still loading. */
export async function settled(page: Page) {
  // Tabs queue their requests one after another (FR-EXEC-014), so check twice
  // with a pause: a request queued just after "idle" is not missed.
  for (let i = 0; i < 2; i++) {
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => document.querySelectorAll('.chakra-skeleton, [data-scope="skeleton"]').length === 0, null, { timeout: 30_000 });
    await page.waitForTimeout(400);
  }
}

/** Console errors that are not expected noise. */
export const realErrors = (t: Traffic) => t.errors.filter((e) => !/Download the React DevTools/.test(e));
