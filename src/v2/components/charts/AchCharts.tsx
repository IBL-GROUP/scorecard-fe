import { Box, Flex, Text } from '@chakra-ui/react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useExpanded } from '@/v2/components/overlay';
import { colors, formatCompact } from '@/v2/constants/theme';

// Achievement charts, each shaped for its question (see the chart plan):
//   AchRings      few items: "how close is each?"
//   AchLollipop   ahead/behind around 100%, dot size = sales
//   AchGapBars    money ahead of / short of target, around zero
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
}

type Pick = (name: string) => void;

const fmt = (n: number) => formatCompact(n);
const pct = (n: number) => `${n.toFixed(1)}%`;
const statusOf = (v: number) => (v >= 100 ? 'good' : v >= 80 ? 'warn' : 'bad');
const STATUS = {
  good: { ink: colors.good, soft: colors.goodSoft, label: 'On or above target' },
  warn: { ink: colors.warn, soft: colors.warnSoft, label: 'Close (80–100%)' },
  bad: { ink: colors.bad, soft: colors.badSoft, label: 'Behind (below 80%)' },
};
const isUnassigned = (n: string) => !n || n === 'Others' || n === 'null' || n === '—';
const withTarget = (items: AchItem[]) => items.filter((i) => i.target_value > 0 && !isUnassigned(i.name));

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

/** Hover card shared by every chart: name, achievement, sales vs target. */
function useHover(noun: 'target' | 'budget' = 'target') {
  const [tip, setTip] = useState<{ x: number; y: number; item: AchItem } | null>(null);
  const on = (item: AchItem) => (e: React.MouseEvent) => {
    const host = (e.currentTarget as Element).closest('[data-ach-host]') as HTMLElement | null;
    const r = host?.getBoundingClientRect();
    setTip({ x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0), item });
  };
  const off = () => setTip(null);
  const node = tip ? <HoverCard {...tip} noun={noun} /> : null;
  return { on, off, node };
}

