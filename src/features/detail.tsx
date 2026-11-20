// Detail sheets (design-system SheetStack): clicking any item opens its detail
// in a sheet that slides in from the right. Opening another item from inside a
// sheet stacks a deeper sheet on top; the earlier one stays visible to the
// left and a click on it (or Esc) goes back.

import { createContext, useCallback, useEffect, useContext, useMemo, useState, type ReactNode } from 'react';
import { colors } from '@/constants/theme';

export type DetailItem =
  | { kind: 'class'; cls: string }
  /** Plan alignment drill (FR-EXEC-049): one class's IBL target vs TSCL budget, by SKU. */
  | { kind: 'alignClass'; cls: string }
  /** Class hierarchy (19 Nov 2026, as Sales Pulse 2.0): a class in a zone (its regions) or a region (its branches). */
  | { kind: 'geo'; cls: string; zone: string; region?: string }
  /** A class at one branch: its SKUs' cover there. */
  | { kind: 'classBranch'; cls: string; branch: string }
  | { kind: 'branch'; branch: string }
  | { kind: 'sku'; sku: string }
  | { kind: 'channel'; channel: string }
  | { kind: 'material'; material: string }
  | { kind: 'order'; order: string }
  | { kind: 'rmpm'; material: string; plant: string }
  /** A plant's work in progress (Dispatch & WIP, WIP by plant). */
  | { kind: 'wipPlant'; plant: string }
  /** A plant's raw and packing material (Dispatch & WIP, RMPM by plant). */
  | { kind: 'rmpmPlant'; plant: string };

export const KIND_LABEL: Record<DetailItem['kind'], string> = {
  class: 'Class',
  alignClass: 'Forecast vs budget',
  geo: 'Zone',
  classBranch: 'Branch',
  branch: 'Branch',
  sku: 'SKU',
  channel: 'Channel',
  material: 'Material',
  order: 'Production order',
  rmpm: 'Raw / packing material',
  wipPlant: 'WIP · plant',
  rmpmPlant: 'RMPM · plant',
};

export function titleOf(i: DetailItem): string {
  switch (i.kind) {
    case 'class':
      return i.cls === 'Others' ? 'Other (unclassified)' : `Class ${i.cls}`;
    case 'alignClass':
      return `${i.cls === 'Others' ? 'Other' : `Class ${i.cls}`} · forecast vs budget by SKU`;
    case 'geo':
      return i.region ?? i.zone;
    case 'classBranch':
      return `${i.cls === 'Others' ? 'Other' : `Class ${i.cls}`} at ${i.branch}`;
    case 'branch':
      return i.branch;
    case 'sku':
      return i.sku;
    case 'channel':
      return i.channel;
    case 'material':
      return i.material;
    case 'order':
      return i.order;
    case 'rmpm':
      return i.material;
    case 'wipPlant':
      return i.plant;
    case 'rmpmPlant':
      return i.plant;
  }
}

const keyOf = (i: DetailItem) => `${i.kind}:${titleOf(i)}:${'id' in i ? i.id : ''}`;

interface DetailCtx {
  stack: DetailItem[];
  /** Open as the first sheet (closes any open sheets). */
  open: (item: DetailItem) => void;
  /** Open on top of the current sheet. */
  push: (item: DetailItem) => void;
  popTo: (depth: number) => void;
  close: () => void;
  keys: string[];
}

const Ctx = createContext<DetailCtx | null>(null);

export function DetailProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DetailItem[]>([]);
  const open = useCallback((item: DetailItem) => setStack([item]), []);
  const push = useCallback(
    (item: DetailItem) =>
      setStack((s) => {
        // Re-opening an item already in the stack goes back to it.
        const at = s.findIndex((x) => keyOf(x) === keyOf(item));
        return at >= 0 ? s.slice(0, at + 1) : [...s, item];
      }),
    [],
  );
  const popTo = useCallback((depth: number) => setStack((s) => s.slice(0, depth + 1)), []);
  const close = useCallback(() => setStack([]), []);
  const value = useMemo(() => ({ stack, open, push, popTo, close, keys: stack.map(keyOf) }), [stack, open, push, popTo, close]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDetail() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDetail must be used inside DetailProvider');
  /** From inside a sheet, push; from the page, open. */
  return c;
}

/**
 * The row a list opened a sheet from, marked while that sheet is open, as Sales Pulse 2.0 marks
 * the row whose sheet is showing (soft brand fill, a brand bar on the left). Works on the page and
 * inside a sheet: open(row, run) remembers the row and the stack before the click; the sheet the
 * click opened is the first one that differs, and the row stays marked while that sheet is open.
 */
export function useOpenedRow() {
  const { keys } = useDetail();
  const [mark, setMark] = useState<{ row: string; before: string[]; at: number; sheet: string } | null>(null);
  useEffect(() => {
    if (!mark || mark.sheet) return;
    const at = keys.findIndex((k, i) => k !== mark.before[i]);
    if (at >= 0) setMark({ ...mark, at, sheet: keys[at] });
  }, [keys, mark]);
  const isActive = (row: string) => !!mark && mark.row === row && !!mark.sheet && keys[mark.at] === mark.sheet;
  const open = (row: string, run: () => void) => {
    setMark({ row, before: keys, at: -1, sheet: '' });
    run();
  };
  return { isActive, open };
}

/** Sales Pulse 2.0's marking of the row whose sheet is open (dsr-fe NationalTable Line). */
export const ACTIVE_ROW = { bg: colors.brandSoft, boxShadow: `inset 3px 0 0 ${colors.brand}` } as const;
