// Topic-panel layout of every 2.0 tab (FR-EXEC-025, the "Idea 5" prototype).
// A tab is three or four topic panels. Each panel shows its KPI tiles, a count
// of their statuses and, where the topic has one, a lead chart that fills the
// space left. Every other chart and table of the topic opens in the panel's
// Details sheet. On a desktop window the tab fits the screen without page
// scrolling (NFR-EXEC-004); smaller windows stack the panels and scroll.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { Children, isValidElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiChevronRight, FiX } from 'react-icons/fi';
import { PanelLeadContext } from '@/v2/components/chart-card/ChartCard';
import { colors } from '@/v2/constants/theme';
import { anyShown, contentsOf } from '@/v2/features/catalog';
import { useFitScreen } from '@/v2/features/fit';
import type { Rag } from '@/v2/features/kpiThresholds';
import { scrollToKpi } from '@/v2/features/nav';
import { useStore } from '@/v2/features/store';
import { onRevealDetail, TileRow } from './Panels';
import { RAG_META } from './Rag';

export interface Topic {
  key: string;
  title: string;
  /** KPI tiles (ExecTile elements, with keys) shown on the panel. */
  tiles?: ReactNode[];
  /** Other content shown on the panel under the tiles (e.g. the Data trust card). */
  body?: ReactNode;
  /** One chart shown on the panel; it fills the height the tiles leave. */
  lead?: ReactNode;
  /** The topic's other charts and tables, laid out by the page; shown in its Details sheet. */
  details?: ReactNode;
  /** Instead of a Details sheet, the panel button runs this (Overview: open the domain tab). */
  open?: { label: string; run: () => void };
}

type Counts = Record<Rag, number>;

/** Status counts of the tiles that have loaded (no new rule: the tiles' own RAG). */
function ragCounts(tiles: ReactNode[]): Counts {
  const n: Counts = { red: 0, amber: 0, green: 0 };
  for (const c of tiles) {
    if (!isValidElement(c)) continue;
    const p = c.props as { rag?: Rag | null; isLoading?: boolean; locked?: unknown; error?: unknown };
    if (p.isLoading || p.locked || p.error || !p.rag) continue;
    n[p.rag] += 1;
  }
  return n;
}

function Verdict({ counts }: { counts: Counts }) {
  const parts = (['red', 'amber', 'green'] as const).filter((k) => counts[k] > 0);
  if (!parts.length) return null;
  return (
    <Flex as="span" align="center" gap="6px" fontSize="12px" fontWeight={700} data-verdict>
      {parts.map((k) => {
        const m = RAG_META[k];
        return (
          <Flex as="span" key={k} align="center" gap="4px" color={m.color} bg={m.soft} px="7px" py="1px" borderRadius="999px">
            <m.Icon size={12} aria-hidden />
            {counts[k]} {m.word.toLowerCase()}
          </Flex>
        );
      })}
    </Flex>
  );
}

const panelButton = {
  as: 'button' as const,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  px: '10px',
  py: '4px',
  borderRadius: '999px',
  fontSize: '12.5px',
  fontWeight: 600,
  color: colors.brand,
  bg: colors.brandSoft,
  flexShrink: 0,
  whiteSpace: 'nowrap' as const,
  _hover: { textDecoration: 'underline' },
  _focusVisible: { outline: `2px solid ${colors.brand}`, outlineOffset: '2px' },
};

interface Prepared {
  topic: Topic;
  tiles: ReactNode[];
  counts: Counts;
  more: { ids: string[]; sections: string[] };
}

