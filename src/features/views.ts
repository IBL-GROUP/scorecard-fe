// Graph or List, per tab, as Sales Pulse 2.0's view switch (dsr-fe HeaderActions): the
// switch sits in the filter bar, the tab reads it, and the choice is kept in this browser.

import { useSyncExternalStore } from 'react';
import type { TabKey } from './tabs';

export type TabView = 'graph' | 'list';

/** Tabs that offer both views, and the one each opens on (Sales Pulse's RD tab opens on its list); Service Measure and Dispatch & WIP keep 1.0's single layout. */
export const VIEW_TABS: Partial<Record<TabKey, TabView>> = { distribution: 'list' };

const KEY = 'sc2-tab-view';
const listeners = new Set<() => void>();

function readAll(): Partial<Record<TabKey, TabView>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<TabKey, TabView>>;
  } catch {
    return {};
  }
}

let views = readAll();

export function setTabView(tab: TabKey, view: TabView) {
  views = { ...views, [tab]: view };
  try {
    localStorage.setItem(KEY, JSON.stringify(views));
  } catch {
    /* storage blocked: the choice lasts this visit */
  }
  listeners.forEach((l) => l());
}

export function useTabView(tab: TabKey): TabView {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => views[tab] ?? VIEW_TABS[tab] ?? 'graph',
  );
}
