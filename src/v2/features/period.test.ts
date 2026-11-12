// Unit tests for period rules F1 and F2 (story S3). Spec case TC-EXEC-022 (FEAT-EXEC).
import { describe, expect, it } from 'vitest';
import { categoryCallEnds, comparisonWindow, getDaysGone, monthKeyFromLabel, presetWindow } from './period';

describe('Comparison windows, rule F2', () => {
  const mtd = presetWindow('mtd', '2026-11-15');

  it('TC-S3-04 MTD on 15 Nov compares with 1–15 Oct (previous period)', () => {
    expect(mtd).toEqual({ start: '2026-11-01', end: '2026-11-15' });
    expect(comparisonWindow(mtd, 'prev')).toEqual({ start: '2026-10-01', end: '2026-10-15' });
  });

  it('TC-S3-04 MTD on 15 Nov compares with 1–15 Nov last year (LY)', () => {
    expect(comparisonWindow(mtd, 'ly')).toEqual({ start: '2025-11-01', end: '2025-11-15' });
  });

  it('TC-S3-04 MTD on 31 Mar compares with 1–28 Feb (shorter month)', () => {
    expect(comparisonWindow(presetWindow('mtd', '2026-03-31'), 'prev')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('TC-S3-04 a custom window compares with the same length just before it', () => {
    expect(comparisonWindow({ start: '2026-10-10', end: '2026-10-19' }, 'prev')).toEqual({ start: '2026-09-30', end: '2026-10-09' });
  });
});

describe('Multi-month calls, rule F1', () => {
  it('TC-S3-09 YTD to 15 Nov needs at most 4 category calls per side', () => {
    const ends = categoryCallEnds(presetWindow('ytd', '2026-11-15'));
    expect(ends).toEqual(['2026-11-15', '2026-08-31', '2026-05-31', '2026-02-28']);
    expect(ends.length).toBeLessThanOrEqual(4);
  });

  it('TC-S3-09 QTD needs one call', () => {
    expect(categoryCallEnds(presetWindow('qtd', '2026-11-15'))).toEqual(['2026-11-15']);
  });
});

describe('Days gone (BR-SUM-001, kept from 1.0)', () => {
  it('TC-S3-02 day 10 of a 30-day month', () => {
    expect(getDaysGone({ start: '2026-11-01', end: '2026-11-30' }, '2026-11-10')).toMatchObject({ daysGone: 10, totalDays: 30 });
  });
});

describe('Month labels from the API', () => {
  it.each([
    ['July 2026', '2026-07'],
    ['March     2026', '2026-03'],
    ['September 2026', '2026-09'],
    ['  may 2026 ', '2026-05'],
  ])('TC-S3-03 %j → %s', (label, key) => {
    expect(monthKeyFromLabel(label)).toBe(key);
  });
});
