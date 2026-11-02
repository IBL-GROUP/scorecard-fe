import { Box, Flex, Skeleton, Text, VStack } from '@chakra-ui/react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export interface GaugeChartProps {
  value: number | null; // achieved %, null when there is no target to measure against
  target: number; // target %
  title: string;
  subtitle?: string;
  color?: string;
  displayTarget?: string; // optional override for target in bottom line
  displayAchieved?: string; // optional override for achieved in bottom line
  targetLabel?: string; // optional override for "Target" label text
  isLoading?: boolean;
}

export function GaugeChart({
  value,
  target,
  title,
  subtitle,
  color = '#2563eb',
  displayTarget,
  displayAchieved,
  targetLabel = 'Target',
  isLoading = false,
}: GaugeChartProps) {
  if (isLoading) {
    return (
      <VStack gap={2} align="center" justify="center" h="100%" w="100%">
        <Skeleton height="140px" width="140px" borderRadius="full" />
        <Skeleton height="12px" width="80px" borderRadius="md" />
        <Skeleton height="10px" width="100px" borderRadius="md" />
      </VStack>
    );
  }

  const diff = (value ?? 0) - target;
  const isAbove = diff >= 0;
  const statusColor = isAbove ? '#059669' : '#dc2626';
  const statusSymbol = isAbove ? '▲' : '▼';

  const data = [{ value: value ?? 0 }, { value: 100 - (value ?? 0) }];

  return (
    <VStack gap={0} align="center" justify="center" h="100%" w="100%">
      <Text
        fontSize="13px"
        fontWeight="700"
        color="gray.700"
        textTransform="uppercase"
        letterSpacing="wide"
        textAlign="center"
        lineHeight="1.3"
      >
        {title}
      </Text>
      {subtitle && (
        <Text fontSize="12px" color="gray.400" textAlign="center" mb={1}>
          {subtitle}
        </Text>
      )}

      <Box position="relative" w="140px" h="140px">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius="68%"
              outerRadius="88%"
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#e2e8f0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <Box
          position="absolute"
          inset={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize="22px" fontWeight="800" color={color} lineHeight={1}>
            {value === null ? '—' : `${value}%`}
          </Text>
        </Box>
      </Box>

      <Flex mt={1} gap={3} justify="center">
        <Box textAlign="center">
          <Text
            fontSize="10px"
            color="gray.400"
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing="wide"
            whiteSpace="nowrap"
          >
            {targetLabel}
          </Text>
          <Text fontSize="12px" color="gray.600" fontWeight="700">
            {displayTarget ?? '—'}
          </Text>
        </Box>
        <Box w="1px" bg="gray.200" alignSelf="stretch" />
        <Box textAlign="center">
          <Text
            fontSize="10px"
            color="gray.400"
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing="wide"
            whiteSpace="nowrap"
          >
            Achieved
          </Text>
          <Text fontSize="12px" color={color} fontWeight="700">
            {displayAchieved ?? '—'}
          </Text>
        </Box>
      </Flex>
      {value !== null && (
        <Text fontSize="12px" fontWeight="700" color={statusColor} mt={0.5}>
          {statusSymbol} {Math.abs(diff).toFixed(1)}%{' '}
          {isAbove ? 'above' : 'below'} target
        </Text>
      )}
    </VStack>
  );
}
