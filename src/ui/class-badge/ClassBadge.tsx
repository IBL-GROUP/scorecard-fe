// The class marker of Supply Chain Pulse 1.0: a solid square in the class's
// colour with its letter (A, B, C, N, O for Other), used wherever a class is
// named, and the legend of those markers for the control panel.

import { Box, Flex, Text } from '@chakra-ui/react';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { clsColor } from '@/constants/classColors';
import { colors } from '@/constants/theme';
import { fetchRows } from '@/features/data';
import { num, type TotalSkuRow } from '@/api/types';

export const CLASS_LEGEND = ['A', 'B', 'C', 'N', 'DC', 'Others'] as const;

/** The letter a class shows: A, B, C, N, or O for Other (unclassified). */
export const classLetter = (cls: string) => (cls === 'Others' || cls === 'Other' ? 'O' : cls);
export const className = (cls: string) => (cls === 'Others' || cls === 'Other' ? 'Other' : `Class ${cls}`);

/**
 * The class a label names ("Class A" → "A", "Class DC" → "DC", "Other" / "Others" →
 * "Others"), or null for any other label. Lets tables and charts show a class by its
 * badge alone (user, 26 Nov 2026: the badge IS the class — no "Class A" beside it).
 */
export function classFromLabel(label: unknown): string | null {
  const s = String(label ?? '').trim();
  if (s === 'Other' || s === 'Others') return 'Others';
  const m = /^Class ([A-Z]{1,3})$/.exec(s);
  return m ? m[1] : null;
}

/**
 * A class shown the standard way: its badge alone, Other ("O") included — the name is the
 * badge's tooltip (user, 26 Nov 2026). A label that is not a class is returned as plain text.
 */
export function ClassMark({ label }: { label: string }) {
  const cls = classFromLabel(label);
  return cls ? <ClassBadge cls={cls} /> : <>{label}</>;
}

/**
 * The ONE class badge design (user, 26 Nov 2026: every box the same, one component).
 * Size, corners and letter never change by place — ClassBadge (HTML) and ClassMarkSvg
 * (charts) both read these, and neither takes a size.
 */
export const CLASS_BADGE = { size: 18, radius: 4, font: 10, weight: 800 } as const;

/**
 * Every text property of the badge letter, set on the badge itself so nothing around it
 * (a table header, a bold or uppercase label, a chart's text style) can change it.
 */
const LETTER_STYLE = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
  fontSize: `${CLASS_BADGE.font}px`,
  fontWeight: CLASS_BADGE.weight,
  fontStyle: "normal",
  letterSpacing: 0,
  textTransform: "none",
  lineHeight: 1,
} as const;

/**
 * A sentence with every "Class A" … "Class DC" in it drawn as the class badge, inline
 * (insights, links: the badge is the class — user, 26 Nov 2026).
 */
export function withClassBadges(text: string): ReactNode {
  const parts = text.split(/Class (A|B|C|N|DC)/);
  if (parts.length === 1) return text;
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <Box as="span" key={i} display="inline-flex" verticalAlign="middle" mx="2px">
        <ClassBadge cls={p} />
      </Box>
    ) : (
      p
    ),
  );
}

/** The same badge drawn in an SVG chart (axis ticks): centred on x, top at y. */
export function ClassMarkSvg({ cls, x = 0, y = 0 }: { cls: string; x?: number; y?: number }) {
  const { size, radius } = CLASS_BADGE;
  return (
    <g transform={`translate(${x - size / 2},${y})`}>
      <title>{className(cls)}</title>
      <rect width={size} height={size} rx={radius} fill={clsColor(cls === 'Other' ? 'Others' : cls)} />
      <text x={size / 2} y={size / 2} dy="0.35em" textAnchor="middle" fill="#FFFFFF" style={LETTER_STYLE}>
        {classLetter(cls)}
      </text>
    </g>
  );
}

export function ClassBadge({ cls }: { cls: string }) {
  const { size, radius } = CLASS_BADGE;
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
      borderRadius={`${radius}px`}
      bg={clsColor(cls === 'Other' ? 'Others' : cls)}
      color="#FFFFFF"
      style={LETTER_STYLE}
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
            <ClassBadge cls={c} />
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
