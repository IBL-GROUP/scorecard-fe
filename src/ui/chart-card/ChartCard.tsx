import { Box, Flex, GridItem, Skeleton, Text, type GridItemProps } from '@chakra-ui/react';
import { useCallback, useState, type ReactNode } from 'react';
import { FiMaximize2 } from 'react-icons/fi';
import { ExpandedContext, InfoTip, Overlay } from '@/ui/overlay';
import type { HelpText } from '@/ui/help';
import { colors } from '@/constants/theme';
import { CardLegendContext, LegendRow, type LegendItem } from './legend';

export interface ChartCardProps {
  title: string;
  children: ReactNode;
  colSpan?: GridItemProps['colSpan'];
  height?: string;
  isLoading?: boolean;
  /** The loading skeleton's shape — what the card shows first: a column chart, a line, a table or a list of bars. */
  variant?: 'bar' | 'line' | 'table' | 'rows';
  headerRight?: ReactNode;
  /** Explanation shown behind the ? icon. */
  info?: ReactNode;
  /** Plain-language what/where help behind the ? icon. */
  help?: HelpText;
  /** Show the ⤢ button that opens the card full-size. Default true. */
  expandable?: boolean;
  /** Supply Chain Pulse: the PRD item ID(s) this card shows; Key insights scroll to it, and the coverage check reads it. */
  dataKpi?: string;
  /** ⤢ opens this instead of the card full size (as Sales Pulse 2.0's breakdown ⤢ opens every breakdown): a fuller view. */
  onExpand?: () => void;
}

const BAR_HEIGHTS = [55, 80, 40, 90, 65, 75, 50, 85, 60, 70];
/** Name-column widths of the table skeleton's rows, so they do not read as one block. */
const TABLE_ROWS = [42, 30, 50, 36, 46, 28, 40, 34, 48, 32, 44, 38, 30, 46];
/** Bar lengths of the bar-list skeleton. */
const ROW_BARS = [88, 72, 64, 80, 52, 70, 44, 60];
const LINE_DOTS   = [45, 65, 30, 70, 50, 80, 38, 60, 55, 75];

// SVG polyline points for the line skeleton (viewBox 0 0 100 100)
const LINE_SVG_POINTS = LINE_DOTS.map((bottom, i) => {
  const x = (i / (LINE_DOTS.length - 1)) * 92 + 4;
  const y = 100 - bottom;
  return `${x},${y}`;
}).join(' ');

