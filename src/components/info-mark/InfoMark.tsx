import { Box, Flex, Portal, Text, Tooltip } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { FiHelpCircle } from 'react-icons/fi';

/** One point in a "?" explanation: a short label and its value. */
export interface InfoPoint {
  label: string;
  value: ReactNode;
}

export interface InfoMarkProps {
  /** What the "?" explains, for screen readers ("About Sales Summary"). */
  about: string;
  points: InfoPoint[];
}

/**
 * The "?" after a card title. Hover, focus or tap it for a small card listing
 * what the card shows and how it is worked out, one point per line.
 *
 * Interactive, so moving onto the card keeps it open, and rendered in a portal
 * so opening it moves nothing on the page (both stop it flickering open and
 * shut). The whole round target opens it, not only the icon's thin lines.
 */
export function InfoMark({ about, points }: InfoMarkProps) {
  return (
    <Tooltip.Root interactive positioning={{ placement: 'bottom-start', gutter: 6 }} openDelay={150} closeDelay={150}>
      <Tooltip.Trigger asChild>
        <Box
          as="button"
          aria-label={`About ${about}`}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          w="20px"
          h="20px"
          ml="6px"
          p={0}
          borderRadius="full"
          bg="transparent"
          color="gray.400"
          cursor="help"
          transition="color 0.15s, background 0.15s"
          _hover={{ color: 'blue.600', bg: 'blue.50' }}
          _focusVisible={{ color: 'blue.600', bg: 'blue.50', outline: '2px solid', outlineColor: 'blue.200' }}
          css={{ '& svg': { pointerEvents: 'none' } }}
        >
          <FiHelpCircle size={15} />
        </Box>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content
            bg="white"
            color="gray.700"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="10px"
            px="14px"
            py="12px"
            minW="240px"
            maxW="340px"
            boxShadow="0 10px 30px rgba(15, 23, 42, 0.15)"
            textTransform="none"
            letterSpacing="normal"
          >
            <Text fontSize="11px" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb="8px">
              About this card
            </Text>
            <Box as="ul" listStyleType="none" m={0} p={0} display="flex" flexDirection="column" gap="7px">
              {points.map((point) => (
                <Flex as="li" key={point.label} align="baseline" gap="8px" fontSize="12.5px" lineHeight="1.4">
                  <Box w="6px" h="6px" borderRadius="full" bg="blue.500" flexShrink={0} transform="translateY(-1px)" />
                  <Text as="span" color="gray.500" minW="92px" flexShrink={0}>
                    {point.label}
                  </Text>
                  <Text as="span" fontWeight="semibold" color="gray.800">
                    {point.value}
                  </Text>
                </Flex>
              ))}
            </Box>
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}
