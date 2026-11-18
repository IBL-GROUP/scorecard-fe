// Unit tests for the 2.0 derivations (derive.ts).
// Each test name starts with the test-case ID it proves.
import { describe, expect, it } from 'vitest';
import type { Result, TabData } from './data';
import { plan } from './derive';
import * as K from './kpis';

const ok = (row: Record<string, number>): Result => ({ data: [row], isLoading: false, isError: false, pending: false, locked: false, section: 'SUMMARY' });

describe('Run-rate required per panel', () => {
  it('TC-EXEC-063 Budget Accuracy TSCL uses the TSCL budget and its sales; Forecast Accuracy IBL uses the IBL target and its sales', () => {
    const d: TabData = {
      fam: ok({ amount: 1_350, target_value: 3_710, pct: 0.36 }),
      fay: ok({ amount: 1_105, target_value: 2_959, target_to_date: 1_677, pct: 0.37 }),
    };
    // A month far ahead: no day gone yet, so every day is still left.
    const p = plan(d, { start: '2099-11-01', end: '2099-11-30' });
    const { daysGone, totalDays } = p.days;

    expect(p.runRate).toEqual(K.runRate(3_710, 1_350, daysGone, totalDays));
    expect(p.runRateBud).toEqual(K.runRate(2_959, 1_105, daysGone, totalDays));
    expect(p.runRateBud.required).not.toBe(p.runRate.required);
  });
});
