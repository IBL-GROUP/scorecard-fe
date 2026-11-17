import { describe, expect, it } from 'vitest';
import { compact, money, pkr } from './format';
import { formatCompact, formatCompactValue } from '@/v2/constants/theme';

describe('2.0 number format (FR-EXEC-030)', () => {
  it('TC-EXEC-036 never shows billions: values of a billion or more stay in millions', () => {
    expect(money(3_040_000_000)).toBe('3,040.0M');
    expect(pkr(1_234_567_890)).toBe('1,234.6M');
    expect(formatCompact(3_040_000_000)).toBe('3,040.0M');
    expect(formatCompactValue(3_040_000_000)).toBe('3,040.0M');
    expect(compact(2_500_000_000, 0)).toBe('2,500M');
    expect(money(-1_500_000_000)).toBe('-1,500.0M');
  });

  it('TC-EXEC-036 shows the value itself under 100K, K from 100K, M from 1M', () => {
    expect(money(45_230)).toBe('45,230');
    expect(money(99_999)).toBe('99,999');
    expect(money(950)).toBe('950');
    expect(money(100_000)).toBe('100K');
    expect(money(505_400)).toBe('505K');
    expect(money(999_700)).toBe('1.0M');
    expect(money(53_800_000)).toBe('53.8M');
    expect(money(null)).toBe('—');
  });

  it('TC-EXEC-036 no "PKR" sign on any value, and never more than one decimal place', () => {
    for (const n of [0, 950, 45_230, 505_400, 53_820_000, 3_040_000_000, -18_340_000]) {
      for (const text of [money(n), pkr(n), formatCompact(n), formatCompactValue(n)]) {
        expect(text).not.toMatch(/PKR/);
        expect(text).not.toMatch(/\.\d{2}/);
      }
    }
    expect(formatCompactValue(53_820_000)).toBe('53.8M');
    expect(formatCompactValue(505_400)).toBe('505.4K');
  });
});
