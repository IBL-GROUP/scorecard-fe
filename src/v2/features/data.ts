// Data layer for Supply Chain Pulse 2.0.
//
// Every query of every tab is declared here, run at the app root, and loaded
// tab by tab in TABS order (FEAT-LOAD, kept from 1.0): the tab on screen loads
// at once; the others load in the background one after another; a filter
// change restarts the queue. Each query is `enabled` only when its tab is
// released AND the user holds its section, and is `track`ed into its tab's
// settled state.
//
// Comparison windows (rule F2), 6-month histories and multi-month plan calls
// (rule F1) are extra calls to the SAME endpoints with other dates.

import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/v2/config/api';
import type { Envelope, FilterBranchRow, FilterItemRow } from '@/v2/api/types';
import {
  addMonths,
  categoryCallEnds,
  comparisonWindow,
  isSingleMonth,
  lastMonthEnds,
  monthEnd,
  monthStart,
  addDays,
  todayIso,
  type Window,
} from './period';
import { useStore } from './store';
import { SECTION_OF, TABS, type Section, type TabKey } from './tabs';

export interface Spec {
  name: string;
  path: string;
  params?: Record<string, unknown>;
}

export interface Result<T = unknown> {
  data: T[] | undefined;
  /** Waiting for data: fetching now, or queued behind earlier tabs. */
  isLoading: boolean;
  isError: boolean;
  /**
   * The back end answered 503 SOURCE_PENDING: the source table isn't in
   * BigQuery yet (scorecard-be v2). Not an error; cards say "not available yet".
   */
  pending: boolean;
  /** The user lacks the section this data belongs to; never requested. */
  locked: boolean;
  section: Section;
}

export type TabData = Record<string, Result>;

const fetchRows = async (path: string, params?: Record<string, unknown>) => {
  const res = await api.get<Envelope<unknown>>(path, { params });
  return res.data.data ?? [];
};

const keyOf = (s: Spec) => ['v2', s.path, s.params ?? {}] as const;

/** scorecard-be v2 answers 503 { code: 'SOURCE_PENDING' } while a source table is missing. */
export function isSourcePending(error: unknown): boolean {
  const res = (error as { response?: { status?: number; data?: { code?: string } } } | null)?.response;
  return res?.status === 503 && res.data?.code === 'SOURCE_PENDING';
}

/** Effective SKU list: hand-picked SKUs win; else the chosen divisions' SKUs (FR-FILT-006). */
function useFilterOptions(enabled: boolean) {
  const items = useQuery({ queryKey: ['v2', '/filters'], queryFn: () => fetchRows('/filters') as Promise<FilterItemRow[]>, enabled, staleTime: 30 * 60_000 });
  const branches = useQuery({ queryKey: ['v2', '/filters/branches'], queryFn: () => fetchRows('/filters/branches') as Promise<FilterBranchRow[]>, enabled, staleTime: 30 * 60_000 });
  return { items: items.data ?? [], branches: branches.data ?? [] };
}

function windowParams(w: Window, base: Record<string, unknown>) {
  return { ...base, startDate: w.start, endDate: w.end };
}

