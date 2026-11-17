// "How we calculate" (FR-EXEC-042), as in Sales Pulse 2.0: every rule behind the
// numbers, tab by tab. The text is each KPI's existing help (what it tells you,
// how it is calculated, its band), the same text behind the tiles' ⓘ icons.

import { Box, Flex, Text } from '@chakra-ui/react';
import { Overlay } from '@/v2/components/overlay';
import { colors } from '@/v2/constants/theme';
import { helpFor } from '@/v2/constants/help';
import { PRD_ITEMS } from '@/v2/features/catalog';
import { TABS, type TabKey } from '@/v2/features/tabs';

export function MethodsOverlay({ tabs, onClose }: { tabs: TabKey[]; onClose: () => void }) {
  return (
    <Overlay title="How we calculate" subtitle="Every figure on this dashboard: what it tells you and how it is worked out" onClose={onClose}>
      <Flex direction="column" gap={6} data-methods>
        {TABS.filter((t) => tabs.includes(t.key)).map((t) => {
          const items = PRD_ITEMS[t.key].map((id) => ({ id, help: helpFor(id) })).filter((x) => x.help);
          if (!items.length) return null;
          return (
            <Box as="section" key={t.key} aria-label={t.label}>
              <Text as="h3" fontSize="15px" fontWeight={700} color={colors.darkText} mb={2}>
                {t.label}
              </Text>
              <Flex direction="column" gap={2}>
                {items.map(({ id, help }) => (
                  <Box key={id} bg={colors.sunkBg} border="1px solid" borderColor={colors.border} borderRadius="4px" px={3} py={2}>
                    <Flex gap={2} align="baseline">
                      <Text fontSize="11px" fontWeight={700} color={colors.brand} flexShrink={0} fontVariantNumeric="tabular-nums">
                        {id}
                      </Text>
                      <Text fontSize="13px" color={colors.darkText}>
                        {help!.what}
                      </Text>
                    </Flex>
                    <Text fontSize="12px" color={colors.mutedText} mt="2px" pl="44px">
                      {help!.source}
                    </Text>
                  </Box>
                ))}
              </Flex>
            </Box>
          );
        })}
      </Flex>
    </Overlay>
  );
}
