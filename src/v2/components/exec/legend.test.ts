import { describe, expect, it } from 'vitest';
import { ragLegend } from './charts';
import { kpiThresholds } from '@/v2/features/kpiThresholds';

describe('chart legends (FR-EXEC-033)', () => {
  it('TC-EXEC-039 status legends are worded from the band itself, never a new threshold', () => {
    const fill = kpiThresholds.fillRate;
    expect(ragLegend('fillRate').map((i) => i.label)).toEqual([`On track ≥ ${fill.green}%`, `Watch ${fill.amber}–${fill.green}%`, `Act < ${fill.amber}%`]);
    const cov = kpiThresholds.coverage;
    expect(ragLegend('coverage', { what: 'of benchmark (TP)' }).map((i) => i.label)).toEqual([
      `On track ${cov.greenLo}–${cov.greenHi}% of benchmark (TP)`,
      `Watch ${cov.amberLo}–${cov.amberHi}% of benchmark (TP)`,
      'Act outside of benchmark (TP)',
    ]);
    expect(ragLegend('staleRdDays', { unit: ' d' })[0].label).toBe(`On track ≤ ${kpiThresholds.staleRdDays.green} d`);
  });

  it('TC-EXEC-039 a legend swatch takes the shape of the mark it explains', () => {
    expect(ragLegend('serviceLevel', { shape: 'band' }).every((i) => i.shape === 'band' && !!i.ink)).toBe(true);
    expect(ragLegend('attainment', { shape: 'bar' }).map((i) => i.shape)).toEqual(['bar', 'bar', 'bar']);
    expect(ragLegend('attainment')[0].shape).toBe('dot');
  });
});
