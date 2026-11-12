// Number formatting for 2.0 (PRD section 3.4): PKR in M (1 decimal) and
// B (2 decimals) on tiles, full figures in tooltips and exports; % with 1
// decimal on tiles; whole days; "—" for missing values, never 0.

export const DASH = '—';

export function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return DASH;
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}
export const pkr = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : `PKR ${money(n)}`);
export const full = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : Math.round(n).toLocaleString('en-US'));
export const pct1 = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : `${n.toFixed(1)}%`);
export const pct0 = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : `${Math.round(n)}%`);
export const days = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : `${Math.round(n)} d`);
export const units = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? DASH : `${money(n)} units`);

/** % change between two values; null when there is no base. */
export const change = (cur: number | null | undefined, base: number | null | undefined) =>
  cur == null || base == null || base === 0 ? null : ((cur - base) / Math.abs(base)) * 100;
