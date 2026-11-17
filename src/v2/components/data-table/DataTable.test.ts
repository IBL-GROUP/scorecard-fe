import { describe, expect, it } from 'vitest';
import { compareValues } from './DataTable';

const sortAsc = (xs: string[]) => [...xs].sort(compareValues);

describe('DataTable default ascending sort (FR-EXEC-027)', () => {
  it('TC-EXEC-035 month labels sort by date, oldest first', () => {
    expect(sortAsc(['November 2026', 'January 2026', 'December 2025', 'June 2026'])).toEqual(['December 2025', 'January 2026', 'June 2026', 'November 2026']);
    expect(sortAsc(['Nov 26', 'Jan 26', 'Dec 25'])).toEqual(['Dec 25', 'Jan 26', 'Nov 26']);
  });

  it('TC-EXEC-035 numbers sort numerically and text alphabetically', () => {
    expect(sortAsc(['1,200', '900', '15'])).toEqual(['15', '900', '1,200']);
    expect(sortAsc(['Others', 'Class B', 'Class A'])).toEqual(['Class A', 'Class B', 'Others']);
  });
});
