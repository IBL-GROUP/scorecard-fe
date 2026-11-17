// "Data not available yet" detection for scorecard-be v2 (story S3/S4, FR-EXEC-020).
import { describe, expect, it } from 'vitest';
import { COVER_DAYS_PATHS, isSourcePending, withCoverDays } from './data';

describe('SOURCE_PENDING', () => {
  it('TC-EXEC-016 a 503 SOURCE_PENDING answer is "not available yet", not an error', () => {
    expect(isSourcePending({ response: { status: 503, data: { code: 'SOURCE_PENDING' } } })).toBe(true);
  });

  it('TC-EXEC-016 any other failure is still an error', () => {
    expect(isSourcePending({ response: { status: 503, data: {} } })).toBe(false);
    expect(isSourcePending({ response: { status: 500, data: { code: 'SOURCE_PENDING' } } })).toBe(false);
    expect(isSourcePending(new Error('Network Error'))).toBe(false);
    expect(isSourcePending(null)).toBe(false);
  });
});

describe('Cover days input (FR-EXEC-047)', () => {
  const specs = {
    overview: [{ name: 'cover', path: '/cover-days', params: { endDate: '2026-11-16' } }, { name: 'sales', path: '/sales-summary', params: { endDate: '2026-11-16' } }],
    revenue: [{ name: 'coverTotal', path: '/cover-days/total' }],
    inventory: [{ name: 'invDays', path: '/inventory-days' }, { name: 'bench', path: '/cover-days/benchmarks' }],
    fulfilment: [],
    distribution: [],
  };
  it('TC-EXEC-052 empty: the calls are unchanged (the days in the month, as 1.0)', () => {
    expect(withCoverDays(specs, null)).toBe(specs);
  });
  it('TC-EXEC-052 set: only the cover-days endpoints carry ?coverDays', () => {
    const out = withCoverDays(specs, 45);
    expect(out.overview[0].params).toEqual({ endDate: '2026-11-16', coverDays: 45 });
    expect(out.overview[1].params).toEqual({ endDate: '2026-11-16' });
    expect(out.revenue[0].params).toEqual({ coverDays: 45 });
    expect(out.inventory[0].params).toEqual({ coverDays: 45 });
    // Benchmarks are days set per class, not worked out: unchanged.
    expect(out.inventory[1].params).toBeUndefined();
    expect(COVER_DAYS_PATHS).toHaveLength(6);
  });
});
