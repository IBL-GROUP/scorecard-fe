// The menu, as in Sales Pulse 2.0 (FR-EXEC-042): ONE Thunder logo, product name
// and version badge, one underlined tab per view (the ones that do not fit go
// behind "More"), then the stock date, "How we calculate", the theme switch and
// the user menu. Tabs keep their tab roles for keyboard and screen readers.

import { Box, Flex, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { FiActivity, FiBookOpen, FiDatabase, FiGrid, FiMoon, FiPackage, FiSun, FiTruck } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { Logo } from '@/components/brand';
import { MeasureRow, MoreMenu, splitShown, useOverflow } from '@/ui/overflow';
import { MethodsOverlay } from '@/components/methods/MethodsOverlay';
import { RagDot } from '@/components/rag/Rag';
import { colors } from '@/constants/theme';
import { rag } from '@/features/kpiThresholds';
import { TABS, type TabKey } from '@/features/tabs';
import { useColorMode } from '@/theme/color-mode';
import { UserMenu } from './UserMenu';

type Tab = (typeof TABS)[number];

/** EX-11: stock snapshot date and when the screen loaded, as Sales Pulse's "Data to …". */
export function DataAsOf({ closing, freshness }: { closing: string | null; freshness: number | null }) {
  const [loadedAt] = useState(() => new Date());
  return (
    <Flex align="center" gap="6px" fontSize="13px" color={colors.bodyText} data-kpi="EX-11" title="Stock snapshot date and when this screen loaded" whiteSpace="nowrap">
      <RagDot rag={rag(freshness, 'freshnessDays')} />
      <Text as="span">
        Stock as of <b>{closing ? new Date(`${closing.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</b> · refreshed{' '}
        {loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Flex>
  );
}

function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();
  const dark = colorMode === 'dark';
  return (
    <Box
      as="button"
      onClick={toggleColorMode}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      display="inline-flex"
      alignItems="center"
      gap="6px"
      h="30px"
      px="10px"
      borderRadius="999px"
      border="1px solid"
      borderColor={colors.border}
      bg={colors.cardBg}
      color={colors.bodyText}
      fontSize="13px"
      fontWeight={500}
      cursor="pointer"
      flexShrink={0}
      _hover={{ bg: colors.hoverBg, color: colors.darkText }}
    >
      {dark ? <FiSun size={14} /> : <FiMoon size={14} />}
      <Text as="span" display={{ base: 'none', lg: 'inline' }}>
        {dark ? 'Light' : 'Dark'}
      </Text>
    </Box>
  );
}

const TAB_ICONS: Record<TabKey, IconType> = {
  overview: FiActivity,
  revenue: FiGrid,
  inventory: FiPackage,
  fulfilment: FiTruck,
  distribution: FiDatabase,
};

/** A view tab inside the grey track: icon and name; the open one a white raised chip in Cobalt. */
const tabPill = (active: boolean) =>
  ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    h: '30px',
    px: '11px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: active ? 600 : 500,
    color: active ? colors.brand : colors.bodyText,
    bg: active ? colors.cardBg : 'transparent',
    boxShadow: active ? `0 1px 3px ${colors.shadow}` : 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    cursor: 'pointer',
    _hover: active ? undefined : { color: colors.darkText },
    _focusVisible: { outline: `2px solid ${colors.brand}`, outlineOffset: '1px' },
  }) as const;

/** One icon pill per view; those that do not fit go behind "More" (Sales Pulse MainTabs). */
function MainTabs({ tabs, active, onPick }: { tabs: Tab[]; active: TabKey; onPick: (k: TabKey) => void }) {
  const GAP = 2;
  const { rowRef, measureRef, fit, full } = useOverflow(tabs.length, GAP, 38);
  const activeIndex = tabs.findIndex((t) => t.key === active);
  const { shown, hidden } = splitShown(tabs.length, fit, activeIndex);

  const tabButton = (tab: Tab, measuring = false) => {
    const on = tab.key === active;
    const Icon = TAB_ICONS[tab.key];
    return (
      <Box
        as="button"
        key={tab.key}
        role={measuring ? undefined : 'tab'}
        aria-selected={measuring ? undefined : on}
        aria-hidden={measuring || undefined}
        tabIndex={measuring ? -1 : undefined}
        title={tab.label}
        aria-label={tab.label}
        onClick={() => onPick(tab.key)}
        {...tabPill(on)}
      >
        <Box as="span" display="inline-flex" opacity={on ? 1 : 0.75}>
          <Icon size={15} />
        </Box>
        {tab.mid}
      </Box>
    );
  };

  return (
    <Box
      ref={rowRef}
      as="nav"
      aria-label="Dashboard views"
      position="relative"
      // The hidden measuring copy must not widen the page on small screens.
      overflow="hidden"
      display="flex"
      alignItems="center"
      alignSelf="center"
      bg={colors.sunkBg}
      p="3px"
      borderRadius="9px"
      gap={`${GAP}px`}
      minW={0}
      flexShrink={1}
      style={{ width: full != null ? `${full + 6}px` : undefined }}
    >
      <MeasureRow measureRef={measureRef} gap={GAP}>
        {tabs.map((t) => tabButton(t, true))}
      </MeasureRow>
      <Flex role="tablist" aria-label="Dashboard tabs" alignItems="center" gap={`${GAP}px`} minW={0}>
        {shown.map((i) => tabButton(tabs[i]))}
      </Flex>
      {hidden.length > 0 && (
        <Flex align="center" pl="2px">
          <MoreMenu h="30px" label="More views" bg="transparent" items={hidden.map((i) => ({ key: tabs[i].key, label: tabs[i].mid, title: tabs[i].label }))} onPick={(key) => onPick(key as TabKey)} />
        </Flex>
      )}
    </Box>
  );
}

export function AppHeader({
  tabs,
  active,
  onPick,
  closing,
  freshness,
}: {
  tabs: Tab[];
  active: TabKey;
  onPick: (k: TabKey) => void;
  closing: string | null;
  freshness: number | null;
}) {
  const [methodsOpen, setMethodsOpen] = useState(false);
  return (
    <Flex
      as="header"
      align="stretch"
      h="50px"
      bg={colors.navbarBg}
      color={colors.midnight}
      gap={1}
      borderTop={`3px solid ${colors.brand}`}
      borderBottom="1px solid"
      borderColor={colors.border}
    >
      <Flex align="center" gap="10px" px={{ base: 3, md: 4 }} flexShrink={0}>
        <Logo height={24} />
        <Box w="1px" h="22px" bg={colors.border} mx="2px" />
        <Text fontSize="14px" fontWeight={600} whiteSpace="nowrap" color={colors.midnight} display={{ base: 'none', md: 'block' }}>
          Supply Chain Pulse
        </Text>
        <Text fontSize="11px" fontWeight={700} color={colors.brand} border="1px solid" borderColor={colors.brand} px="4px" borderRadius="3px" lineHeight="14px">
          2.0
        </Text>
      </Flex>
      <Box w="1px" bg={colors.border} my="12px" mx={2} flexShrink={0} />
      <MainTabs tabs={tabs} active={active} onPick={onPick} />
      <Flex align="center" ml="auto" px={{ base: 3, md: 4 }} gap={{ base: 2, md: 3 }} flexShrink={0}>
        <Box display={{ base: 'none', '2xl': 'block' }}>
          <DataAsOf closing={closing} freshness={freshness} />
        </Box>
        <Box
          as="button"
          onClick={() => setMethodsOpen(true)}
          display="inline-flex"
          alignItems="center"
          gap="6px"
          h="30px"
          px="10px"
          borderRadius="4px"
          border="1px solid"
          borderColor={colors.border}
          bg={colors.cardBg}
          color={colors.bodyText}
          fontSize="13px"
          cursor="pointer"
          flexShrink={0}
          _hover={{ borderColor: colors.brand, color: colors.brand }}
          title="Every rule behind the numbers on this dashboard"
          aria-label="How we calculate"
        >
          <FiBookOpen size={13} />
          <Text as="span" display={{ base: 'none', lg: 'inline' }}>
            How We Calculate
          </Text>
        </Box>
        {methodsOpen && <MethodsOverlay tabs={tabs.map((t) => t.key)} onClose={() => setMethodsOpen(false)} />}
        <ThemeToggle />
        <UserMenu />
      </Flex>
    </Flex>
  );
}
