import { Box, Flex, GridItem, Skeleton, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { InfoMark, type InfoPoint } from '@/components/info-mark';
import { colors } from '@/constants/theme';

export interface ChartCardProps {
  title: string;
  titleNode?: ReactNode;
  /** Shown as a "?" after the title; hovering or focusing it lists these points. */
  info?: InfoPoint[];
  children: ReactNode;
  colSpan?: number;
  height?: string;
  isLoading?: boolean;
  variant?: 'bar' | 'line' | 'gauge-bar';
  headerRight?: ReactNode;
}

const BAR_HEIGHTS = [55, 80, 40, 90, 65, 75, 50, 85, 60, 70];
const LINE_DOTS = [45, 65, 30, 70, 50, 80, 38, 60, 55, 75];

// SVG polyline points for the line skeleton (viewBox 0 0 100 100)
const LINE_SVG_POINTS = LINE_DOTS.map((bottom, i) => {
  const x = (i / (LINE_DOTS.length - 1)) * 92 + 4;
  const y = 100 - bottom;
  return `${x},${y}`;
}).join(' ');

export function ChartCard({
  title,
  titleNode,
  info,
  children,
  colSpan = 4,
  height = 'auto',
  isLoading = false,
  variant = 'bar',
  headerRight,
}: ChartCardProps) {
  const skeletonH = height === 'auto' ? '220px' : height;

  return (
    <GridItem colSpan={colSpan}>
      <Box
        bg={colors.cardBg}
        backdropFilter="blur(10px)"
        borderRadius="xl"
        p={4}
        boxShadow="md"
        h="full"
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          pb={2}
          borderBottom="1px solid"
          borderColor="gray.200"
        >
          {/* Above the chart legends, which are lifted up into this row (zIndex 1)
              across the card's full width and would otherwise cover the "?". */}
          <Flex align="center" minW={0} position="relative" zIndex={2}>
            <Text
              fontSize="14px"
              fontWeight="bold"
              color="gray.800"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              {titleNode ?? title}
            </Text>
            {info?.length ? <InfoMark about={title} points={info} /> : null}
          </Flex>
          {headerRight}
        </Box>
        <Box h={height} position="relative">
          {isLoading ? (
            variant === 'gauge-bar' ? (
              /* ── Gauge + Bar skeleton: circle on left, bars on right ── */
              <Flex h={skeletonH} gap={0}>
                <Box
                  w="175px"
                  flexShrink={0}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Skeleton height="140px" width="140px" borderRadius="full" />
                </Box>
                <Box w="1px" bg="gray.100" mx={3} flexShrink={0} />
                <Box
                  flex={1}
                  display="flex"
                  alignItems="flex-end"
                  justifyContent="space-between"
                  gap="6px"
                  px={2}
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
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    overflow: 'visible',
                  }}
                >
                  <polyline
                    points={LINE_SVG_POINTS}
                    fill="none"
                    stroke="#CBD5E0"
                    strokeWidth="1"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      animation:
                        'chakra-skeleton-loading 1.4s ease-in-out infinite',
                    }}
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
    </GridItem>
  );
}
