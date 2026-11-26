// Ported from Sales Pulse 2.0 (dsr-fe src/components/branch-highlights/BranchHighlights.tsx), 19 Nov 2026:
// HighlightCard unchanged, and the five-across grid (with its loading state) the highlight strips use.
import { Box, Grid, Skeleton, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { colors } from '@/constants/theme';
import { InfoTip } from '@/ui/overlay';
import type { HelpText } from '@/ui/help';
import { AnimatedValue } from '@/ui/motion';

export type Tone = 'sales' | 'target' | 'good' | 'bad';
const toneColor: Record<Tone, string> = {
  sales: colors.sales,
  target: colors.target,
  good: colors.good,
  bad: colors.bad,
};

export interface Tag {
  text: string;
  color: string;
}

function TagWord({ tag }: { tag: Tag }) {
  return (
    <Box as="span" fontSize="12px" fontWeight={600} color={tag.color} mr="6px" verticalAlign="middle">
      {tag.text}
    </Box>
  );
}

export function HighlightCard({
  label,
  tone,
  name,
  nameMark,
  value,
  caption,
  help,
  nameTag,
  valueTag,
}: {
  help?: HelpText;
  /** A small coloured word before the name / value, saying what the figure is (e.g. Units, Value). */
  nameTag?: Tag;
  valueTag?: Tag;
  label: string;
  tone: Tone;
  name: string;
  /** Drawn instead of the name (e.g. a class badge); the name stays as its tooltip. */
  nameMark?: ReactNode;
  value: ReactNode;
  caption: ReactNode;
}) {
  return (
    <Box
      className="sp-tint"
      style={{ '--acc': toneColor[tone] } as React.CSSProperties}
      border="1px solid"
      borderColor={colors.border}
      borderRadius="4px"
      px={4}
      py="10px"
      minW={0}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <Text fontSize="14px" fontWeight={600} color={toneColor[tone]} truncate flex={1}>
          {label}
        </Text>
        {help && <InfoTip help={help} size={14} />}
      </Box>
      <Text fontSize="16px" fontWeight={700} color={colors.darkText} truncate title={name} mt="2px">
        {nameTag && <TagWord tag={nameTag} />}
        {nameMark ? (
          <Box as="span" display="inline-flex" verticalAlign="middle">
            {nameMark}
          </Box>
        ) : (
          name
        )}
      </Text>
      <Text
        fontSize="20px"
        fontWeight={700}
        // Up is green and down is red, as on every ▲ / ▼ in Sales Pulse.
        color={
          typeof value === 'string' && value.startsWith('▲')
            ? colors.good
            : typeof value === 'string' && value.startsWith('▼')
              ? colors.bad
              : colors.darkText
        }
        lineHeight="1.25"
        fontVariantNumeric="tabular-nums"
        truncate
        title={typeof value === 'string' ? value : undefined}
      >
        {valueTag && <TagWord tag={valueTag} />}
        <AnimatedValue value={value} />
      </Text>
      <Text fontSize="12px" color={colors.mutedText} truncate mt="2px">
        {caption}
      </Text>
    </Box>
  );
}

/** The strip of highlight cards above a tab's table or charts: five across on a desktop. */
export function HighlightGrid({ isLoading, children }: { isLoading?: boolean; children: ReactNode }) {
  if (isLoading)
    return (
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }} gap={3} flexShrink={0} className="sp-stagger">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} h="104px" borderRadius="4px" />
        ))}
      </Grid>
    );
  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }} gap={3} flexShrink={0}>
      {children}
    </Grid>
  );
}
