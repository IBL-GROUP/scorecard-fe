// "How we calculate", as in Sales Pulse 2.0 (dsr-fe components/methods/MethodsOverlay):
// a search box, the rules used everywhere, then every figure by tab as a row of
// name · what it tells you · how it is worked out. The text comes from the same
// help entries the ? icons use, so the two can never disagree.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { Overlay } from '@/ui/overlay';
import { colors } from '@/constants/theme';
import { PULSE_HELP, SUMMARY_HELP, helpFor, type HelpText } from '@/constants/help';
import { REVIEW_HELP } from '@/ui/pulse/ReviewSheet';
import { kpiThresholds as T } from '@/features/kpiThresholds';
import type { TabKey } from '@/features/tabs';

type Item = [string, HelpText | undefined];
const k = (label: string, id: string): Item => [label, helpFor(id)];

const GROUPS: { title: string; tab: TabKey; items: Item[] }[] = [
  {
    title: 'Pulse',
    tab: 'overview',
    items: [
      ['Status', PULSE_HELP.status],
      k('Service Level', 'EX-05'),
      k('Order Fill Rate', 'EX-06'),
      k('Days Of Cover', 'EX-04'),
      k('Excess Stock', 'EX-08'),
      k('Working Capital', 'EX-07'),
      ['Working Capital Bar', PULSE_HELP.wcBar],
      ['Supply Chain Health', PULSE_HELP.health],
      ['Service Grid', PULSE_HELP.serviceGrid],
      k('Key Insights', 'EX-10'),
      k('Stock As Of', 'EX-11'),
    ],
  },
  {
    title: 'Analyze The Supply Chain',
    tab: 'overview',
    items: [
      ['Supply Chain Review', REVIEW_HELP.sheet],
      ['Service Level', REVIEW_HELP.service],
      ['Order Fill Rate', REVIEW_HELP.fill],
      ['Days Of Cover', REVIEW_HELP.cover],
      ['Working Capital', REVIEW_HELP.wc],
      ['Finished Goods Against Benchmark', REVIEW_HELP.stock],
      ['Short And Long On Cover', REVIEW_HELP.shortLong],
      ['What Would Fix It', REVIEW_HELP.fix],
      ['What-If Slider', REVIEW_HELP.whatIf],
      ['Missing And Risks', REVIEW_HELP.checks],
      ['Where Service Is Lost', REVIEW_HELP.owners],
    ],
  },
  {
    title: 'Summary',
    tab: 'revenue',
    items: [
      k('Sales', 'RV-01'),
      ['Inventory', SUMMARY_HELP.inventory],
      ['Inventory Target', SUMMARY_HELP.inventoryTarget],
      k('Sales Achievement To Date', 'EX-01'),
      k('Projected Month-End', 'EX-02'),
      k('Budget Achievement To Date', 'EX-03'),
      k('Required Run-Rate', 'RV-05'),
      k('Achievement Trend, IBL', 'RV-06'),
      k('Achievement Trend, TSCL', 'RV-07'),
      k('Gap To Plan By Class', 'RV-08'),
      k('Sales Mix', 'RV-09'),
      k('SKUs Sold', 'RV-10'),
      k('Forecast vs Budget', 'RV-11'),
      k('Class Ranking', 'RV-12'),
      k('Sales Summary', 'RV-13'),
      k('Forecast Accuracy IBL', 'RV-14'),
      k('Budget Accuracy TSCL', 'RV-15'),
      k('Days Gone', 'RV-16'),
      k('Coverage Index', 'IN-03'),
      k('Excess Inventory', 'IN-04'),
      k('Revenue At Risk', 'IN-05'),
      k('Cover vs Benchmark By Class', 'IN-07'),
      k('Excess By Class', 'IN-08'),
      k('Cover Days', 'IN-14'),
    ],
  },
  {
    title: 'Service Measure',
    tab: 'inventory',
    items: [
      k('Service Level', 'EX-05'),
      k('Finished Goods At Cost', 'IN-02'),
      k('SKUs Below Threshold', 'IN-06'),
      k('Working Capital Trend', 'IN-09'),
      k('Service Measure By Branch', 'IN-10'),
      k('Branch Ranking', 'IN-11'),
      k('Cover By Branch', 'IN-12'),
      k('Benchmark And Threshold', 'IN-13'),
      k('Threshold vs Actual', 'IN-15'),
      k('SKUs Against Threshold', 'IN-16'),
      k('Inventory Days', 'IN-17'),
    ],
  },
  {
    title: 'Dispatch & WIP',
    tab: 'fulfilment',
    items: [
      k('Order Fill Rate', 'OP-01'),
      k('Unfulfilled Quantity', 'OP-02'),
      k('Fill Rate By Channel', 'OP-03'),
      k('Materials Below 90%', 'OP-04'),
      k('Biggest Shortfalls', 'OP-05'),
      k('WIP Value', 'OP-06'),
      k('Production Completion', 'OP-07'),
      k('Open Production Orders', 'OP-08'),
      k('WIP By Plant', 'OP-09'),
      k('RMPM Value', 'OP-10'),
      k('RMPM On Hold', 'OP-11'),
      k('RMPM By Plant', 'OP-12'),
      k('Dispatch vs Order Table', 'OP-14'),
      k('WIP Table', 'OP-15'),
      k('RMPM Table', 'OP-16'),
    ],
  },
  {
    title: 'RD Data Status',
    tab: 'distribution',
    items: [
      k('Reported Today', 'DH-01'),
      k('Current Stock', 'DH-02'),
      k('Stale Stock', 'DH-03'),
      k('Data Age', 'DH-04'),
      k('Compliance By Branch', 'DH-05'),
      k('Chronic Non-Reporters', 'DH-06'),
      k('Data Freshness', 'DH-07'),
      k('Plan Data Loaded', 'DH-08'),
      k('Unclassified Sales', 'DH-09'),
      k('Benchmark Version', 'DH-10'),
      k('Current Stock In Hand', 'DH-11'),
      k('Previous Stock In Hand', 'DH-12'),
      k('Total Stock In Hand', 'DH-13'),
      k('RD Data Status Table', 'DH-14'),
    ],
  },
];

