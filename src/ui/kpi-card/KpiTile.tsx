import { Box, Flex, Skeleton, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { InfoTip } from '@/ui/overlay';
import { AnimatedValue } from '@/ui/motion';
import type { HelpText } from '@/ui/help';
import { colors, fmt1 } from '@/constants/theme';

export interface KpiDelta {
  /** Percentage change, e.g. -22.29. null/undefined = not available. */
  pct: number | null | undefined;
  /** What the change is measured against, e.g. "vs last month". */
  label: string;
  /** '%' (default) for a growth rate, 'pts' for a change in percentage points. */
  unit?: '%' | 'pts';
}

export interface KpiCompareOption {
  key: string;
  label: string;
  /** Why it can't be used yet; the option shows greyed out with this text. */
  disabled?: string;
}

/** Per-tile comparison, offered when the page-wide compare is Off. The parent
 *  works out the numbers and passes the result back in `delta`. */
export interface KpiCompare {
  options: KpiCompareOption[];
  selected?: string | null;
  onSelect: (key: string | null) => void;
}

export interface KpiTileProps {
  label: string;
  value: string;
  /** Small text after the value, e.g. "of 532.3M". */
  valueSuffix?: string;
  /** Secondary line, e.g. "Last month 222.59M"; may colour part of itself. */
  caption?: ReactNode;
  delta?: KpiDelta;
  isLoading?: boolean;
  /** ONEThunder symbol shown before the label. */
  icon?: ReactNode;
  /** Which measure the tile is about: Sales (Cobalt) or Target (Teal). */
  /** Plain-language "what is this / where from" behind a ? icon. */
  help?: HelpText;
  compare?: KpiCompare;
  /** How the value splits (e.g. by sales type): a thin stacked bar, then each part's amount. */
  split?: KpiSplitPart[];
}

export interface KpiSplitPart {
  label: string;
  value: number;
  /** Already formatted, e.g. "743.9M". */
  text: string;
  color: string;
}

/** The split line under a tile's value: one bar, then each part's amount. */
function SplitLine({ parts }: { parts: KpiSplitPart[] }) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0);
  if (!total) return null;
  return (
    <Box mt="4px">
      <Flex h="6px" borderRadius="3px" overflow="hidden" bg={colors.sunkBg}>
        {parts.map((p) => (
          <Box key={p.label} h="100%" w={`${(Math.max(0, p.value) / total) * 100}%`} bg={p.color} title={`${p.label}: ${p.text}`} />
        ))}
      </Flex>
      <Flex mt="5px" gap="4px 12px" wrap="wrap" fontSize="11px" color={colors.mutedText}>
        {parts.map((p) => (
          <Flex key={p.label} align="center" gap="5px" whiteSpace="nowrap">
            <Box w="8px" h="8px" borderRadius="2px" bg={p.color} flexShrink={0} />
            {p.label}
            <Text as="span" color={colors.darkText} fontWeight={600} fontVariantNumeric="tabular-nums">
              {p.text}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}

function DeltaText({ delta }: { delta: KpiDelta }) {
  if (delta.pct == null || Number.isNaN(delta.pct)) {
    return (
      <Text as="span" color={colors.mutedText} fontStyle="italic">
        No comparison
      </Text>
    );
  }
  const up = delta.pct > 0;
  const flat = delta.pct === 0;
  const color = flat ? colors.mutedText : up ? colors.good : colors.bad;
  return (
    <Flex align="center" gap="6px" wrap="wrap" className="sp-pop" key={`${delta.label}${delta.pct}`}>
      <Box
        as="span"
        display="inline-flex"
        alignItems="center"
        gap="3px"
        color={color}
        fontWeight={700}
        fontVariantNumeric="tabular-nums"
      >
        {flat ? '■' : up ? '▲' : '▼'} {fmt1(Math.abs(delta.pct))}{delta.unit === 'pts' ? ' pts' : '%'}
      </Box>
      <Text as="span" color={colors.mutedText}>
        {delta.label}
      </Text>
    </Flex>
  );
}

function CompareControl({ compare, delta }: { compare: KpiCompare; delta?: KpiDelta }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const active = compare.selected ? compare.options.find((o) => o.key === compare.selected) : undefined;
  return (
    <Box ref={ref} position="relative" fontSize="12px">
      <Flex align="center" gap="6px" minH="18px">
        {active && delta ? (
          <>
            <Box minW={0}>
              <DeltaText delta={delta} />
            </Box>
            <Box
              as="button"
              aria-label="Change comparison"
              onClick={() => setOpen((v) => !v)}
              color={colors.mutedText}
              _hover={{ color: colors.brand }}
              cursor="pointer"
              px="2px"
            >
              ▾
            </Box>
            <Box
              as="button"
              aria-label="Remove comparison"
              onClick={() => compare.onSelect(null)}
              color={colors.mutedText}
              _hover={{ color: colors.bad }}
              cursor="pointer"
              px="2px"
            >
              ×
            </Box>
          </>
        ) : (
          <Box
            as="button"
            onClick={() => setOpen((v) => !v)}
            color={colors.brand}
            fontWeight={600}
            cursor="pointer"
            _hover={{ textDecoration: 'underline' }}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            Compare ▾
          </Box>
        )}
      </Flex>
      {open && (
        <Box
          role="menu"
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          zIndex={20}
          minW="230px"
          bg={colors.cardBg}
          border="1px solid"
          borderColor={colors.border}
          borderRadius="4px"
          boxShadow={`0 6px 18px ${colors.shadow}`}
          py="4px"
        >
          <Text px={3} py="4px" fontSize="11px" color={colors.mutedText} textTransform="uppercase" letterSpacing=".04em">
            Compare this figure with
          </Text>
          {compare.options.map((o) => {
            const on = o.key === compare.selected;
            return (
              <Box
                key={o.key}
                as="button"
                role="menuitemradio"
                aria-checked={on}
                aria-disabled={!!o.disabled}
                display="block"
                w="100%"
                textAlign="left"
                px={3}
                py="6px"
                cursor={o.disabled ? 'not-allowed' : 'pointer'}
                bg={on ? colors.brandSoft : undefined}
                _hover={o.disabled ? undefined : { bg: colors.hoverBg }}
                onClick={() => {
                  if (o.disabled) return;
                  compare.onSelect(o.key);
                  setOpen(false);
                }}
              >
                <Text fontSize="13px" color={o.disabled ? colors.mutedText : colors.darkText} fontWeight={on ? 600 : 400} display="flex" alignItems="center" gap="6px">
                  {on && (
                    <svg className="sp-check" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                      <path d="M2 6.5 5 9.5 10 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {o.label}
                </Text>
                {o.disabled && (
                  <Text fontSize="11px" color={colors.mutedText}>
                    {o.disabled}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

// A neutral tile: the value is the loudest thing; colour appears only to say
// whether a change is good or bad.
export function KpiTile({
  label,
  value,
  valueSuffix,
  caption,
  delta,
  isLoading,
  icon,
  help,
  compare,
  split,
}: KpiTileProps) {
  return (
    <Flex
      direction="column"
      gap="4px"
      className="sp-card sp-tint"
      border="1px solid"
      borderColor={colors.border}
      borderRadius="4px"
      px={4}
      py="10px"
      minW={0}
      position="relative"
    >
      <Flex align="center" gap="6px" color={colors.cardAccent}>
        {icon && (
          <Box color={colors.cardAccent} display="flex" flexShrink={0}>
            {icon}
          </Box>
        )}
        <Text fontSize="14px" fontWeight={600} truncate>
          {label}
        </Text>
        {help && (
          <Box ml="auto" display="flex">
            <InfoTip help={help} />
          </Box>
        )}
      </Flex>
      {isLoading ? (
        <>
          <Skeleton h="28px" w="60%" borderRadius="md" />
          <Skeleton h="14px" w="80%" borderRadius="md" />
        </>
      ) : (
        <Flex direction="column" gap="4px" className="sp-fade">
          <Flex align="baseline" gap="6px" wrap="wrap">
            <Text
              fontSize="24px"
              fontWeight={700}
              lineHeight="1.1"
              color={colors.darkText}
              fontVariantNumeric="tabular-nums"
            >
              <AnimatedValue value={value} />
            </Text>
            {valueSuffix && (
              <Text fontSize="13px" color={colors.mutedText} fontWeight={500}>
                {valueSuffix}
              </Text>
            )}
          </Flex>
          {/* The change and the caption share one line; the caption gives way
              (cut with …, full text on hover) rather than adding a line. */}
          {(compare || delta || caption) && (
            <Flex align="center" gap="6px" minW={0} fontSize="12px">
              {compare ? (
                <Box flexShrink={0}>
                  <CompareControl compare={compare} delta={delta} />
                </Box>
              ) : (
                delta && (
                  <Box flexShrink={0}>
                    <DeltaText delta={delta} />
                  </Box>
                )
              )}
              {caption && (
                <Text color={colors.mutedText} truncate minW={0} flex={1} title={typeof caption === 'string' ? caption : undefined}>
                  {compare || delta ? '· ' : ''}
                  {caption}
                </Text>
              )}
            </Flex>
          )}
          {split && split.length > 0 && <SplitLine parts={split} />}
        </Flex>
      )}
    </Flex>
  );
}
