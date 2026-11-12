// Unit tests for the Supply Chain Pulse 2.0 KPI engine (stories S3 and S4).
// Spec case TC-EXEC-021 (FEAT-EXEC) is this file; TC-EXEC-017 is the pace test.
// Each test name starts with the test-case ID it proves.
import { describe, expect, it } from 'vitest';
import type { CategoryAccuracyRow, DispatchVsOrderRow, RdStatusRow, RpmRow } from '@/v2/api/types';
import * as K from './kpis';
import { rag, ragOf, riskRules } from './kpiThresholds';

const close = (v: number | null, expected: number, digits = 1) => expect(Number(v!.toFixed(digits))).toBe(expected);

const stock = (p: Partial<K.ClassStock>): K.ClassStock => ({ cls: 'A', cd: null, cdEfp: null, invTp: 0, invCost: 0, qty: 0, dailyTarget: 0, bm: null, th: null, ...p });

describe('Plan (story S3)', () => {
  it('TC-S3-01 attainment to date with S=96, T_td=100 is 96.0%, Amber', () => {
    const v = K.attainmentToDate(96, 100);
    close(v, 96.0);
    expect(rag(v, 'attainment')).toBe('amber');
  });

  it('TC-S3-02 projected month-end with S=50 on day 10 of 30 and T=140 is 107.1%, Green', () => {
    const v = K.projectedMonthEnd(50, 10, 30, 140);
    close(v, 107.1);
    expect(rag(v, 'projected')).toBe('green');
  });

  it('TC-S3-03 multi-month YTD attainment is Σamount ÷ Σtarget, not the last month only', () => {
    const rows: CategoryAccuracyRow[] = [
      { classification: 'A', month: 'January 2026', amount: 100, target_value: 100, pct: 100 },
      { classification: 'A', month: 'February 2026', amount: 50, target_value: 100, pct: 50 },
      // PostgreSQL's padded TO_CHAR label, as /forecast-accuracy-category-monthly sends it.
      { classification: 'A', month: 'March     2026', amount: 150, target_value: 100, pct: 150 },
    ] as CategoryAccuracyRow[];
    const cells = K.categoryCells([rows]);
    const ytd = K.multiMonthAttainment(cells, ['2026-01', '2026-02', '2026-03']);
    expect(ytd.amount).toBe(300);
    expect(ytd.target).toBe(300);
    close(ytd.pct, 100.0);
    // Last month alone would read 150%: the rule must not do that.
    close(K.multiMonthAttainment(cells, ['2026-03']).pct, 150.0);
  });

  it('TC-S3-06 Top Risks with 10 triggered rules shows 7, ranked by severity', () => {
    const redKpis = Array.from({ length: 10 }, (_, i) => ({ id: `EX-0${i}`, name: `KPI ${i}`, value: '1%', tab: 'revenue' }));
    const risks = K.buildRisks({
      redKpis,
      serviceMatrix: [],
      classStock: [stock({ cls: 'B', cd: 5, th: 15, bm: 30, dailyTarget: 1 })], // R3, also red
      channels: [{ channel: 'Retail', ordered: 100, delivered: 50, pct: 50, unfulfilled: 50 }], // R5 amber
      rdRows: [],
      blockedQiPct: null,
      planAlignmentPct: null,
      classAttainment: [],
      fmtMoney: (n) => String(n),
    });
    expect(risks).toHaveLength(riskRules.maxItems);
    // Red before amber; inside red, higher weight first (R1 = 100 before R3 = 95).
    expect(risks.every((r) => r.tone === 'red')).toBe(true);
    expect(risks[0].id.startsWith('R1-')).toBe(true);
    expect(risks.map((r) => r.id)).not.toContain('R5-Retail');
  });

  it('TC-S3-06 keeps up to 2 places for opportunities', () => {
    const risks = K.buildRisks({
      redKpis: Array.from({ length: 9 }, (_, i) => ({ id: `K${i}`, name: 'x', value: '1', tab: 'revenue' })),
      serviceMatrix: [],
      classStock: [],
      channels: [],
      rdRows: [],
      blockedQiPct: null,
      planAlignmentPct: null,
      classAttainment: [
        { cls: 'A', pct: 130 },
        { cls: 'B', pct: 120 },
        { cls: 'C', pct: 115 },
      ],
      fmtMoney: String,
    });
    expect(risks).toHaveLength(7);
    expect(risks.filter((r) => r.tone === 'opportunity')).toHaveLength(2);
    expect(risks.slice(0, 5).every((r) => r.tone === 'red')).toBe(true);
  });
});

describe('RAG bands (story S3)', () => {
  it.each([
    [89.9, 'red'],
    [90, 'amber'],
    [99.9, 'amber'],
    [100, 'green'],
  ])('TC-S3-05 attainment %s is %s', (value, expected) => {
    expect(rag(value, 'attainment')).toBe(expected);
  });

  it('TC-S3-12 a changed band changes the colour with no code change', () => {
    expect(ragOf(95, { kind: 'higher', green: 100, amber: 90 })).toBe('amber');
    expect(ragOf(95, { kind: 'higher', green: 95, amber: 90 })).toBe('green');
  });

  it('TC-S3-05 no value gives no status', () => {
    expect(rag(null, 'attainment')).toBeNull();
    expect(rag(Number.NaN, 'attainment')).toBeNull();
  });
});

