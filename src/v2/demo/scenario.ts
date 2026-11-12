// Demo scenario: switches the prototype's generated data between the states the
// S1 review needs to see (AC-S1-7, TC-S1-04, TC-S1-12). Demo mode only; kept in
// browser storage so a reload keeps the chosen scenario.

export type Performance = 'mixed' | 'ahead' | 'behind';
export type DataState = 'live' | 'loading' | 'empty' | 'error' | 'errorOne';

export interface DemoScenario {
  /** Sales against plan: mixed (some classes ahead, some behind), ahead or behind. */
  performance: Performance;
  /** live = normal; loading = never answers; empty = no rows; error = every call 500; errorOne = only /dispatch-vs-order fails. */
  state: DataState;
  /** Stock snapshot 4 days old and many silent distributors. */
  stale: boolean;
  /** Months of history; 6 means no "same period last year". */
  historyMonths: 24 | 6;
}

export const DEFAULT_SCENARIO: DemoScenario = { performance: 'mixed', state: 'live', stale: false, historyMonths: 24 };

const KEY = 'sc2.demoScenario';

export function readScenario(): DemoScenario {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SCENARIO, ...(JSON.parse(raw) as Partial<DemoScenario>) };
  } catch {
    /* storage blocked: defaults */
  }
  return DEFAULT_SCENARIO;
}

export function writeScenario(s: DemoScenario) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
