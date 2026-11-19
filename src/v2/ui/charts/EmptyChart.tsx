import { Flex, Text } from '@chakra-ui/react';
import { FiBarChart2 } from 'react-icons/fi';

export interface EmptyChartProps {
  height?: number | string;
  title?: string;
  subtitle?: string;
}

export function EmptyChart({
  height = 250,
  title = 'No data available',
  subtitle = 'Try adjusting your filters',
}: EmptyChartProps) {
  return (
    <Flex
      w="100%"
      h={height}
      direction="column"
      align="center"
      justify="center"
      gap={2}
      color="var(--sp-muted-text)"
    >
      <Flex
        w="56px"
        h="56px"
        align="center"
        justify="center"
        borderRadius="full"
        bg="var(--sp-sunk-bg)"
        color="var(--sp-muted-text)"
      >
        <FiBarChart2 size={26} />
      </Flex>
      <Text fontSize="14px" fontWeight="700" color="var(--sp-muted-text)">
        {title}
      </Text>
      <Text fontSize="12px" color="var(--sp-muted-text)">
        {subtitle}
      </Text>
    </Flex>
  );
}
