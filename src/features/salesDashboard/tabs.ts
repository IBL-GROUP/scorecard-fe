import { useCallback, useEffect, useState } from 'react';
import { permissionCode, usePermissions } from '@/api/permissions';
import type { MainTab } from './salesDashboardSlice';

/**
 * The tabs, each carrying the permission section_code that governs it.
 *
 * The section code cannot be derived from the redux value — RD Data Status is
 * stored as RD_DATA_STATUS but switched on as 'regionalDistributor' — so the
 * mapping has to be written down somewhere, and this is that somewhere.
 *
 * Lives here rather than in HeaderActions because it has more than one reader:
 * the header decides which tabs to RENDER, and the dashboard and filter bar
 * decide which queries to FETCH. Those must agree — a tab the user cannot open
 * should not cost them a request — and they only can if they read one list.
 */
export const MAIN_TABS = [
  { label: 'Summary', value: 'supplyChain', section: 'SUMMARY' },
  { label: 'Service Measure', value: 'serviceMeasure', section: 'SERVICE_MEASURE' },
  { label: 'Dispatch & WIP', value: 'dispatchWip', section: 'DISPATCH_WIP' },
  { label: 'RD Data Status', value: 'regionalDistributor', section: 'RD_DATA_STATUS' },
] as const satisfies readonly { label: string; value: MainTab; section: string }[];

const SECTION_BY_TAB = Object.fromEntries(
  MAIN_TABS.map((tab) => [tab.value, tab.section])
) as Record<MainTab, string>;

/**
 * `canSeeTab(tab)` — whether the user holds VIEW on the tab's section.
 *
 * False until the permission codes have arrived, so a query gated on it waits
 * for them rather than firing first and asking later.
 *
 * This hides UI and saves requests; it is not access control. scorecard-be
 * still serves every endpoint to any valid token.
 */
export function useCanSeeTab() {
  const { has, isReady } = usePermissions();

  return useCallback(
    (tab: MainTab) => isReady && has(permissionCode(SECTION_BY_TAB[tab])),
    [isReady, has]
  );
}

/* ------------------------------------------------------------ load queue */

/** The two fields of a React Query result the queue needs to see. */
export interface QueryProgress {
  isFetched: boolean;
  isFetching: boolean;
}

/** Finished for the CURRENT params — landed or failed, and not refetching. */
export const isQuerySettled = (query: QueryProgress) =>
  query.isFetched && !query.isFetching;

export type TabSettledMap = Record<MainTab, boolean>;

/**
 * Loads the dashboard one tab at a time, in MAIN_TABS order.
 *
 * Every query a tab needs runs together; only when all of them have settled is
 * the next tab released. The whole dashboard therefore warms up in the
 * background whichever tab is on screen, without ~20 queries landing on the
 * database at once.
 *
 * Two exceptions, both following dsr-fe's background queue:
 *   - the tab on screen is always loaded — opening a tab never waits behind
 *     the ones before it; and
 *   - a tab the user holds no permission on is never loaded, and is skipped
 *     rather than holding the queue up.
 *
 * A change to `restartKey` (the params the queries are keyed on) sends the
 * queue back to the first tab, so a new filter refreshes tab by tab too
 * instead of every tab refetching at once. The reset happens during render,
 * not in an effect, so the stale stages are switched off before any of their
 * queries can start on the new params.
 *
 * Pair it with useReleaseNextTab, called after the queries.
 */
export function useTabLoadQueue(mainTab: MainTab, restartKey: string) {
  const canSeeTab = useCanSeeTab();
  const [state, setState] = useState({ key: restartKey, released: 1 });

  let released = state.released;
  if (state.key !== restartKey) {
    released = 1;
    setState({ key: restartKey, released: 1 });
  }

  const shouldLoad = useCallback(
    (tab: MainTab) =>
      canSeeTab(tab) &&
      (tab === mainTab ||
        MAIN_TABS.findIndex((entry) => entry.value === tab) < released),
    [canSeeTab, mainTab, released]
  );

  return { shouldLoad, released, setState, canSeeTab };
}

/**
 * Releases the next tab once every released tab has settled.
 *
 * `settled` says, per tab, whether all of that tab's queries have finished. A
 * tab the user cannot open counts as settled — its queries never run, so
 * waiting for them would stall every tab behind it.
 */
export function useReleaseNextTab(
  queue: ReturnType<typeof useTabLoadQueue>,
  settled: TabSettledMap
) {
  const { isReady } = usePermissions();
  const { released, setState, canSeeTab } = queue;

  const releasedDone =
    isReady &&
    MAIN_TABS.slice(0, released).every(
      (tab) => !canSeeTab(tab.value) || settled[tab.value]
    );

  useEffect(() => {
    if (!releasedDone || released >= MAIN_TABS.length) return;
    setState((current) =>
      current.released === released
        ? { ...current, released: released + 1 }
        : current
    );
  }, [releasedDone, released, setState]);
}
