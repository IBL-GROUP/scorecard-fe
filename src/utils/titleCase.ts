/**
 * Short labels — legends, card titles, tile names, captions and suffixes — in
 * Title Case: every word starts with a capital ("RD to trade" → "RD To Trade",
 * "target 2,055.6M to date" → "Target 2,055.6M To Date"). Words that already
 * hold a capital (RD, TP, EFP, SKU) and figures stay as they are; "vs" stays
 * lower case. Sentences and help text are never passed through this.
 */
export const titleCase = (s: string): string =>
  s.replace(/(^|[\s(/·–—-])([a-z][a-z']*)/g, (_m, pre: string, word: string) => (word === 'vs' ? pre + word : pre + word[0].toUpperCase() + word.slice(1)));

/** titleCase for a label that may not be text: anything else passes through untouched. */
export const titleCaseNode = <T,>(v: T): T => (typeof v === 'string' ? (titleCase(v) as T) : v);
