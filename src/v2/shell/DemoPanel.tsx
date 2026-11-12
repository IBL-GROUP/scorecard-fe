// Demo-only control panel for the S1 review: switch the generated data's
// scenario (AC-S1-7), act as another user (locked tiles, executive vs planner)
// and check that every PRD item and every retained 1.0 metric is on screen
// (TC-S1-02, TC-S1-03).

import { Box, Flex, Text } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { FiX } from 'react-icons/fi';
import { Segmented } from '@/v2/components/segmented';
import { notify } from '@/v2/components/notify';
import { colors } from '@/v2/constants/theme';
import { readScenario, writeScenario, type DemoScenario } from '@/v2/demo/scenario';
import { PRD_ITEMS, RETAINED_1_0, renderedIds } from '@/v2/features/catalog';
import { useStore } from '@/v2/features/store';
import { ALL_SECTIONS, SECTION_LABEL, TABS, type Section, type TabKey } from '@/v2/features/tabs';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box mb={3}>
      <Text fontSize="11px" color={colors.mutedText} textTransform="uppercase" letterSpacing=".05em" mb="4px">
        {label}
      </Text>
      {children}
    </Box>
  );
}

export function DemoPanel({ onClose, tab }: { onClose: () => void; tab: TabKey }) {
  const qc = useQueryClient();
  const st = useStore();
  const [s, setS] = useState<DemoScenario>(readScenario());
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setInterval(() => setIds(renderedIds()), 800);
    setIds(renderedIds());
    return () => clearInterval(t);
  }, []);

  const update = (next: DemoScenario) => {
    setS(next);
    writeScenario(next);
    qc.resetQueries({ queryKey: ['v2'] });
    notify({ title: 'Demo scenario changed', detail: `${next.performance} sales · ${next.state} data · ${next.stale ? 'stale' : 'fresh'} · ${next.historyMonths} months of history`, tone: 'data', key: 'scenario' });
  };
  const toggleSection = (sec: Section) => {
    const sections = st.user.sections.includes(sec) ? st.user.sections.filter((x) => x !== sec) : [...st.user.sections, sec];
    st.setUser({ ...st.user, sections });
  };

  const expected = PRD_ITEMS[tab];
  const missing = expected.filter((id) => !ids.has(id));
  const retainedHere = RETAINED_1_0.filter((r) => r.ids.some((id) => expected.includes(id)));
  const retainedMissing = retainedHere.filter((r) => !r.ids.some((id) => ids.has(id)));

  return (
    <Box position="fixed" top="0" right="0" bottom="0" w={{ base: '100%', sm: '360px' }} bg={colors.cardBg} borderLeft="1px solid" borderColor={colors.border} boxShadow={`0 0 24px ${colors.shadow}`} zIndex={50} p={4} overflowY="auto" role="dialog" aria-label="Demo controls">
      <Flex align="center" mb={3}>
        <Text fontWeight={700} color={colors.darkText}>
          Demo controls
        </Text>
        <Box as="button" ml="auto" onClick={onClose} aria-label="Close demo controls" color={colors.mutedText}>
          <FiX />
        </Box>
      </Flex>
      <Text fontSize="12px" color={colors.mutedText} mb={4}>
        Generated numbers for the S1 review. No request reaches scorecard-be.
      </Text>

      <Row label="Sales against plan">
        <Segmented size="xs" value={s.performance} onChange={(v) => update({ ...s, performance: v })} options={[{ value: 'mixed', label: 'Mixed' }, { value: 'ahead', label: 'Ahead' }, { value: 'behind', label: 'Behind' }]} />
      </Row>
      <Row label="Data state">
        <Segmented
          size="xs"
          value={s.state}
          onChange={(v) => update({ ...s, state: v })}
          options={[
            { value: 'live', label: 'Normal' },
            { value: 'loading', label: 'Loading' },
            { value: 'empty', label: 'Empty' },
            { value: 'error', label: 'Error' },
            { value: 'errorOne', label: 'One fails', title: '/dispatch-vs-order fails; everything else loads' },
          ]}
        />
      </Row>
      <Row label="Data quality">
        <Segmented size="xs" value={s.stale ? 'stale' : 'fresh'} onChange={(v) => update({ ...s, stale: v === 'stale' })} options={[{ value: 'fresh', label: 'Fresh' }, { value: 'stale', label: 'Stale (4 days old)' }]} />
      </Row>
      <Row label="History">
        <Segmented size="xs" value={String(s.historyMonths)} onChange={(v) => update({ ...s, historyMonths: Number(v) as 24 | 6 })} options={[{ value: '24', label: '24 months' }, { value: '6', label: '6 months (no LY)' }]} />
      </Row>

      <Row label="Act as">
        <Segmented size="xs" value={st.user.persona} onChange={(v) => st.setUser({ ...st.user, persona: v, id: v === 'executive' ? 'demo' : 'demo-planner', name: v === 'executive' ? 'Demo Executive' : 'Demo Planner' })} options={[{ value: 'executive', label: 'Executive' }, { value: 'planner', label: 'Planner' }]} />
        <Flex direction="column" gap="4px" mt={2}>
          {ALL_SECTIONS.map((sec) => (
            <Flex as="label" key={sec} align="center" gap="8px" fontSize="13px" color={colors.bodyText} cursor="pointer">
              <input type="checkbox" checked={st.user.sections.includes(sec)} onChange={() => toggleSection(sec)} />
              {SECTION_LABEL[sec]}
            </Flex>
          ))}
        </Flex>
      </Row>

      <Row label={`Coverage on ${TABS.find((t) => t.key === tab)!.short}`}>
        <Text fontSize="13px" color={missing.length ? colors.bad : colors.good} fontWeight={600}>
          PRD items: {expected.length - missing.length} / {expected.length}
        </Text>
        {missing.length > 0 && (
          <Text fontSize="12px" color={colors.mutedText}>
            Missing: {missing.join(', ')}
          </Text>
        )}
        <Text fontSize="13px" color={retainedMissing.length ? colors.bad : colors.good} fontWeight={600} mt={1}>
          1.0 metrics on this tab: {retainedHere.length - retainedMissing.length} / {retainedHere.length}
        </Text>
        {retainedMissing.map((r) => (
          <Text key={r.n} fontSize="12px" color={colors.mutedText}>
            Missing #{r.n}: {r.metric}
          </Text>
        ))}
      </Row>

      <Box as="button" fontSize="12px" color={colors.brand} onClick={() => update({ performance: 'mixed', state: 'live', stale: false, historyMonths: 24 })}>
        Reset scenario
      </Box>
    </Box>
  );
}
