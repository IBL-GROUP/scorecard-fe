import { Box, Flex, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { Overlay } from '@/v2/components/overlay';
import { colors } from '@/v2/constants/theme';

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
  onClose,
}: {
  tabTitle: string;
  period: string;
  headline: string;
  points: AnalyzePoint[];
  onClose: () => void;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const tone = { good: colors.good, bad: colors.bad, neutral: colors.brand };
  return (
    <Overlay title={`Analyze · ${tabTitle}`} subtitle={`${period} · what this screen says, in plain words · worked out from the data, no AI`} onClose={onClose} width="min(760px, 94vw)">
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
                <Box flexShrink={0} w="22px" h="22px" borderRadius="999px" bg={colors.sunkBg} color={tone[pt.tone]} fontSize="11.5px" fontWeight={700} display="flex" alignItems="center" justifyContent="center">
                  {i + 1}
                </Box>
                <Text flex={1} fontSize="13.5px" fontWeight={600} color={colors.darkText}>
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
    </Overlay>
  );
}
