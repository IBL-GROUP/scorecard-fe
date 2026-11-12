import { Box, Flex, Skeleton, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { InfoTip } from '@/v2/components/overlay';
import { RollingNumber } from '@/v2/components/motion';
import type { HelpText } from '@/v2/constants/help';
import { colors } from '@/v2/constants/theme';

export interface KpiDelta {
  /** Percentage change, e.g. -22.29. null/undefined = not available. */
  pct: number | null | undefined;
  /** What the change is measured against, e.g. "vs last month". */
  label: string;
  /** '%' (default) for a growth rate, 'pts' for a change in percentage points. */
  unit?: '%' | 'pts';
}

export interface KpiPacing {
  /** Achieved share of target, 0–100+ */
  achievedPct: number;
  /** Where the marker sits, 0–100 (e.g. 100 = on target to date). */
  timeGonePct: number;
  /** Text next to the marker. */
  markerLabel?: string;
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
  /** Secondary line, e.g. "Last month 222.59M". */
  caption?: string;
  delta?: KpiDelta;
  pacing?: KpiPacing;
  isLoading?: boolean;
  /** ONEThunder symbol shown before the label. */
  icon?: ReactNode;
  /** Which measure the tile is about: Sales (Cobalt) or Target (Teal). */
  tone?: 'sales' | 'target';
  /** Plain-language "what is this / where from" behind a ? icon. */
  help?: HelpText;
  compare?: KpiCompare;
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
        {flat ? '■' : up ? '▲' : '▼'} {Math.abs(delta.pct).toFixed(1)}{delta.unit === 'pts' ? ' pts' : '%'}
      </Box>
      <Text as="span" color={colors.mutedText}>
        {delta.label}
      </Text>
    </Flex>
  );
}

function PacingBar({ pacing }: { pacing: KpiPacing }) {
  const achieved = Math.max(0, pacing.achievedPct);
  const gone = Math.min(100, Math.max(0, pacing.timeGonePct));
  // Scale the bar so the bigger of achieved/time-gone always fits.
  const scaleMax = Math.max(100, achieved);
  const ahead = achieved >= gone;
  const gap = achieved - gone;
  return (
    <Box mt="2px">
      <Box position="relative" h="6px" borderRadius="3px" bg={colors.sunkBg}>
        <Box
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          borderRadius="3px"
          bg={colors.sales}
          w="100%"
          className="sp-grow"
          style={{ transform: `scaleX(${achieved / scaleMax})` }}
        />
        <Box
          position="absolute"
          top="-4px"
          bottom="-4px"
          w="2px"
          bg={colors.target}
          left={`calc(${(gone / scaleMax) * 100}% - 1px)`}
          title={pacing.markerLabel ?? `${gone.toFixed(0)}% of the period gone`}
        />
      </Box>
      <Flex justify="space-between" mt="6px" fontSize="12px" gap={2}>
        <Text as="span" color={ahead ? colors.good : colors.bad} fontWeight={600}>
          {ahead ? '▲ On or ahead of target' : '▼ Behind target'} ({gap > 0 ? '+' : ''}
          {gap.toFixed(1)} pts)
        </Text>
        <Text as="span" color={colors.mutedText} whiteSpace="nowrap">
          <Box as="span" color={colors.target} fontWeight={700}>│</Box>{' '}
          {pacing.markerLabel ?? `${gone.toFixed(0)}% of month gone`}
        </Text>
      </Flex>
    </Box>
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
  pacing,
  isLoading,
  icon,
  tone,
  help,
  compare,
}: KpiTileProps) {
  const toneColor = tone === 'target' ? colors.target : tone === 'sales' ? colors.sales : undefined;
  return (
    <Flex
      direction="column"
      gap="4px"
      bg={colors.cardBg}
      border="1px solid"
      borderColor={colors.border}
      borderRadius="4px"
      borderTop={toneColor ? `3px solid ${toneColor}` : undefined}
      px={4}
      py="10px"
      minW={0}
      position="relative"
    >
      <Flex align="center" gap="6px" color={toneColor ?? colors.mutedText}>
        {icon && (
          <Box color={colors.brand} display="flex" flexShrink={0}>
            {icon}
          </Box>
        )}
        <Text fontSize="13px" fontWeight={500} truncate>
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
              {/\d/.test(value) ? <RollingNumber value={value} /> : value}
            </Text>
            {valueSuffix && (
              <Text fontSize="13px" color={colors.mutedText} fontWeight={500}>
                {valueSuffix}
              </Text>
            )}
          </Flex>
          {compare ? (
            <CompareControl compare={compare} delta={delta} />
          ) : delta && (
            <Box fontSize="12px">
              <DeltaText delta={delta} />
            </Box>
          )}
          {pacing && <PacingBar pacing={pacing} />}
          {caption && (
            <Text fontSize="12px" color={colors.mutedText}>
              {caption}
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
}
