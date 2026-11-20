// The control panel under the menu, as in Sales Pulse 2.0: one Odoo-style
// search for Division, Class and Branch on the left (chips, saved favourites)
// and the period button on the right. Every choice applies at once.

import { Box, Flex, Input } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { daysInMonth, parse } from '@/features/period';
import { SearchBar, type SearchField } from '@/components/search';
import { colors } from '@/constants/theme';
import { useStore, type Filters } from '@/features/store';
import type { DashboardData } from '@/features/data';
import type { TabKey } from '@/features/tabs';
import { PeriodControl } from './PeriodControl';
import { ClassLegend } from '@/ui/class-badge';
import { Segmented } from '@/ui/segmented';
import { FiBarChart2, FiList } from 'react-icons/fi';
import { VIEW_TABS, setTabView, useTabView, type TabView } from '@/features/views';

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
  // The same bar on every tab, as Sales Pulse 2.0. Dispatch & WIP and RD Data Status read
  // sources with no division, class or branch: there the bar says the filters wait for the other tabs.
  const datesOnly = tab === 'fulfilment' || tab === 'distribution';

  const fields: SearchField[] = useMemo(() => {
    const divisions = [...new Set(data.options.items.map((i) => i.division).filter(Boolean) as string[])].sort();
    // One row per hub branch (the list has one per storage location); names A→Z with Others last.
    const geo = [...new Map(data.options.branches.map((b) => [String(b.hub_branch_code), b])).values()].sort((x, y) => x.hub_branch_desc.localeCompare(y.hub_branch_desc));
    const uniq = (xs: string[]) => [...new Set(xs)].sort((x, y) => Number(x === 'Others') - Number(y === 'Others') || x.localeCompare(y, undefined, { numeric: true }));
    return [
      { key: 'division', label: 'Division', multi: true, options: divisions.map((d) => ({ value: d, label: d })) },
      { key: 'classification', label: 'Class', multi: true, options: CLASSES.map((c) => ({ value: c, label: c === 'Others' ? 'Other' : `Class ${c}` })) },
      // Zone › Region › Branch (vw_zone_region_data), as Sales Pulse 2.0: each narrows the next.
      { key: 'zone', label: 'Zone', multi: true, options: uniq(geo.map((b) => b.zone ?? 'Others')).map((z) => ({ value: z, label: z })) },
      {
        key: 'region',
        label: 'Region',
        multi: true,
        options: uniq(geo.filter((b) => !st.filters.zone.length || st.filters.zone.includes(b.zone ?? 'Others')).map((b) => b.region ?? 'Others')).map((r) => ({ value: r, label: r })),
      },
      {
        key: 'branch',
        label: 'Branch',
        multi: true,
        options: geo
          .filter((b) => (!st.filters.zone.length || st.filters.zone.includes(b.zone ?? 'Others')) && (!st.filters.region.length || st.filters.region.includes(b.region ?? 'Others')))
          .map((b) => ({ value: String(b.hub_branch_code), label: b.hub_branch_desc })),
      },
      // SKU, as 1.0: the chosen divisions narrow the list.
      {
        key: 'sku',
        label: 'SKU',
        multi: true,
        options: data.options.items
          .filter((i) => !st.filters.division.length || (i.division != null && st.filters.division.includes(i.division)))
          .map((i) => ({ value: i.item_code, label: `${i.item_description} · ${i.item_code}` })),
      },
    ];
  }, [data.options.items, data.options.branches, st.filters.division, st.filters.zone, st.filters.region]);

  const values: Record<string, string> = {
    division: st.filters.division.join(','),
    classification: st.filters.classification.join(','),
    zone: st.filters.zone.join(','),
    region: st.filters.region.join(','),
    branch: st.filters.branch.join(','),
    sku: st.filters.sku.join(','),
  };
  // Classes are picked in the search box (its Filters menu, as Sales Pulse 2.0 offers Primary / Secondary);
  // the legend only explains them.
  const apply = (next: Record<string, string>) => {
    const f: Filters = { division: split(next.division), classification: split(next.classification), zone: split(next.zone), region: split(next.region), branch: split(next.branch), sku: split(next.sku) };
    st.applyFilters(f);
  };

  return (
    <Flex align="center" gap={4} wrap="wrap" px={4} py="10px" bg={colors.barBg} borderBottom="1px solid" borderColor={colors.border} data-control-panel>
      <Flex flex="1 1 460px" minW={0} maxW="1400px">
        <Flex w="100%" gap={3} align="center">
            {/* At most the search bar's own 760px, so Cover days and the legend follow it whether the legend shows or not. */}
            <Box flex="0 1 760px" minW={0} data-filter-search
              // Dates-only tabs: their sources have no division, class or branch, so the search is shown
              // but inactive (it cannot open a menu of filters that would change nothing).
              opacity={datesOnly ? 0.55 : 1}
              pointerEvents={datesOnly ? 'none' : undefined}
              aria-disabled={datesOnly || undefined}
              title={datesOnly ? 'Filters do not apply to this tab' : undefined}
            >
              <SearchBar fields={fields} values={values} onChange={apply} favoritesKey="supplyChainPulse.favorites" quickFilterKeys={['classification']} placeholder="Search division, class, zone, branch, SKU…" />
            </Box>
            {datesOnly ? null : (
              <>
                <CoverDaysInput />
                <Box display={{ base: 'none', xl: 'flex' }}>
                  <ClassLegend />
                </Box>
              </>
            )}
          </Flex>
      </Flex>
      <Flex align="center" gap={3} flexShrink={0} ml="auto">
        {VIEW_TABS[tab] && <ViewSwitch tab={tab} />}
        <PeriodControl />
      </Flex>
    </Flex>
  );
}

/** Graph or List, on the tabs that have both: Sales Pulse 2.0's view switch (dsr-fe HeaderActions). */
function ViewSwitch({ tab }: { tab: TabKey }) {
  const view = useTabView(tab);
  return (
    <Segmented<TabView>
      ariaLabel="Switch view"
      options={[
        { value: 'graph', label: <FiBarChart2 size={16} />, title: 'Graph' },
        { value: 'list', label: <FiList size={16} />, title: 'List' },
      ]}
      value={view}
      onChange={(v) => setTabView(tab, v)}
    />
  );
}
