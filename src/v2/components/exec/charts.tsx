// Small chart primitives for the 2.0 executive screens, drawn with the design
// system's colour tokens so light and dark mode re-colour them.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import type { MouseEvent, ReactNode } from 'react';
import { colors } from '@/v2/constants/theme';
import { kpiThresholds, type Band, type BandKey, type Rag } from '@/v2/features/kpiThresholds';
import { RAG_META, ragCell } from './Rag';

/** Shared Recharts styling. */
export const axis = { stroke: colors.axisText, fontSize: 11, tickLine: false } as const;
export const grid = { stroke: colors.gridStroke, strokeDasharray: '3 3' } as const;
export const tooltipStyle = {
  contentStyle: { background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, color: colors.darkText },
  labelStyle: { color: colors.darkText, fontWeight: 600 },
  itemStyle: { color: colors.bodyText },
} as const;

/** The 1.0 accuracy gauge, kept (RV-14, RV-15): a half-ring from 0 to 120%. */
/** The 1.0 gauge footer (FR-EXEC-040): target and achieved side by side, then how far above or below target. */
export interface GaugeFooter {
  /** "Month Budget" or "Month Target", as in 1.0. */
  targetLabel: string;
  target: string;
  achieved: string;
}

export function Gauge({ value, label, rag, footer }: { value: number | null; label: string; rag?: Rag | null; footer?: GaugeFooter }) {
  const max = 120;
  const v = Math.max(0, Math.min(max, value ?? 0));
  const angle = Math.PI * (1 - v / max);
  const r = 70;
  const cx = 90;
  const cy = 86;
  const end = { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  const mark = (p: number) => {
    const a = Math.PI * (1 - p / max);
    return { x1: cx + (r - 12) * Math.cos(a), y1: cy - (r - 12) * Math.sin(a), x2: cx + (r + 8) * Math.cos(a), y2: cy - (r + 8) * Math.sin(a) };
  };
  const m100 = mark(100);
  const color = rag ? ragCell(rag).color : colors.sales;
  return (
    <Flex direction="column" align="center">
      <svg width="180" height="100" viewBox="0 0 180 100" role="img" aria-label={`${label}: ${value == null ? 'no value' : value.toFixed(1) + '%'}`}>
        <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`} fill="none" stroke={colors.sunkBg} strokeWidth="14" />
        {value != null && <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${end.x.toFixed(1)},${end.y.toFixed(1)}`} fill="none" stroke={color} strokeWidth="14" />}
        <line {...m100} stroke={colors.target} strokeWidth="2.5" />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="16" fontWeight="700" fill={colors.darkText}>
          {value == null ? '—' : `${value.toFixed(1)}%`}
        </text>
      </svg>
      <Text fontSize="12px" color={colors.mutedText} mt="-4px">
        {label}
      </Text>
      {footer && (
        <>
          <Flex mt={2} gap={3} justify="center" data-gauge-footer>
            <Box textAlign="center">
              <Text fontSize="10px" color={colors.mutedText} fontWeight={600} textTransform="uppercase" letterSpacing="wide" whiteSpace="nowrap">
                {footer.targetLabel}
              </Text>
              <Text fontSize="12.5px" color={colors.bodyText} fontWeight={700} fontVariantNumeric="tabular-nums">
                {footer.target}
              </Text>
            </Box>
            <Box w="1px" bg={colors.border} alignSelf="stretch" />
            <Box textAlign="center">
              <Text fontSize="10px" color={colors.mutedText} fontWeight={600} textTransform="uppercase" letterSpacing="wide" whiteSpace="nowrap">
                Achieved
              </Text>
              <Text fontSize="12.5px" color={color} fontWeight={700} fontVariantNumeric="tabular-nums">
                {footer.achieved}
              </Text>
            </Box>
          </Flex>
          {/* 1.0 rule: the gauge % minus 100 (GaugeChart). */}
          {value != null && (
            <Text fontSize="12px" fontWeight={700} color={value >= 100 ? colors.good : colors.bad} mt="2px" fontVariantNumeric="tabular-nums">
              {value >= 100 ? '▲' : '▼'} {Math.abs(value - 100).toFixed(1)}% {value >= 100 ? 'above' : 'below'} target
            </Text>
          )}
        </>
      )}
    </Flex>
  );
}

