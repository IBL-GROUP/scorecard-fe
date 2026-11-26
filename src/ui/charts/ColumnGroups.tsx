// Every "by …" chart as vertical columns, drawn like the daily chart (user, 24 Nov 2026:
// no horizontal bars anywhere). One group of columns per item, the series side by side,
// oldest period first; each value upright inside its column (above it when the column is
// too short, below it for a negative one); a target as a dashed line across its group.
// Groups share the card's width; past a minimum width the chart scrolls sideways, so no
// item is ever left out.

import { Box, Flex, Text } from '@chakra-ui/react';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { colors } from '@/constants/theme';
import { ClassMark, classFromLabel } from '@/ui/class-badge';

export interface ColumnSeries {
  key: string;
  name: string;
  color: string;
}

export interface ColumnGroup {
  key: string;
  name: string;
  /** One value per series key; missing or 0 draws no column. */
  values: Record<string, number | null | undefined>;
  /** A colour for one series in this group only (e.g. red for a fall). */
  colors?: Record<string, string>;
  /** The text on a column, when not the formatted value (e.g. "+4.2%"). */
  labels?: Record<string, string>;
  /** A target or threshold: a dashed line across the group. */
  target?: number;
  /** Under the name: "target · %", a growth, a note. */
  foot?: ReactNode;
  /** Hover text for the group. */
  title?: string;
}

/** px per character of an 11px bold label. */
const CHAR_W = 7;

/** Dark or white text, whichever reads on a column's fill (a theme var or a hex). */
export function inkOn(fill: string) {
  let c = fill;
  const m = /^var\((--[^),\s]+)/.exec(c);
  if (m && typeof document !== 'undefined') c = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(c)?.[1];
  if (!hex) return '#FFFFFF';
  const n = parseInt(hex, 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#141A2A' : '#FFFFFF';
}

/** The plot's height in px, measured on the first group (all groups are the same height). */
function usePlotHeight() {
  const [h, setH] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    const obs = new ResizeObserver(() => setH(el.clientHeight));
    obs.observe(el);
    ro.current = obs;
    setH(el.clientHeight);
  }, []);
  return [ref, h] as const;
}

