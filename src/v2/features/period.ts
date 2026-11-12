// Date windows for Supply Chain Pulse 2.0.
//
// - Period presets (PRD section 3.3).
// - Days gone / total days (BR-SUM-001, unchanged from 1.0).
// - Comparison windows (PRD rule F2).
// - Month-by-month plan windows (PRD rule F1).
//
// Dates are local-time `YYYY-MM-DD` strings throughout.

export type PresetKey = 'mtd' | 'lastMonth' | 'qtd' | 'ytd' | 'custom';
export type CompareKey = 'prev' | 'ly';

export interface Window {
  start: string;
  end: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayIso = () => iso(new Date());

export const daysInMonth = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();
export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
/** Whole days from a to b inclusive. */
export const daysInclusive = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000) + 1;

/** Shift a date by whole months, clamping the day to the target month's length. */
export function addMonths(s: string, n: number): string {
  const d = parse(s);
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  const target = new Date(y, m, 1);
  const day = Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
  return iso(new Date(target.getFullYear(), target.getMonth(), day));
}

export const monthStart = (s: string) => s.slice(0, 8) + '01';
export const monthEnd = (s: string) => {
  const d = parse(s);
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

export function presetWindow(key: Exclude<PresetKey, 'custom'>, today = todayIso()): Window {
  const t = parse(today);
  switch (key) {
    case 'mtd':
      return { start: monthStart(today), end: today };
    case 'lastMonth': {
      const prev = addMonths(monthStart(today), -1);
      return { start: prev, end: monthEnd(prev) };
    }
    case 'qtd': {
      const q0 = Math.floor(t.getMonth() / 3) * 3;
      return { start: iso(new Date(t.getFullYear(), q0, 1)), end: today };
    }
    case 'ytd':
      return { start: iso(new Date(t.getFullYear(), 0, 1)), end: today };
  }
}

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'mtd', label: 'MTD' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'qtd', label: 'QTD' },
  { key: 'ytd', label: 'YTD' },
  { key: 'custom', label: 'Custom' },
];

/**
 * BR-SUM-001 (1.0 rule, kept): totalDays runs from the 1st of the From month to
 * the last day of the To month; daysGone from From to min(To, today), clamped
 * to [1, totalDays].
 */
export function getDaysGone(w: Window, today = todayIso()) {
  const totalDays = daysInclusive(monthStart(w.start), monthEnd(w.end));
  const cap = w.end < today ? w.end : today;
  const raw = cap < w.start ? 1 : daysInclusive(w.start, cap);
  const daysGone = Math.min(totalDays, Math.max(1, raw));
  return { daysGone, totalDays, pct: Math.round((daysGone / totalDays) * 100) };
}

/** True when the window is inside one calendar month. */
export const isSingleMonth = (w: Window) => w.start.slice(0, 7) === w.end.slice(0, 7);

/**
 * PRD rule F2. Previous period = a window of the same length immediately
 * before; a window that starts on the 1st of a month and stays in it compares
 * with the same days of the previous month (MTD on day d → days 1..d of last
 * month). Same period last year shifts both dates by 12 months.
 */
export function comparisonWindow(w: Window, mode: CompareKey): Window {
  if (mode === 'ly') return { start: addMonths(w.start, -12), end: addMonths(w.end, -12) };
  if (w.start.endsWith('-01') && isSingleMonth(w)) {
    const start = addMonths(w.start, -1);
    const lastDay = daysInMonth(parse(start).getFullYear(), parse(start).getMonth());
    const day = Math.min(Number(w.end.slice(8, 10)), lastDay);
    return { start, end: `${start.slice(0, 8)}${pad(day)}` };
  }
  const len = daysInclusive(w.start, w.end);
  return { start: addDays(w.start, -len), end: addDays(w.start, -1) };
}

/** Calendar months a window touches, as `YYYY-MM`. */
export function monthsIn(w: Window): string[] {
  const out: string[] = [];
  let cur = monthStart(w.start);
  while (cur <= w.end) {
    out.push(cur.slice(0, 7));
    cur = addMonths(cur, 1);
  }
  return out;
}

/**
 * PRD rule F1. /forecast-accuracy-category-* return the 3 months ending in the
 * To month, so a window of n months needs ceil(n / 3) calls. Returns the end
 * dates to call with.
 */
export function categoryCallEnds(w: Window): string[] {
  const months = monthsIn(w);
  const ends: string[] = [];
  for (let i = months.length - 1; i >= 0; i -= 3) {
    const m = months[i];
    ends.push(i === months.length - 1 ? w.end : monthEnd(`${m}-01`));
  }
  return ends;
}

/** The last n month-end dates up to `end` (the current month ends at `end`). */
export function lastMonthEnds(end: string, n: number): string[] {
  const out: string[] = [end];
  let cur = monthStart(end);
  for (let i = 1; i < n; i++) {
    cur = addMonths(cur, -1);
    out.unshift(monthEnd(cur));
  }
  return out;
}

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/**
 * "July 2026" → "2026-07". The API sends PostgreSQL's TO_CHAR labels, and
 * /forecast-accuracy-category-monthly pads the month name to 9 characters
 * ("March     2026"), so any run of spaces is accepted. Parsed by hand, not
 * with `new Date(...)`, which only some browsers accept for this format.
 */
export function monthKeyFromLabel(label: string): string {
  const m = /^\s*([A-Za-z]+)\s+(\d{4})\s*$/.exec(label);
  const i = m ? MONTH_NAMES.indexOf(m[1].toLowerCase()) : -1;
  return m && i >= 0 ? `${m[2]}-${pad(i + 1)}` : label.trim();
}

export const monthLabel = (ym: string, style: 'long' | 'short' = 'short') =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: style, year: style === 'long' ? 'numeric' : '2-digit' });

export function rangeLabel(w: Window): string {
  const f = (s: string) => parse(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return w.start === w.end ? f(w.start) : `${f(w.start)} – ${f(w.end)}`;
}
