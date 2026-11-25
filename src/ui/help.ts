// Help texts the Sales Pulse 2.0 components (src/ui, ported from dsr-fe)
// show behind their ⓘ. Supply Chain KPI help lives in constants/help.ts.
import type { HelpText } from '@/constants/help';

export type { HelpText };

export const HELP = {
  colSales: { what: 'Sales in {cur}.', source: 'Sum of invoice amounts at TP.' },
  colPrior: { what: 'Sales in {prev}.', source: 'Same calculation for that period.' },
  colTarget: { what: 'IBL target or TSCL budget for the selected days.', source: 'IBL: sum of daily targets (vw_tscl_spl_targets). TSCL: the monthly budget (vw_tscl_budget).' },
  colAch: { what: 'Sales as a % of target. 100% = on target.', source: 'Sales ÷ target.' },
  colShare: { what: 'This row’s part of the total shown.', source: 'Row value ÷ total.' },
  colGrowth: { what: 'Growth against {prev}.', source: '({cur} − {prev}) ÷ {prev}.' },
} satisfies Record<string, HelpText>;