/** Horizontal bullet: bar = actual, tick = target, shaded zone = below threshold (IN-07). */
export function Bullet({
  label,
  actual,
  target,
  threshold,
  max,
  color,
  rag,
  right,
  sub,
  onClick,
}: {
  label: ReactNode;
  actual: number | null;
  target: number | null;
  threshold?: number | null;
  max: number;
  color: string;
  rag?: Rag | null;
  right?: ReactNode;
  /** A second line under the bar (e.g. inventory value and units, FR-EXEC-032). */
  sub?: ReactNode;
  onClick?: () => void;
}) {
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <Grid data-bullet templateColumns="74px 1fr 120px" gap="10px" alignItems="center" py="5px" cursor={onClick ? 'pointer' : undefined} onClick={onClick} _hover={onClick ? { bg: colors.hoverBg } : undefined} borderRadius="4px" px="4px">
      <Text fontSize="12.5px" fontWeight={600} color={colors.darkText} truncate>
        {label}
      </Text>
      <Box position="relative" h="18px" bg={colors.sunkBg} borderRadius="3px" overflow="hidden">
        {threshold != null && <Box position="absolute" left={0} top={0} bottom={0} w={pos(threshold)} bg={colors.badSoft} title={`Below threshold (${threshold} d)`} />}
        {actual != null && <Box position="absolute" left={0} top="4px" h="10px" w={pos(actual)} bg={color} borderRadius="2px" className="sp-grow" />}
        {target != null && <Box position="absolute" top="1px" bottom="1px" w="3px" left={`calc(${pos(target)} - 1px)`} bg={colors.target} title={`Benchmark ${target} d`} />}
      </Box>
      <Flex justify="flex-end" align="center" gap="6px" fontSize="12px" color={rag ? ragCell(rag).color : colors.bodyText} fontWeight={600}>
        {right}
      </Flex>
      {sub && (
        <Text gridColumn="2 / -1" mt="-6px" fontSize="11px" color={colors.mutedText} fontVariantNumeric="tabular-nums" truncate>
          {sub}
        </Text>
      )}
    </Grid>
  );
}

