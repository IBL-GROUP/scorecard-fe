// Usage tracking: dashboard heartbeats and export events, sent to the
// authenticator under the dashboard name with the open tab's label. Never shown
// to the user, and a failure never reaches them.

import { AUTH_API_URL, getToken } from '@/utils/session';

const HEARTBEAT_MS = 30_000;
const SESSION_ID_KEY = 'searle_usage_session_scorecard';
/** Must match 1.0 and the authenticator's usage report, so rows fold together. */
const DASHBOARD = 'Supply Chain Pulse';

let tabLabel = 'Executive Overview';
let onTabChange: (() => void) | null = null;

/** Called by the shell whenever the tab on screen changes. */
export function setUsageTab(label: string) {
  if (label === tabLabel) return;
  tabLabel = label;
  onTabChange?.();
}

function usageSessionId(): string {
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

function post(path: string, body: unknown) {
  const token = getToken();
  if (!token) return;
  void fetch(`${AUTH_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    /* never surfaces */
  });
}

const send = (event: 'ping' | 'end') => post('/usage/heartbeat', { session_id: usageSessionId(), dashboard: DASHBOARD, tab: tabLabel, event });

/** Starts the heartbeat while the page is visible. Returns a stop function. */
export function startUsageTracking(): () => void {
  let timer: number | null = null;
  const beat = () => send('ping');
  const start = () => {
    if (timer !== null) return;
    beat();
    timer = window.setInterval(beat, HEARTBEAT_MS);
  };
  const stop = (sendEnd: boolean) => {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
    if (sendEnd) send('end');
  };
  const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop(true));
  const onPageHide = () => stop(true);
  // A tab switch beats at once, so the time since the last beat lands on the old tab.
  onTabChange = () => {
    if (timer !== null) beat();
  };
  if (document.visibilityState === 'visible') start();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    onTabChange = null;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    stop(true);
  };
}
