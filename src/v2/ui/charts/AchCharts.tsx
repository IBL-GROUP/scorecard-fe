import { Box, Flex, Text } from '@chakra-ui/react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useExpanded } from '@/v2/ui/overlay';
import { colors, formatCompact, fmt1 } from '@/v2/constants/theme';
import { byName } from '@/v2/ui/byName';
import { AnimatedValue } from '@/v2/ui/motion';
import { useCardLegend } from '@/v2/ui/chart-card/legend';

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

const fmt = (n: number) => formatCompact(n);
const pct = (n: number) => `${fmt1(n)}%`;
const statusOf = (v: number) => (v >= 100 ? 'good' : v >= 80 ? 'warn' : 'bad');
const STATUS = {
  good: { ink: colors.good, soft: colors.goodSoft, label: 'On or above target' },
  warn: { ink: colors.warn, soft: colors.warnSoft, label: 'Close (80–100%)' },
  bad: { ink: colors.bad, soft: colors.badSoft, label: 'Behind (below 80%)' },
};
const isUnassigned = (n: string) => !n || n === 'Others' || n === 'null' || n === '—';
/**
 * The items a chart draws: everything with a target, with all unassigned
 * rows (blank, null, "Others") folded into ONE "Others" item. Nothing is
 * dropped — Others is always shown, and byName keeps it last in A→Z lists.
 */
const withTarget = (items: AchItem[]) => {
  const named = items.filter((i) => i.target_value > 0 && !isUnassigned(i.name));
  const rest = items.filter((i) => isUnassigned(i.name));
  const sale = rest.reduce((a, i) => a + i.sale_value, 0);
  const target = rest.reduce((a, i) => a + i.target_value, 0);
  const prior = rest.some((i) => i.prior != null) ? rest.reduce((a, i) => a + (i.prior ?? 0), 0) : undefined;
  const ly = rest.some((i) => i.ly != null) ? rest.reduce((a, i) => a + (i.ly ?? 0), 0) : undefined;
  const others: AchItem[] =
    target > 0 ? [{ name: 'Others', value: (sale / target) * 100, sale_value: sale, target_value: target, prior, ly }] : [];
  return [...named, ...others];
};
/** As withTarget, for charts with no target (Units, EFP without a budget): everything with sales in any period. */
const withSales = (items: AchItem[]) => {
  const has = (i: AchItem) => i.sale_value > 0 || (i.prior ?? 0) > 0 || (i.ly ?? 0) > 0;
  const named = items.filter((i) => has(i) && !isUnassigned(i.name));
  const rest = items.filter((i) => isUnassigned(i.name));
  const sum = (k: 'sale_value' | 'prior' | 'ly') => rest.reduce((a, i) => a + (i[k] ?? 0), 0);
  const others: AchItem = {
    name: 'Others',
    value: 0,
    sale_value: sum('sale_value'),
    target_value: 0,
    prior: rest.some((i) => i.prior != null) ? sum('prior') : undefined,
    ly: rest.some((i) => i.ly != null) ? sum('ly') : undefined,
  };
  return has(others) ? [...named, others] : named;
};

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

/**
 * What a hover card can add beyond the item itself: the period names, the
 * chart's total (for the row's share), and whether the row already prints its
 * figures — the bullets do, so their card leaves those out and adds what the
 * row cannot show.
 */
interface HoverExtras {
  periods?: { a?: string; b?: string; ly?: string };
  total?: number;
  rowShowsFigures?: boolean;
}

/** Hover card shared by every chart. */
function useHover(noun: 'target' | 'budget' | 'none' = 'target', extras: HoverExtras = {}) {
  const [tip, setTip] = useState<{ x: number; y: number; item: AchItem } | null>(null);
  const on = (item: AchItem) => (e: React.MouseEvent) => {
    const host = (e.currentTarget as Element).closest('[data-ach-host]') as HTMLElement | null;
    const r = host?.getBoundingClientRect();
    setTip({ x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0), item });
  };
  const off = () => setTip(null);
  const node = tip ? (
    noun === 'none' ? <SalesHoverCard {...tip} extras={extras} /> : <HoverCard {...tip} noun={noun} extras={extras} />
  ) : null;
  return { on, off, node };
}

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

