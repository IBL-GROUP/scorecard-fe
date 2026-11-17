// Stock level topic (FR-EXEC-025): IN-03, IN-04 and IN-05 tiles, the IN-07
// lead chart, and IN-14 and IN-08 in its Details sheet. On the Summary tab
// since 16 Nov 2026, before that on Inventory & Working Capital (FR-EXEC-031).
// Each class row of IN-07, and its Total, also shows the inventory value at TP
// and at EFP and the units: the 1.0 Cover Days card figures (FR-EXEC-032).

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/v2/components/chart-card';
import { Segmented } from '@/v2/components/segmented';
import { ExecTile } from '@/v2/components/exec/ExecTile';
import { CardGrid, CardState } from '@/v2/components/exec/Panels';
import type { Topic } from '@/v2/components/exec/AreaLayout';
import { Bullet, Legend, axis, grid, ragLegend, tooltipStyle } from '@/v2/components/exec/charts';
import { RagDot } from '@/v2/components/exec/Rag';
import { colors } from '@/v2/constants/theme';
import { clsColor } from '@/v2/constants/classColors';
import { num, type CoverDaysRow } from '@/v2/api/types';
import { rowsOf, type TabData } from '@/v2/features/data';
import { status, stock } from '@/v2/features/derive';
import { classCoverage, shortfallRag } from '@/v2/features/kpis';
import { rag } from '@/v2/features/kpiThresholds';
import { days, full, money, pct0, pct1, pkr } from '@/v2/features/format';
import { useDetail } from '@/v2/features/detail';
import { useStore } from '@/v2/features/store';

const CLASS_ORDER = ['A', 'B', 'C', 'N', 'Others'];

/** Inventory value on the chosen basis (TP or EFP), and units, of one /cover-days row (FR-EXEC-032). */
function stockValues(r: CoverDaysRow | null | undefined, basis: 'TP' | 'EFP'): string | undefined {
  if (!r) return undefined;
  const value = num(basis === 'TP' ? r.inv_val : r.inv_val_efp);
  return `${basis} ${pkr(value)} · ${full(num(r.quantity))} units`;
}

