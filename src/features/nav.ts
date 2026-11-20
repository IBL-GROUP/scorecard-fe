// Navigation between 2.0 tabs (PRD 3.1, 5.4). Since 19 Nov 2026 (user) the address stays
// /scorecard-dashboard/, as Sales Pulse 2.0's: the open tab and the KPI to scroll to live in
// app state, the tab kept for this browser tab so a refresh reopens it. An old link with
// ?tab=…&focus=… still opens there once, and the address is cleaned at once.

import { useCallback, useSyncExternalStore } from 'react';
import { useStore, type Chip } from './store';
import { TABS, type TabKey } from './tabs';

const KEY = 'sc2-active-tab';
const isTab = (t: string | null): t is TabKey => !!t && TABS.some((x) => x.key === t);

function initial(): { tab: TabKey; focus: string | null } {
  let tab: TabKey = 'overview';
  let focus: string | null = null;
  try {
    const kept = sessionStorage.getItem(KEY);
    if (isTab(kept)) tab = kept;
  } catch {
    /* storage blocked */
  }
  // An old link: take its tab and focus, then drop them from the address.
  const sp = new URLSearchParams(window.location.search);
  if (sp.has('tab') || sp.has('focus')) {
    const t = sp.get('tab');
    if (isTab(t)) tab = t;
    focus = sp.get('focus');
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
    try {
      sessionStorage.setItem(KEY, tab);
    } catch {
      /* storage blocked */
    }
  }
  return { tab, focus };
}

let state = initial();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function go(tab: TabKey, focus: string | null) {
  state = { tab, focus };
  try {
    sessionStorage.setItem(KEY, tab);
  } catch {
    /* storage blocked: the tab lasts this visit */
  }
  listeners.forEach((l) => l());
}

export function useActiveTab(): TabKey {
  return useSyncExternalStore(subscribe, () => state.tab);
}

/** The KPI a tile or insight asked to scroll to, by its PRD ID (null when none). */
export function useFocus(): string | null {
  return useSyncExternalStore(subscribe, () => state.focus);
}

export function useNav() {
  const { setChip } = useStore();
  return useCallback(
    (tab: TabKey, focus?: string, chip?: Chip) => {
      if (chip) setChip(tab, chip);
      go(tab, focus ?? null);
    },
    [setChip],
  );
}

/** Scroll to a KPI or card by its PRD ID. */
export function scrollToKpi(id: string) {
  const el = document.querySelector(`[data-kpi~="${id}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    (el as HTMLElement).animate?.([{ boxShadow: '0 0 0 3px var(--sp-brand)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 1400 });
  }
}
