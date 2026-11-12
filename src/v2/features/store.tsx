// Page state for Supply Chain Pulse 2.0: period, comparison, filters, local
// chips, the (demo) user, and Operational Detail open/closed state.
//
// Filters follow PRD section 3.3: period presets apply at once (rule F3);
// Division / Classification / Branch are staged and applied together.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { presetWindow, todayIso, type CompareKey, type PresetKey, type Window } from './period';
import { ALL_SECTIONS, type Section, type TabKey } from './tabs';

export interface Filters {
  division: string[];
  classification: string[];
  branch: string[];
}
export const EMPTY_FILTERS: Filters = { division: [], classification: [], branch: [] };

export type ChipKey = 'cls' | 'branch' | 'channel' | 'material';
export interface Chip { key: ChipKey; value: string }

export type Persona = 'executive' | 'planner';
export interface AppUser {
  /** Token subject (live) or a demo id. Keys the per-user preferences. */
  id: string;
  name: string;
  /**
   * 'planner' opens Operational Detail expanded by default. In live mode the
   * user chooses it with "Planner view" in the user menu (decision of
   * 11 Nov 2026: the session carries no executive/planner role).
   */
  persona: Persona;
  sections: Section[];
}
/** @deprecated use AppUser */
export type DemoUser = AppUser;

/** What the live session supplies (FEAT-AUTH, FEAT-PERM). */
export interface LiveUser {
  id: string;
  name: string;
  sections: Section[];
}

const USER_KEY = 'sc2.demoUser';
const ZONE4_KEY = 'sc2.zone4';
const PERSONA_KEY = 'sc2.persona';

function readPersona(id: string): Persona {
  try {
    return localStorage.getItem(`${PERSONA_KEY}.${id}`) === 'planner' ? 'planner' : 'executive';
  } catch {
    return 'executive';
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage blocked */
  }
}

interface State {
  preset: PresetKey;
  window: Window;
  compare: CompareKey;
  filters: Filters;
  chips: Partial<Record<TabKey, Chip>>;
  user: AppUser;
  /** Operational Detail sections the user opened or closed, by id. */
  zone4: Record<string, boolean>;
}

interface Store extends State {
  setPreset: (p: PresetKey) => void;
  setCustom: (w: Window) => void;
  setCompare: (c: CompareKey) => void;
  applyFilters: (f: Filters) => void;
  setChip: (tab: TabKey, chip: Chip | null) => void;
  setUser: (u: AppUser) => void;
  /** "Planner view" in the user menu; remembered per user. */
  setPersona: (p: Persona) => void;
  isZone4Open: (id: string) => boolean;
  setZone4: (id: string, open: boolean) => void;
  can: (s: Section) => boolean;
}

const Ctx = createContext<Store | null>(null);

export const DEFAULT_USER: AppUser = { id: 'demo', name: 'Demo Executive', persona: 'executive', sections: ALL_SECTIONS };

const zone4Of = (u: AppUser) => readJson<Record<string, boolean>>(`${ZONE4_KEY}.${u.id}`, {});
const fromLive = (l: LiveUser): AppUser => ({ ...l, persona: readPersona(l.id) });

/**
 * `live` is the signed-in user (live mode). Without it the store runs the demo
 * user that the S1 demo controls switch between.
 */
export function StoreProvider({ children, live }: { children: ReactNode; live?: LiveUser }) {
  const [state, setState] = useState<State>(() => {
    const user = live ? fromLive(live) : { ...DEFAULT_USER, ...readJson(USER_KEY, DEFAULT_USER) };
    return {
      preset: 'mtd',
      window: presetWindow('mtd'),
      compare: 'prev',
      filters: EMPTY_FILTERS,
      chips: {},
      user,
      zone4: zone4Of(user),
    };
  });

  // The display name arrives after the first render; sections may change on refetch.
  const liveKey = live ? JSON.stringify(live) : '';
  useEffect(() => {
    if (!live) return;
    setState((s) =>
      s.user.id === live.id && s.user.name === live.name && s.user.sections.join() === live.sections.join()
        ? s
        : { ...s, user: { ...fromLive(live) }, zone4: s.user.id === live.id ? s.zone4 : zone4Of(fromLive(live)) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);

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
  const setUser = useCallback((u: AppUser) => {
    writeJson(USER_KEY, u);
    setState((s) => ({ ...s, user: u, zone4: zone4Of(u) }));
  }, []);
  const setPersona = useCallback((p: Persona) => {
    setState((s) => {
      try {
        localStorage.setItem(`${PERSONA_KEY}.${s.user.id}`, p);
      } catch {
        /* storage blocked: the choice lasts for this visit */
      }
      // A new default applies to every section: forget per-section choices.
      writeJson(`${ZONE4_KEY}.${s.user.id}`, {});
      return { ...s, user: { ...s.user, persona: p }, zone4: {} };
    });
  }, []);
  const setZone4 = useCallback((id: string, open: boolean) => {
    setState((s) => {
      const zone4 = { ...s.zone4, [id]: open };
      writeJson(`${ZONE4_KEY}.${s.user.id}`, zone4);
      return { ...s, zone4 };
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...state,
      setPreset,
      setCustom,
      setCompare,
      applyFilters,
      setChip,
      setUser,
      setPersona,
      setZone4,
      // Collapsed by default for executives, expanded for planners (PRD 3.1).
      isZone4Open: (id) => state.zone4[id] ?? state.user.persona === 'planner',
      can: (sec) => state.user.sections.includes(sec),
    }),
    [state, setPreset, setCustom, setCompare, applyFilters, setChip, setUser, setPersona, setZone4],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