/** One "label · value" line of a hover card. */
function TipLine({ label, children, color }: { label: string; children: ReactNode; color?: string }) {
  return (
    <Flex justify="space-between" gap={4} lineHeight="18px">
      <Text color={colors.mutedText}>{label}</Text>
      <Text color={color ?? colors.darkText} fontWeight={600} fontVariantNumeric="tabular-nums" textAlign="right">
        {children}
      </Text>
    </Flex>
  );
}

/**
 * Growth against last month and last year, and the item's share of the chart's
 * total — what a row cannot show. Each only when there is something to say.
 */
function TipComparisons({ item, extras }: { item: AchItem; extras: HoverExtras }) {
  const g = growthPct(item.sale_value, item.prior ?? undefined);
  const gly = growthPct(item.sale_value, item.ly ?? undefined);
  const arrow = (v: number) => `${v >= 0 ? '▲' : '▼'} ${pct(Math.abs(v))}`;
  const withValue = (v?: number) => (!extras.rowShowsFigures && v ? ` (${fmt(v)})` : '');
  return (
    <>
      {g != null && (
        <TipLine label={`vs ${extras.periods?.b ?? 'last month'}`} color={g >= 0 ? colors.good : colors.bad}>
          {arrow(g)}
          {withValue(item.prior)}
        </TipLine>
      )}
      {gly != null && (
        <TipLine label={`vs ${extras.periods?.ly ?? 'last year'}`} color={gly >= 0 ? colors.good : colors.bad}>
          {arrow(gly)}
          {withValue(item.ly)}
        </TipLine>
      )}
      {extras.total ? <TipLine label="Share of total sales">{pct((item.sale_value / extras.total) * 100)}</TipLine> : null}
    </>
  );
}

function HoverCard({
  x,
  y,
  item,
  noun = 'target',
  extras = {},
}: {
  x: number;
  y: number;
  item: AchItem;
  noun?: 'target' | 'budget';
  extras?: HoverExtras;
}) {
  const s = STATUS[statusOf(item.value)];
  const gap = item.sale_value - item.target_value;
  return (
    <TipBox x={x} y={y}>
      <Text fontWeight={700} color={colors.darkText} mb="2px">
        {item.name}
      </Text>
      <Text color={s.ink} fontWeight={600} mb="2px">
        {extras.rowShowsFigures ? s.label.replace('target', noun) : `${pct(item.value)} · ${s.label.replace('target', noun)}`}
      </Text>
      {!extras.rowShowsFigures && (
        <TipLine label="Sales">
          {fmt(item.sale_value)} of {fmt(item.target_value)}
        </TipLine>
      )}
      <TipLine label={gap >= 0 ? `Ahead of ${noun}` : `Short of ${noun}`} color={gap >= 0 ? colors.good : colors.bad}>
        {fmt(Math.abs(gap))}
      </TipLine>
      <TipComparisons item={item} extras={extras} />
    </TipBox>
  );
}

function SalesHoverCard({ x, y, item, extras = {} }: { x: number; y: number; item: AchItem; extras?: HoverExtras }) {
  return (
    <TipBox x={x} y={y}>
      <Text fontWeight={700} color={colors.darkText} mb="2px">
        {item.name}
      </Text>
      {!extras.rowShowsFigures && <TipLine label="Sales">{fmt(item.sale_value)}</TipLine>}
      <TipComparisons item={item} extras={extras} />
    </TipBox>
  );
}

/** Growth of this period over another, for the bullets' header when there is no target. */
const growthPct = (a: number, b?: number) => (b ? ((a - b) / b) * 100 : null);

function Host({ children, hostRef }: { children: ReactNode; hostRef?: React.Ref<HTMLDivElement> }) {
  // In the ⤢ pop-up the parent has no height of its own, so give it one.
  const expanded = useExpanded();
  return (
    <Box ref={hostRef} data-ach-host position="relative" w="100%" h={expanded ? 'min(600px, 70vh)' : '100%'} minH={0}>
      {children}
    </Box>
  );
}

function Empty() {
  return (
    <Flex h="100%" align="center" justify="center">
      <Text fontSize="13px" color={colors.mutedText}>
        No items with a target here.
      </Text>
    </Flex>
  );
}