export function ChartCard({
  title,
  children,
  colSpan = 4,
  height = 'auto',
  isLoading = false,
  variant = 'bar',
  headerRight,
  info,
  help,
  expandable = true,
  dataKpi,
  onExpand,
}: ChartCardProps) {
  const [expanded, setExpanded] = useState(false);
  const skeletonH = height === 'auto' ? '100%' : height;
  // The chart's legend, under the title (see legend.tsx). Kept per chart, so
  // the card's copy and the ⤢ copy can come and go without clearing it.
  const [legends, setLegends] = useState<Record<string, LegendItem[]>>({});
  const putLegend = useCallback((id: string, items: LegendItem[] | null) => {
    setLegends((all) => {
      if (!items) {
        if (!(id in all)) return all;
        const rest = { ...all };
        delete rest[id];
        return rest;
      }
      return { ...all, [id]: items };
    });
  }, []);
  const legend = Object.values(legends).find((items) => items.length > 0);

  return (
    <GridItem colSpan={colSpan} minH={0} minW={0} data-kpi={dataKpi} scrollMarginTop="140px" className="sp-card">
      <Box
        className="sp-tint"
        border="1px solid"
        borderColor={colors.border}
        borderRadius="4px"
        px={4}
        pt={3}
        pb={3}
        h="full"
        minH={0}
        display="flex"
        flexDirection="column"
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          gap={3}
          mb={2}
          minH="28px"
          flexShrink={0}
        >
          {/* The title takes what the controls leave; a long switch on the
              right shrinks and moves its extra options behind ⌄. */}
          <Box flex="1 1 0" minW="140px">
            <Text
              fontSize="16px"
              fontWeight={700}
              color={colors.cardAccent}
              lineHeight="1.3"
            >
              {title}
            </Text>
            {legend && (
              <Box mt="3px">
                <LegendRow items={legend} />
              </Box>
            )}
          </Box>
          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={2} flex="0 1 auto" minW={0} css={{ "& > *:not(:first-child)": { flexShrink: 0 } }}>
            {headerRight}
            {(help || info) && <InfoTip help={help} text={info} />}
            {expandable && !isLoading && (
              <Box
                as="button"
                aria-label={`Expand ${title}`}
                title={onExpand ? "Open the details" : "Expand"}
                onClick={() => (onExpand ? onExpand() : setExpanded(true))}
                color={colors.mutedText}
                cursor="pointer"
                p="2px"
                borderRadius="4px"
                _hover={{ color: colors.darkText, bg: colors.hoverBg }}
              >
                <FiMaximize2 size={14} />
              </Box>
            )}
          </Box>
        </Box>
        {/* The body takes whatever height the card's grid cell gives it; on
            narrow screens, where cards stack and the page scrolls, it keeps a
            readable minimum instead. */}
        <Box
          h={height}
          position="relative"
          flex={height === 'auto' ? 1 : undefined}
          minH={{ base: '240px', lg: 0 }}
        >
          {isLoading ? (
            variant === 'table' ? (
              /* ── Table skeleton: header, Total row, then rows of a name and figures ── */
              <Flex direction="column" h={skeletonH} overflow="hidden" gap="10px" pt={1}>
                <Skeleton height="28px" borderRadius="4px" opacity={0.7} flexShrink={0} />
                <Skeleton height="22px" borderRadius="4px" opacity={0.55} flexShrink={0} />
                {TABLE_ROWS.map((w, i) => (
                  <Flex key={i} gap={4} align="center" flexShrink={0} px={1}>
                    <Skeleton height="12px" w={`${w}%`} borderRadius="3px" />
                    <Box flex={1} />
                    {[0, 1, 2].map((c) => (
                      <Skeleton key={c} height="12px" w="56px" borderRadius="3px" />
                    ))}
                  </Flex>
                ))}
              </Flex>
            ) : variant === 'rows' ? (
              /* ── Bar-list skeleton (RowBars, ranked lists): a label over a horizontal bar, per row ── */
              <Flex direction="column" h={skeletonH} overflow="hidden" gap="14px" pt={1}>
                {ROW_BARS.map((w, i) => (
                  <Box key={i} flexShrink={0}>
                    <Flex justify="space-between" mb="6px">
                      <Skeleton height="10px" w={`${20 + (i % 3) * 8}%`} borderRadius="3px" />
                      <Skeleton height="10px" w="70px" borderRadius="3px" />
                    </Flex>
                    <Skeleton height="10px" w={`${w}%`} borderRadius="2px" />
                  </Box>
                ))}
              </Flex>
            ) : variant === 'line' ? (
              /* ── Line chart skeleton: grid lines + connecting line + dots ── */
              <Box position="relative" h={skeletonH} overflow="hidden">
                {/* Horizontal grid lines */}
                {[20, 45, 70].map((top) => (
                  <Skeleton
                    key={top}
                    position="absolute"
                    left={0}
                    right={0}
                    top={`${top}%`}
                    height="2px"
                    opacity={0.35}
                    borderRadius="none"
                  />
                ))}
                {/* SVG polyline connecting the dots */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <polyline
                    points={LINE_SVG_POINTS}
                    fill="none"
                    stroke="#CBD5E0"
                    strokeWidth="1"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ animation: 'chakra-skeleton-loading 1.4s ease-in-out infinite' }}
                  />
                </svg>
                {/* Dots centered on each data point */}
                {LINE_DOTS.map((bottom, i) => (
                  <Box
                    key={i}
                    position="absolute"
                    left={`${(i / (LINE_DOTS.length - 1)) * 92 + 4}%`}
                    bottom={`${bottom}%`}
                    transform="translate(-50%, 50%)"
                  >
                    <Skeleton borderRadius="full" width="10px" height="10px" />
                  </Box>
                ))}
              </Box>
            ) : (
              /* ── Bar chart skeleton: vertical bars ── */
              <Box
                display="flex"
                alignItems="flex-end"
                justifyContent="space-between"
                gap="6px"
                px={2}
                h={skeletonH}
              >
                {BAR_HEIGHTS.map((pct, i) => (
                  <Skeleton
                    key={i}
                    flex={1}
                    height={`${pct}%`}
                    borderRadius="sm"
                  />
                ))}
              </Box>
            )
          ) : (
            <CardLegendContext.Provider value={putLegend}>{children}</CardLegendContext.Provider>
          )}
        </Box>
      </Box>
      {expanded && (
        <Overlay title={title} subtitle={legend && <LegendRow items={legend} />} onClose={() => setExpanded(false)}>
          <CardLegendContext.Provider value={putLegend}>
            {/* Every pop-up the height of Sales Pulse 2.0's expanded charts (AchCharts Host),
                so tables, pies and short lists open as large as the charts do. */}
            <Flex direction="column" h="min(600px, 70vh)" minH={0}>
              <ExpandedContext.Provider value={true}>{children}</ExpandedContext.Provider>
            </Flex>
          </CardLegendContext.Provider>
        </Overlay>
      )}
    </GridItem>
  );
}
