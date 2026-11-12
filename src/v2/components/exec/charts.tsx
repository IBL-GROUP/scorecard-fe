// Small chart primitives for the 2.0 executive screens, drawn with the design
// system's colour tokens so light and dark mode re-colour them.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import type { MouseEvent, ReactNode } from 'react';
import { colors } from '@/v2/constants/theme';
import type { Rag } from '@/v2/features/kpiThresholds';
import { ragCell } from './Rag';

/** Shared Recharts styling. */
export const axis = { stroke: colors.axisText, fontSize: 11, tickLine: false } as const;
export const grid = { stroke: colors.gridStroke, strokeDasharray: '3 3' } as const;
export const tooltipStyle = {
  contentStyle: { background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 12, color: colors.darkText },
  labelStyle: { color: colors.darkText, fontWeight: 600 },
  itemStyle: { color: colors.bodyText },
} as const;

export function Sparkline({ values, color = colors.sales, height = 26 }: { values: (number | null)[]; color?: string; height?: number }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return null;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const w = 120;
  const x = (i: number) => (i / (values.length - 1)) * (w - 4) + 2;
  const y = (v: number) => (max === min ? height / 2 : height - 3 - ((v - min) / (max - min)) * (height - 6));
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-label="6-month trend" role="img">
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last.i)} cy={y(last.v)} r="2.2" fill={color} />
    </svg>
  );
}

/** The 1.0 accuracy gauge, kept (RV-14, RV-15): a half-ring from 0 to 120%. */
export function Gauge({ value, label, rag }: { value: number | null; label: string; rag?: Rag | null }) {
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
  onClick?: () => void;
}) {
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <Grid templateColumns="74px 1fr 120px" gap="10px" alignItems="center" py="5px" cursor={onClick ? 'pointer' : undefined} onClick={onClick} _hover={onClick ? { bg: colors.hoverBg } : undefined} borderRadius="4px" px="4px">
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

/** Small legend row. */
export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <Flex gap="12px" wrap="wrap" fontSize="11.5px" color={colors.mutedText}>
      {items.map((i) => (
        <Flex key={i.label} align="center" gap="5px">
          <Box w="12px" h={i.dashed ? '0' : '8px'} borderTop={i.dashed ? `2px dashed ${i.color}` : undefined} bg={i.dashed ? undefined : i.color} borderRadius="2px" />
          {i.label}
        </Flex>
      ))}
    </Flex>
  );
}
