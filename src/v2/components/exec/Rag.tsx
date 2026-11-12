import { Box, Flex, Text } from '@chakra-ui/react';
import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { colors } from '@/v2/constants/theme';
import type { Rag } from '@/v2/features/kpiThresholds';

// Status is never colour alone (PRD 5.3): every badge pairs colour with an
// icon and a word.
export const RAG_META: Record<Rag, { word: string; color: string; soft: string; Icon: typeof FiCheckCircle }> = {
  green: { word: 'On track', color: colors.good, soft: colors.goodSoft, Icon: FiCheckCircle },
  amber: { word: 'Watch', color: colors.warn, soft: colors.warnSoft, Icon: FiAlertTriangle },
  red: { word: 'Act', color: colors.bad, soft: colors.badSoft, Icon: FiAlertOctagon },
};

export function RagBadge({ rag, size = 'md' }: { rag: Rag | null | undefined; size?: 'sm' | 'md' }) {
  if (!rag) return null;
  const m = RAG_META[rag];
  return (
    <Flex
      as="span"
      align="center"
      gap="4px"
      px={size === 'sm' ? '6px' : '8px'}
      py="1px"
      borderRadius="999px"
      bg={m.soft}
      color={m.color}
      fontSize={size === 'sm' ? '11px' : '12px'}
      fontWeight={700}
      flexShrink={0}
      data-rag={rag}
      role="img"
      aria-label={`Status: ${m.word}`}
    >
      <m.Icon size={size === 'sm' ? 11 : 12} aria-hidden />
      <Text as="span">{m.word}</Text>
    </Flex>
  );
}

/** Soft background + strong text for a heatmap cell or table cell. */
export function ragCell(rag: Rag | null | undefined) {
  if (!rag) return { bg: undefined, color: colors.mutedText };
  return { bg: RAG_META[rag].soft, color: RAG_META[rag].color };
}

export function RagDot({ rag }: { rag: Rag | null | undefined }) {
  if (!rag) return null;
  return <Box as="span" display="inline-block" w="8px" h="8px" borderRadius="50%" bg={RAG_META[rag].color} data-rag={rag} role="img" aria-label={RAG_META[rag].word} />;
}