function HoverCard({ x, y, item, noun = 'target' }: { x: number; y: number; item: AchItem; noun?: 'target' | 'budget' }) {
  const s = STATUS[statusOf(item.value)];
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
      <Text fontWeight={700} color={colors.darkText} mb="2px">
        {item.name}
      </Text>
      <Text color={s.ink} fontWeight={600}>
        {pct(item.value)} · {s.label.replace('target', noun)}
      </Text>
      <Text color={colors.bodyText}>
        Sales {fmt(item.sale_value)} of {fmt(item.target_value)} {noun}
      </Text>
      <Text color={colors.mutedText}>
        {item.sale_value >= item.target_value ? `+${fmt(item.sale_value - item.target_value)} over` : `${fmt(item.target_value - item.sale_value)} short`}
        {item.prior != null ? ` · B ${fmt(item.prior)}` : ''}
      </Text>
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
  const list = withTarget(items).sort((a, b) => b.sale_value - a.sale_value).slice(0, 6);
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
                      {label}
                    </Text>
                    <Text fontSize={`${Math.max(10, Math.round(font * 0.55))}px`} color={s.ink} fontWeight={700}>
                      {i.value >= 100 ? '▲ on target' : `${fmt(i.target_value - i.sale_value)} short`}
                    </Text>
                  </Flex>
                </Box>
                <Text fontSize="12.5px" fontWeight={600} color={colors.darkText} maxW="100%" textAlign="center" lineClamp={2} title={i.name}>
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

// ── Lollipop around 100% ────────────────────────────────────────────────────
export function AchLollipop({ items, onPick }: { items: AchItem[]; onPick?: Pick }) {
  const expanded = useExpanded();
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const hover = useHover();
  const all = withTarget(items).sort((a, b) => b.value - a.value);
  const longest = Math.max(60, ...withTarget(items).map((i) => textWidth(i.name)));
  const LABEL = Math.min(Math.max(90, w * 0.42), longest + 14);
  const VAL = 66;
  const rowH = 24;
  const fit = expanded ? all.length : Math.max(3, Math.floor((h - 30) / rowH));
  const list = all.slice(0, fit);
  const hidden = all.length - list.length;
  const vals = list.map((i) => i.value);
  const lo = Math.min(60, ...vals);
  const hi = Math.min(250, Math.max(140, ...vals));
  const plotW = Math.max(40, w - LABEL - VAL);
  const x = (v: number) => LABEL + ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * plotW;
  const maxSale = Math.max(1, ...list.map((i) => i.sale_value));
  const r = (s: number) => 4 + 7 * Math.sqrt(s / maxSale);
  const totalH = list.length * rowH + 26;
  return (
    <Host hostRef={ref}>
      {!all.length ? (
        <Empty />
      ) : (
        w > 0 && (
          <>
            <svg width={w} height={Math.max(totalH, 0)} role="img" aria-label="Achievement by item around 100%">
              {/* 100% line */}
              <line x1={x(100)} x2={x(100)} y1={0} y2={list.length * rowH} stroke="var(--sp-target)" strokeWidth="1.5" strokeDasharray="4 3" />
              {list.map((i, k) => {
                const cy = k * rowH + rowH / 2;
                const s = STATUS[statusOf(i.value)];
                const clipped = i.value > hi;
                return (
                  <g
                    key={i.name}
                    onMouseMove={hover.on(i)}
                    onMouseLeave={hover.off}
                    onClick={() => onPick?.(i.name)}
                    style={{ cursor: onPick ? 'pointer' : 'default' }}
                    className="sp-rise"
                  >
                    <rect x={0} y={k * rowH} width={w} height={rowH} fill="transparent" />
                    <title>{i.name}</title>
                    <text style={{ fontSize: 12 }} x={LABEL - 8} y={cy + 4} textAnchor="end" fill="var(--sp-body-text)">
                      {fitName(i.name, LABEL - 12)}
                    </text>
                    <line x1={x(100)} x2={x(i.value)} y1={cy} y2={cy} stroke={s.ink} strokeWidth="2" />
                    <circle cx={x(i.value)} cy={cy} r={r(i.sale_value)} fill={s.ink} stroke="var(--sp-card-bg)" strokeWidth="2" />
                    <text x={w - 4} y={cy + 4} textAnchor="end" fontWeight={600} fill="var(--sp-dark-text)" style={{ fontSize: 12,  fontVariantNumeric: 'tabular-nums' }}>
                      {clipped ? '›' : ''}
                      {pct(i.value)}
                    </text>
                  </g>
                );
              })}
              <text style={{ fontSize: 11 }} x={x(100)} y={list.length * rowH + 16} textAnchor="middle" fill="var(--sp-target)">
                100%
              </text>
              {x(100) - LABEL > 70 && (
                <text style={{ fontSize: 11 }} x={x(100) - 24} y={list.length * rowH + 16} textAnchor="end" fill="var(--sp-muted-text)">
                  ◂ behind
                </text>
              )}
              {LABEL + plotW - x(100) > 70 && (
                <text style={{ fontSize: 11 }} x={x(100) + 24} y={list.length * rowH + 16} fill="var(--sp-muted-text)">
                  ahead ▸
                </text>
              )}
            </svg>
            <Text position="absolute" bottom={0} right={0} fontSize="11px" color={colors.mutedText}>
              Dot size = sales{hidden > 0 ? ` · ${hidden} more in ⤢` : ''}
            </Text>
          </>
        )
      )}
      {hover.node}
    </Host>
  );
}

// ── Gap bars (money ahead / short, around zero) ──────────────────────────────
export function AchGapBars({ items, onPick }: { items: AchItem[]; onPick?: Pick }) {
  const expanded = useExpanded();
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const hover = useHover();
  const all = withTarget(items)
    .map((i) => ({ ...i, gap: i.sale_value - i.target_value }))
    .sort((a, b) => a.gap - b.gap); // most short first
  const rowH = 22;
  const fit = expanded ? all.length : Math.max(3, Math.floor((h - 26) / rowH));
  // Show the extremes: most short at the top, most ahead at the bottom.
  const list = all.length <= fit ? all : [...all.slice(0, Math.ceil(fit / 2)), ...all.slice(all.length - Math.floor(fit / 2))];
  const hidden = all.length - list.length;
  const longest = Math.max(60, ...list.map((i) => textWidth(i.name)));
  const LABEL = Math.min(Math.max(90, w * 0.38), longest + 14);
  const VAL = 56;
  const plotW = Math.max(40, w - LABEL - VAL * 2);
  const max = Math.max(1, ...list.map((i) => Math.abs(i.gap)));
  const anyShort = list.some((i) => i.gap < 0);
  const anyAhead = list.some((i) => i.gap > 0);
  // Zero sits in the middle when there are both; at the edge when not.
  const zeroX = LABEL + VAL + (anyShort && anyAhead ? plotW / 2 : anyShort ? plotW : 0);
  const scale = (anyShort && anyAhead ? plotW / 2 : plotW) / max;
  return (
    <Host hostRef={ref}>
      {!all.length ? (
        <Empty />
      ) : (
        w > 0 && (
          <>
            <svg width={w} height={list.length * rowH + 4} role="img" aria-label="Sales ahead of or short of target, in value">
              <line x1={zeroX} x2={zeroX} y1={0} y2={list.length * rowH} stroke="var(--sp-target)" strokeWidth="1.5" />
              {list.map((i, k) => {
                const cy = k * rowH + rowH / 2;
                const short = i.gap < 0;
                const bw = Math.max(2, Math.abs(i.gap) * scale);
                const bx = short ? zeroX - bw : zeroX;
                const gapRow = hidden > 0 && k === Math.ceil(fit / 2);
                return (
                  <g key={i.name} onMouseMove={hover.on(i)} onMouseLeave={hover.off} onClick={() => onPick?.(i.name)} style={{ cursor: onPick ? 'pointer' : 'default' }}>
                    <title>{i.name}</title>
                    {gapRow && <line x1={0} x2={w} y1={k * rowH} y2={k * rowH} stroke="var(--sp-border)" strokeDasharray="2 3" />}
                    <rect x={0} y={k * rowH} width={w} height={rowH} fill="transparent" />
                    <text style={{ fontSize: 12 }} x={LABEL - 8} y={cy + 4} textAnchor="end" fill="var(--sp-body-text)">
                      {fitName(i.name, LABEL - 12)}
                    </text>
                    <rect x={bx} y={cy - 6} width={bw} height={12} rx={3} fill={short ? 'var(--sp-bad)' : 'var(--sp-good)'} className="sp-rise" />
                    <text
                      x={short ? bx - 4 : bx + bw + 4}
                      y={cy + 4}
                      textAnchor={short ? 'end' : 'start'}
                     
                      fontWeight={600}
                      fill={short ? 'var(--sp-bad)' : 'var(--sp-good)'}
                      style={{ fontSize: 11.5,  fontVariantNumeric: 'tabular-nums' }}
                    >
                      {short ? '−' : '+'}
                      {fmt(Math.abs(i.gap))}
                    </text>
                  </g>
                );
              })}
            </svg>
            <Flex position="absolute" bottom={0} left={0} right={0} justify="space-between" fontSize="11px" color={colors.mutedText}>
              <span>◂ short of target · ahead ▸ (in value)</span>
              {hidden > 0 && <span>{hidden} in the middle hidden · ⤢ for all</span>}
            </Flex>
          </>
        )
      )}
      {hover.node}
    </Host>
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
            <Flex key={c.k} direction="column" flex="1 1 0" minW={0} minH={0} bg={colors.sunkBg} borderRadius="4px" borderTop={`3px solid ${s.ink}`}>
              <Box px={2} pt="6px" pb="4px">
                <Text fontSize="12px" fontWeight={700} color={s.ink} truncate>
                  {title[c.k]}
                </Text>
                <Text fontSize="11px" color={colors.mutedText} truncate>
                  {c.list.length} · {fmt(c.sales)} · {c.gap >= 0 ? '+' : '−'}
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
  noun = 'target',
}: {
  items: AchItem[];
  onPick?: Pick;
  showPrior?: boolean;
  /** EFP is compared with the budget, TP with the target. */
  noun?: 'target' | 'budget';
}) {
  const expanded = useExpanded();
  const [ref, { h }] = useSize<HTMLDivElement>();
  const hover = useHover(noun);
  const all = withTarget(items).sort((a, b) => b.target_value - a.target_value);
  const rowH = 38;
  const fit = expanded ? all.length : Math.max(2, Math.floor((h - 20) / rowH));
  const list = all.slice(0, fit);
  const max = Math.max(1, ...list.map((i) => Math.max(i.target_value, i.sale_value, i.prior ?? 0)));
  return (
    <Host hostRef={ref}>
      {!all.length ? (
        <Empty />
      ) : (
        <Flex direction="column" h="100%" gap={0}>
          <Box flex={1} minH={0} className="sp-stagger">
            {list.map((i) => {
              const s = STATUS[statusOf(i.value)];
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
                    <Text color={colors.mutedText} whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                      {fmt(i.sale_value)} / {fmt(i.target_value)} ·{' '}
                      <Box as="span" color={s.ink} fontWeight={700}>
                        {pct(i.value)}
                      </Box>
                    </Text>
                  </Flex>
                  {Math.max(i.sale_value, i.target_value) / max < 0.02 ? (
                    // Under 2% of the biggest row: a bar this thin is invisible
                    // and reads as missing data, so say why instead. The numbers
                    // and % above are still exact.
                    <Flex position="relative" h="12px" align="center" gap="6px">
                      <Box w="3px" h="6px" bg={colors.sales} borderRadius="1px" flexShrink={0} />
                      <Box w="2px" h="12px" bg={colors.target} flexShrink={0} />
                      <Text fontSize="11px" color={colors.mutedText} lineHeight="12px" truncate>
                        Too small to draw at this scale ({((Math.max(i.sale_value, i.target_value) / max) * 100).toFixed(2)}% of the largest)
                      </Text>
                    </Flex>
                  ) : (
                  <Box position="relative" h="12px">
                    {/* Target band */}
                    <Box position="absolute" left={0} top={0} bottom={0} w={`${(i.target_value / max) * 100}%`} bg={colors.targetSoft} borderRadius="2px" />
                    {/* Sales bar */}
                    <Box position="absolute" left={0} top="3px" bottom="3px" w="100%" bg={colors.sales} borderRadius="2px" className="sp-grow" style={{ transform: `scaleX(${i.sale_value / max})` }} />
                    {/* Target tick */}
                    <Box position="absolute" top="-2px" bottom="-2px" w="2px" bg={colors.target} left={`calc(${(i.target_value / max) * 100}% - 1px)`} />
                    {showPrior && i.prior != null && i.prior > 0 && (
                      <Box position="absolute" top="1px" bottom="1px" w="2px" bg={colors.prior} left={`calc(${(i.prior / max) * 100}% - 1px)`} title={`B ${fmt(i.prior)}`} />
                    )}
                  </Box>
                  )}
                </Box>
              );
            })}
          </Box>
          <Flex gap={3} fontSize="11px" color={colors.mutedText} pt={1} wrap="wrap">
            <Flex align="center" gap="5px"><Box w="12px" h="6px" bg={colors.sales} borderRadius="1px" />Sales</Flex>
            <Flex align="center" gap="5px"><Box w="12px" h="8px" bg={colors.targetSoft} borderRadius="1px" /><Box w="2px" h="10px" bg={colors.target} />{noun === 'budget' ? 'Budget' : 'Target'}</Flex>
            {showPrior && <Flex align="center" gap="5px"><Box w="2px" h="10px" bg={colors.prior} />B period</Flex>}
            {all.length > list.length && <Text ml="auto">{all.length - list.length} more in ⤢</Text>}
          </Flex>
        </Flex>
      )}
      {hover.node}
    </Host>
  );
}