/** The Stock level topic of the tab whose data is `d`; `clsChip` is that tab's class chip. */
export function useStockLevelTopic(d: TabData, clsChip: string | null): Topic {
  const detail = useDetail();
  const [basis, setBasis] = useState<'TP' | 'EFP'>('TP');
  // IN-07 has its own TP / EFP switch (FR-EXEC-034): it swaps each bar between
  // TP and EFP cover days; coverage % and status stay on TP (no new rule).
  const [leadBasis, setLeadBasis] = useState<'TP' | 'EFP'>('TP');
  const { coverDays } = useStore();
  const s = stock(d);
  const sStock = status(d, 'cover', 'coverTotal', 'bench');
  const showCls = (c: string) => !clsChip || c === clsChip;
  const excessRag = rag(s.excess.pct, 'excessPct');
  const shortRag = shortfallRag(s.shortfall);

  // IN-14 cards: Total + classes.
  const coverRows = rowsOf<CoverDaysRow>(d.cover);
  const coverOf = (cls: string) => coverRows.find((r) => (r.classification ?? 'Others') === cls);
  const cards = [
    ...(s.total ? [{ cls: 'Total', r: s.total }] : []),
    ...CLASS_ORDER.map((c) => ({ cls: c, r: coverOf(c) })).filter((x): x is { cls: string; r: CoverDaysRow } => !!x.r),
  ];

  // IN-07 bars: TP cover days, or EFP cover days from the same /cover-days row.
  const efpCd = (cls: string) => num(coverOf(cls)?.cover_days_efp ?? null);
  const barCd = (r: { cls: string; cd: number | null }) => (leadBasis === 'TP' ? r.cd : efpCd(r.cls));
  const totalBar = leadBasis === 'TP' ? s.totalCd : num(s.total?.cover_days_efp ?? null);
  // One scale for both bases, so toggling does not rescale the bars.
  const bulletMax = Math.max(10, ...s.cls.flatMap((r) => [r.cd ?? 0, efpCd(r.cls) ?? 0, r.bm ?? 0, r.th ?? 0])) * 1.1;
  const tpTag = leadBasis === 'EFP' ? ' (TP)' : '';

  // IN-08 waterfall: start FG, minus each class excess, end right-sized; shortfall as separate bars.
  const excessSteps = s.excessByClass.filter((e) => e.value > 0);
  let running = s.fgCost ?? 0;
  const bridge: { name: string; base: number; value: number; kind: 'total' | 'down' | 'short' }[] = [{ name: 'FG at cost', base: 0, value: running, kind: 'total' }];
  for (const e of excessSteps) {
    running -= e.value;
    bridge.push({ name: `Excess ${e.cls}`, base: running, value: e.value, kind: 'down' });
  }
  bridge.push({ name: 'Right-sized', base: 0, value: Math.max(0, running), kind: 'total' });
  for (const sh of s.shortfall) bridge.push({ name: `Short ${sh.cls}`, base: 0, value: sh.value, kind: 'short' });

  return {
    key: 'stock',
    title: 'Stock level',
    tiles: [
      <ExecTile key="IN-03" id="IN-03" label="Coverage Index" value={pct1(s.coverage)} rag={rag(s.coverage, 'coverage')} band="coverage" variance={`${days(s.totalCd)} vs ${days(s.wBm)} benchmark`} {...sStock} />,
      <ExecTile key="IN-04"
        id="IN-04"
        label="Excess Inventory Value"
        value={pkr(s.excess.value)}
        rag={excessRag}
        band="excessPct"
        variance={`${pct1(s.excess.pct)} of FG at cost`}
        {...sStock}
      />,
      <ExecTile key="IN-05" id="IN-05" label="Cover Shortfall Value (TP)" value={pkr(s.shortfallValue)} rag={sStock.isLoading ? null : shortRag} caption={s.shortfall.length ? `Below threshold: ${s.shortfall.map((x) => x.cls).join(', ')}` : 'No class below threshold'} {...sStock} />,
    ],
    lead: (
      <ChartCard
        dataKpi="IN-07"
        title="Cover Days vs Benchmark by Class"
        subtitle={`${leadBasis === 'TP' ? 'Cover days valued at trade price (TP)' : 'Cover days valued at item cost (EFP) · coverage % and status stay on TP'}${coverDays == null ? '' : ` · daily target = month target ÷ ${coverDays} days`}`}
        colSpan={{ base: 12, lg: 6 }}
        height="280px"
        isLoading={sStock.isLoading}
        headerRight={<Segmented size="xs" value={leadBasis} onChange={setLeadBasis} ariaLabel="Cover days valuation" options={[{ value: 'TP', label: 'TP' }, { value: 'EFP', label: 'EFP' }]} />}
      >
        {CardState({ ...sStock, empty: !s.cls.length }) ?? (
          <Flex direction="column" h="100%">
            <Box flex={1} minH={0} overflowY="auto" tabIndex={0} role="region" aria-label="Cover days by class" _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: "-2px" }}>
              {s.cls
                .filter((r) => showCls(r.cls))
                .map((r) => {
                  const cov = classCoverage(r);
                  const rg = rag(cov, 'coverage');
                  const cd = barCd(r);
                  return (
                    <Bullet
                      key={r.cls}
                      label={`Class ${r.cls}`}
                      actual={cd}
                      target={r.bm}
                      threshold={r.th}
                      max={bulletMax}
                      color={clsColor(r.cls)}
                      rag={rg}
                      right={
                        <>
                          {days(cd)} · {cov == null ? 'no benchmark' : `${pct0(cov)}${tpTag}`} <RagDot rag={rg} />
                        </>
                      }
                      sub={stockValues(coverOf(r.cls), leadBasis)}
                      onClick={() => detail.open({ kind: 'class', cls: r.cls })}
                    />
                  );
                })}
              {totalBar != null && (
                <Bullet label="Total" sub={stockValues(s.total, leadBasis)} actual={totalBar} target={s.wBm} max={bulletMax} color={colors.darkText} rag={rag(s.coverage, 'coverage')} right={<>{days(totalBar)} · {pct0(s.coverage)}{tpTag}</>} />
              )}
            </Box>
            <Legend
              items={[
                { label: `Cover days, ${leadBasis} (class colour)`, color: clsColor('A'), colors: CLASS_ORDER.map(clsColor) },
                { label: 'All classes', color: colors.darkText },
                { label: 'Benchmark', color: colors.target, shape: 'tick' },
                { label: 'Below threshold', color: colors.badSoft, ink: colors.bad, shape: 'band' },
                ...ragLegend('coverage', { what: 'of benchmark (TP)' }),
              ]}
            />
          </Flex>
        )}
      </ChartCard>
    ),
    details: (
      <>
        <CardGrid mb={3}>
          <ChartCard
            dataKpi="IN-14"
            title="Cover Days by Class"
            subtitle={basis === 'TP' ? 'Valued at trade price (TP)' : 'Valued at item cost (EFP)'}
            colSpan={12}
            isLoading={sStock.isLoading}
            expandable={false}
            headerRight={<Segmented size="xs" value={basis} onChange={setBasis} ariaLabel="Valuation" options={[{ value: 'TP', label: 'TP' }, { value: 'EFP', label: 'EFP' }]} />}
          >
            {CardState({ ...sStock, empty: !cards.length }) ?? (
              <>
                <Grid templateColumns={{ base: 'repeat(2, minmax(0,1fr))', md: 'repeat(3, minmax(0,1fr))', xl: 'repeat(6, minmax(0,1fr))' }} gap={3}>
                {cards.map(({ cls, r }) => {
                  const cd = num(basis === 'TP' ? r.cover_days : r.cover_days_efp);
                  const inv = num(basis === 'TP' ? r.inv_val : r.inv_val_efp);
                  const cs = s.cls.find((x) => x.cls === cls);
                  const rg = cs ? rag(classCoverage(cs), 'coverage') : null;
                  const dim = clsChip && cls !== clsChip && cls !== 'Total';
                  return (
                    <Box key={cls} borderTop={`3px solid ${clsColor(cls)}`} bg={colors.sunkBg} borderRadius="3px" px={3} py={2} opacity={dim ? 0.4 : 1}>
                      <Flex align="center" gap="6px">
                        <Text fontSize="12.5px" fontWeight={700} color={colors.darkText}>
                          {cls === 'Total' ? 'Total' : `Class ${cls}`}
                        </Text>
                        <Box ml="auto">
                          <RagDot rag={rg} />
                        </Box>
                      </Flex>
                      <Text fontSize="22px" fontWeight={700} color={colors.darkText}>
                        {days(cd)}
                      </Text>
                      <Text fontSize="12px" color={colors.bodyText}>
                        {pkr(inv)}
                      </Text>
                      <Text fontSize="12px" color={colors.mutedText}>
                        {full(num(r.quantity))} units
                      </Text>
                    </Box>
                  );
                })}
                </Grid>
                <Legend items={[{ label: 'Class colour', color: clsColor('A'), colors: CLASS_ORDER.map(clsColor) }, ...ragLegend('coverage', { what: 'of benchmark (TP)' })]} />
              </>
            )}
          </ChartCard>
        </CardGrid>
        <CardGrid mb={3}>
          <ChartCard dataKpi="IN-08" title="Excess / Shortfall Bridge" subtitle="FG at cost → less excess above benchmark → right-sized; shortfall (TP) in red" colSpan={12} height="460px" isLoading={sStock.isLoading}>
            {CardState({ ...sStock, empty: !s.cls.length }) ?? (
              <Flex direction="column" h="100%">
              <Box flex={1} minH={0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bridge} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
                  <CartesianGrid {...grid} vertical={false} />
                  <XAxis dataKey="name" {...axis} angle={-30} textAnchor="end" interval={0} height={50} />
                  <YAxis {...axis} tickFormatter={(v: number) => money(v)} width={52} />
                  <Tooltip {...tooltipStyle} formatter={(v, name) => (name === 'base' ? null : pkr(Number(v)))} />
                  <Bar dataKey="base" stackId="w" fill="transparent" legendType="none" />
                  <Bar dataKey="value" name="Value" stackId="w">
                    {bridge.map((b) => (
                      <Cell key={b.name} fill={b.kind === 'total' ? colors.sales : b.kind === 'down' ? colors.warn : colors.bad} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </Box>
              <Legend
                items={[
                  { label: 'FG at cost / right-sized', color: colors.sales },
                  { label: 'Excess above benchmark (cost)', color: colors.warn },
                  { label: 'Cover shortfall (TP)', color: colors.bad },
                ]}
              />
              </Flex>
            )}
          </ChartCard>
        </CardGrid>
      </>
    ),
  };
}