// ── Rings ────────────────────────────────────────────────────────────────────
export function AchRings({ items, onPick }: { items: AchItem[]; onPick?: Pick }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const list = withTarget(items)
    .sort((a, b) => b.sale_value - a.sale_value)
    .slice(0, 6)
    .sort((a, b) => byName(a.name, b.name));
  const hover = useHover();
  // Rings grow to fill the card (bigger in the ⤢ pop-up), one row.
  const d = Math.round(Math.max(72, Math.min(200, h - 64, list.length ? w / list.length - 16 : 0)));
  const sw = Math.max(8, Math.round(d * 0.1));
  const R = (d - sw) / 2;
  const C = 2 * Math.PI * R;
  const font = Math.round(d * 0.17);
  return (
    <Host hostRef={ref}>
      {!list.length ? (
        <Empty />
      ) : (
        <Flex h="100%" align="center" justify="space-around" gap={2} className="sp-stagger">
          {list.map((i) => {
            const s = STATUS[statusOf(i.value)];
            const fill = Math.min(1, i.value / 100);
            const label = i.value >= 1000 ? `${Math.round(i.value)}%` : i.value >= 100 ? `${Math.round(i.value)}%` : pct(i.value);
            return (
              <Flex
                key={i.name}
                as="button"
                direction="column"
                align="center"
                gap={1}
                flex="1 1 0"
                minW={0}
                cursor={onPick ? 'pointer' : 'default'}
                onClick={() => onPick?.(i.name)}
                onMouseMove={hover.on(i)}
                onMouseLeave={hover.off}
                aria-label={`${i.name}: ${pct(i.value)} of target`}
              >
                <Box position="relative" w={`${d}px`} h={`${d}px`} flexShrink={0}>
                  <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`}>
                    <circle cx={d / 2} cy={d / 2} r={R} fill="none" stroke="var(--sp-sunk-bg)" strokeWidth={sw} />
                    <circle
                      cx={d / 2}
                      cy={d / 2}
                      r={R}
                      fill="none"
                      stroke={s.ink}
                      strokeWidth={sw}
                      strokeLinecap="round"
                      strokeDasharray={`${C * fill} ${C}`}
                      transform={`rotate(-90 ${d / 2} ${d / 2})`}
                      style={{ transition: 'stroke-dasharray var(--sp-m-300) var(--sp-ease-out)' }}
                    />
                  </svg>
                  <Flex position="absolute" inset={`${sw + 2}px`} direction="column" align="center" justify="center" textAlign="center">
                    <Text fontSize={`${font}px`} lineHeight="1.1" fontWeight={700} color={colors.darkText} fontVariantNumeric="tabular-nums">
                      <AnimatedValue value={label} />
                    </Text>
                    <Text fontSize={`${Math.max(10, Math.round(font * 0.55))}px`} color={s.ink} fontWeight={700}>
                      <AnimatedValue value={i.value >= 100 ? '▲ on target' : `${fmt(i.target_value - i.sale_value)} short`} />
                    </Text>
                  </Flex>
                </Box>
                {/* Two lines' room for every name, used or not: a name that
                    wraps (TRADE MARKETING) would otherwise make its column
                    taller and lift its ring out of line with the others. */}
                <Text
                  fontSize="13px"
                  fontWeight={600}
                  color={colors.darkText}
                  maxW="100%"
                  textAlign="center"
                  lineHeight="1.3"
                  minH="2.6em"
                  lineClamp={2}
                  title={i.name}
                >
                  {i.name}
                </Text>
                <Text fontSize="11.5px" color={colors.mutedText} fontVariantNumeric="tabular-nums">
                  {fmt(i.sale_value)} of {fmt(i.target_value)}
                </Text>
              </Flex>
            );
          })}
        </Flex>
      )}
      {hover.node}
    </Host>
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
                      style={{ fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}
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

/** An item's achievement, for the diverging charts' hover card. */
function achTip(i: AchItem) {
  const s = STATUS[statusOf(i.value)];
  return (
    <>
      <Text color={s.ink} fontWeight={600}>
        {pct(i.value)} · {s.label}
      </Text>
      <Text color={colors.bodyText}>
        Sales {fmt(i.sale_value)} of {fmt(i.target_value)} target
      </Text>
      <Text color={colors.mutedText}>
        {i.sale_value >= i.target_value ? `+${fmt(i.sale_value - i.target_value)} over` : `${fmt(i.target_value - i.sale_value)} short`}
      </Text>
    </>
  );
}

// ── % bars (behind / ahead of 100%, in points) ──────────────────────────────
export function AchPctBars({ items, onPick }: { items: AchItem[]; onPick?: Pick }) {
  return (
    <DivergingBars
      items={withTarget(items).map((i) => ({
        name: i.name,
        value: i.value - 100,
        label: i.value > 999 ? '>999%' : pct(i.value),
        tip: achTip(i),
      }))}
      fmt={(abs) => `${fmt1(abs)} pts`}
      note="◂ behind · ahead ▸ of 100% of target"
      onPick={onPick}
      emptyText="No items with a target here."
    />
  );
}

// ── Gap bars (money ahead / short, around zero) ──────────────────────────────
export function AchGapBars({ items, onPick }: { items: AchItem[]; onPick?: Pick }) {
  return (
    <DivergingBars
      items={withTarget(items).map((i) => ({
        name: i.name,
        value: i.sale_value - i.target_value,
        tip: achTip(i),
      }))}
      fmt={fmt}
      note="◂ short of target · ahead ▸ (in value)"
      onPick={onPick}
      emptyText="No items with a target here."
    />
  );
}

// ── Status board (Behind / Close / On target) ─────────────────────────────────
export function AchStatusBoard({ items, onPick }: { items: AchItem[]; onPick?: Pick }) {
  const hover = useHover();
  const all = withTarget(items).filter((i) => i.sale_value > 0 || i.target_value > 0);
  if (!all.length) return <Empty />;
  const cols = (['bad', 'warn', 'good'] as const).map((k) => {
    const list = all.filter((i) => statusOf(i.value) === k).sort((a, b) => b.sale_value - a.sale_value);
    return { k, list, sales: list.reduce((s, i) => s + i.sale_value, 0), gap: list.reduce((s, i) => s + (i.sale_value - i.target_value), 0) };
  });
  const title = { bad: 'Behind · below 80%', warn: 'Close · 80–100%', good: 'On target · 100%+' };
  return (
    <Host>
      <Flex h="100%" gap={2} minH={0}>
        {cols.map((c) => {
          const s = STATUS[c.k];
          return (
            <Flex key={c.k} direction="column" flex="1 1 0" minW={0} minH={0} bg={colors.sunkBg} borderRadius="4px">
              <Box px={2} pt="6px" pb="4px">
                <Text fontSize="12px" fontWeight={700} color={s.ink} truncate>
                  {title[c.k]}
                </Text>
                <Text fontSize="11px" color={colors.mutedText} truncate>
                  {fmt(c.sales)} · {c.gap >= 0 ? '+' : '−'}
                  {fmt(Math.abs(c.gap))}
                </Text>
              </Box>
              <Box flex={1} minH={0} overflowY="auto" px="6px" pb="6px" className="sp-stagger">
                {c.list.length === 0 ? (
                  <Text fontSize="11.5px" color={colors.mutedText} px={1}>
                    None
                  </Text>
                ) : (
                  c.list.map((i) => (
                    <Box
                      key={i.name}
                      as="button"
                      display="block"
                      w="100%"
                      textAlign="left"
                      bg={colors.cardBg}
                      border="1px solid"
                      borderColor={colors.border}
                      borderRadius="3px"
                      px={2}
                      py="4px"
                      mb="4px"
                      cursor={onPick ? 'pointer' : 'default'}
                      _hover={{ borderColor: s.ink }}
                      onClick={() => onPick?.(i.name)}
                      onMouseMove={hover.on(i)}
                      onMouseLeave={hover.off}
                      title={i.name}
                    >
                      <Flex justify="space-between" gap={1} align="baseline">
                        <Text fontSize="12px" fontWeight={600} color={colors.darkText} truncate>
                          {i.name}
                        </Text>
                        <Text fontSize="11.5px" fontWeight={700} color={s.ink} flexShrink={0} fontVariantNumeric="tabular-nums">
                          {i.value >= 1000 ? `${Math.round(i.value)}%` : pct(i.value)}
                        </Text>
                      </Flex>
                      <Text fontSize="11px" color={colors.mutedText} fontVariantNumeric="tabular-nums">
                        {fmt(i.sale_value)} of {fmt(i.target_value)}
                      </Text>
                    </Box>
                  ))
                )}
              </Box>
            </Flex>
          );
        })}
      </Flex>
      {hover.node}
    </Host>
  );
}

// ── Bullets ─────────────────────────────────────────────────────────────────
export function AchBullets({
  items,
  onPick,
  showPrior,
  showLy = false,
  noun = 'target',
  periods,
  noTarget = false,
}: {
  items: AchItem[];
  onPick?: Pick;
  showPrior?: boolean;
  /** Also draw the same days last year, under the B bar. */
  showLy?: boolean;
  /** Names for the bars, e.g. { a: "Nov '26", b: "Oct '26", ly: "Nov '25" }. */
  periods?: { a: string; b: string; ly?: string };
  /** EFP is compared with the budget, TP with the target. */
  noun?: 'target' | 'budget';
  /** No target to draw (Units, EFP without a budget): the same rows, sales only. */
  noTarget?: boolean;
}) {
  const expanded = useExpanded();
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const all = (noTarget ? withSales(items) : withTarget(items)).sort((a, b) => byName(a.name, b.name));
  const hover = useHover(noTarget ? 'none' : noun, {
    periods,
    total: all.reduce((n, i) => n + Math.max(0, i.sale_value), 0),
    rowShowsFigures: true,
  });
  // With a comparison on, each row carries a second bar for the B period.
  const rowH = 38 + (showPrior ? 14 : 0) + (showLy ? 12 : 0);
  const aName = periods?.a || 'This period';
  const bName = periods?.b || 'B period';
  const lyName = periods?.ly || 'Last year';
  const fit = expanded ? all.length : Math.max(2, Math.floor((h - 20) / rowH));
  const list = all.slice(0, fit);
  const max = Math.max(1, ...list.map((i) => Math.max(i.target_value, i.sale_value, i.prior ?? 0, showLy ? i.ly ?? 0 : 0)));
  // A row far smaller than the biggest (TRADE MARKETING beside a division)
  // would draw as nothing; any figure above zero keeps a bar at least 3px long,
  // so the row always shows its bars and its target line.
  // (Not before the card has a width: 3px of nothing would fill every bar.)
  const minScale = w > 58 ? 3 / (w - 58) : 0;
  const scale = (value: number) => (value > 0 ? Math.min(1, Math.max(value / max, minScale)) : 0);
  // In a ChartCard the legend sits under the card's title, not under the bars.
  const legendInCard = useCardLegend([
    { label: aName, color: colors.sales },
    ...(showPrior ? [{ label: bName, color: colors.prior }] : []),
    ...(showLy ? [{ label: lyName, color: colors.lastYear }] : []),
    ...(noTarget ? [] : [{ label: noun === 'budget' ? 'Budget' : 'Target', color: colors.target, shape: 'tick' as const }]),
  ]);
  return (
    <Host hostRef={ref}>
      {!all.length ? (
        <Empty />
      ) : (
        <Flex direction="column" h="100%" gap={0}>
          <Box flex={1} minH={0} className="sp-stagger">
            {list.map((i) => {
              const s = STATUS[statusOf(i.value)];
              const g = showPrior ? growthPct(i.sale_value, i.prior) : null;
              return (
                <Box
                  key={i.name}
                  as="button"
                  display="block"
                  w="100%"
                  textAlign="left"
                  h={`${rowH}px`}
                  py="3px"
                  cursor={onPick ? 'pointer' : 'default'}
                  onClick={() => onPick?.(i.name)}
                  onMouseMove={hover.on(i)}
                  onMouseLeave={hover.off}
                  _hover={{ bg: colors.hoverBg }}
                  borderRadius="3px"
                >
                  <Flex justify="space-between" fontSize="12px" mb="3px" gap={2}>
                    <Text color={colors.darkText} fontWeight={500} truncate title={i.name}>
                      {i.name}
                    </Text>
                    {noTarget ? (
                      g != null && (
                        <Text color={colors.mutedText} whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                          vs {bName} ·{' '}
                          <Box as="span" color={g >= 0 ? colors.good : colors.bad} fontWeight={700}>
                            {g >= 0 ? '▲' : '▼'} {pct(Math.abs(g))}
                          </Box>
                        </Text>
                      )
                    ) : (
                      <Text color={colors.mutedText} whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                        {fmt(i.target_value)} {noun} ·{' '}
                        <Box as="span" color={s.ink} fontWeight={700}>
                          {pct(i.value)}
                        </Box>
                      </Text>
                    )}
                  </Flex>
                  {/* This period and (with a comparison on) the B period as two
                      separate bars on the same scale, each with its value at the
                      end, and one target line through both. */}
                  <Flex gap="8px" align="flex-start">
                    <Box position="relative" flex={1} minW={0}>
                      <Box h="11px" title={`${aName} ${fmt(i.sale_value)}`}>
                        <Box h="100%" w="100%" bg={colors.sales} borderRadius="2px" className="sp-grow" style={{ transform: `scaleX(${scale(i.sale_value)})` }} />
                      </Box>
                      {showPrior && (
                        <Box h="9px" mt="3px" title={`${bName} ${fmt(i.prior ?? 0)}`}>
                          <Box h="100%" w="100%" bg={colors.prior} borderRadius="2px" className="sp-grow" style={{ transform: `scaleX(${scale(i.prior ?? 0)})` }} />
                        </Box>
                      )}
                      {showLy && (
                        <Box h="9px" mt="3px" title={`${lyName} ${fmt(i.ly ?? 0)}`}>
                          <Box h="100%" w="100%" bg={colors.lastYear} borderRadius="2px" className="sp-grow" style={{ transform: `scaleX(${scale(i.ly ?? 0)})` }} />
                        </Box>
                      )}
                      {/* Target line, through both bars */}
                      {!noTarget && <Box position="absolute" top="-3px" bottom="-3px" w="2px" bg={colors.target} left={`max(0px, calc(${(i.target_value / max) * 100}% - 1px))`} title={`${noun === 'budget' ? 'Budget' : 'Target'} ${fmt(i.target_value)}`} />}
                    </Box>
                    <Flex direction="column" w="50px" flexShrink={0} fontSize="11px" textAlign="right" fontVariantNumeric="tabular-nums">
                      <Text lineHeight="11px" color={colors.darkText} fontWeight={600}>{fmt(i.sale_value)}</Text>
                      {showPrior && (
                        <Text lineHeight="9px" mt="3px" color={colors.mutedText}>{i.prior != null && i.prior > 0 ? fmt(i.prior) : '—'}</Text>
                      )}
                      {showLy && (
                        <Text lineHeight="9px" mt="3px" color={colors.mutedText}>{i.ly ? fmt(i.ly) : '—'}</Text>
                      )}
                    </Flex>
                  </Flex>
                </Box>
              );
            })}
          </Box>
          {(!legendInCard || all.length > list.length) && (
            <Flex gap={3} fontSize="11px" color={colors.mutedText} pt={1} wrap="wrap">
              {!legendInCard && (
                <>
                  <Flex align="center" gap="5px"><Box w="14px" h="8px" bg={colors.sales} borderRadius="1px" />{aName}</Flex>
                  {showPrior && <Flex align="center" gap="5px"><Box w="14px" h="6px" bg={colors.prior} borderRadius="1px" />{bName}</Flex>}
                  {showLy && <Flex align="center" gap="5px"><Box w="14px" h="6px" bg={colors.lastYear} borderRadius="1px" />{lyName}</Flex>}
                  {!noTarget && <Flex align="center" gap="5px"><Box w="2px" h="12px" bg={colors.target} />{noun === 'budget' ? 'Budget' : 'Target'}</Flex>}
                </>
              )}
              {all.length > list.length && <Text ml="auto">{all.length - list.length} more in ⤢</Text>}
            </Flex>
          )}
        </Flex>
      )}
      {hover.node}
    </Host>
  );
}

// ── Gap list ────────────────────────────────────────────────────────────────
type GapMode = 'short' | 'over';
type GapBy = 'money' | 'percent';

/**
 * Items short of (or over) target, biggest first: by money, or by percentage
 * points from 100% (`by="percent"`, the Achievement tab's % view).
 *
 * In the card it lists the side the card's Short / Over switch picks. Expanded
 * (⤢) it always shows both, side by side.
 */
export function AchGapList({ items, onPick, mode, by = 'money' }: { items: AchItem[]; onPick?: Pick; mode: GapMode; by?: GapBy }) {
  const expanded = useExpanded();
  if (!expanded) return <GapRows items={items} onPick={onPick} mode={mode} by={by} />;
  return (
    <Flex h="min(640px, 72vh)" gap={5} direction={{ base: 'column', md: 'row' }}>
      {(['short', 'over'] as const).map((m) => (
        <Flex key={m} direction="column" flex={1} minW={0} minH={0}>
          <Text fontSize="13px" fontWeight={700} color={m === 'short' ? colors.bad : colors.good} mb={1} flexShrink={0}>
            {m === 'short' ? 'Short of target' : 'Over target'}
          </Text>
          <Box flex={1} minH={0}>
            <GapRows items={items} onPick={onPick} mode={m} by={by} />
          </Box>
        </Flex>
      ))}
    </Flex>
  );
}

function GapRows({ items, onPick, mode, by }: { items: AchItem[]; onPick?: Pick; mode: GapMode; by: GapBy }) {
  const hover = useHover();
  const all = withTarget(items)
    // Positive = short: rupees under target, or points under 100%.
    .map((i) => ({ ...i, gap: by === 'percent' ? 100 - i.value : i.target_value - i.sale_value }))
    .filter((i) => (mode === 'short' ? i.gap > 0 : i.gap < 0))
    .sort((a, b) => (mode === 'short' ? b.gap - a.gap : a.gap - b.gap));
  const max = scaleMax(all.map((i) => Math.abs(i.gap)));
  if (!all.length)
    return (
      <Flex h="100%" align="center" justify="center">
        <Text fontSize="13px" color={colors.mutedText}>
          {mode === 'short' ? 'Nothing is short of target.' : 'Nothing is over target.'}
        </Text>
      </Flex>
    );
  return (
    <Box data-ach-host position="relative" h="100%" minH={0}>
      <Box h="100%" overflowY="auto" pr={1}>
        {all.map((i) => {
          const s = STATUS[statusOf(i.value)];
          const size = Math.abs(i.gap);
          return (
            <Flex
              key={i.name}
              as="button"
              w="100%"
              align="center"
              gap={2}
              py="5px"
              px={1}
              textAlign="left"
              borderBottom="1px solid"
              borderColor={colors.sunkBg}
              cursor={onPick ? 'pointer' : 'default'}
              _hover={{ bg: colors.hoverBg }}
              onClick={() => onPick?.(i.name)}
              onMouseMove={hover.on(i)}
              onMouseLeave={hover.off}
            >
              <Text flex="0 0 42%" fontSize="12px" color={colors.darkText} truncate title={i.name}>
                {i.name}
              </Text>
              <Box flexShrink={0} px="6px" py="1px" borderRadius="999px" bg={s.soft} color={s.ink} fontSize="11px" fontWeight={700} minW="52px" textAlign="center" fontVariantNumeric="tabular-nums">
                {i.value >= 1000 ? `${Math.round(i.value)}%` : pct(i.value)}
              </Box>
              <Box flex={1} h="8px" bg={colors.sunkBg} borderRadius="2px" overflow="hidden">
                <Box h="100%" w="100%" bg={mode === 'short' ? colors.bad : colors.good} borderRadius="2px" className="sp-grow" style={{ transform: `scaleX(${Math.min(1, size / max)})` }} />
              </Box>
              <Text flex="0 0 72px" textAlign="right" fontSize="12px" fontWeight={600} color={mode === 'short' ? colors.bad : colors.good} fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                {mode === 'short' ? '−' : '+'}
                {by === 'percent' ? `${size >= 1000 ? Math.round(size).toLocaleString() : fmt1(size)} pts` : fmt(size)}
              </Text>
            </Flex>
          );
        })}
      </Box>
      {hover.node}
    </Box>
  );
}