function TopicPanel({ p, fit, span, isOpen, onDetails }: { p: Prepared; fit: boolean; span: boolean; isOpen: boolean; onDetails: (el: HTMLElement) => void }) {
  const { topic, tiles, counts, more } = p;
  const hasDetails = !!topic.details && (more.ids.length > 0 || more.sections.length > 0);
  return (
    <Flex
      as="section"
      aria-label={topic.title}
      data-topic={topic.key}
      direction="column"
      gap={2}
      bg={colors.sunkBg}
      border="1px solid"
      borderColor={colors.border}
      borderRadius="6px"
      p={3}
      minH={0}
      minW={0}
      // On a short desktop window a panel scrolls inside rather than squeezing its chart flat.
      overflowY={fit ? 'auto' : undefined}
      gridColumn={span ? '1 / -1' : undefined}
    >
      <Flex align="center" gap="12px" minH="28px" flexShrink={0} wrap="wrap">
        {/* No Details button (user request, 17 Nov 2026): the panel title opens the topic's sheet (FR-EXEC-049). */}
        {hasDetails && !topic.open ? (
          <Box
            as="button"
            display="inline-flex"
            alignItems="center"
            gap="4px"
            fontSize="15px"
            fontWeight={700}
            color={colors.darkText}
            aria-label={`${topic.title}: details`}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            data-kpi-more={more.ids.join(' ')}
            title={`More on ${topic.title}`}
            onClick={(e: React.MouseEvent<HTMLElement>) => onDetails(e.currentTarget)}
            _hover={{ color: colors.brand, textDecoration: 'underline' }}
            _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: '2px', borderRadius: '2px' }}
          >
            <Text as="h2" fontSize="15px" fontWeight={700}>
              {topic.title}
            </Text>
            <FiChevronRight size={15} aria-hidden />
          </Box>
        ) : (
          <Text as="h2" fontSize="15px" fontWeight={700} color={colors.darkText}>
            {topic.title}
          </Text>
        )}
        <Verdict counts={counts} />
        <Box ml="auto" />
        {topic.open && (
          <Box {...panelButton} onClick={topic.open.run}>
            {topic.open.label} <FiArrowRight aria-hidden />
          </Box>
        )}
      </Flex>
      {tiles.length > 0 && (
        <Box flexShrink={0}>
          <TileRow max={tiles.length}>{tiles}</TileRow>
        </Box>
      )}
      {topic.body && <Box flexShrink={0}>{topic.body}</Box>}
      {topic.lead && (
        <Grid flex={1} minH={fit ? '190px' : '280px'} templateColumns="minmax(0,1fr)" templateRows="minmax(0,1fr)">
          <PanelLeadContext.Provider value={true}>{topic.lead}</PanelLeadContext.Provider>
        </Grid>
      )}
    </Flex>
  );
}

function DetailsSheet({ p, onClose }: { p: Prepared; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    // The detail SheetStack, when open on top, takes Esc first (it stops the event).
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <Box position="fixed" top="var(--sp-top, 0px)" left={0} right={0} bottom={0} bg="rgba(15, 23, 42, 0.35)" zIndex={1300} onClick={onClose} aria-hidden />
      <Flex
        role="dialog"
        aria-label={`${p.topic.title} details`}
        data-topic-sheet={p.topic.key}
        position="fixed"
        top="var(--sp-top, 0px)"
        right={0}
        bottom={0}
        w={{ base: '100vw', lg: 'min(1480px, 78vw)' }}
        bg={colors.pageBg}
        borderLeft="1px solid"
        borderColor={colors.border}
        boxShadow="-10px 0 28px rgba(0, 0, 0, 0.18)"
        zIndex={1301}
        direction="column"
        className="sp-fade"
      >
        <Flex align="center" gap="12px" px={5} py={3} bg={colors.cardBg} borderBottom="1px solid" borderColor={colors.border} flexShrink={0}>
          <Text as="h2" fontSize="16px" fontWeight={700} color={colors.darkText}>
            {p.topic.title}
          </Text>
          <Text fontSize="12.5px" color={colors.mutedText}>
            details
          </Text>
          <Verdict counts={p.counts} />
          <Box
            as="button"
            ref={closeRef}
            ml="auto"
            display="flex"
            alignItems="center"
            gap="6px"
            px="10px"
            py="4px"
            borderRadius="4px"
            fontSize="13px"
            color={colors.bodyText}
            _hover={{ bg: colors.hoverBg }}
            _focusVisible={{ outline: `2px solid ${colors.brand}` }}
            onClick={onClose}
            aria-label="Close details"
          >
            <FiX aria-hidden /> Close
          </Box>
        </Flex>
        <Box flex={1} minH={0} overflowY="auto" px={5} py={4}>
          {p.topic.details}
        </Box>
      </Flex>
    </>
  );
}

/**
 * `asideTopic` is one more topic panel, shown in the side column under
 * `aside` (Summary: Plan alignment under Risks & Opportunities, FR-EXEC-036).
 */
