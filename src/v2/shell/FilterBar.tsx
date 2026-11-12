// Global filter bar (PRD 3.3): Period presets and Compare apply at once;
// Division, Classification and Branch (under "More filters") are staged and
// applied together with Apply, as in 1.0 (FR-FILT-002).

import { Box, Flex, Text } from '@chakra-ui/react';
import { DatePicker } from '@/v2/components/date-picker';
import { notify } from '@/v2/components/notify';
import { Button } from '@/v2/components/button';
import { useEffect, useState } from 'react';
import { FiSliders } from 'react-icons/fi';
import { Segmented } from '@/v2/components/segmented';
import { MultiSelect } from '@/v2/components/select/MultiSelect';
import { colors } from '@/v2/constants/theme';
import { PRESETS, rangeLabel, todayIso, type CompareKey, type PresetKey } from '@/v2/features/period';
import { EMPTY_FILTERS, useStore, type Filters } from '@/v2/features/store';
import type { DashboardData } from '@/v2/features/data';
import type { TabKey } from '@/v2/features/tabs';

const COMPARE: { value: CompareKey; label: string }[] = [
  { value: 'prev', label: 'Previous period' },
  { value: 'ly', label: 'Same period LY' },
];

export function FilterBar({ data, tab }: { data: DashboardData; tab: TabKey }) {
  const st = useStore();
  const [staged, setStaged] = useState<Filters>(st.filters);
  const [more, setMore] = useState(st.filters.branch.length > 0);
  const [custom, setCustom] = useState(st.window);
  useEffect(() => setStaged(st.filters), [st.filters]);
  useEffect(() => setCustom(st.window), [st.window]);

  const items = data.options.items;
  const divisions = [...new Set(items.map((i) => i.division).filter(Boolean) as string[])].sort();
  const dirty = JSON.stringify(staged) !== JSON.stringify(st.filters);
  const branchTab = tab === 'revenue' || tab === 'inventory';
  const productFilters = tab !== 'fulfilment' && tab !== 'distribution';

  return (
    <Box bg={colors.barBg} borderBottom="1px solid" borderColor={colors.border} px={{ base: 4, md: 6 }} py="8px">
      <Flex gap="10px" align="center" wrap="wrap">
        <Flex direction="column" gap="2px">
          <Text fontSize="11px" color={colors.mutedText}>
            Period
          </Text>
          <Segmented<PresetKey> size="xs" ariaLabel="Period" value={st.preset} onChange={st.setPreset} options={PRESETS.map((p) => ({ value: p.key, label: p.label }))} />
        </Flex>
        {st.preset === 'custom' && (
          <Flex gap="6px" align="flex-end">
            <Box>
              <Text fontSize="11px" color={colors.mutedText}>
                From
              </Text>
              <DatePicker variant="range-start" value={custom.start} maxDate={custom.end} onChange={(v) => setCustom({ ...custom, start: v })} />
            </Box>
            <Box>
              <Text fontSize="11px" color={colors.mutedText}>
                To
              </Text>
              <DatePicker variant="range-end" value={custom.end} minDate={custom.start} maxDate={todayIso()} onChange={(v) => setCustom({ ...custom, end: v })} />
            </Box>
            <Button size="sm" variant="primary" onClick={() => custom.start && custom.end && custom.start <= custom.end && st.setCustom(custom)}>
              Set
            </Button>
          </Flex>
        )}
        <Flex direction="column" gap="2px">
          <Text fontSize="11px" color={colors.mutedText}>
            Compare to
          </Text>
          <Segmented<CompareKey> size="xs" ariaLabel="Compare to" value={st.compare} onChange={st.setCompare} options={COMPARE} />
        </Flex>
        {productFilters && (
          <>
            <Box minW="170px">
              <MultiSelect label="Division" value={staged.division} onChange={(v) => setStaged({ ...staged, division: v })} options={divisions.map((d) => ({ value: d, label: d }))} placeholder="All divisions" />
            </Box>
            <Box minW="150px">
              <MultiSelect label="Class" value={staged.classification} onChange={(v) => setStaged({ ...staged, classification: v })} options={['A', 'B', 'C', 'N', 'Others'].map((c) => ({ value: c, label: c }))} placeholder="All classes" />
            </Box>
            <Button size="sm" variant="gray" onClick={() => setMore(!more)} aria-expanded={more} alignSelf="flex-end">
              <FiSliders /> More filters
            </Button>
            {more && (
              <Box minW="190px">
                <MultiSelect
                  label="Branch"
                  value={staged.branch}
                  onChange={(v) => setStaged({ ...staged, branch: v })}
                  options={data.options.branches.map((b) => ({ value: String(b.hub_branch_code), label: b.hub_branch_desc }))}
                  placeholder={branchTab ? 'All branches' : 'All branches (used on Revenue and Inventory)'}
                />
              </Box>
            )}
            <Flex gap="6px" alignSelf="flex-end">
              <Button size="sm" variant="primary" disabled={!dirty} onClick={() => (st.applyFilters(staged), notify({ title: 'Filters applied', detail: 'Every tab reloads with the new selection, the one on screen first.', tone: 'info', key: 'filters' }))}>
                Apply
              </Button>
              <Button size="sm" variant="primaryOutline" onClick={() => (setStaged(EMPTY_FILTERS), st.applyFilters(EMPTY_FILTERS))}>
                Clear
              </Button>
            </Flex>
          </>
        )}
        <Text ml="auto" fontSize="12px" color={colors.mutedText} alignSelf="flex-end">
          {rangeLabel(st.window)} · vs {rangeLabel(data.cmpWindow)}
        </Text>
      </Flex>
    </Box>
  );
}
