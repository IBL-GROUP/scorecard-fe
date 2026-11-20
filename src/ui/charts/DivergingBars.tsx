import { Box, Flex, Text } from '@chakra-ui/react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useExpanded } from '@/ui/overlay';
import { colors } from '@/constants/theme';

// Achievement charts, each shaped for its question (see the chart plan):
//   AchRings      few items: "how close is each?"
//   AchPctBars    ahead/behind 100% of target, in points
//   AchGapBars    money ahead of / short of target, around zero
//   DivergingBars the drawing behind AchGapBars, for any +/− figure (growth %)
//   AchStatusBoard  items sorted into Behind / Close / On target columns
//   AchBullets    sales bar inside the target band, B as a tick
//   AchGapList    long lists: ranked by money short (or over)

export interface AchItem {
  name: string;
  /** Achievement %, sales ÷ target × 100. */
  value: number;
  sale_value: number;
  target_value: number;
  /** Comparison period (B) sales, when compare is on. */
  prior?: number;
  /** The same days last year, when that comparison is on. */
  ly?: number;
}

type Pick = (name: string) => void;

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

let measureCtx: CanvasRenderingContext2D | null = null;
/** Width of a label in px, so name columns fit the longest name instead of cutting it. */
function textWidth(t: string, font = `12px ${typeof document !== 'undefined' ? getComputedStyle(document.body).fontFamily : 'sans-serif'}`) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return t.length * 7;
  measureCtx.font = font;
  return measureCtx.measureText(t).width;
}
const fitName = (t: string, max: number) => {
  if (textWidth(t) <= max) return t;
  let s = t;
  while (s.length > 3 && textWidth(`${s}…`) > max) s = s.slice(0, -1);
  return `${s}…`;
};

/** The hover card's box, placed at the pointer and flipped left near the right edge. */
function TipBox({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <Box
      position="absolute"
      left={`${x + 12}px`}
      top={`${y + 12}px`}
      zIndex={5}
      pointerEvents="none"
      bg={colors.cardBg}
      border="1px solid"
      borderColor={colors.border}
      borderRadius="4px"
      boxShadow={`0 4px 14px ${colors.shadow}`}
      px={3}
      py={2}
      minW="170px"
      fontSize="12px"
      css={{ transform: x > 260 ? 'translateX(calc(-100% - 24px))' : undefined }}
    >
      {children}
    </Box>
  );
}

function Host({ children, hostRef }: { children: ReactNode; hostRef?: React.Ref<HTMLDivElement> }) {
  // In the ⤢ pop-up the parent has no height of its own, so give it one.
  const expanded = useExpanded();
  return (
    <Box ref={hostRef} data-ach-host position="relative" w="100%" h={expanded ? 'min(600px, 70vh)' : '100%'} minH={0}>
      {children}
    </Box>
  );
}

/**
 * The scale for a set of bar sizes, ignoring runaway values at the top.
 *
 * A few items far beyond the rest (24,719% and 8,412% over, then 146%) would
 * flatten every other bar to nothing. Walking down the biggest few, the first
 * size more than 3× the next marks the break: the scale stops a little past
 * the size below it, and the ones above run full length with their exact
 * numbers still on them.
 */
function scaleMax(sizes: number[]) {
  const desc = [...sizes].sort((a, b) => b - a);
  for (let k = 0; k < Math.min(5, desc.length - 1); k++) {
    if (desc[k + 1] > 0 && desc[k] > 3 * desc[k + 1]) return desc[k + 1] * 1.25;
  }
  return Math.max(1e-9, desc[0] ?? 0);
}

// ── Diverging bars (any +/− figure, around zero) ────────────────────────────

export interface DivergingItem {
  name: string;
  /** Signed: below zero draws left in red, above zero right in green. */
  value: number;
  /** What the hover card says under the name. */
  tip?: ReactNode;
  /** Text at the bar's end instead of the signed value (e.g. "123.5%"). */
  label?: string;
}

/**
 * Bars either side of a zero line: most negative at the top, most positive at
 * the bottom, each with its signed value at the end. When the rows do not fit,
 * the extremes stay and the middle is hidden (⤢ shows all). Teams short of /
 * ahead of target, BU against 100% and every growth chart in Sales Pulse draw
 * with it, so a +/− figure reads the same wherever it appears.
 *
 * Runaway values (see scaleMax) run to the edge, marked ›; their labels are
 * still exact.
 */
