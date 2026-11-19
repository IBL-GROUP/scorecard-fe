// "How we calculate", as in Sales Pulse 2.0 (dsr-fe components/methods/MethodsOverlay):
// a search box, the rules used everywhere, then every figure by tab as a row of
// name · what it tells you · how it is worked out. The text comes from the same
// help entries the ? icons use, so the two can never disagree.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { Overlay } from '@/v2/ui/overlay';
import { colors } from '@/v2/constants/theme';
import { PULSE_HELP, SUMMARY_HELP, helpFor, type HelpText } from '@/v2/constants/help';
import { REVIEW_HELP } from '@/v2/ui/pulse/ReviewSheet';
import { kpiThresholds as T } from '@/v2/features/kpiThresholds';
import type { TabKey } from '@/v2/features/tabs';

type Item = [string, HelpText | undefined];
const k = (label: string, id: string): Item => [label, helpFor(id)];

const GROUPS: { title: string; tab: TabKey; items: Item[] }[] = [
  {
    title: 'Pulse',
    tab: 'overview',
    items: [
      ['Status', PULSE_HELP.status],
      k('Service level', 'EX-05'),
      k('Order fill rate', 'EX-06'),
      k('Days of cover', 'EX-04'),
      k('Excess stock', 'EX-08'),
      k('Working capital', 'EX-07'),
      ['Working capital bar', PULSE_HELP.wcBar],
      ['Supply chain health', PULSE_HELP.health],
      ['Service grid', PULSE_HELP.serviceGrid],
      k('Key insights', 'EX-10'),
      k('Stock as of', 'EX-11'),
    ],
  },
  {
    title: 'Analyze the supply chain',
    tab: 'overview',
    items: [
      ['Supply chain review', REVIEW_HELP.sheet],
      ['Service level', REVIEW_HELP.service],
      ['Order fill rate', REVIEW_HELP.fill],
      ['Days of cover', REVIEW_HELP.cover],
      ['Working capital', REVIEW_HELP.wc],
      ['Finished goods against benchmark', REVIEW_HELP.stock],
      ['Short and long on cover', REVIEW_HELP.shortLong],
      ['What would fix it', REVIEW_HELP.fix],
      ['What-if slider', REVIEW_HELP.whatIf],
      ['Missing and risks', REVIEW_HELP.checks],
      ['Where service is lost', REVIEW_HELP.owners],
    ],
  },
  {
    title: 'Summary',
    tab: 'revenue',
    items: [
      k('Sales', 'RV-01'),
      ['Inventory', SUMMARY_HELP.inventory],
      ['Inventory target', SUMMARY_HELP.inventoryTarget],
      k('Sales achievement to date', 'EX-01'),
      k('Projected month-end', 'EX-02'),
      k('Budget achievement to date', 'EX-03'),
      k('Required run-rate', 'RV-05'),
      k('Achievement trend, IBL', 'RV-06'),
      k('Achievement trend, TSCL', 'RV-07'),
      k('Gap to plan by class', 'RV-08'),
      k('Sales mix', 'RV-09'),
      k('SKUs sold', 'RV-10'),
      k('Forecast vs budget', 'RV-11'),
      k('Class ranking', 'RV-12'),
      k('Sales summary', 'RV-13'),
      k('Forecast Accuracy IBL', 'RV-14'),
      k('Budget Accuracy TSCL', 'RV-15'),
      k('Days gone', 'RV-16'),
      k('Coverage index', 'IN-03'),
      k('Excess inventory', 'IN-04'),
      k('Revenue at risk', 'IN-05'),
      k('Cover vs benchmark by class', 'IN-07'),
      k('Excess by class', 'IN-08'),
      k('Cover days', 'IN-14'),
    ],
  },
  {
    title: 'Service Measure',
    tab: 'inventory',
    items: [
      k('Service level', 'EX-05'),
      k('Finished goods at cost', 'IN-02'),
      k('SKUs below threshold', 'IN-06'),
      k('Working capital trend', 'IN-09'),
      k('Service measure by branch', 'IN-10'),
      k('Branch ranking', 'IN-11'),
      k('Cover by branch', 'IN-12'),
      k('Benchmark and threshold', 'IN-13'),
      k('Threshold vs actual', 'IN-15'),
      k('SKUs against threshold', 'IN-16'),
      k('Inventory days', 'IN-17'),
    ],
  },
  {
    title: 'Dispatch & WIP',
    tab: 'fulfilment',
    items: [
      k('Order fill rate', 'OP-01'),
      k('Unfulfilled quantity', 'OP-02'),
      k('Fill rate by channel', 'OP-03'),
      k('Materials below 90%', 'OP-04'),
      k('Biggest shortfalls', 'OP-05'),
      k('WIP value', 'OP-06'),
      k('Production completion', 'OP-07'),
      k('Open production orders', 'OP-08'),
      k('WIP by plant', 'OP-09'),
      k('RMPM value', 'OP-10'),
      k('RMPM on hold', 'OP-11'),
      k('RMPM by plant', 'OP-12'),
      k('Dispatch vs order table', 'OP-14'),
      k('WIP table', 'OP-15'),
      k('RMPM table', 'OP-16'),
    ],
  },
  {
    title: 'RD Data Status',
    tab: 'distribution',
    items: [
      k('Reported today', 'DH-01'),
      k('Current stock', 'DH-02'),
      k('Stale stock', 'DH-03'),
      k('Data age', 'DH-04'),
      k('Compliance by branch', 'DH-05'),
      k('Chronic non-reporters', 'DH-06'),
      k('Data freshness', 'DH-07'),
      k('Plan data loaded', 'DH-08'),
      k('Unclassified sales', 'DH-09'),
      k('Benchmark version', 'DH-10'),
      k('Current stock in hand', 'DH-11'),
      k('Previous stock in hand', 'DH-12'),
      k('Total stock in hand', 'DH-13'),
      k('RD data status table', 'DH-14'),
    ],
  },
];

