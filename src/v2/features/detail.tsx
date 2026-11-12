// Detail sheets (design-system SheetStack): clicking any item opens its detail
// in a sheet that slides in from the right. Opening another item from inside a
// sheet stacks a deeper sheet on top; the earlier one stays visible to the
// left and a click on it (or Esc) goes back.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Rag } from './kpiThresholds';
import type { BandKey } from './kpiThresholds';
import type { TileDelta } from '@/v2/components/exec/ExecTile';

export interface SheetAction {
  label: string;
  run: () => void;
}

export type DetailItem =
  | {
      kind: 'kpi';
      id: string;
      label: string;
      value: string;
      valueSuffix?: string;
      rag?: Rag | null;
      band?: BandKey;
      bandUnit?: string;
      variance?: ReactNode;
      delta?: TileDelta;
      caption?: ReactNode;
      action?: SheetAction;
    }
  | { kind: 'class'; cls: string }
  | { kind: 'branch'; branch: string }
  | { kind: 'sku'; sku: string }
  | { kind: 'channel'; channel: string }
  | { kind: 'material'; material: string }
  | { kind: 'order'; order: string }
  | { kind: 'rmpm'; material: string; plant: string }
  | { kind: 'rd'; code: string };

export const KIND_LABEL: Record<DetailItem['kind'], string> = {
  kpi: 'KPI',
  class: 'Class',
  branch: 'Branch',
  sku: 'SKU',
  channel: 'Channel',
  material: 'Material',
  order: 'Production order',
  rmpm: 'Raw / packing material',
  rd: 'Distributor',
};

export function titleOf(i: DetailItem): string {
  switch (i.kind) {
    case 'kpi':
      return i.label;
    case 'class':
      return i.cls === 'Others' ? 'Others (unclassified)' : `Class ${i.cls}`;
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
    case 'rd':
      return `RD ${i.code}`;
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
