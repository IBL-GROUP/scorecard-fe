// Number formatting for 2.0 (PRD section 3.4, FR-EXEC-030): never billions,
// always millions (1,234.5M); K from 100K; under 100K the value itself
// (45,230); at most one decimal place; no "PKR" sign on any value. Full
// figures in tooltips and exports; % with 1 decimal; whole days; "—" for
// missing values, never 0.

export const DASH = '—';

/** The 2.0 compact rule (FR-EXEC-030), shared by every compact formatter. */
export function compact(n: number, mDecimals = 1, kDecimals = 0): string {
  const a = Math.abs(n);
  const kd = 10 ** kDecimals;
  // 999,960 would read "1000K": show it as millions instead.
  if (a >= 1e6 || (a >= 1e5 && Math.round((a / 1e3) * kd) / kd >= 1000)) {
    return `${(n / 1e6).toLocaleString('en-US', { maximumFractionDigits: mDecimals })}M`;
  }
  if (a >= 1e5) return `${(n / 1e3).toLocaleString('en-US', { maximumFractionDigits: kDecimals })}K`;
  return Math.round(n).toLocaleString('en-US');
}

export function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return DASH;
  return compact(n);
}
/** Money in the compact rule, without a currency sign ("53.8M"): no "PKR" on any value (FR-EXEC-030). */
export const pkr = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : money(n));
export const full = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : Math.round(n).toLocaleString('en-US'));
export const pct1 = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`);
export const days = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : `${Math.round(n)} d`);
export const units = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : `${money(n)} Units`);

/** % change between two values; null when there is no base. */
export const change = (cur: number | null | undefined, base: number | null | undefined) =>
  cur == null || base == null || base === 0 ? null : ((cur - base) / Math.abs(base)) * 100;
