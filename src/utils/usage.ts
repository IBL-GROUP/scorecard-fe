/**
 * Reports how long this dashboard is actually being looked at.
 */

import { getToken, AUTH_API_URL } from '@/utils/session';
import { store } from '@/app/store';
import { MAIN_TABS } from '@/features/salesDashboard/tabs';

const HEARTBEAT_MS = 30_000;
const SESSION_ID_KEY = 'searle_usage_session_scorecard';

/** One id per tab, so two tabs on the same dashboard are counted separately. */
function usageSessionId(): string {
  let id = sessionStorage.getItem(SESSION_ID_KEY);

  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }

  return id;
}

function send(event: 'ping' | 'end') {
  const token = getToken();
  if (!token) return;

  const body = JSON.stringify({
    session_id: usageSessionId(),
    dashboard: window.location.origin,
    event,
  });

  void fetch(`${AUTH_API_URL}/usage/heartbeat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Usage tracking must never surface an error to the user.
  });
}

/**
 * Records that the user downloaded an Excel file, for the Exports column of the
 * authenticator's engagement report.
 *
 * Call it once per download, right after the file is written. Who exported
 * comes from the token; the body says where: this dashboard, the tab that was
 * open, and the table's title when it has one (most tables here have none,
 * which is why the tab is read from the store rather than left to the caller).
 * Fire-and-forget, like the heartbeat: a failure never reaches the user.
 */
export function recordExport(table?: string): void {
  const token = getToken();
  if (!token) return;

  const { mainTab } = store.getState().salesDashboard;
  const tab = MAIN_TABS.find((t) => t.value === mainTab)?.label ?? mainTab;
  const report = [tab, table && table !== tab ? table : null]
    .filter(Boolean)
    .join(' › ');

  void fetch(`${AUTH_API_URL}/usage/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ dashboard: window.location.origin, report }),
    keepalive: true,
  }).catch(() => {
    // Usage tracking must never surface an error to the user.
  });
}

export function startUsageTracking(): () => void {
  let timer: number | null = null;

  const beat = () => send('ping');

  const start = () => {
    if (timer !== null) return;
    beat();
    timer = window.setInterval(beat, HEARTBEAT_MS);
  };

  const stop = (sendEnd: boolean) => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
      if (sendEnd) send('end');
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') start();
    else stop(true);
  };

  const onPageHide = () => stop(true);

  if (document.visibilityState === 'visible') start();

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
    stop(true);
  };
}
