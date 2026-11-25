// The class marker of Supply Chain Pulse 1.0: a solid square in the class's
// colour with its letter (A, B, C, N, O for Other), used wherever a class is
// named, and the legend of those markers for the control panel.

import { Box, Flex, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { clsColor } from '@/constants/classColors';
import { colors } from '@/constants/theme';
import { fetchRows } from '@/features/data';
import { num, type TotalSkuRow } from '@/api/types';

export const CLASS_LEGEND = ['A', 'B', 'C', 'N', 'Others'] as const;

/** The letter a class shows: A, B, C, N, or O for Other (unclassified). */
export const classLetter = (cls: string) => (cls === 'Others' || cls === 'Other' ? 'O' : cls);
export const className = (cls: string) => (cls === 'Others' || cls === 'Other' ? 'Other' : `Class ${cls}`);

export function ClassBadge({ cls, size = 20 }: { cls: string; size?: number }) {
  return (
    <Flex
      as="span"
      // Keeps its white letter inside a table header (.sp-th inks its text).
      className="sp-keep"
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
 * how many SKUs it holds (1.0's "No. of SKUs": /total-sku, the whole product range, not narrowed
 * by any filter). It only explains — classes are picked in the search box's Filters menu.
 * Shown by default; the eye hides it (remembered in this browser).
 */
const LEGEND_KEY = 'sc2-class-legend';

/** SKUs per class (A, B, C, N, Others), as 1.0's Benchmark card counts them. */
export function useClassSkuCounts() {
  const q = useQuery({ queryKey: ['api', '/total-sku'], queryFn: () => fetchRows('/total-sku') as Promise<TotalSkuRow[]>, staleTime: 30 * 60_000 });
  const counts: Record<string, number> = {};
  for (const r of q.data ?? []) {
    const t = (r.classification ?? '').trim();
    const c = t === '' || t === 'Other' || t === 'Others' ? 'Others' : t;
    counts[c] = (counts[c] ?? 0) + (num(r.count) ?? 0);
  }
  return q.data ? counts : null;
}

export function ClassLegend() {
  const counts = useClassSkuCounts();
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
    <Flex align="center" flexShrink={0} gap={3} aria-label="Classes">
      {shown &&
        // Other only when it has SKUs (user, 25 Nov 2026): an empty "Other 0" is noise.
        CLASS_LEGEND.filter((c) => c !== 'Others' || (counts?.Others ?? 0) > 0).map((c) => (
          <Flex key={c} align="center" gap="6px" title={counts ? `${className(c)}: ${(counts[c] ?? 0).toLocaleString('en-US')} SKUs` : className(c)}>
            <ClassBadge cls={c} size={18} />
            <Text fontSize="13px" color={colors.bodyText} whiteSpace="nowrap">
              {c === 'Others' ? 'Other' : c}
            </Text>
            {counts && (
              <Text as="span" fontSize="12px" fontWeight={700} color={clsColor(c)} bg={colors.sunkBg} px="6px" borderRadius="10px" lineHeight="18px" fontVariantNumeric="tabular-nums">
                {(counts[c] ?? 0).toLocaleString('en-US')}
              </Text>
            )}
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
        {!shown && 'Class Legend'}
      </Box>
    </Flex>
  );
}
