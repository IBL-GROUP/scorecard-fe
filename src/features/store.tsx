// Page state for Supply Chain Pulse: period, comparison, filters, local chips,
// the cover-days input and the signed-in user.
//
// Period presets apply at once; Division / Classification / Branch are staged
// and applied together.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { presetWindow, todayIso, type CompareKey, type PresetKey, type Window } from './period';
import type { Section, TabKey } from './tabs';

export interface Filters {
  division: string[];
  classification: string[];
  /** Zone and region (vw_zone_region_data): they narrow to their branches, as in Sales Pulse 2.0. */
  zone: string[];
  region: string[];
  branch: string[];
  /** Hand-picked SKU codes; they win over the division's SKUs (as 1.0). */
  sku: string[];
}
export const EMPTY_FILTERS: Filters = { division: [], classification: [], zone: [], region: [], branch: [], sku: [] };

export type ChipKey = 'cls' | 'branch' | 'channel' | 'material';
export interface Chip { key: ChipKey; value: string }

/** The signed-in user: token subject, display name and the sections they hold. */
export interface AppUser {
  id: string;
  name: string;
  sections: Section[];
}

interface State {
  preset: PresetKey;
  window: Window;
  compare: CompareKey;
  filters: Filters;
  chips: Partial<Record<TabKey, Chip>>;
  /** Cover days input: the days the month's target is spread over; null = the days in the month. */
  coverDays: number | null;
}

interface Store extends State {
  user: AppUser;
  setPreset: (p: PresetKey) => void;
  setCustom: (w: Window) => void;
  setCompare: (c: CompareKey) => void;
  applyFilters: (f: Filters) => void;
  setChip: (tab: TabKey, chip: Chip | null) => void;
  can: (s: Section) => boolean;
  setCoverDays: (d: number | null) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children, user }: { children: ReactNode; user: AppUser }) {
  const [state, setState] = useState<State>(() => ({
    preset: 'mtd',
    window: presetWindow('mtd'),
    compare: 'prev',
    filters: EMPTY_FILTERS,
    chips: {},
    coverDays: null,
  }));

  const setPreset = useCallback((p: PresetKey) => {
    setState((s) => ({ ...s, preset: p, window: p === 'custom' ? s.window : presetWindow(p, todayIso()) }));
  }, []);
  const setCustom = useCallback((w: Window) => setState((s) => ({ ...s, preset: 'custom', window: w })), []);
  const setCompare = useCallback((c: CompareKey) => setState((s) => ({ ...s, compare: c })), []);
  const applyFilters = useCallback((f: Filters) => setState((s) => ({ ...s, filters: f })), []);
  const setChip = useCallback(
    (tab: TabKey, chip: Chip | null) =>
      setState((s) => {
        const chips = { ...s.chips };
        if (chip) chips[tab] = chip;
        else delete chips[tab];
        return { ...s, chips };
      }),
    [],
  );
  const setCoverDays = useCallback((d: number | null) => setState((s) => ({ ...s, coverDays: d })), []);

  // The display name arrives after the first render and sections may change on
  // refetch: the user comes straight from the props, never copied into state.
  const sectionsKey = user.sections.join();
  const value = useMemo<Store>(
    () => ({
      ...state,
      user,
      setPreset,
      setCustom,
      setCompare,
      applyFilters,
      setChip,
      can: (sec) => user.sections.includes(sec),
      setCoverDays,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, user.id, user.name, sectionsKey, setPreset, setCustom, setCompare, applyFilters, setChip, setCoverDays],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
