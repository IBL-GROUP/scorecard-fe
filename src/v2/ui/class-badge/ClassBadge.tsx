// The class marker of Supply Chain Pulse 1.0: a solid square in the class's
// colour with its letter (A, B, C, N, O for Other), used wherever a class is
// named, and the legend of those markers for the control panel.

import { Box, Flex, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { clsColor } from '@/v2/constants/classColors';
import { colors } from '@/v2/constants/theme';

export const CLASS_LEGEND = ['A', 'B', 'C', 'N', 'Others'] as const;

/** The letter a class shows: A, B, C, N, or O for Other (unclassified). */
export const classLetter = (cls: string) => (cls === 'Others' || cls === 'Other' ? 'O' : cls);
export const className = (cls: string) => (cls === 'Others' || cls === 'Other' ? 'Other' : `Class ${cls}`);

export function ClassBadge({ cls, size = 20 }: { cls: string; size?: number }) {
  return (
    <Flex
      as="span"
      align="center"
      justify="center"
      w={`${size}px`}
      h={`${size}px`}
      flexShrink={0}
      borderRadius="4px"
      bg={clsColor(cls === 'Other' ? 'Others' : cls)}
      color="#FFFFFF"
      fontSize={`${Math.round(size * 0.55)}px`}
      fontWeight={800}
      lineHeight={1}
      title={className(cls)}
      aria-label={className(cls)}
    >
      {classLetter(cls)}
    </Flex>
  );
}

/**
 * The class legend of the control panel, after Cover days: each class's marker, its name and
 * how many SKUs it holds. It only explains — classes are picked in the search box's Filters
 * menu. Shown by default; the eye hides it (remembered in this browser).
 */
const LEGEND_KEY = 'sc2-class-legend';

export function ClassLegend({ counts }: { counts: Record<string, number> }) {
  const [shown, setShown] = useState(() => {
    try {
      return localStorage.getItem(LEGEND_KEY) !== 'hidden';
    } catch {
      return true;
    }
  });
  const toggle = () => {
    const next = !shown;
    setShown(next);
    try {
      localStorage.setItem(LEGEND_KEY, next ? 'shown' : 'hidden');
    } catch {
      /* storage blocked: the choice lasts this visit */
    }
  };
  return (
    <Flex align="center" flexShrink={0} gap={3} aria-label="Classes and their SKUs">
      {shown &&
        CLASS_LEGEND.map((c) => (
          <Flex key={c} align="center" gap="6px" title={`${className(c)}: ${counts[c] ?? 0} SKUs`}>
            <ClassBadge cls={c} size={18} />
            <Text fontSize="13px" color={colors.bodyText} whiteSpace="nowrap">
              {className(c)}
            </Text>
            <Text fontSize="12px" fontWeight={700} color={colors.mutedText} fontVariantNumeric="tabular-nums">
              {counts[c] ?? 0}
            </Text>
          </Flex>
        ))}
      <Box
        as="button"
        display="flex"
        alignItems="center"
        gap="5px"
        fontSize="12px"
        color={colors.mutedText}
        _hover={{ color: colors.darkText }}
        onClick={toggle}
        title={shown ? 'Hide the class legend' : 'Show the class legend'}
        aria-pressed={shown}
      >
        {shown ? <FiEyeOff size={14} /> : <FiEye size={14} />}
        {!shown && 'Class legend'}
      </Box>
    </Flex>
  );
}