export function AreaLayout({ topics, top, aside, asideKpi, asideTopic }: { topics: Topic[]; top?: ReactNode; aside?: ReactNode; asideKpi?: string; asideTopic?: Topic }) {
  const fit = useFitScreen();
  const { metricMode, shows } = useStore();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [sp] = useSearchParams();
  const focus = sp.get('focus');

  const prepare = (topic: Topic): Prepared => {
    const tiles = Children.toArray(topic.tiles).filter((c) => isValidElement(c) && shows((c.props as { id?: string }).id));
    return { topic, tiles, counts: ragCounts(tiles), more: contentsOf(topic.details, shows) };
  };
  const prepared: Prepared[] = topics.map(prepare);
  const asidePrepared = asideTopic ? prepare(asideTopic) : null;
  // "1.0 only" (FR-EXEC-024) drops a panel with nothing of 1.0 on it or behind it.
  const isShownPanel = (p: Prepared) => metricMode === 'all' || p.tiles.length > 0 || anyShown(p.topic.lead, shows) || anyShown(p.topic.body, shows) || p.more.ids.length > 0;
  const shown = prepared.filter(isShownPanel);
  const asideShown = asidePrepared && isShownPanel(asidePrepared) ? asidePrepared : null;
  const showAside = !!aside && (!asideKpi || shows(asideKpi));
  const showColumn = showAside || !!asideShown;

  const ref = useRef(prepared);
  ref.current = asidePrepared ? [...prepared, asidePrepared] : prepared;

  // "View details" or a chart click asks for an Operational Detail: open the sheet holding it.
  useEffect(() => onRevealDetail((id) => {
    const p = ref.current.find((x) => x.more.sections.includes(id));
    if (p) setOpenKey(p.topic.key);
  }), []);

  // A focused KPI (?focus=…) that is only in a closed sheet opens that sheet.
  useEffect(() => {
    if (!focus || document.querySelector(`[data-kpi~="${focus}"]`)) return;
    const p = ref.current.find((x) => x.more.ids.includes(focus));
    if (!p) return;
    setOpenKey(p.topic.key);
    const id = setTimeout(() => scrollToKpi(focus), 200);
    return () => clearTimeout(id);
  }, [focus]);

  const close = useCallback(() => {
    setOpenKey(null);
    opener.current?.focus();
  }, []);

  const n = shown.length;
  const cols = n > 1 ? 2 : 1;
  // A row with a lead chart shares the height left; a row of tiles only takes what it needs.
  const rowSizes = Array.from({ length: Math.ceil(n / cols) }, (_, r) => (shown.slice(r * cols, r * cols + cols).some((p) => p.topic.lead && anyShown(p.topic.lead, shows)) ? 'minmax(0,1fr)' : 'auto')).join(' ');
  const open = [...shown, ...(asideShown ? [asideShown] : [])].find((p) => p.topic.key === openKey);

  return (
    <Flex direction="column" h={fit ? '100%' : undefined} minH={0} gap={3}>
      {top}
      <Grid flex={1} minH={0} gap={3} templateColumns={{ base: 'minmax(0,1fr)', xl: showColumn ? 'minmax(0,1fr) minmax(300px, 24%)' : 'minmax(0,1fr)' }}>
        <Grid minH={0} gap={3} templateColumns={{ base: 'minmax(0,1fr)', lg: `repeat(${cols}, minmax(0,1fr))` }} templateRows={fit ? rowSizes : undefined}>
          {shown.map((p, i) => (
            <TopicPanel
              key={p.topic.key}
              p={p}
              fit={fit}
              span={cols === 2 && n % 2 === 1 && i === n - 1}
              isOpen={openKey === p.topic.key}
              onDetails={(el) => {
                opener.current = el;
                setOpenKey(p.topic.key);
              }}
            />
          ))}
        </Grid>
        {showColumn && (
          // Side column: the aside (risks) on top, the aside topic under it, each half the height.
          <Grid minH={0} gap={3} templateColumns="minmax(0,1fr)" templateRows={fit && showAside && asideShown ? 'minmax(0,1fr) minmax(0,1fr)' : undefined}>
            {showAside && (
              <Box minH={0} overflowY={fit ? 'auto' : undefined}>
                {aside}
              </Box>
            )}
            {asideShown && (
              <TopicPanel
                p={asideShown}
                fit={fit}
                span={false}
                isOpen={openKey === asideShown.topic.key}
                onDetails={(el) => {
                  opener.current = el;
                  setOpenKey(asideShown.topic.key);
                }}
              />
            )}
          </Grid>
        )}
      </Grid>
      {open && <DetailsSheet p={open} onClose={close} />}
    </Flex>
  );
}