// ── Gap list ────────────────────────────────────────────────────────────────
export function AchGapList({ items, onPick, mode }: { items: AchItem[]; onPick?: Pick; mode: 'short' | 'over' }) {
  const hover = useHover();
  const all = withTarget(items)
    .map((i) => ({ ...i, gap: i.target_value - i.sale_value }))
    .filter((i) => (mode === 'short' ? i.gap > 0 : i.gap < 0))
    .sort((a, b) => (mode === 'short' ? b.gap - a.gap : a.gap - b.gap));
  const max = Math.max(1, ...all.map((i) => Math.abs(i.gap)));
  if (!all.length)
    return (
      <Flex h="100%" align="center" justify="center">
        <Text fontSize="13px" color={colors.mutedText}>
          {mode === 'short' ? 'Nothing is short of target.' : 'Nothing is over target.'}
        </Text>
      </Flex>
    );
  return (
    <Host>
      <Box h="100%" overflowY="auto" pr={1}>
        {all.map((i) => {
          const s = STATUS[statusOf(i.value)];
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
                <Box h="100%" w="100%" bg={mode === 'short' ? colors.bad : colors.good} borderRadius="2px" className="sp-grow" style={{ transform: `scaleX(${Math.abs(i.gap) / max})` }} />
              </Box>
              <Text flex="0 0 58px" textAlign="right" fontSize="12px" fontWeight={600} color={mode === 'short' ? colors.bad : colors.good} fontVariantNumeric="tabular-nums">
                {mode === 'short' ? '−' : '+'}
                {fmt(Math.abs(i.gap))}
              </Text>
            </Flex>
          );
        })}
      </Box>
      {hover.node}
    </Host>
  );
}
