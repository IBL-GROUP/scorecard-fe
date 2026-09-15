import { useQuery } from '@tanstack/react-query';
import { AUTH_API_URL, getToken, joinPortalPath } from '@/utils/session';

/**
 * The signed-in user's account, as the authenticator knows it: their display
 * name, and the other dashboards they may open. Both back the user menu.
 */

async function authGet<T>(path: string): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('No session');

  const response = await fetch(`${AUTH_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Authenticator request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

/** organization.user_login.display_name — the full name, e.g. "Syed Grami". */
export function useDisplayName() {
  return useQuery({
    queryKey: ['me', 'profile'],
    queryFn: async () => {
      const body = await authGet<{ data?: { display_name?: string | null } }>('/profile');
      return body.data?.display_name?.trim() || null;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** A dashboard the user may open — one organization.menu_item row. */
export interface UserDashboard {
  menu_id: string;
  resource_code: string;
  label: string;
  /** e.g. "/sales-dashboard". */
  path: string;
  icon: string | null;
}

/**
 * Every dashboard the user holds any permission on, in menu order — the same
 * list the portal shows as cards.
 */
export function useUserDashboards() {
  return useQuery({
    queryKey: ['me', 'dashboards'],
    queryFn: async () => {
      const body = await authGet<{ data?: UserDashboard[] }>('/dashboards/user-reports');
      return body.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

const trimSlashes = (path: string) => `/${path.replace(/^\/+|\/+$/g, '')}`;

/** Whether `dashboard` is the app this code is running in. */
export function isCurrentDashboard(dashboard: UserDashboard): boolean {
  return trimSlashes(dashboard.path) === trimSlashes(import.meta.env.BASE_URL);
}

/**
 * Where the dashboards are served. They share one origin under sub-paths, so
 * by default that is this app's own origin; VITE_DASHBOARD_ORIGIN overrides it,
 * as it does in the portal.
 */
const DASHBOARD_ORIGIN = (
  import.meta.env.VITE_DASHBOARD_ORIGIN || window.location.origin
).replace(/\/+$/, '');

/**
 * Local development only. There each dashboard runs on its own dev server, so
 * there is no shared origin to build links from. VITE_DASHBOARD_URLS names the
 * origin a dashboard runs on, keyed by its path, comma-separated:
 *
 *   VITE_DASHBOARD_URLS=/sales-dashboard=http://localhost:5174,/scorecard-dashboard=http://localhost:5175
 *
 * Left unset on the server, where every dashboard shares DASHBOARD_ORIGIN.
 */
const DASHBOARD_ORIGIN_BY_PATH = new Map(
  String(import.meta.env.VITE_DASHBOARD_URLS ?? '')
    .split(',')
    .map((entry) => entry.split('=').map((part) => part.trim()))
    .filter(([path, origin]) => path && origin)
    .map(([path, origin]) => [trimSlashes(path), origin.replace(/\/+$/, '')] as [string, string]),
);

/**
 * Opens another dashboard, carrying this session over.
 *
 * The same handoff the portal does: mint a single-use ticket from our own token
 * and put that, never the token, in the link. The target redeems it on arrival.
 * If the ticket cannot be minted, the user lands on the portal instead.
 */
export async function openDashboard(dashboard: UserDashboard): Promise<void> {
  const path = trimSlashes(dashboard.path);
  const origin = DASHBOARD_ORIGIN_BY_PATH.get(path) ?? DASHBOARD_ORIGIN;
  const url = new URL(`${origin}${path}/`);

  try {
    const token = getToken();
    if (!token) throw new Error('No session');

    const response = await fetch(`${AUTH_API_URL}/auth/ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      // For the audit log only; the server never redirects on it.
      body: JSON.stringify({ target: url.toString() }),
    });
    const body = (await response.json()) as { ticket?: string };
    if (!response.ok || !body.ticket) throw new Error('No ticket');

    url.searchParams.set('t', body.ticket);
    window.location.href = url.toString();
  } catch {
    window.location.href = joinPortalPath('dashboard');
  }
}

/**
 * This dashboard's user manual, set per project in VITE_USER_MANUAL_URL. Null
 * until one is published — the menu then shows the entry as coming soon.
 */
export const USER_MANUAL_URL: string | null =
  import.meta.env.VITE_USER_MANUAL_URL?.trim() || null;

/**
 * Signs the user out everywhere, via the portal's /logout page.
 *
 * The portal's session is the one that matters — clearing only ours would leave
 * the portal signed in, and the next visit would hand a session straight back.
 * The portal empties the ot_session_user cookie as it signs out, and this tab's
 * token stops being accepted on that alone, so nothing is cleared here first;
 * that also lets the usage tracker send its closing beat as the page unloads.
 */
export function logout(): void {
  window.location.href = joinPortalPath('logout');
}