export function DivergingBars({
  items,
  fmt: format,
  note,
  onPick,
  emptyText = 'Nothing to show here.',
}: {
  items: DivergingItem[];
  /** Formats the size of a value; the sign is added in front. */
  fmt: (abs: number) => string;
  /** The footnote's description, e.g. "◂ short of target · ahead ▸ (in value)". */
  note: string;
  onPick?: Pick;
  emptyText?: string;
}) {
  const expanded = useExpanded();
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const [tip, setTip] = useState<{ x: number; y: number; item: DivergingItem } | null>(null);
  const hoverOn = (item: DivergingItem) => (e: React.MouseEvent) => {
    const r = (e.currentTarget as Element).closest('[data-ach-host]')?.getBoundingClientRect();
    setTip({ x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0), item });
  };
  const all = items.filter((i) => Number.isFinite(i.value)).sort((a, b) => a.value - b.value); // most negative first
  const rowH = 22;
  const fit = expanded ? all.length : Math.max(3, Math.floor((h - 26) / rowH));
  // Show the extremes: most negative at the top, most positive at the bottom.
  const list = all.length <= fit ? all : [...all.slice(0, Math.ceil(fit / 2)), ...all.slice(all.length - Math.floor(fit / 2))];
  const hidden = all.length - list.length;
  const longest = Math.max(60, ...list.map((i) => textWidth(i.name)));
  const LABEL = Math.min(Math.max(90, w * 0.38), longest + 14);
  const VAL = 56;
  const plotW = Math.max(40, w - LABEL - VAL * 2);
  const max = scaleMax(list.map((i) => Math.abs(i.value)));
  const anyNeg = list.some((i) => i.value < 0);
  const anyPos = list.some((i) => i.value > 0);
  // Zero sits in the middle when there are both; at the edge when not.
  const zeroX = LABEL + VAL + (anyNeg && anyPos ? plotW / 2 : anyNeg ? plotW : 0);
  const scale = (anyNeg && anyPos ? plotW / 2 : plotW) / max;
  return (
    <Host hostRef={ref}>
      {!all.length ? (
        <Flex h="100%" align="center" justify="center">
          <Text fontSize="13px" color={colors.mutedText}>
            {emptyText}
          </Text>
        </Flex>
      ) : (
        w > 0 && (
          <>
            <svg width={w} height={list.length * rowH + 4} role="img" aria-label={note}>
              <line x1={zeroX} x2={zeroX} y1={0} y2={list.length * rowH} stroke="var(--sp-target)" strokeWidth="1.5" />
              {list.map((i, k) => {
                const cy = k * rowH + rowH / 2;
                const neg = i.value < 0;
                const over = Math.abs(i.value) > max;
                const bw = Math.max(2, Math.min(Math.abs(i.value), max) * scale);
                const bx = neg ? zeroX - bw : zeroX;
                const gapRow = hidden > 0 && k === Math.ceil(fit / 2);
                return (
                  <g
                    key={i.name}
                    onMouseMove={hoverOn(i)}
                    onMouseLeave={() => setTip(null)}
                    onClick={() => onPick?.(i.name)}
                    style={{ cursor: onPick ? 'pointer' : 'default' }}
                  >
                    {gapRow && <line x1={0} x2={w} y1={k * rowH} y2={k * rowH} stroke="var(--sp-border)" strokeDasharray="2 3" />}
                    <rect x={0} y={k * rowH} width={w} height={rowH} fill="transparent" />
                    <text style={{ fontSize: 12 }} x={LABEL - 8} y={cy + 4} textAnchor="end" fill="var(--sp-body-text)">
                      {fitName(i.name, LABEL - 12)}
                    </text>
                    <rect x={bx} y={cy - 6} width={bw} height={12} rx={3} fill={neg ? 'var(--sp-bad)' : 'var(--sp-good)'} className="sp-rise" />
                    <text
                      x={neg ? bx - 4 : bx + bw + 4}
                      y={cy + 4}
                      textAnchor={neg ? 'end' : 'start'}
                      fontWeight={600}
                      fill={neg ? 'var(--sp-bad)' : 'var(--sp-good)'}
                      style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {over ? (neg ? '‹ ' : '› ') : ''}
                      {i.label ?? `${neg ? '−' : '+'}${format(Math.abs(i.value))}`}
                    </text>
                  </g>
                );
              })}
            </svg>
            <Flex position="absolute" bottom={0} left={0} right={0} justify="space-between" fontSize="11px" color={colors.mutedText}>
              <span>{note}</span>
              {hidden > 0 && <span>{hidden} in the middle hidden · ⤢ for all</span>}
            </Flex>
          </>
        )
      )}
      {tip && (
        <TipBox x={tip.x} y={tip.y}>
          <Text fontWeight={700} color={colors.darkText} mb="2px">
            {tip.item.name}
          </Text>
          {tip.item.tip ?? (
            <Text color={tip.item.value < 0 ? colors.bad : colors.good} fontWeight={600}>
              {tip.item.label ?? `${tip.item.value < 0 ? '−' : '+'}${format(Math.abs(tip.item.value))}`}
            </Text>
          )}
        </TipBox>
      )}
    </Host>
  );
}