const SHARED: { title: string; text: string }[] = [
  { title: 'Supply Chain, Not Sales', text: 'Pulse and “Analyze the supply chain” look at stock, service, dispatch, production and distributors. Sales and targets are on Summary, where cover days and excess are measured against the daily sales target.' },
  { title: 'Totals', text: 'Every table has a Total line under the column names that stays in view while you scroll. It adds up all the rows that match your filters and search. Percentages are never added up: they are worked out from the summed figures.' },
  { title: 'Drill-Down Sheets', text: 'Clicking a row opens it as a sheet from the right. Branches follow Zone › Region › Branch. Each deeper click adds a sheet on top; the earlier ones stay visible at the left. Click one, the breadcrumb or press Esc to go back; click the dimmed page to close them all.' },
  { title: 'Period', text: 'Summary and Service Measure use the selected dates and every filter. Dispatch & WIP and RD Data Status follow the dates only. RD Data Status shows the stock reported on the last day of the period (today for the running month).' },
  { title: 'Classes And Others', text: 'Classes A, B, C and N have a benchmark and a threshold. SKUs with no class, or a class not in the item master, are counted as Others, always shown and listed last.' },
  { title: 'Cost And Trade Price', text: 'Stock, excess and working capital are at cost (inv_val_efp). Sales and revenue at risk are at trade price (TP). Excess converts days to value with each class’s cost ÷ TP.' },
  {
    title: 'Status Colours',
    text: `Green = on target, amber = watch, red = below. Service level: green ≥ ${T.serviceLevel.green}%, red < ${T.serviceLevel.amber}%. Fill rate: green ≥ ${T.fillRate.green}%, red < ${T.fillRate.amber}%. Coverage: green ${T.coverage.greenLo}–${T.coverage.greenHi}% of benchmark. Colours always come with a number or label.`,
  },
  { title: 'Number Formats', text: 'B with 2 decimals, M with 1 and K with 0; every % has 1 decimal; cover in whole days.' },
  { title: 'Our Own Calculations', text: 'Key insights, the status chip, Analyze and “Analyze the supply chain” are worked out by fixed rules from the data on screen. No AI is used and nothing is sent anywhere. They show where to look, not proof of cause.' },
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
    <Overlay title="How We Calculate" subtitle="Every rule behind the numbers on this dashboard, in plain words" onClose={onClose}>
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
              Rules Used Everywhere
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
