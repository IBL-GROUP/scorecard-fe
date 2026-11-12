import { colors } from '@/v2/constants/theme';
import { Box, Flex, Skeleton, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface StatCardProps {
  label: string;
  // Headline figure — kept short (compact notation) so it reads at a glance.
  value: string;
  // Exact figure, shown small beneath the headline so precision isn't lost.
  caption?: string;
  icon: ReactNode;
  // Identity colour for the icon chip. Text stays in ink tokens — the chip is
  // what carries identity, so the numbers never wear a series colour.
  accent: string;
  isLoading?: boolean;
}

export function StatCard({
  label,
  value,
  caption,
  icon,
  accent,
  isLoading,
}: StatCardProps) {
  return (
    <Box
      bg={colors.cardBg}
      border="1px solid"
      borderColor="#D8DADD"
      borderRadius="4px"
      px={4}
      py={3}
    >
      <Flex align="center" gap={2} mb={1}>
        <Flex
          align="center"
          justify="center"
          w="28px"
          h="28px"
          borderRadius="md"
          flexShrink={0}
          // Tint of the accent, so the chip reads as a quiet badge rather than
          // a second headline.
          bg={`${accent}1A`}
          color={accent}
          fontSize="14px"
        >
          {icon}
        </Flex>
        <Text
          fontSize="11px"
          fontWeight="bold"
          color="var(--sp-muted-text)"
          textTransform="uppercase"
          letterSpacing="0.04em"
          lineHeight="1.2"
        >
          {label}
        </Text>
      </Flex>

      {isLoading ? (
        <Skeleton height="24px" width="60%" borderRadius="md" />
      ) : (
        <Text
          fontSize="24px"
          fontWeight="black"
          color="var(--sp-dark-text)"
          lineHeight="1.1"
        >
          {value}
        </Text>
      )}

      {caption && !isLoading && (
        <Text fontSize="11px" color="var(--sp-muted-text)" lineHeight="1.3">
          {caption}
        </Text>
      )}
    </Box>
  );
}
