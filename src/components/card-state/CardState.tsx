// A card's body when it has nothing to draw: no access to its section, its source
// not moved to BigQuery yet, a failed load, or no rows for the filters.

import { Flex } from '@chakra-ui/react';
import { FiAlertCircle, FiClock, FiLock } from 'react-icons/fi';
import { colors } from '@/constants/theme';
import { SECTION_LABEL, type Section } from '@/features/tabs';
import { EmptyChart } from '@/ui/charts/EmptyChart';

const PENDING_TEXT = 'Data not available yet: the source table is still being moved to BigQuery.';

export function CardState({ locked, error, empty, emptyText }: { locked?: Section | null; error?: boolean | 'pending'; empty?: boolean; emptyText?: string }) {
  if (locked)
    return (
      <Flex h="100%" minH="160px" align="center" justify="center" gap="8px" color={colors.mutedText} fontSize="13px">
        <FiLock /> Needs {SECTION_LABEL[locked]} access
      </Flex>
    );
  if (error === 'pending')
    return (
      <Flex h="100%" minH="160px" align="center" justify="center" gap="8px" color={colors.mutedText} fontSize="13px" textAlign="center" px={4} data-state="pending">
        <FiClock /> {PENDING_TEXT}
      </Flex>
    );
  if (error)
    return (
      <Flex h="100%" minH="160px" align="center" justify="center" gap="8px" color={colors.bad} fontSize="13px" textAlign="center" px={4}>
        <FiAlertCircle /> Couldn’t load this chart. Other figures are unaffected.
      </Flex>
    );
  if (empty) return <EmptyChart height={180} title="No Data For This Selection" subtitle={emptyText ?? 'Try another period or fewer filters'} />;
  return null;
}
