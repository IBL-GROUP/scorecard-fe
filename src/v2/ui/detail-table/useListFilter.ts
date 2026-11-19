// Filters for a details list in the dashboard's search bar (as the control panel): each field a
// row property; a row stays when, for every field with a choice, its value is one of them. Each
// field offers the values left by the other choices (a plant narrows its storage locations).

import { useState } from 'react';
import type { SearchField } from '@/v2/components/search';

export interface ListField<R> {
  key: string;
  label: string;
  of: (r: R) => string;
  /** Fixed options, listed first (1.0's lists); the data adds any others. */
  fixed?: { value: string; label: string }[];
}

/** Distinct values as options, A→Z. */
export const optionsOf = (vals: (string | undefined | null)[]) => [...new Set(vals.filter((v): v is string => !!v))].sort().map((v) => ({ value: v, label: v }));

export function useListFilter<R>(rows: R[], fields: ListField<R>[]) {
  const [values, setValues] = useState<Record<string, string>>({});
  const chosen = (key: string) => (values[key] ? values[key].split(',').filter(Boolean) : []);
  const keep = (r: R, skip?: string) => fields.every((f) => f.key === skip || !chosen(f.key).length || chosen(f.key).includes(f.of(r)));
  const shown = rows.filter((r) => keep(r));
  const searchFields: SearchField[] = fields.map((f) => {
    const fixed = f.fixed ?? [];
    const fromData = optionsOf(rows.filter((r) => keep(r, f.key)).map(f.of)).filter((o) => !fixed.some((x) => x.value === o.value));
    return { key: f.key, label: f.label, multi: true, options: [...fixed, ...fromData] };
  });
  return { shown, values, setValues, searchFields };
}