/** All specs, per tab, for the current filters. */
function buildSpecs(w: Window, cmp: Window, base: Record<string, unknown>, branchSet: boolean): Record<TabKey, Spec[]> {
  const today = todayIso();
  const cur = windowParams(w, base);
  const prev = windowParams(cmp, base);
  const capped = { ...cur, endDate: w.end < today ? w.end : today };
  const cappedPrev = { ...prev, endDate: cmp.end < today ? cmp.end : today };
  const datesOnly = { startDate: w.start, endDate: w.end };
  const datesOnlyPrev = { startDate: cmp.start, endDate: cmp.end };
  const noBranch = { ...cur };
  delete (noBranch as Record<string, unknown>).branch;
  const rdDate = w.end < today ? w.end : today;

  // 6 months of category history = two calls (each returns 3 months).
  const earlierEnd = monthEnd(addMonths(monthStart(w.end), -3));
  const cat6 = (path: string, prefix: string): Spec[] => [
    { name: `${prefix}0`, path, params: cur },
    { name: `${prefix}1`, path, params: { ...cur, startDate: monthStart(earlierEnd), endDate: earlierEnd } },
  ];
  // Rule F1: multi-month windows sum month by month.
  const f1 = (path: string, prefix: string): Spec[] =>
    isSingleMonth(w) ? [] : categoryCallEnds(w).map((end, i) => ({ name: `${prefix}${i}`, path, params: { ...cur, startDate: monthStart(end), endDate: end } }));
  // IN-09 / EX-07 trend: the last 6 month-ends.
  const wcTrend: Spec[] = lastMonthEnds(w.end, 6).flatMap((end, i) => {
    const p = { startDate: monthStart(end), endDate: end };
    return [
      { name: `wcFg${i}`, path: '/cover-days/total', params: { ...base, ...p } },
      { name: `wcWip${i}`, path: '/wip', params: p },
      { name: `wcRpm${i}`, path: '/rpm', params: p },
    ];
  });

  const planCore: Spec[] = [
    { name: 'fam', path: '/forecast-accuracy-monthly', params: cur },
    { name: 'famCmp', path: '/forecast-accuracy-monthly', params: prev },
    { name: 'daysgone', path: '/forecast-accuracy-monthly/daysgone', params: capped },
    { name: 'daysgoneCmp', path: '/forecast-accuracy-monthly/daysgone', params: cappedPrev },
    { name: 'fay', path: '/forecast-accuracy-yearly', params: cur },
    { name: 'fayCmp', path: '/forecast-accuracy-yearly', params: prev },
    ...cat6('/forecast-accuracy-category-monthly', 'cat'),
    ...f1('/forecast-accuracy-category-monthly', 'f1m'),
    ...f1('/forecast-accuracy-category-yearly', 'f1y'),
    { name: 'ibl', path: '/ibl-vs-tscl', params: cur },
  ];
  const stockCore: Spec[] = [
    { name: 'cover', path: '/cover-days', params: cur },
    { name: 'coverTotal', path: '/cover-days/total', params: cur },
    { name: 'bench', path: '/cover-days/benchmarks', params: { endDate: w.end } },
    { name: 'aboveBelow', path: '/above-below-threshold', params: cur },
    { name: 'serviceAll', path: '/service-measure', params: noBranch },
  ];

  return {
    overview: [
      ...planCore,
      ...stockCore,
      { name: 'dispatch', path: '/dispatch-vs-order', params: datesOnly },
      { name: 'dispatchCmp', path: '/dispatch-vs-order', params: datesOnlyPrev },
      { name: 'wip', path: '/wip', params: datesOnly },
      { name: 'rpm', path: '/rpm', params: datesOnly },
      { name: 'rd', path: '/rd-status', params: { date: rdDate } },
      { name: 'closing', path: '/cover-days/closing-inv' },
      { name: 'sales', path: '/sales-summary', params: cur },
      ...wcTrend,
    ],
    revenue: [
      ...planCore,
      ...cat6('/forecast-accuracy-category-yearly', 'catY'),
      { name: 'sales', path: '/sales-summary', params: cur },
      { name: 'salesCmp', path: '/sales-summary', params: prev },
      { name: 'totalSku', path: '/total-sku' },
    ],
    inventory: [
      ...stockCore,
      ...(branchSet ? [{ name: 'serviceFiltered', path: '/service-measure', params: cur }] : []),
      { name: 'totalSku', path: '/total-sku' },
      { name: 'tgt', path: '/tgt-vs-actual', params: cur },
      { name: 'invDays', path: '/inventory-days', params: cur },
      { name: 'wip', path: '/wip', params: datesOnly },
      { name: 'rpm', path: '/rpm', params: datesOnly },
      ...wcTrend,
    ],
    fulfilment: [
      { name: 'dispatch', path: '/dispatch-vs-order', params: datesOnly },
      { name: 'dispatchCmp', path: '/dispatch-vs-order', params: datesOnlyPrev },
      { name: 'wip', path: '/wip', params: datesOnly },
      { name: 'wipCmp', path: '/wip', params: datesOnlyPrev },
      { name: 'rpm', path: '/rpm', params: datesOnly },
      { name: 'rpmCmp', path: '/rpm', params: datesOnlyPrev },
      { name: 'aboveBelow', path: '/above-below-threshold', params: cur },
    ],
    distribution: [
      { name: 'rd', path: '/rd-status', params: { date: rdDate } },
      { name: 'rdCmp', path: '/rd-status', params: { date: addDays(rdDate, -1) } },
      { name: 'closing', path: '/cover-days/closing-inv' },
      { name: 'fam', path: '/forecast-accuracy-monthly', params: cur },
      { name: 'fay', path: '/forecast-accuracy-yearly', params: cur },
      { name: 'bench', path: '/cover-days/benchmarks', params: { endDate: w.end } },
      { name: 'sales', path: '/sales-summary', params: cur },
    ],
  };
}

const settled = (q: UseQueryResult) => q.isFetched && !q.isFetching;

