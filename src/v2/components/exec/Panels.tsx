import { Box, Flex, Grid, Text, type GridProps } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { FiAlertCircle, FiChevronDown, FiChevronRight, FiClock, FiLock, FiX } from 'react-icons/fi';
import { colors } from '@/v2/constants/theme';
import { useStore, type Chip } from '@/v2/features/store';
import { SECTION_LABEL, type Section, type TabKey } from '@/v2/features/tabs';
import { EmptyChart } from '@/v2/components/charts/EmptyChart';
import { ExportNameContext } from '@/v2/components/data-table/DataTable';

/** A zone of the inverted pyramid (PRD 5.1). */
export function Zone({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box as="section" aria-label={label} mb={4}>
      <Text fontSize="11px" letterSpacing=".06em" textTransform="uppercase" color={colors.mutedText} fontWeight={600} mb="6px">
        {label}
      </Text>
      {children}
    </Box>
  );
}

/** KPI banner: up to 6 tiles; wraps to 3 per row on tablet and 1 on phone (PRD 5.5). */
export function TileRow({ children, max = 6 }: { children: ReactNode; max?: number }) {
  return (
    <Grid className="sp-stagger" gap={3} templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0,1fr))', md: 'repeat(3, minmax(0,1fr))', xl: `repeat(${max}, minmax(0,1fr))` }}>
      {children}
    </Grid>
  );
}

/** 12-column grid for ChartCards (colSpan per card). */
export function CardGrid({ children, ...rest }: { children: ReactNode } & GridProps) {
  return (
    <Grid templateColumns={{ base: '1fr', lg: 'repeat(12, minmax(0,1fr))' }} gap={3} {...rest}>
      {children}
    </Grid>
  );
}

/** The body of a card when its data can't be shown. Returns null when it can. */
export function CardState({ locked, error, empty, emptyText }: { locked?: Section | null; error?: boolean | 'pending'; empty?: boolean; emptyText?: string }) {
  if (locked)
    return (
      <Flex h="100%" minH="160px" align="center" justify="center" gap="8px" color={colors.mutedText} fontSize="13px">
        <FiLock /> Needs {SECTION_LABEL[locked]} access
      </Flex>
    );
  if (error === 'pending')
    return (
      <Flex h="100%" minH="160px" align="center" justify="center" gap="8px" color={colors.mutedText} fontSize="13px" textAlign="center" px={4} data-state="pending">
        <FiClock /> {PENDING_TEXT}
      </Flex>
    );
  if (error)
    return (
      <Flex h="100%" minH="160px" align="center" justify="center" gap="8px" color={colors.bad} fontSize="13px" textAlign="center" px={4}>
        <FiAlertCircle /> Couldn’t load this chart. Other figures are unaffected.
      </Flex>
    );
  if (empty) return <EmptyChart height={180} title="No data for this selection" subtitle={emptyText ?? 'Try another period or fewer filters'} />;
  return null;
}

export function ViewDetails({ detailId }: { detailId: string }) {
  const { setZone4 } = useStore();
  return (
    <Box
      as="button"
      fontSize="12px"
      color={colors.brand}
      fontWeight={600}
      cursor="pointer"
      _hover={{ textDecoration: 'underline' }}
      onClick={() => openDetail(detailId, setZone4)}
    >
      View details
    </Box>
  );
}

/** Expand an Operational Detail section and scroll to it. */
export function openDetail(id: string, setZone4: (id: string, open: boolean) => void) {
  setZone4(id, true);
  setTimeout(() => document.querySelector(`[data-detail="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

/** Zone 4: a collapsible block holding a 1.0 table (PRD 3.1). */
export function OperationalDetail({ id, kpi, title, subtitle, children }: { id: string; kpi: string; title: string; subtitle?: string; children: ReactNode }) {
  const { isZone4Open, setZone4 } = useStore();
  const open = isZone4Open(id);
  return (
    <Box data-detail={id} data-kpi={kpi} scrollMarginTop="140px" bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderRadius="4px" mb={3}>
      <Flex
        as="button"
        w="100%"
        align="center"
        gap="8px"
        px={4}
        py="10px"
        textAlign="left"
        cursor="pointer"
        aria-expanded={open}
        onClick={() => setZone4(id, !open)}
        _hover={{ bg: colors.hoverBg }}
      >
        {open ? <FiChevronDown /> : <FiChevronRight />}
        <Text fontWeight={600} fontSize="14px" color={colors.darkText}>
          {title}
        </Text>
        {subtitle && (
          <Text fontSize="12px" color={colors.mutedText}>
            {subtitle}
          </Text>
        )}
        <Text ml="auto" fontSize="11px" color={colors.mutedText}>
          {kpi}
        </Text>
      </Flex>
      {open && (
        <Box px={2} pb={3} className="sp-fade">
          <ExportNameContext.Provider value={title}>{children}</ExportNameContext.Provider>
        </Box>
      )}
    </Box>
  );
}

const CHIP_LABEL: Record<Chip['key'], string> = { cls: 'Class', branch: 'Branch', channel: 'Channel', material: 'Material' };

/** Local filter chip for the current tab (rule F4). */
export function ChipBar({ tab }: { tab: TabKey }) {
  const { chips, setChip } = useStore();
  const chip = chips[tab];
  if (!chip) return null;
  return (
    <Flex align="center" gap="8px" mb={3} fontSize="12.5px">
      <Text color={colors.mutedText}>Showing only</Text>
      <Flex as="button" align="center" gap="6px" px="10px" py="3px" borderRadius="999px" bg={colors.brandSoft} color={colors.brand} fontWeight={600} onClick={() => setChip(tab, null)} aria-label="Clear this filter">
        {CHIP_LABEL[chip.key]}: {chip.value} <FiX />
      </Flex>
    </Flex>
  );
}

/** Small "filters not applied" marker (rule F5). */
export const DATES_ONLY = 'Filters not applied: dates only';

/** Shown where scorecard-be answers SOURCE_PENDING (the table isn't in BigQuery yet). */
export const PENDING_TEXT = 'Data not available yet: the source table is still being moved to BigQuery.';