const SHARED: { title: string; text: string }[] = [
  { title: 'Supply chain, not sales', text: 'Pulse and “Analyze the supply chain” look at stock, service, dispatch, production and distributors. Sales and targets are on Summary, where cover days and excess are measured against the daily sales target.' },
  { title: 'Totals', text: 'Every table has a Total line under the column names that stays in view while you scroll. It adds up all the rows that match your filters and search. Percentages are never added up: they are worked out from the summed figures.' },
  { title: 'Drill-down sheets', text: 'Clicking a row opens it as a sheet from the right. Branches follow Zone › Region › Branch. Each deeper click adds a sheet on top; the earlier ones stay visible at the left. Click one, the breadcrumb or press Esc to go back; click the dimmed page to close them all.' },
  { title: 'Period', text: 'Summary and Service Measure use the selected dates and every filter. Dispatch & WIP and RD Data Status follow the dates only. RD Data Status shows the stock reported on the last day of the period (today for the running month).' },
  { title: 'Classes and Others', text: 'Classes A, B, C and N have a benchmark and a threshold. SKUs with no class, or a class not in the item master, are counted as Others, always shown and listed last.' },
  { title: 'Cost and trade price', text: 'Stock, excess and working capital are at cost (inv_val_efp). Sales and revenue at risk are at trade price (TP). Excess converts days to value with each class’s cost ÷ TP.' },
  {
    title: 'Status colours',
    text: `Green = on target, amber = watch, red = below. Service level: green ≥ ${T.serviceLevel.green}%, red < ${T.serviceLevel.amber}%. Fill rate: green ≥ ${T.fillRate.green}%, red < ${T.fillRate.amber}%. Coverage: green ${T.coverage.greenLo}–${T.coverage.greenHi}% of benchmark. Colours always come with a number or label.`,
  },
  { title: 'Number formats', text: 'B with 2 decimals, M with 1 and K with 0; every % has 1 decimal; cover in whole days.' },
  { title: 'Our own calculations', text: 'Key insights, the status chip and “Analyze the supply chain” are worked out by fixed rules from the data on screen. No AI is used and nothing is sent anywhere. They show where to look, not proof of cause.' },
];

export function MethodsOverlay({ tabs, onClose }: { tabs: TabKey[]; onClose: () => void }) {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return GROUPS.filter((g) => tabs.includes(g.tab))
      .map((g) => ({ ...g, items: g.items.filter((i): i is [string, HelpText] => !!i[1]) }))
      .map((g) => (needle ? { ...g, items: g.items.filter(([t, h]) => `${t} ${h.what} ${h.source}`.toLowerCase().includes(needle)) } : g))
      .filter((g) => g.items.length);
  }, [q, tabs]);
  return (
    <Overlay title="How we calculate" subtitle="Every rule behind the numbers on this dashboard, in plain words" onClose={onClose}>
      <Flex direction="column" gap={4} data-methods>
        <Box
          as="input"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ placeholder: 'Search, e.g. cover days, fill rate, excess…', value: q, onChange: (e: any) => setQ(e.target.value) } as any)}
          h="34px"
          px={3}
          border="1px solid"
          borderColor={colors.border}
          borderRadius="4px"
          bg={colors.cardBg}
          color={colors.darkText}
          fontSize="13px"
          maxW="420px"
        />
        {!q && (
          <Box>
            <Text fontSize="14px" fontWeight={700} color={colors.darkText} mb={2}>
              Rules used everywhere
            </Text>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
              {SHARED.map((r) => (
                <Box key={r.title} bg={colors.sunkBg} borderRadius="4px" px={3} py={2}>
                  <Text fontSize="13px" fontWeight={700} color={colors.darkText}>
                    {r.title}
                  </Text>
                  <Text fontSize="13px" color={colors.bodyText}>
                    {r.text}
                  </Text>
                </Box>
              ))}
            </Grid>
          </Box>
        )}
        {groups.map((g) => (
          <Box key={g.title}>
            <Text fontSize="14px" fontWeight={700} color={colors.darkText} mb={2}>
              {g.title}
            </Text>
            <Box border="1px solid" borderColor={colors.border} borderRadius="4px" bg={colors.cardBg}>
              {g.items.map(([t, h]) => (
                <Grid key={t} templateColumns={{ base: '1fr', md: '220px 1fr 1fr' }} gap={3} px={3} py="9px" borderBottom="1px solid" borderColor={colors.sunkBg}>
                  <Text fontSize="13px" fontWeight={600} color={colors.darkText}>
                    {t}
                  </Text>
                  <Text fontSize="13px" color={colors.bodyText}>
                    {h.what}
                  </Text>
                  <Text fontSize="13px" color={colors.mutedText}>
                    {h.source}
                  </Text>
                </Grid>
              ))}
            </Box>
          </Box>
        ))}
        {q && !groups.length && (
          <Text fontSize="13px" color={colors.mutedText}>
            Nothing matches “{q}”.
          </Text>
        )}
      </Flex>
    </Overlay>
  );
}
