import { Box, GridItem, Skeleton, Text, type GridItemProps } from '@chakra-ui/react';
import { useState, type ReactNode } from 'react';
import { FiMaximize2 } from 'react-icons/fi';
import { ExpandedContext, InfoTip, Overlay } from '@/v2/components/overlay';
import type { HelpText } from '@/v2/constants/help';
import { colors } from '@/v2/constants/theme';
import { useStore } from '@/v2/features/store';

export interface ChartCardProps {
  title: string;
  children: ReactNode;
  colSpan?: GridItemProps['colSpan'];
  height?: string;
  isLoading?: boolean;
  variant?: 'bar' | 'line';
  headerRight?: ReactNode;
  /** One short line under the title: what is compared, or a hint. */
  subtitle?: ReactNode;
  /** Explanation shown behind the ? icon. */
  info?: ReactNode;
  /** Plain-language what/where help behind the ? icon. */
  help?: HelpText;
  /** Show the ⤢ button that opens the card full-size. Default true. */
  expandable?: boolean;
  /** PRD item ID(s) this card shows (Supply Chain Pulse 2.0); used for scroll-to and the coverage check. */
  dataKpi?: string;
}

const BAR_HEIGHTS = [55, 80, 40, 90, 65, 75, 50, 85, 60, 70];
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
  subtitle,
  info,
  help,
  expandable = true,
  dataKpi,
}: ChartCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { shows } = useStore();
  const skeletonH = height === 'auto' ? '100%' : height;
  // "1.0 only" in the header hides cards that carry no 1.0 metric (FR-EXEC-024).
  if (!shows(dataKpi)) return null;

  return (
    <GridItem colSpan={colSpan} minH={0} minW={0} data-kpi={dataKpi} scrollMarginTop="140px">
      <Box
        bg={colors.cardBg}
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
          <Box minW={0}>
            <Text
              fontSize="14.5px"
              fontWeight={600}
              color={colors.darkText}
              lineHeight="1.3"
            >
              {title}
            </Text>
            {subtitle && (
              <Text fontSize="12px" color={colors.mutedText} mt="1px">
                {subtitle}
              </Text>
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={2} flexShrink={0}>
            {headerRight}
            {(help || info) && <InfoTip help={help} text={info} />}
            {expandable && !isLoading && (
              <Box
                as="button"
                aria-label={`Expand ${title}`}
                title="Expand"
                onClick={() => setExpanded(true)}
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
            variant === 'line' ? (
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
            children
          )}
        </Box>
      </Box>
      {expanded && (
        <Overlay title={title} subtitle={subtitle} onClose={() => setExpanded(false)}>
          <ExpandedContext.Provider value={true}>{children}</ExpandedContext.Provider>
        </Overlay>
      )}
    </GridItem>
  );
}
