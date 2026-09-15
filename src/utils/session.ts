/**
 * Session handoff from the authenticator portal.
 *
 * This app never logs anyone in. The portal sends the browser here with a
 * one-time ticket — ?t=<16 chars> — which we swap for the real access token over
 * a direct call to the authenticator API. The JWT itself never appears in a URL.
 *
 * Namespaced sessionStorage key — all dashboards share one origin under the
 * reverse proxy, so an unscoped key would collide across apps in the same tab.
 */

const TOKEN_KEY = 'searle_token_scorecard';
const TICKET_PARAM = 't';

/**
 * Portal site origin (trailing slash). Sign-in is /login; home is /dashboard.
 */
function portalBase(): string {
  const raw =
    import.meta.env.VITE_AUTH_PORTAL_URL ||
    'https://dev.onethunder.iblgrp.com/';
  return String(raw).replace(/\/+$/, '') + '/';
}

/** Join portal base + path without double slashes. */
export function joinPortalPath(path: string): string {
  const base = portalBase().replace(/\/+$/, '');
  const segment = path.replace(/^\/+/, '');
  return `${base}/${segment}`;
}

/** Authenticator API base URL (must include /api). */
export const AUTH_API_URL = (
  import.meta.env.VITE_AUTH_API_URL ||
  'https://dev-login.onethunder.iblgrp.com/api'
).replace(/\/+$/, '');

interface TokenPayload {
  exp?: number;
  /** organization.user_login.user_login_id — who the token belongs to. */
  sub?: string;
  user_name?: string;
  email_id?: string;
}

function decodeTokenPayload(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * A token we cannot read is treated as expired. Better to bounce someone to the
 * portal than to let a malformed token through and fail on the first API call.
 */
function isExpired(token: string) {
  const exp = decodeTokenPayload(token)?.exp;
  if (!exp) return true;
  return Date.now() >= exp * 1000;
}

/** Takes the ticket out of the address bar without adding a history entry. */
function stripTicketFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(TICKET_PARAM)) return;

  url.searchParams.delete(TICKET_PARAM);
  window.history.replaceState({}, '', url.toString());
}

/**
 * Shared so two callers cannot race each other.
 *
 * React.StrictMode mounts, unmounts and remounts in development, so AuthGate's
 * effect fires twice. The first call strips the ticket from the URL before its
 * fetch resolves, so the second call found no ticket, concluded there was no
 * session, and bounced to the portal — which minted another ticket and started
 * the whole thing again. Handing the second caller the SAME promise means it
 * waits for the real answer instead of redirecting past it.
 */
let pendingRedeem: Promise<boolean> | null = null;

export function redeemTicketFromUrl(): Promise<boolean> {
  if (!pendingRedeem) pendingRedeem = performRedeem();
  return pendingRedeem;
}

async function performRedeem(): Promise<boolean> {
  const ticket = new URL(window.location.href).searchParams.get(TICKET_PARAM);
  if (!ticket) return false;

  stripTicketFromUrl();

  try {
    const response = await fetch(`${AUTH_API_URL}/auth/ticket/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (!data?.token) return false;

    sessionStorage.setItem(TOKEN_KEY, data.token);
    return true;
  } catch (error) {
    console.error('[session] ticket redemption failed', error);
    return false;
  }
}

const SESSION_COOKIE = 'ot_session_user';

function portalUserId(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** The `sub` claim — organization.user_login.user_login_id. */
function tokenSubject(token: string): string | null {
  return decodeTokenPayload(token)?.sub ?? null;
}

export function getToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  if (isExpired(token)) {
    clearSession();
    return null;
  }

  const current = portalUserId();
  if (current === '') {
    clearSession();
    return null;
  }
  if (current !== null && current !== tokenSubject(token)) {
    clearSession();
    return null;
  }

  return token;
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Hands the browser to the portal's login page, remembering where we were so it
 * can send the user straight back here afterwards.
 */
export function redirectToPortal() {
  clearSession();
  const target = `${portalBase()}login?redirect=${encodeURIComponent(
    window.location.href
  )}`;
  window.location.replace(target);
}

export function hasValidSession() {
  return getToken() !== null;
}

/** The signed-in user, as the token's claims describe them. */
export interface SessionUser {
  /** organization.user_login.user_name, e.g. "syed.sharjeel". */
  userName: string;
  email: string | null;
}

/**
 * Who is signed in, read straight from the token — no request. Null when there
 * is no valid session.
 */
export function getSessionUser(): SessionUser | null {
  const token = getToken();
  if (!token) return null;

  const payload = decodeTokenPayload(token);
  if (!payload?.user_name) return null;

  return { userName: payload.user_name, email: payload.email_id ?? null };
}
