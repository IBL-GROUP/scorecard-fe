import { describe, expect, it } from 'vitest';
import { CLS_COLOR, classColorCss, clsColor } from './classColors';

describe('class colours (FR-EXEC-054)', () => {
  it('TC-EXEC-062 classes use the Sales Pulse 2.0 (DSR) hues, the same in light and dark', () => {
    const want = { a: '#3B5BDB', b: '#12A594', c: '#E8590C', n: '#8B5CF6', others: '#6B7280' };
    for (const [k, hex] of Object.entries(want)) {
      expect(classColorCss).toContain(`:root{`);
      expect(classColorCss.match(new RegExp(`--sp-cls-${k}:${hex};`, 'g'))?.length, k).toBe(2); // light + dark
    }
    expect(clsColor('A')).toBe(CLS_COLOR.A);
    expect(clsColor('unknown')).toBe(CLS_COLOR.Others);
  });
});
