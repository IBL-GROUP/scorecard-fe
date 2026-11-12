// RAG bands for every Supply Chain Pulse 2.0 KPI, in one place.
//
// These are the PROPOSED defaults from PRD v2 section 4.0. They are not
// approved business rules: the S1 review records the owners' decisions
// (PRD Appendix B, D1) and any change is made here only — no component
// hard-codes a band.

export type Rag = 'green' | 'amber' | 'red';

export type Band =
  /** Higher is better: ≥ green is Green, ≥ amber is Amber, else Red. */
  | { kind: 'higher'; green: number; amber: number }
  /** Lower is better: ≤ green is Green, ≤ amber is Amber, else Red. */
  | { kind: 'lower'; green: number; amber: number }
  /** Two-sided: inside [greenLo, greenHi] Green, inside [amberLo, amberHi] Amber, else Red. */
  | { kind: 'range'; greenLo: number; greenHi: number; amberLo: number; amberHi: number };

export const kpiThresholds = {
  attainment: { kind: 'higher', green: 100, amber: 90 },
  projected: { kind: 'higher', green: 100, amber: 95 },
  coverage: { kind: 'range', greenLo: 80, greenHi: 120, amberLo: 60, amberHi: 150 },
  serviceLevel: { kind: 'higher', green: 90, amber: 80 },
  stockoutRisk: { kind: 'lower', green: 10, amber: 20 },
  fillRate: { kind: 'higher', green: 95, amber: 90 },
  excessPct: { kind: 'lower', green: 10, amber: 20 },
  onHoldPct: { kind: 'lower', green: 5, amber: 10 },
  productionCompletion: { kind: 'higher', green: 90, amber: 75 },
  planAlignment: { kind: 'range', greenLo: 95, greenHi: 105, amberLo: 90, amberHi: 110 },
  rdCompliance: { kind: 'higher', green: 90, amber: 75 },
  staleRdDays: { kind: 'lower', green: 1, amber: 3 },
  staleValuePct: { kind: 'lower', green: 0, amber: 10 },
  freshnessDays: { kind: 'lower', green: 1, amber: 2 },
  unclassifiedPct: { kind: 'lower', green: 2, amber: 5 },
} satisfies Record<string, Band>;

export type BandKey = keyof typeof kpiThresholds;

/** Exception rules for the Top Risks list (PRD EX-10). */
export const riskRules = {
  /** R2: a branch × class service cell below this %. */
  branchServiceBelow: 80,
  /** R4: a class with cover days above this multiple of its benchmark. */
  excessMultiple: 1.5,
  /** R5: a channel with fill rate below this %. */
  channelFillBelow: 90,
  /** R6: RDs silent for more than this many days. */
  staleRdDays: 3,
  /** DH-06: RDs silent for more than this many days are "chronic". */
  chronicRdDays: 7,
  /** R7: RMPM blocked + quality inspection above this % of value. */
  heldMaterialAbove: 10,
  /** O1: a class above this % of target to date is an opportunity. */
  classUpsideAbove: 110,
  /** OP-04: materials below this delivery % count as below target. */
  materialFillBelow: 90,
  /** Most items the Top Risks list shows. */
  maxItems: 7,
} as const;

/** Evaluate a value against a band. null/NaN → null (no status). */
export function ragOf(value: number | null | undefined, band: Band): Rag | null {
  if (value == null || Number.isNaN(value)) return null;
  switch (band.kind) {
    case 'higher':
      return value >= band.green ? 'green' : value >= band.amber ? 'amber' : 'red';
    case 'lower':
      return value <= band.green ? 'green' : value <= band.amber ? 'amber' : 'red';
    case 'range':
      if (value >= band.greenLo && value <= band.greenHi) return 'green';
      if (value >= band.amberLo && value <= band.amberHi) return 'amber';
      return 'red';
  }
}

export const rag = (value: number | null | undefined, key: BandKey) => ragOf(value, kpiThresholds[key]);

/** Plain-language band text for tooltips. */
export function bandText(key: BandKey, unit = '%'): string {
  const b: Band = kpiThresholds[key];
  if (b.kind === 'higher') return `Green ≥ ${b.green}${unit} · Amber ${b.amber}–${b.green}${unit} · Red < ${b.amber}${unit}`;
  if (b.kind === 'lower') return `Green ≤ ${b.green}${unit} · Amber ≤ ${b.amber}${unit} · Red > ${b.amber}${unit}`;
  return `Green ${b.greenLo}–${b.greenHi}${unit} · Amber ${b.amberLo}–${b.amberHi}${unit} · Red outside`;
}
