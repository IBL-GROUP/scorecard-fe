// "All metrics / 1.0 only" switch (FR-EXEC-024): which items each mode shows.
import { createElement as h, Fragment } from 'react';
import { describe, expect, it } from 'vitest';
import { anyShown, isShown, PRD_ITEMS, RETAINED_1_0, tabHasItems, V1_IDS } from './catalog';
import type { TabKey } from './tabs';

const Leaf = () => null;
const v1 = (kpi?: string | null) => isShown('v1', kpi);
const all = (kpi?: string | null) => isShown('all', kpi);

describe('metric mode', () => {
  it('TC-EXEC-030 "1.0 only" keeps exactly the items carrying the 36 retained 1.0 metrics', () => {
    expect(RETAINED_1_0).toHaveLength(36);
    for (const m of RETAINED_1_0) expect(m.ids.some((id) => v1(id))).toBe(true);
    expect(v1('IN-14')).toBe(true);
    expect(v1('RV-06 RV-07')).toBe(true);
    expect(v1('RV-01')).toBe(false);
    expect(v1('DH-07 DH-08 DH-09 DH-10')).toBe(false);
    expect(v1(undefined)).toBe(false);
    // Every 1.0 ID is a real PRD item.
    const prd = new Set(Object.values(PRD_ITEMS).flat());
    for (const id of V1_IDS) expect(prd.has(id)).toBe(true);
  });

  it('TC-EXEC-030 "All metrics" shows everything, tagged or not', () => {
    expect(all('RV-01')).toBe(true);
    expect(all(undefined)).toBe(true);
  });

  it('TC-EXEC-030 every tab keeps at least one 1.0 item', () => {
    for (const tab of Object.keys(PRD_ITEMS) as TabKey[]) {
      expect(tabHasItems('v1', tab)).toBe(true);
      expect(tabHasItems('all', tab)).toBe(true);
    }
  });

  it('TC-EXEC-030 a zone is empty in "1.0 only" mode when none of its items carry a 1.0 metric', () => {
    const twoOnly = h(Fragment, null, h(Leaf, { id: 'RV-01' }), h(Leaf, { dataKpi: 'RV-08' }), h(Leaf));
    const mixed = h('div', null, h(Leaf, { id: 'EX-01' }), h('div', null, h(Leaf, { id: 'EX-04' })));
    const detail = h(Leaf, { id: 'dispatch', kpi: 'OP-14' });
    expect(anyShown(twoOnly, v1)).toBe(false);
    expect(anyShown(mixed, v1)).toBe(true);
    expect(anyShown(detail, v1)).toBe(true);
    // An untagged leaf (Top Risks, Data trust) is 2.0-only.
    expect(anyShown(h(Leaf), v1)).toBe(false);
    expect(anyShown([null, false, 'text'], v1)).toBe(false);
  });
});
