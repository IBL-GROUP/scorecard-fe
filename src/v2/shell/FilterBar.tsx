// The control panel under the menu, as in Sales Pulse 2.0 (FR-EXEC-043): one
// Odoo-style search for Division, Class and Branch on the left (chips, saved
// favourites), the "All metrics / 1.0 only" switch and the period button on the
// right. Every choice applies at once: there is no Apply button (FR-FILT-002 as
// changed for 2.0 on 16 Nov 2026).

import { Box, Flex, Input, Text } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { daysInMonth, parse } from '@/v2/features/period';
import { SearchBar, type SearchField } from '@/v2/components/search';
import { colors } from '@/v2/constants/theme';
import { useStore, type Filters } from '@/v2/features/store';
import type { DashboardData } from '@/v2/features/data';
import type { TabKey } from '@/v2/features/tabs';
import { MetricModeSwitch } from './MetricModeSwitch';
import { PeriodButton } from './PeriodButton';

const CLASSES = ['A', 'B', 'C', 'N', 'Others'];

/**
 * Cover days (FR-EXEC-047): the days the month's target is spread over when
 * scorecard-be works out cover days (daily target = month target ÷ these days).
 * Empty = the days in the To month, as 1.0. Applies on Enter or on leaving the
 * box; a value outside 1–366 is put back.
 */
function CoverDaysInput() {
  const st = useStore();
  const shown = st.coverDays == null ? '' : String(st.coverDays);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const end = parse(st.window.end);
  const monthDays = daysInMonth(end.getFullYear(), end.getMonth());
  const commit = () => {
    const t = text.trim();
    if (!t) return st.setCoverDays(null);
    const n = Number(t);
    if (Number.isInteger(n) && n >= 1 && n <= 366) st.setCoverDays(n === monthDays ? null : n);
    else setText(shown);
  };
  return (
    <Flex align="center" gap="8px" flexShrink={0}>
      <label htmlFor="cover-days" style={{ fontSize: '13px', color: colors.mutedText, whiteSpace: 'nowrap' }}>
        Cover days
      </label>
      <Input
        id="cover-days"
        data-cover-days
        type="number"
        inputMode="numeric"
        min={1}
        max={366}
        step={1}
        w="84px"
        h="34px"
        fontSize="13px"
        borderRadius="4px"
        bg={colors.cardBg}
        placeholder={String(monthDays)}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        title={`Days the month's target is spread over: daily target = month target ÷ these days. Empty = days in the month (${monthDays}).`}
      />
    </Flex>
  );
}
const split = (v: string | undefined) => (v ? v.split(',').filter(Boolean) : []);

export function FilterBar({ data, tab }: { data: DashboardData; tab: TabKey }) {
  const st = useStore();
  // Division, Class and Branch drive the Summary, Inventory and Overview data;
  // Fulfilment and Distribution have their own chips (as before).
  const productFilters = tab !== 'fulfilment' && tab !== 'distribution';

  const fields: SearchField[] = useMemo(() => {
    const divisions = [...new Set(data.options.items.map((i) => i.division).filter(Boolean) as string[])].sort();
    return [
      { key: 'division', label: 'Division', multi: true, options: divisions.map((d) => ({ value: d, label: d })) },
      { key: 'classification', label: 'Class', multi: true, options: CLASSES.map((c) => ({ value: c, label: c === 'Others' ? 'Other' : `Class ${c}` })) },
      { key: 'branch', label: 'Branch', multi: true, options: data.options.branches.map((b) => ({ value: String(b.hub_branch_code), label: b.hub_branch_desc })) },
    ];
  }, [data.options.items, data.options.branches]);

  const values: Record<string, string> = {
    division: st.filters.division.join(','),
    classification: st.filters.classification.join(','),
    branch: st.filters.branch.join(','),
  };
  const apply = (next: Record<string, string>) => {
    const f: Filters = { division: split(next.division), classification: split(next.classification), branch: split(next.branch) };
    st.applyFilters(f);
  };

  return (
    <Flex align="center" gap={4} wrap="wrap" px={4} py="10px" bg={colors.barBg} borderBottom="1px solid" borderColor={colors.border} data-control-panel>
      <Flex flex="1 1 460px" minW={0} maxW="900px">
        {productFilters ? (
          <Flex w="100%" gap={3} align="center">
            <Box flex={1} minW={0} data-filter-search>
              <SearchBar fields={fields} values={values} onChange={apply} favoritesKey="supplyChainPulse.favorites" placeholder="Search division, class, branch…" />
            </Box>
            <CoverDaysInput />
          </Flex>
        ) : (
          <Text fontSize="12.5px" color={colors.mutedText}>
            Division, class and branch do not apply to this tab; use its own chips.
          </Text>
        )}
      </Flex>
      <Flex align="center" gap={3} flexShrink={0} ml="auto">
        <MetricModeSwitch />
        <PeriodButton cmpWindow={data.cmpWindow} />
      </Flex>
    </Flex>
  );
}
