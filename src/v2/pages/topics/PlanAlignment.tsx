// Plan alignment topic (FR-EXEC-025): the RV-11 lead chart and RV-12 class
// leaders and laggards in its Details sheet. On the Summary tab, in the side
// column under Risks & Opportunities (FR-EXEC-036). Its accuracy table lives in
// the Forecast Accuracy IBL panel's Details.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { ChartCard } from '@/v2/components/chart-card';
import { CardGrid, CardState } from '@/v2/components/exec/Panels';
import { HBars } from '@/v2/components/exec/HBars';
import type { Topic } from '@/v2/components/exec/AreaLayout';
import { RAG_META, RagBadge } from '@/v2/components/exec/Rag';
import { Legend, ragLegend } from '@/v2/components/exec/charts';
import { clsColor } from '@/v2/constants/classColors';
import { colors } from '@/v2/constants/theme';
import { helpFor } from '@/v2/constants/help';
import { num } from '@/v2/api/types';
import type { TabData } from '@/v2/features/data';
import { plan, status } from '@/v2/features/derive';
import { classRanking } from '@/v2/features/kpis';
import { rag } from '@/v2/features/kpiThresholds';
import { money, pct0 } from '@/v2/features/format';
import { monthLabel, type Window } from '@/v2/features/period';
import { useDetail } from '@/v2/features/detail';

const CLASSES = ['A', 'B', 'C', 'N', 'Others'];

/** The Plan alignment topic of the tab whose data is `d`; `onlyCls` is that tab's class chip. */
export function usePlanAlignmentTopic(d: TabData, w: Window, onlyCls: string | null): Topic {
  const detail = useDetail();
  const p = plan(d, w);
  const ranking = classRanking(p.cells, p.currentMonth);
  const visibleClasses = onlyCls ? [onlyCls] : CLASSES;
  const st = { cat: status(d, 'cat0', 'cat1'), ibl: status(d, 'ibl') };
  // A class with no TSCL budget loaded has no alignment (the API sends 0): left out, not drawn as 0%.
  const alignment = p.iblRows
    .filter((r) => (num(r.tscl_target) ?? 0) > 0)
    .map((r) => ({ cls: r.classification, pct: num(r.ibl_vs_tscl_pct) ?? 0, gap: (num(r.ibl_target) ?? 0) - (num(r.tscl_target) ?? 0) }))
    .filter((r) => r.cls === 'Total' || visibleClasses.includes(r.cls));

  return {
    key: 'alignment',
    title: 'Forecast vs budget',
    lead: (
      <ChartCard title="Forecast vs budget by class" subtitle="IBL target ÷ TSCL budget · line = 100%, forecast equals budget" colSpan={7} height="240px" isLoading={st.ibl.isLoading} help={helpFor('RV-11')} dataKpi="RV-11">
        {CardState({ locked: st.ibl.locked, error: st.ibl.error, empty: !alignment.length, emptyText: 'No TSCL budget is loaded for this month' }) ?? (
          <HBars
            sort="keep"
            rows={alignment.map((a) => ({
              key: a.cls,
              label: a.cls === 'Total' ? 'All classes' : a.cls === 'Others' ? 'Other' : `Class ${a.cls}`,
              value: a.pct,
              target: 100,
              color: RAG_META[rag(a.pct, 'planAlignment') ?? 'green'].color,
              valueText: pct0(a.pct),
              note: `gap ${a.gap >= 0 ? '+' : '−'}${money(Math.abs(a.gap))}`,
              // Click a class → its SKUs (FR-EXEC-049); "All classes" is the total.
              onClick: a.cls === 'Total' ? undefined : () => detail.open({ kind: 'alignClass', cls: a.cls }),
              title: a.cls === 'Total' ? undefined : 'Click for its SKUs',
            }))}
            fmt={pct0}
            legend={[...ragLegend('planAlignment', { shape: 'bar', what: 'forecast ÷ budget' }), { label: '100% = forecast equals budget', color: colors.target, shape: 'tick' }]}
          />
        )}
      </ChartCard>
    ),
    details: (
      <>
        <CardGrid mb={3}>
          <ChartCard title="Class leaders and laggards" subtitle={`This month · ${monthLabel(p.currentMonth, 'long')}`} colSpan={12} height="auto" isLoading={st.cat.isLoading} help={helpFor('RV-12')} dataKpi="RV-12" expandable={false}>
            {CardState({ locked: st.cat.locked, error: st.cat.error, empty: !ranking.length }) ?? (
              <Grid templateColumns="1fr 1fr" gap={4}>
                {[
                  { title: 'Ahead', list: ranking.slice(0, 2) },
                  { title: 'Behind', list: [...ranking].reverse().slice(0, 2) },
                ].map((g) => (
                  <Box key={g.title}>
                    <Text fontSize="11px" color={colors.mutedText} textTransform="uppercase" mb={1}>
                      {g.title}
                    </Text>
                    {g.list.map((r) => {
                      const prorated = p.days.totalDays > 0 ? (r.pct / p.days.daysGone) * p.days.totalDays : r.pct;
                      const status = rag(p.projectedFinal ? r.pct : prorated, 'attainment');
                      return (
                        <Flex key={r.cls} align="center" gap="8px" py="4px" cursor="pointer" _hover={{ bg: colors.hoverBg }} onClick={() => detail.open({ kind: 'class', cls: r.cls })}>
                          <Box w="10px" h="10px" borderRadius="2px" bg={clsColor(r.cls)} />
                          <Text fontWeight={600} fontSize="13px">
                            Class {r.cls}
                          </Text>
                          <Text fontSize="13px" ml="auto">
                            {pct0(r.pct)}
                          </Text>
                          <RagBadge rag={status} size="sm" />
                        </Flex>
                      );
                    })}
                  </Box>
                ))}
                <Box gridColumn="1 / -1">
                  <Legend items={[{ label: 'Class colour', color: clsColor('A'), colors: CLASSES.map(clsColor) }, ...ragLegend('attainment', { what: 'of pace' })]} />
                </Box>
              </Grid>
            )}
          </ChartCard>
        </CardGrid>
      </>
    ),
  };
}