describe('Inventory (story S4)', () => {
  it('TC-S4-01 excess for CD=60, BM=40, DT=1 M, cost ratio 0.6 is PKR 12 M', () => {
    const [x] = K.excessByClass([stock({ cd: 60, bm: 40, dailyTarget: 1_000_000, invTp: 100, invCost: 60 })]);
    expect(x.value).toBeCloseTo(12_000_000, 6);
  });

  it('TC-S4-02 shortfall for CD=10, TH=15, DT=2 M is PKR 10 M', () => {
    const [x] = K.shortfallByClass([stock({ cd: 10, th: 15, dailyTarget: 2_000_000 })]);
    expect(x.value).toBe(10_000_000);
    expect(K.shortfallRag([x])).toBe('red'); // class A short → Red
  });

  it('TC-S4-03 weighted benchmark and Coverage Index leave out Others (no benchmark)', () => {
    const rows = [
      stock({ cls: 'A', bm: 30, dailyTarget: 2 }),
      stock({ cls: 'B', bm: 60, dailyTarget: 1 }),
      stock({ cls: 'Others', bm: null, dailyTarget: 100 }),
    ];
    const wb = K.weightedBenchmark(rows);
    expect(wb).toBe(40); // (30×2 + 60×1) ÷ 3
    close(K.coverageIndex(50, wb), 125.0);
  });

  it('TC-S4-03 a 0 benchmark from cover_days counts as not set', () => {
    const [n] = K.classStock([{ classification: 'N', cover_days: 10, inv_val: 1, inv_val_efp: 1, quantity: 1, daily_target: 1 } as never], [{ classification: 'N', days: 0, threshold: 0, effective_date: '2026-07-29' }]);
    expect(n.bm).toBeNull();
    expect(n.th).toBeNull();
  });
});

describe('Fulfilment (story S4)', () => {
  it('TC-S4-04 fill rate from 3 dispatch rows is Σdelivery ÷ Σorder', () => {
    const rows = [
      { material_name: 'M1', channel_type: 'Retail', total_order_qty: 100, total_delivery_qty: 90 },
      { material_name: 'M2', channel_type: 'Retail', total_order_qty: 50, total_delivery_qty: 50 },
      // A null delivered quantity (allowed by the contract) counts as 0.
      { material_name: 'M3', channel_type: 'Institution', total_order_qty: 50, total_delivery_qty: null },
    ] as unknown as DispatchVsOrderRow[];
    const f = K.fillRate(rows);
    expect(f.ordered).toBe(200);
    expect(f.delivered).toBe(140);
    close(f.pct, 70.0);
  });

  it('TC-S4-05 material on hold from RMPM rows is (blocked + QI + restricted + returns) ÷ total', () => {
    const rows = [
      { total_val: 1000, blocked_val: 50, quality_inspection_val: 30, restricted_val: 10, returns_val: 10 },
      { total_val: 1000, blocked_val: 0, quality_inspection_val: 0, restricted_val: 0, returns_val: 0 },
    ] as unknown as RpmRow[];
    const s = K.rmpmSummary(rows);
    expect(s.held).toBe(100);
    close(s.onHoldPct, 5.0);
    close(s.blockedQiPct, 4.0);
  });
});

describe('Distribution (story S4)', () => {
  it('TC-S4-06 RD compliance and reporting-age buckets from 10 RD rows', () => {
    const ages = [0, 0, 0, 0, 0, 1, 2, 3, 5, 9];
    const rows = ages.map((d, i) => ({
      ibl_distributor_code: String(i),
      distributor_desc: `RD ${i}`,
      branch_code: '8001',
      branch_desc: 'Karachi',
      stock_qty: d === 0 ? 10 : 0,
      stock_value: d === 0 ? 100 : 0,
      last_stock_qty: d === 0 ? 0 : 5,
      last_stock_value: d === 0 ? 0 : 50,
      last_stock_date: null,
      day_diff: d,
    })) as unknown as RdStatusRow[];
    const s = K.rdSummary(rows);
    expect(s.count).toBe(10);
    expect(s.reporting).toBe(5);
    close(s.compliance, 50.0);
    expect(K.rdAgeBuckets(rows).map((b) => b.count)).toEqual([5, 1, 2, 1, 1]);
    expect(K.chronicNonReporters(rows).map((r) => r.day_diff)).toEqual([9]);
  });
});

describe('Pace adjustment on live data (story S3)', () => {
  it('TC-EXEC-017 the running month is not scaled twice when its target already runs to the same day', () => {
    // IBL targets are daily: the category call returns the target to endDate.
    const cells: K.MonthClass[] = [{ month: '2026-11', cls: 'A', amount: 90, target: 100 }];
    expect(K.varianceByClass(cells, '2026-11', 1).steps[0].variance).toBe(-10);
    // A target covering more days than the sales (window ends in the future) is cut to the same days.
    expect(K.varianceByClass(cells, '2026-11', 0.5).steps[0].variance).toBe(40);
  });
});
