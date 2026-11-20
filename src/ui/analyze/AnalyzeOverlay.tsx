// Sales Pulse 2.0's Analyze (dsr-fe components/analyze/AnalyzeOverlay), for
// Supply Chain Pulse: the supply chain in a few plain points.

import { Box, Flex, Skeleton, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { Overlay } from '@/ui/overlay';
import { colors } from '@/constants/theme';

export interface AnalyzePoint {
  tone: 'good' | 'bad' | 'neutral';
  /** One line: the point itself. */
  title: string;
  /** One paragraph: what it means and what is behind it. */
  body: string;
}

/**
 * "Analyze": the screen in plain words. 3–6 points, each opens to a short
 * paragraph. Built from the same rules as Key insights, no AI.
 */
export function AnalyzeOverlay({
  tabTitle,
  period,
  headline,
  points,
  loading,
  onClose,
}: {
  tabTitle: string;
  period: string;
  headline: string;
  points: AnalyzePoint[];
  loading?: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const tone = { good: colors.good, bad: colors.bad, neutral: colors.brand };
  return (
    <Overlay title={`Analyze · ${tabTitle}`} subtitle={`${period} · the supply chain in plain words · worked out from the data, no AI`} onClose={onClose} width="min(760px, 94vw)">
      {loading ? (
        <Flex direction="column" gap={3}>
          <Skeleton h="20px" w="70%" borderRadius="4px" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} h="40px" borderRadius="4px" />
          ))}
        </Flex>
      ) : (
        <>
          <Text fontSize="15px" fontWeight={700} color={colors.darkText} mb={3}>
            {headline}
          </Text>
          <Flex direction="column" border="1px solid" borderColor={colors.border} borderRadius="4px" bg={colors.cardBg}>
            {points.map((pt, i) => {
              const isOpen = open === i;
              return (
                <Box key={i} borderBottom={i < points.length - 1 ? '1px solid' : undefined} borderColor={colors.sunkBg}>
                  <Flex
                    as="button"
                    w="100%"
                    align="flex-start"
                    gap={3}
                    px={4}
                    py="11px"
                    textAlign="left"
                    cursor="pointer"
                    _hover={{ bg: colors.hoverBg }}
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <Box flexShrink={0} w="22px" h="22px" borderRadius="999px" bg={colors.sunkBg} color={tone[pt.tone]} fontSize="11px" fontWeight={600} display="flex" alignItems="center" justifyContent="center">
                      {i + 1}
                    </Box>
                    <Text flex={1} fontSize="13px" fontWeight={600} color={colors.darkText}>
                      {pt.title}
                    </Text>
                    <Box color={colors.mutedText} mt="3px">
                      {isOpen ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                    </Box>
                  </Flex>
                  {isOpen && (
                    <Text className="sp-fade" px={4} pl="50px" pb={3} fontSize="13px" color={colors.bodyText} lineHeight="1.55">
                      {pt.body}
                    </Text>
                  )}
                </Box>
              );
            })}
          </Flex>
        </>
      )}
    </Overlay>
  );
}
