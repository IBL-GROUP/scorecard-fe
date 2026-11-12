import { Box, Flex, Skeleton, Text } from '@chakra-ui/react';

export interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  gradient: string;
}

export function KpiCard({ title, value, subtitle, gradient }: KpiCardProps) {
  return (
    <Box
      p={2}
      borderRadius="lg"
      color="white"
      boxShadow="lg"
      style={{ background: gradient }}
    >
      <Flex justify={'space-between'}>
        <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">
          {title}
        </Text>
        {subtitle && (
          <Text fontSize="xs" fontWeight="bold">
            {subtitle}
          </Text>
        )}
      </Flex>
      <Text fontSize="lg" fontWeight="black">
        {value}
      </Text>
    </Box>
  );
}

export interface KpiGroupItem {
  label: string;
  value: string;
}

export interface KpiGroupCardProps {
  gradient: string;
  items: KpiGroupItem[];
  isLoading?: boolean;
}

export function KpiGroupCard({
  gradient,
  items,
  isLoading,
}: KpiGroupCardProps) {
  return (
    <Box
      px={2}
      py={2}
      borderRadius="lg"
      color="white"
      boxShadow="lg"
      style={{ background: gradient }}
    >
      <Flex align="stretch" h="100%">
        {items.map((item, i) => (
          <Flex key={item.label} flex={1} align="stretch">
            {i > 0 && (
              <Box w="1px" bg="whiteAlpha.400" mx={4} alignSelf="stretch" />
            )}
            <Flex flex={1} align={'center'}>
              <Text
                fontSize="14px"
                fontWeight="600"
                textTransform="uppercase"
                lineHeight="1.25"
                color="gray.900"
                mr={2}
              >
                {item.label} :
              </Text>
              {isLoading ? (
                <Skeleton
                  h="20px"
                  w="60px"
                  borderRadius="md"
                  bg="whiteAlpha.500"
                />
              ) : (
                <Text fontSize="lg" fontWeight="black" lineHeight="1">
                  {item.value}
                </Text>
              )}
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