export function ColumnGroups({
  groups,
  series,
  fmt,
  targetName = 'Target',
  reference,
  onPick,
  onHover,
  onLeave,
  isActive,
  footLabel,
  emptyText = 'Nothing to show here.',
}: {
  groups: ColumnGroup[];
  series: ColumnSeries[];
  fmt: (n: number) => string;
  /** The target's name in hover text ("Target", "Budget", "Threshold"). */
  targetName?: string;
  /** One line across every group (e.g. 100% or a KPI target). */
  reference?: { value: number; label?: string };
  onPick?: (key: string) => void;
  onHover?: (key: string) => (e: React.MouseEvent) => void;
  onLeave?: () => void;
  /** Marks the group whose drill sheet is open. */
  isActive?: (key: string) => boolean;
  /** What every group's foot figure is, written once at the chart's left (e.g. "Ach"). */
  footLabel?: string;
  emptyText?: string;
}) {
  const [plotRef, plotH] = usePlotHeight();
  if (!groups.length) {
    return (
      <Flex h="100%" align="center" justify="center">
        <Text fontSize="13px" color={colors.mutedText}>
          {emptyText}
        </Text>
      </Flex>
    );
  }
  const all = groups.flatMap((g) => series.map((s) => Number(g.values[s.key]) || 0));
  const hi = Math.max(0, ...all, ...groups.map((g) => g.target ?? 0), reference?.value ?? 0);
  const lo = Math.min(0, ...all);
  // Headroom past the longest column, for a label that sits outside a short one.
  const top = hi > 0 ? hi * 1.14 : 0;
  const bottom = lo < 0 ? lo * 1.14 : 0;
  const span = top - bottom || 1;
  const zero = (-bottom / span) * 100; // % from the bottom
  const pctOf = (v: number) => (Math.abs(v) / span) * 100;
  const hasFoot = groups.some((g) => g.foot != null);
  const FOOT = hasFoot ? 38 : 22;
  const groupMin = series.length * 26 + 18;

  return (
    <Box h="100%" minH={0} overflowX="auto" overflowY="hidden">
      <Flex h="100%" minW={`${groups.length * groupMin}px`} gap="6px" className="sp-stagger">
        {footLabel && hasFoot && (
          <Flex direction="column" flexShrink={0} position="sticky" left={0} zIndex={1} pr="6px">
            <Box flex={1} minH={0} />
            <Text h={`${FOOT}px`} pt="19px" fontSize="11px" lineHeight="15px" fontWeight={700} color={colors.mutedText} borderTop="1px solid" borderColor={colors.border}>
              {footLabel}
            </Text>
          </Flex>
        )}
        {groups.map((g, gi) => {
          const active = isActive?.(g.key) ?? false;
          return (
            <Flex
              key={g.key}
              as="button"
              direction="column"
              flex="1 1 0"
              minW={`${groupMin}px`}
              textAlign="center"
              cursor={onPick ? 'pointer' : 'default'}
              onClick={() => onPick?.(g.key)}
              onMouseMove={onHover?.(g.key)}
              onMouseLeave={onLeave}
              title={onHover ? undefined : g.title ?? g.name}
              bg={active ? colors.hoverBg : undefined}
              _hover={{ bg: colors.hoverBg }}
              borderRadius="3px"
              pt="4px"
            >
              <Box ref={gi === 0 ? plotRef : undefined} position="relative" flex={1} minH={0} w="100%">
                {/* The zero line: the axis the columns stand on (or hang from). */}
                <Box position="absolute" left={0} right={0} bottom={`${zero}%`} borderTop="1px solid" borderColor={lo < 0 ? colors.borderStrong : colors.border} />
                <Flex position="absolute" inset={0} justify="center" gap="3px" px="4px">
                  {series.map((s) => {
                    const v = Number(g.values[s.key]) || 0;
                    const fill = g.colors?.[s.key] ?? s.color;
                    const text = v ? g.labels?.[s.key] ?? fmt(v) : '';
                    const hPct = v ? Math.max(pctOf(v), 0.6) : 0;
                    const inside = (hPct / 100) * plotH >= text.length * CHAR_W + 10;
                    const neg = v < 0;
                    return (
                      <Box key={s.key} position="relative" flex="1 1 0" maxW="24px" minW="12px" h="100%">
                        {v !== 0 && (
                          <Box
                            position="absolute"
                            left={0}
                            right={0}
                            bottom={neg ? `${zero - hPct}%` : `${zero}%`}
                            h={`${hPct}%`}
                            bg={fill}
                            borderRadius={neg ? '0 0 3px 3px' : '3px 3px 0 0'}
                            title={`${s.name}: ${text}`}
                          >
                            <Text
                              as="span"
                              position="absolute"
                              left="50%"
                              {...(neg
                                ? inside
                                  ? { bottom: '6px' }
                                  : { top: 'calc(100% + 4px)' }
                                : inside
                                  ? { top: '6px' }
                                  : { bottom: 'calc(100% + 4px)' })}
                              style={{ writingMode: 'vertical-rl', transform: 'translateX(-50%) rotate(180deg)' }}
                              fontSize="11px"
                              fontWeight={600}
                              lineHeight={1}
                              whiteSpace="nowrap"
                              fontVariantNumeric="tabular-nums"
                              color={inside ? inkOn(fill) : colors.darkText}
                            >
                              {text}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Flex>
                {g.target != null && g.target > 0 && (
                  <Box
                    position="absolute"
                    left="2px"
                    right="2px"
                    bottom={`${zero + pctOf(g.target)}%`}
                    borderTop="2px dashed"
                    borderColor={colors.target}
                    title={`${targetName} ${fmt(g.target)}`}
                    pointerEvents="none"
                  />
                )}
                {reference && (
                  <Box
                    position="absolute"
                    left="-3px"
                    right="-3px"
                    bottom={`${zero + (reference.value >= 0 ? pctOf(reference.value) : -pctOf(reference.value))}%`}
                    borderTop="2px dashed"
                    borderColor={colors.benchmark}
                    pointerEvents="none"
                  />
                )}
              </Box>
              {/* Name and figures centred under their columns (user, 26 Nov 2026). */}
              <Box h={`${FOOT}px`} flexShrink={0} pt="4px" px="2px" fontSize="11px" lineHeight="15px" textAlign="center" borderTop="1px solid" borderColor={colors.border}>
                {classFromLabel(g.name) ? (
                  <Flex h="18px" align="center" justify="center" color={colors.darkText} fontWeight={600} title={g.name}>
                    <ClassMark label={g.name} />
                  </Flex>
                ) : (
                  <Text color={colors.darkText} fontWeight={600} truncate title={g.name}>
                    {g.name}
                  </Text>
                )}
                {g.foot != null && (
                  <Text as="div" color={colors.mutedText} truncate fontVariantNumeric="tabular-nums">
                    {g.foot}
                  </Text>
                )}
              </Box>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
}
