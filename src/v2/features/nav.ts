// Navigation between 2.0 tabs (PRD 3.1, 5.4). The tab and the focused KPI live
// in the URL (?tab=…&focus=…), so the browser Back button returns to the
// previous tab and React Router restores its scroll position.

import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, type Chip } from './store';
import { TABS, type TabKey } from './tabs';

export function useActiveTab(): TabKey {
  const [sp] = useSearchParams();
  const t = sp.get('tab') as TabKey | null;
  return t && TABS.some((x) => x.key === t) ? t : 'overview';
}

export function useNav() {
  const navigate = useNavigate();
  const { setChip } = useStore();
  return useCallback(
    (tab: TabKey, focus?: string, chip?: Chip) => {
      if (chip) setChip(tab, chip);
      const q = new URLSearchParams({ tab });
      if (focus) q.set('focus', focus);
      navigate({ search: `?${q.toString()}` });
    },
    [navigate, setChip],
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
