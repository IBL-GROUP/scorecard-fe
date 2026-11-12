// The 2.0 app shell: navbar (tabs, "Data as of" stamp EX-11, "All metrics /
// 1.0 only" switch, theme switch, user menu), global filter bar, the active tab, and (demo mode) the demo controls.

import { Box, Flex, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { ScrollRestoration, useSearchParams } from 'react-router-dom';
import { FiMoon, FiSettings, FiSun } from 'react-icons/fi';
import { colors } from '@/v2/constants/theme';
import { useColorMode } from '@/v2/theme/color-mode';
import { DEMO_DATA } from '@/v2/config/api';
import { useDashboardData } from '@/v2/features/data';
import { useActiveTab, useNav, scrollToKpi } from '@/v2/features/nav';
import { useStore } from '@/v2/features/store';
import { TABS } from '@/v2/features/tabs';
import { tabHasItems, type MetricMode } from '@/v2/features/catalog';
import { trust } from '@/v2/features/derive';
import { rag } from '@/v2/features/kpiThresholds';
import { RagDot } from '@/v2/components/exec/Rag';
import { FilterBar } from './FilterBar';
import { DemoPanel } from './DemoPanel';
import { UserMenu } from './UserMenu';
import { NoAccess } from '@/v2/auth/AuthGate';
import { setUsageTab } from '@/v2/features/usage';
import { DetailLayer } from '@/v2/components/detail/DetailSheets';
import { ErrorBoundary } from '@/v2/components/ErrorBoundary';
import { notify, NotifyHost } from '@/v2/components/notify';
import { OverviewPage } from '@/v2/pages/OverviewPage';
import { RevenuePage } from '@/v2/pages/RevenuePage';
import { InventoryPage } from '@/v2/pages/InventoryPage';
import { FulfilmentPage } from '@/v2/pages/FulfilmentPage';
import { DistributionPage } from '@/v2/pages/DistributionPage';

function DataAsOf({ closing, freshness }: { closing: string | null; freshness: number | null }) {
  const [loadedAt] = useState(() => new Date());
  return (
    <Flex align="center" gap="6px" fontSize="12px" color={colors.mutedText} data-kpi="EX-11" title="Stock snapshot date and when this screen loaded">
      <RagDot rag={rag(freshness, 'freshnessDays')} />
      <Text>
        Stock as of {closing ? new Date(`${closing.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} · refreshed{' '}
        {loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Flex>
  );
}

const METRIC_MODES: { mode: MetricMode; label: string; short: string }[] = [
  { mode: 'all', label: 'All metrics', short: 'All' },
  { mode: 'v1', label: '1.0 only', short: '1.0' },
];

/**
 * "All metrics" shows every 2.0 KPI and chart; "1.0 only" shows just the items
 * that carry a Supply Chain Pulse 1.0 metric. Remembered per user (FR-EXEC-024).
 */
export function MetricModeSwitch() {
  const { metricMode, setMetricMode } = useStore();
  return (
    <Flex
      role="group"
      aria-label="Metrics shown"
      title="All metrics: every 2.0 KPI and chart. 1.0 only: just the KPIs and metrics Supply Chain Pulse 1.0 has."
      border="1px solid"
      borderColor={colors.border}
      borderRadius="999px"
      p="2px"
      gap="2px"
      flexShrink={0}
      data-metric-mode={metricMode}
    >
      {METRIC_MODES.map((o) => {
        const on = metricMode === o.mode;
        return (
          <Box
            key={o.mode}
            as="button"
            aria-pressed={on}
            aria-label={o.label}
            onClick={() => setMetricMode(o.mode)}
            px="10px"
            py="3px"
            borderRadius="999px"
            fontSize="12px"
            fontWeight={on ? 700 : 500}
            bg={on ? colors.brandSoft : 'transparent'}
            color={on ? colors.brand : colors.bodyText}
            whiteSpace="nowrap"
            _hover={on ? undefined : { bg: colors.navbarHover }}
          >
            <Text as="span" display={{ base: 'none', lg: 'inline' }}>
              {o.label}
            </Text>
            <Text as="span" display={{ base: 'inline', lg: 'none' }}>
              {o.short}
            </Text>
          </Box>
        );
      })}
    </Flex>
  );
}

export function Shell() {
  const tab = useActiveTab();
  const nav = useNav();
  const st = useStore();
  const [sp] = useSearchParams();
  const { colorMode, toggleColorMode } = useColorMode();
  const [demoOpen, setDemoOpen] = useState(false);
  const data = useDashboardData(tab);
  // A tab is listed when the user holds one of its sections and, in "1.0 only"
  // mode, it carries a 1.0 metric (every tab does today).
  const visibleTabs = TABS.filter((t) => t.anyOf.some((s) => st.can(s)) && tabHasItems(st.metricMode, t.key));
  const t = trust(data.tabs.overview);

  // One message when any figure fails to load (the rest of the page keeps working).
  const failed = Object.values(data.tabs).flatMap((t) => Object.values(t)).some((r) => r.isError);
  useEffect(() => {
    if (failed) notify({ title: 'Some figures could not load', detail: 'The cards that need them say so; everything else is up to date.', tone: 'bad', key: 'load-error' });
  }, [failed]);

  // Scroll to the focused KPI after a tile click (PRD 5.4).
  const focus = sp.get('focus');
  useEffect(() => {
    if (!focus) return;
    const id = setTimeout(() => scrollToKpi(focus), 120);
    return () => clearTimeout(id);
  }, [focus, tab]);

  // Usage tracking splits time by the tab on screen (FEAT-USG).
  const shownTab = visibleTabs.some((x) => x.key === tab) ? tab : visibleTabs[0]?.key;
  useEffect(() => {
    if (shownTab) setUsageTab(TABS.find((x) => x.key === shownTab)!.label);
  }, [shownTab]);

  if (!visibleTabs.length && !DEMO_DATA)
    // Holds a permission on the dashboard, but none of the four sections.
    return <NoAccess title="No Supply Chain Pulse sections" body="Your role opens this dashboard but none of its sections (Summary, Service Measure, Dispatch & WIP, RD Data Status). Ask your administrator to add one." />;

  if (!visibleTabs.length)
    return (
      <Flex minH="100vh" align="center" justify="center" bg={colors.pageBg} direction="column" gap={3}>
        <Text color={colors.darkText} fontWeight={600}>
          No Supply Chain Pulse access
        </Text>
        <Box as="button" color={colors.brand} fontSize="13px" onClick={() => setDemoOpen(true)}>
          Open demo controls to grant sections
        </Box>
        {demoOpen && <DemoPanel tab={tab} onClose={() => setDemoOpen(false)} />}
      </Flex>
    );

  const activeTab = visibleTabs.some((x) => x.key === tab) ? tab : visibleTabs[0].key;

  return (
    <Box minH="100vh" bg={colors.pageBg}>
      <ScrollRestoration />
      <Box position="sticky" top={0} zIndex={30}>
        <Flex bg={colors.navbarBg} borderBottom="1px solid" borderColor={colors.border} px={{ base: 4, md: 6 }} h="52px" align="center" gap={4}>
          <Flex align="baseline" gap="8px" flexShrink={0}>
            <Text fontWeight={800} color={colors.brand} fontSize="16px">
              Supply Chain Pulse
            </Text>
            <Text fontSize="12px" color={colors.mutedText} fontWeight={600}>
              2.0
            </Text>
          </Flex>
          <Flex as="nav" gap="2px" overflowX="auto" role="tablist" aria-label="Dashboard tabs" flex={1} minW={0}>
            {visibleTabs.map((x) => {
              const on = x.key === activeTab;
              return (
                <Box
                  key={x.key}
                  as="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => nav(x.key)}
                  px="12px"
                  h="52px"
                  fontSize="13.5px"
                  fontWeight={on ? 700 : 500}
                  color={on ? colors.brand : colors.bodyText}
                  borderBottom="3px solid"
                  borderColor={on ? colors.brand : 'transparent'}
                  whiteSpace="nowrap"
                  _hover={{ bg: colors.navbarHover }}
                >
                  <Text as="span" display={{ base: 'none', '2xl': 'inline' }}>
                    {x.label}
                  </Text>
                  <Text as="span" display={{ base: 'none', lg: 'inline', '2xl': 'none' }}>
                    {x.mid}
                  </Text>
                  <Text as="span" display={{ base: 'inline', lg: 'none' }}>
                    {x.short}
                  </Text>
                </Box>
              );
            })}
          </Flex>
          <Box display={{ base: 'none', xl: 'block' }}>
            <DataAsOf closing={t.closing} freshness={t.freshness} />
          </Box>
          <MetricModeSwitch />
          <Box as="button" onClick={toggleColorMode} aria-label="Switch light or dark mode" color={colors.mutedText} p="6px" borderRadius="4px" _hover={{ bg: colors.navbarHover }}>
            {colorMode === 'light' ? <FiMoon /> : <FiSun />}
          </Box>
          {DEMO_DATA && (
            <Flex as="button" align="center" gap="6px" onClick={() => setDemoOpen(true)} px="8px" py="3px" borderRadius="999px" bg={colors.warnSoft} color={colors.warn} fontSize="11px" fontWeight={700} title="Generated numbers for demos and tests. No request reaches the live database.">
              <FiSettings /> DEMO DATA
            </Flex>
          )}
          <UserMenu />
        </Flex>
        <FilterBar data={data} tab={activeTab} />
      </Box>

      <Box as="main" px={{ base: 4, md: 6 }} py={4} maxW="1680px" mx="auto">
        <Box display={{ base: 'block', xl: 'none' }} mb={3}>
          <DataAsOf closing={t.closing} freshness={t.freshness} />
        </Box>
        <ErrorBoundary>
        {activeTab === 'overview' && <OverviewPage data={data} />}
        {activeTab === 'revenue' && <RevenuePage data={data} />}
        {activeTab === 'inventory' && <InventoryPage data={data} />}
        {activeTab === 'fulfilment' && <FulfilmentPage data={data} />}
        {activeTab === 'distribution' && <DistributionPage data={data} />}
        </ErrorBoundary>
      </Box>
      <DetailLayer data={data} />
      <NotifyHost />
      {demoOpen && <DemoPanel tab={activeTab} onClose={() => setDemoOpen(false)} />}
    </Box>
  );
}