export function useDashboardData(active: TabKey) {
  const st = useStore();
  const { window: w, compare, filters } = st;
  const options = useFilterOptions(st.can('SUMMARY') || st.can('SERVICE_MEASURE'));

  // FR-FILT-006: divisions expand to their SKU codes; Division itself is never sent.
  const sku = useMemo(
    () => (filters.division.length ? options.items.filter((i) => i.division && filters.division.includes(i.division)).map((i) => i.item_code) : []),
    [filters.division, options.items],
  );
  const base = useMemo(() => {
    const b: Record<string, unknown> = {};
    if (filters.classification.length) b.classification = filters.classification;
    if (sku.length) b.sku = sku;
    if (filters.branch.length) b.branch = filters.branch;
    return b;
  }, [filters.classification, filters.branch, sku]);

  const cmp = useMemo(() => comparisonWindow(w, compare), [w, compare]);
  const specs = useMemo(() => buildSpecs(w, cmp, base, filters.branch.length > 0), [w, cmp, base, filters.branch.length]);

  // ── Load queue ──
  const restartKey = JSON.stringify([w, cmp, base, st.user.sections]);
  const [queue, setQueue] = useState({ key: restartKey, released: 1 });
  let released = queue.released;
  if (queue.key !== restartKey) {
    released = 1;
    setQueue({ key: restartKey, released: 1 });
  }
  const visible = (t: TabKey) => TABS.find((x) => x.key === t)!.anyOf.some((s) => st.can(s));
  const tabIndex = (t: TabKey) => TABS.findIndex((x) => x.key === t);
  const loadTab = (t: TabKey) => visible(t) && (t === active || tabIndex(t) < released);

  // `track`: one useQueries per tab, so each tab's settled state is its own.
  const track = (tab: TabKey) =>
    specs[tab].map((s) => ({
      queryKey: keyOf(s),
      queryFn: () => fetchRows(s.path, s.params),
      enabled: loadTab(tab) && st.can(SECTION_OF[s.path] ?? 'SUMMARY'),
      staleTime: 5 * 60_000,
      // A missing source stays missing: don't retry it.
      retry: (n: number, e: unknown) => !isSourcePending(e) && n < 1,
    }));
  const overview = useQueries({ queries: track('overview') });
  const revenue = useQueries({ queries: track('revenue') });
  const inventory = useQueries({ queries: track('inventory') });
  const fulfilment = useQueries({ queries: track('fulfilment') });
  const distribution = useQueries({ queries: track('distribution') });
  const raw: Record<TabKey, UseQueryResult[]> = { overview, revenue, inventory, fulfilment, distribution };

  const tabSettled = (t: TabKey) =>
    !visible(t) || raw[t].every((q, i) => !st.can(SECTION_OF[specs[t][i].path] ?? 'SUMMARY') || settled(q));
  const releasedDone = TABS.slice(0, released).every((t) => tabSettled(t.key));
  useEffect(() => {
    if (!releasedDone || released >= TABS.length) return;
    setQueue((q) => (q.key === restartKey && q.released === released ? { ...q, released: released + 1 } : q));
  }, [releasedDone, released, restartKey]);

  const shape = (t: TabKey): TabData =>
    Object.fromEntries(
      specs[t].map((s, i) => {
        const q = raw[t][i];
        const section = SECTION_OF[s.path] ?? 'SUMMARY';
        const locked = !st.can(section);
        const pending = q.isError && isSourcePending(q.error);
        return [
          s.name,
          {
            data: q.data as unknown[] | undefined,
            isLoading: !locked && !pending && (q.isPending || (q.isFetching && q.data == null)),
            isError: q.isError && !pending,
            pending,
            locked,
            section,
          },
        ];
      }),
    );

  return {
    window: w,
    cmpWindow: cmp,
    options,
    released,
    tabs: {
      overview: shape('overview'),
      revenue: shape('revenue'),
      inventory: shape('inventory'),
      fulfilment: shape('fulfilment'),
      distribution: shape('distribution'),
    } as Record<TabKey, TabData>,
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;

/** Typed rows of a result ([] while loading or locked). */
export const rowsOf = <T,>(r: Result | undefined) => ((r?.data ?? []) as T[]);
/** First row of a result. */
export const firstOf = <T,>(r: Result | undefined) => (r?.data?.[0] as T | undefined);
/** Any of these results still loading. */
export const anyLoading = (...rs: (Result | undefined)[]) => rs.some((r) => r?.isLoading);
export const anyLocked = (...rs: (Result | undefined)[]) => rs.some((r) => r?.locked);
export const anyError = (...rs: (Result | undefined)[]) => rs.some((r) => r?.isError);
export const anyPending = (...rs: (Result | undefined)[]) => rs.some((r) => r?.pending);
