// The app shell, laid out as Sales Pulse 2.0: the menu (AppHeader), the control
// panel (FilterBar: search and period button) and the active tab.

import { Box } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';
import { ScrollRestoration } from 'react-router-dom';
import { colors } from '@/constants/theme';
import { useDashboardData } from '@/features/data';
import { useActiveTab, useFocus, useNav, scrollToKpi } from '@/features/nav';
import { useStore } from '@/features/store';
import { SCROLL_TABS, TABS } from '@/features/tabs';
import { trust } from '@/features/derive';
import { useFitScreen } from '@/features/fit';
import { FilterBar } from './FilterBar';
import { AppHeader, DataAsOf } from './AppHeader';
import { NoAccess } from '@/auth/AuthGate';
import { setUsageTab } from '@/features/usage';
import { DetailLayer } from '@/components/detail/DetailSheets';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { notify, NotifyHost } from '@/components/notify';
import { PulsePage } from '@/pages/PulsePage';
import { SummaryPage } from '@/pages/SummaryPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { FulfilmentPage } from '@/pages/FulfilmentPage';
import { DistributionPage } from '@/pages/DistributionPage';

export function Shell() {
  const tab = useActiveTab();
  const nav = useNav();
  const st = useStore();
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
  // A tab is listed when the user holds one of its sections.
  const visibleTabs = TABS.filter((t) => t.anyOf.some((s) => st.can(s)));
  const t = trust(data.tabs.overview);

  // One message when any figure fails to load (the rest of the page keeps working).
  const failed = Object.values(data.tabs).flatMap((t) => Object.values(t)).some((r) => r.isError);
  useEffect(() => {
    if (failed) notify({ title: 'Some figures could not load', detail: 'The cards that need them say so; everything else is up to date.', tone: 'bad', key: 'load-error' });
  }, [failed]);

  // Scroll to the focused KPI after a tile click (PRD 5.4).
  const focus = useFocus();
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

  if (!visibleTabs.length)
    // Holds a permission on the dashboard, but none of the four sections.
    return <NoAccess title="No Supply Chain Pulse sections" body="Your role opens this dashboard but none of its sections (Summary, Service Measure, Dispatch & WIP, RD Data Status). Ask your administrator to add one." />;

  const activeTab = visibleTabs.some((x) => x.key === tab) ? tab : visibleTabs[0].key;
  // Service Measure shows all its 1.0 matrices on one page, as 1.0 does, so it scrolls (FR-EXEC-052).
  const fit = fitWindow && !SCROLL_TABS.includes(activeTab);

  return (
    <Box minH="100vh" bg={colors.pageBg}>
      <ScrollRestoration />
      <Box position="sticky" top={0} zIndex={30} ref={headerRef}>
        <AppHeader tabs={visibleTabs} active={activeTab} onPick={nav} closing={t.closing} freshness={t.freshness} />
        <FilterBar data={data} tab={activeTab} />
      </Box>

      <Box
        as="main"
        px={4}
        py={fit ? 3 : 4}
        // Desktop: the tab fills the window below the header and the page does not scroll (NFR-EXEC-004).
        h={fit ? 'calc(100vh - var(--sp-top, 110px))' : undefined}
        overflow={fit ? 'hidden' : undefined}
        data-fit={fit || undefined}
      >
        <Box display={{ base: 'block', '2xl': 'none' }} mb={3}>
          <DataAsOf closing={t.closing} freshness={t.freshness} />
        </Box>
        <ErrorBoundary>
        {activeTab === 'overview' && <PulsePage data={data} />}
        {activeTab === 'revenue' && <SummaryPage data={data} />}
        {activeTab === 'inventory' && <InventoryPage data={data} />}
        {activeTab === 'fulfilment' && <FulfilmentPage data={data} />}
        {activeTab === 'distribution' && <DistributionPage data={data} />}
        </ErrorBoundary>
      </Box>
      <DetailLayer data={data} />
      <NotifyHost />
    </Box>
  );
}
