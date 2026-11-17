// "All metrics / 1.0 only" switch (FR-EXEC-024). Since 16 Nov 2026 it sits in the
// control panel beside the period button, as Sales Pulse 2.0 keeps its view
// controls there (FR-EXEC-042).

import { Box, Flex, Text } from '@chakra-ui/react';
import { colors } from '@/v2/constants/theme';
import type { MetricMode } from '@/v2/features/catalog';
import { useStore } from '@/v2/features/store';

const METRIC_MODES: { mode: MetricMode; label: string; short: string }[] = [
  { mode: 'all', label: 'All metrics', short: 'All' },
  { mode: 'v1', label: '1.0 only', short: '1.0' },
];

/**
 * "All metrics" shows every 2.0 KPI and chart; "1.0 only" shows just the items
 * that carry a Supply Chain Pulse 1.0 metric. Remembered per user (FR-EXEC-024).
 */
export function MetricModeSwitch() {
  const { metricMode, setMetricMode } = useStore();
  return (
    <Flex
      role="group"
      aria-label="Metrics shown"
      title="All metrics: every 2.0 KPI and chart. 1.0 only: just the KPIs and metrics Supply Chain Pulse 1.0 has."
      border="1px solid"
      borderColor={colors.border}
      borderRadius="999px"
      p="2px"
      gap="2px"
      flexShrink={0}
      data-metric-mode={metricMode}
    >
      {METRIC_MODES.map((o) => {
        const on = metricMode === o.mode;
        return (
          <Box
            key={o.mode}
            as="button"
            aria-pressed={on}
            aria-label={o.label}
            onClick={() => setMetricMode(o.mode)}
            px="10px"
            py="3px"
            borderRadius="999px"
            fontSize="12px"
            fontWeight={on ? 700 : 500}
            bg={on ? colors.brandSoft : 'transparent'}
            color={on ? colors.brand : colors.bodyText}
            whiteSpace="nowrap"
            _hover={on ? undefined : { bg: colors.navbarHover }}
          >
            <Text as="span" display={{ base: 'none', lg: 'inline' }}>
              {o.label}
            </Text>
            <Text as="span" display={{ base: 'inline', lg: 'none' }}>
              {o.short}
            </Text>
          </Box>
        );
      })}
    </Flex>
  );
}
