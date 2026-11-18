// The 2.0 app shell, laid out as Sales Pulse 2.0 (FR-EXEC-042, FR-EXEC-043): the
// menu (AppHeader), the control panel (FilterBar: search, metric switch, period
// button), the active tab, and (demo mode) the demo controls.

import { Box, Flex, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { ScrollRestoration, useSearchParams } from 'react-router-dom';
import { colors } from '@/v2/constants/theme';
import { DEMO_DATA } from '@/v2/config/api';
import { useDashboardData } from '@/v2/features/data';
import { useActiveTab, useNav, scrollToKpi } from '@/v2/features/nav';
import { useStore } from '@/v2/features/store';
import { SCROLL_TABS, TABS } from '@/v2/features/tabs';
import { tabHasItems } from '@/v2/features/catalog';
import { trust } from '@/v2/features/derive';
import { useFitScreen } from '@/v2/features/fit';
import { FilterBar } from './FilterBar';
import { DemoPanel } from './DemoPanel';
import { AppHeader, DataAsOf } from './AppHeader';
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

export function Shell() {
  const tab = useActiveTab();
  const nav = useNav();
  const st = useStore();
  const [sp] = useSearchParams();
  const [demoOpen, setDemoOpen] = useState(false);
  const data = useDashboardData(tab);
  const fitWindow = useFitScreen();
  // The header height, for the fixed-screen tab and the Details sheets below it (FR-EXEC-025).
  const headerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--sp-top', `${el.getBoundingClientRect().height}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  });
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
  // Service Measure shows all its 1.0 matrices on one page, as 1.0 does, so it scrolls (FR-EXEC-052).
  const fit = fitWindow && !SCROLL_TABS.includes(activeTab);

  return (
    <Box minH="100vh" bg={colors.pageBg}>
      <ScrollRestoration />
      <Box position="sticky" top={0} zIndex={30} ref={headerRef}>
        <AppHeader tabs={visibleTabs} active={activeTab} onPick={nav} closing={t.closing} freshness={t.freshness} onDemo={() => setDemoOpen(true)} />
        <FilterBar data={data} tab={activeTab} />
      </Box>

      <Box
        as="main"
        px={{ base: 4, md: 6 }}
        py={fit ? 3 : 4}
        maxW="1920px"
        mx="auto"
        // Desktop: the tab fills the window below the header and the page does not scroll (NFR-EXEC-004).
        h={fit ? 'calc(100vh - var(--sp-top, 110px))' : undefined}
        overflow={fit ? 'hidden' : undefined}
        data-fit={fit || undefined}
      >
        <Box display={{ base: 'block', '2xl': 'none' }} mb={3}>
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