/** Matrix heatmap with RAG cells (IN-10, IN-12). */
export function Heatmap({
  cols,
  rows,
  format,
  ragOf,
  onCell,
  highlightRow,
}: {
  cols: string[];
  rows: { label: string; cells: (number | null)[]; extra?: ReactNode }[];
  format: (v: number | null) => string;
  ragOf: (v: number | null, col: number) => Rag | null;
  onCell?: (row: string, col: number, shift: boolean) => void;
  highlightRow?: string[];
}) {
  return (
    <Box overflowX="auto">
      <Box as="table" w="100%" fontSize="12px" style={{ borderCollapse: 'separate', borderSpacing: '2px' }}>
        <thead>
          <tr>
            <Box as="th" textAlign="left" color={colors.mutedText} fontWeight={500} px="6px" py="4px">
              Branch
            </Box>
            {cols.map((c) => (
              <Box as="th" key={c} color={colors.mutedText} fontWeight={500} px="6px" py="4px" textAlign="center">
                {c}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <Box as="td" px="6px" py="3px" color={colors.darkText} fontWeight={highlightRow?.includes(r.label) ? 700 : 500} whiteSpace="nowrap">
                {highlightRow?.includes(r.label) ? '▸ ' : ''}
                {r.label}
                {r.extra}
              </Box>
              {r.cells.map((v, i) => {
                const s = ragCell(ragOf(v, i));
                return (
                  <Box
                    as="td"
                    key={i}
                    textAlign="center"
                    px="6px"
                    py="5px"
                    bg={s.bg ?? colors.sunkBg}
                    color={s.color}
                    fontWeight={600}
                    borderRadius="3px"
                    cursor={onCell ? 'pointer' : undefined}
                    title={onCell ? 'Click for details; Shift-click to open the matching table rows' : undefined}
                    onClick={onCell ? (e: MouseEvent) => onCell(r.label, i, e.shiftKey) : undefined}
                    fontVariantNumeric="tabular-nums"
                  >
                    {format(v)}
                  </Box>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

/**
 * How a legend swatch is drawn, so it looks like the mark it explains
 * (FR-EXEC-033): a bar, a line, a dashed target line, a vertical benchmark
 * tick, a shaded band or heatmap cell, or a status dot.
 */
export type LegendShape = 'bar' | 'line' | 'dashed' | 'tick' | 'band' | 'dot';

export interface LegendItem {
  label: string;
  color: string;
  shape?: LegendShape;
  /** Old spelling of shape 'dashed'. */
  dashed?: boolean;
  /** Several colours in one swatch: bars drawn in each class's colour. */
  colors?: string[];
  /** Text colour of a 'band' swatch (heatmap cells: soft fill, strong text). */
  ink?: string;
}

function Swatch({ i }: { i: LegendItem }) {
  const shape: LegendShape = i.shape ?? (i.dashed ? 'dashed' : 'bar');
  switch (shape) {
    case 'line':
      return (
        <Box position="relative" w="16px" h="10px" flexShrink={0}>
          <Box position="absolute" left={0} right={0} top="4px" h="2.5px" bg={i.color} borderRadius="2px" />
          <Box position="absolute" left="5px" top="2px" w="6px" h="6px" bg={i.color} borderRadius="50%" />
        </Box>
      );
    case 'dashed':
      return <Box w="16px" h="0" borderTop={`2px dashed ${i.color}`} flexShrink={0} />;
    case 'tick':
      return <Box w="2.5px" h="12px" bg={i.color} borderRadius="1px" flexShrink={0} mx="3px" />;
    case 'band':
      return (
        <Box w="14px" h="10px" bg={i.color} borderRadius="2px" flexShrink={0} border="1px solid" borderColor={i.ink ?? 'transparent'} opacity={0.95} />
      );
    case 'dot':
      return <Box w="8px" h="8px" bg={i.color} borderRadius="50%" flexShrink={0} />;
    default:
      return i.colors?.length ? (
        <Flex w="16px" h="8px" borderRadius="2px" overflow="hidden" flexShrink={0}>
          {i.colors.map((c) => (
            <Box key={c} flex={1} bg={c} />
          ))}
        </Flex>
      ) : (
        <Box w="14px" h="8px" bg={i.color} borderRadius="2px" flexShrink={0} />
      );
  }
}

/** Legend row at the foot of a chart: one item per mark the chart draws (FR-EXEC-033). */
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <Flex as="ul" listStyleType="none" gap="6px 14px" wrap="wrap" fontSize="11.5px" color={colors.bodyText} pt="6px" flexShrink={0} aria-label="Legend" data-legend>
      {items.map((i) => (
        <Flex as="li" key={i.label} align="center" gap="6px">
          <Swatch i={i} />
          {i.label}
        </Flex>
      ))}
    </Flex>
  );
}

/**
 * Legend items for a status band, worded from the band itself (no new rule):
 * e.g. "On track ≥ 95%", "Watch 90–95%", "Act < 90%". `what` is appended
 * ("of benchmark"); `shape` matches how the chart shows the status.
 */
export function ragLegend(key: BandKey, opts: { unit?: string; what?: string; shape?: LegendShape } = {}): LegendItem[] {
  const { unit = '%', what, shape = 'dot' } = opts;
  const b: Band = kpiThresholds[key];
  const tail = what ? ` ${what}` : '';
  const words =
    b.kind === 'higher'
      ? [`≥ ${b.green}${unit}`, `${b.amber}–${b.green}${unit}`, `< ${b.amber}${unit}`]
      : b.kind === 'lower'
        ? [`≤ ${b.green}${unit}`, `≤ ${b.amber}${unit}`, `> ${b.amber}${unit}`]
        : [`${b.greenLo}–${b.greenHi}${unit}`, `${b.amberLo}–${b.amberHi}${unit}`, 'outside'];
  return (['green', 'amber', 'red'] as const).map((r, n) => {
    const c = ragCell(r);
    return shape === 'band'
      ? { label: `${RAG_META[r].word} ${words[n]}${tail}`, color: c.bg ?? c.color, ink: c.color, shape }
      : { label: `${RAG_META[r].word} ${words[n]}${tail}`, color: c.color, shape };
  });
}

