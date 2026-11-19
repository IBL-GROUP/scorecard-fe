/** Names that stand for "no name" — they always sort after the real ones. */
const UNNAMED = new Set(['', 'others', 'other / unmapped', 'unassigned', 'null', '—']);

/**
 * One collator, made once. `localeCompare` with options builds a new one on
 * every call, which made sorting Chemist Sales' 143k rows take ~8 s and froze
 * the page; the order is the same.
 */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * A→Z by name, numbers in order (DIVISION-1, DIVISION-2 … DIVISION-10) and
 * case ignored, with Others / Unassigned last. Every table and list in Sales
 * Pulse orders its rows this way.
 */
export function byName(a: string, b: string): number {
  const ua = UNNAMED.has(a.trim().toLowerCase());
  const ub = UNNAMED.has(b.trim().toLowerCase());
  if (ua !== ub) return ua ? 1 : -1;
  return collator.compare(a, b);
}
