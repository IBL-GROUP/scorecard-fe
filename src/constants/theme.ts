import { compact } from '@/features/format';

// ─── Sales Pulse 2.0 palette ────────────────────────────────────────────────
// ONEThunder: Cobalt (#233a87) and Midnight (#161631), with Odoo's grey scale
// for neutrals. Every colour is a CSS variable with a light and a dark value,
// so the theme switch re-colours charts, tables and cards alike.
//
// Colours carry meaning, the same way everywhere:
//   Sales        = Cobalt          → `sales` / `current`
//   earlier sales (B period) = light Cobalt → `prior` (same measure, earlier)
//   same days last year = muted red (#BA5A5A) → `lastYear` (the third comparison bar)
//   Target       = Teal            → `target` (lines, bars, the 100% marker)
//   good / close / behind = green / amber / red, always with ▲▼ or a label

type Palette = Record<string, string>;

const light: Palette = {
  brand: '#233A87', // IBL Cobalt
  brandHover: '#1B2D6B',
  brandSoft: '#E9EDF8',
  onBrand: '#FFFFFF',
  midnight: '#161631',
  accent: '#4A62B5',
  accentSoft: '#E9EDF8',

  sales: '#233A87',
  salesSoft: '#E9EDF8',
  target: '#0E8F86',
  targetSoft: '#E2F4F2',

  // A soft Cobalt-grey page so the white cards stand out (light mode was
  // nearly all white).
  pageBg: '#E4E9F4',
  cardBg: '#FFFFFF',
  // The filter bar under the navbar: a light Cobalt tint.
  barBg: '#EEF1FA',
  sunkBg: '#E7E9ED',
  hoverBg: '#F1F3F9',
  border: '#D3D8E4',
  borderStrong: '#9A9CA5',

  darkText: '#161631',
  bodyText: '#374151',
  mutedText: '#5F636F',

  good: '#1D7F45',
  goodSoft: '#E3F3EA',
  bad: '#C0392B',
  badSoft: '#FBE7E5',
  warn: '#B7791F',
  warnSoft: '#FDF0DC',

  navbarBg: '#FFFFFF',
  navbarHover: '#F3F4F6',
  navbarActive: '#E9EDF8',

  prior: '#AFBCE6',
  lastYear: '#BA5A5A',
  current: '#233A87',

  gridStroke: '#E7E9ED',
  axisText: '#7C7F89',

  tableTotal: '#EEF1FA',
  band: '#161631',
  bandInk: '#ECEEF8',
  bandMuted: '#A9AFD0',
  bandLine: '#2E3154',
  bandSales: '#8EA2F0',
  bandTarget: '#5EE0D2',
  overlay: 'rgba(22,22,49,.45)',
  shadow: 'rgba(22,22,49,.14)',

  // Table header rows (.sp-th).
  tableHead: '#F3F5FB',
  tableHeadInk: '#233A87',
  tableHeadLine: '#233A87',

  // Card accents: each card's title colour and the faint wash behind it, in turn
  // across a row (Blue, Teal, Violet, Amber, Rose, Sky).
  acc1: '#2563EB',
  acc2: '#0D9488',
  acc3: '#7C3AED',
  acc4: '#D97706',
  acc5: '#DB2777',
  acc6: '#0284C7',
};

// Dark = warm charcoal. Surfaces are neutral, slightly warm greys so the page
// reads calm and executive; colour lives only in the data (Cobalt = Sales,
// Teal = Target, status green/amber/red).
const dark: Palette = {
  brand: '#9AACF2',
  brandHover: '#B3C1F6',
  brandSoft: '#262838',
  onBrand: '#121110',
  midnight: '#F1EEE8',
  accent: '#9AACF2',
  accentSoft: '#262838',

  sales: '#8EA2F0',
  salesSoft: '#252736',
  target: '#4CC2B3',
  targetSoft: '#1A2E2A',

  pageBg: '#121110',
  cardBg: '#1B1A18',
  barBg: '#1B1A18',
  sunkBg: '#252321',
  hoverBg: '#23211E',
  border: '#322F2B',
  borderStrong: '#4A4640',

  darkText: '#F1EEE8',
  bodyText: '#D2CDC5',
  mutedText: '#A19B92',

  good: '#4CC98B',
  goodSoft: '#16302A',
  bad: '#EE8279',
  badSoft: '#3A2220',
  warn: '#E9B55A',
  warnSoft: '#372D18',

  navbarBg: '#171614',
  navbarHover: '#23211E',
  navbarActive: '#2B2926',

  prior: '#5E5A6E',
  lastYear: '#BA5A5A',
  current: '#8EA2F0',

  gridStroke: '#2A2825',
  axisText: '#A19B92',

  tableTotal: '#211F1C',
  band: '#0B0A09',
  bandInk: '#F1EEE8',
  bandMuted: '#A19B92',
  bandLine: '#2A2825',
  bandSales: '#8EA2F0',
  bandTarget: '#5ED6C6',
  overlay: 'rgba(8,7,6,.66)',
  shadow: 'rgba(0,0,0,.5)',

  tableHead: '#202233',
  tableHeadInk: '#B3C1F6',
  tableHeadLine: '#9AACF2',

  acc1: '#60A5FA',
  acc2: '#2DD4BF',
  acc3: '#A78BFA',
  acc4: '#FBBF24',
  acc5: '#F472B6',
  acc6: '#38BDF8',
};

const cssName = (k: string) => `--sp-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
const v = (k: string) => `var(${cssName(k)})`;
const block = (p: Palette) => Object.entries(p).map(([k, val]) => `${cssName(k)}:${val};`).join('');

/** CSS for both themes. Dark applies when <html> has class "dark". */
const baseCss = `:root{${block(light)}color-scheme:light}html.dark{${block(dark)}color-scheme:dark}body{background:var(--sp-page-bg);color:var(--sp-dark-text)}`;

// ── Motion ──
// One motion language (see .claude/motion-plan.md): 100/150/200/300ms,
// ease-out on enter, ease-in on exit, transform/opacity only. The press
// release uses a small spring (≤2% overshoot) on purpose: "sink, then spring".
const motionCss = `:root{--sp-m-100:100ms;--sp-m-150:150ms;--sp-m-200:200ms;--sp-m-300:300ms;--sp-ease-out:cubic-bezier(.16,1,.3,1);--sp-ease-in:cubic-bezier(.7,0,.84,0);--sp-ease-spring:cubic-bezier(.34,1.4,.64,1)}
:where(button:not(:disabled),[role=button],[role=radio],[role=tab],[role=menuitemradio],a[href]){transition:scale var(--sp-m-300) var(--sp-ease-spring),background-color var(--sp-m-150) ease-out,color var(--sp-m-150) ease-out,border-color var(--sp-m-150) ease-out,box-shadow var(--sp-m-150) ease-out,opacity var(--sp-m-150) ease-out}
:where(button:not(:disabled),[role=button],[role=radio],[role=tab],[role=menuitemradio],a[href]):active{scale:.97;transition:scale var(--sp-m-100) var(--sp-ease-in)}
.sp-rn{display:inline-flex;white-space:pre;font-variant-numeric:tabular-nums}
.sp-rn-col{display:inline-block;height:1.15em;line-height:1.15em;overflow:hidden;vertical-align:bottom}
.sp-rn-strip{display:block;transition:transform var(--sp-m-300) var(--sp-ease-out)}
.sp-rn-strip>span{display:block;height:1.15em}
.sp-pop{animation:sp-pop var(--sp-m-200) var(--sp-ease-out)}
@keyframes sp-pop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
.sp-rise{animation:sp-rise var(--sp-m-300) var(--sp-ease-out) backwards}
@keyframes sp-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.sp-fade{animation:sp-fade var(--sp-m-150) ease-out}
@keyframes sp-fade{from{opacity:0}to{opacity:1}}
.sp-stagger>*{animation:sp-rise var(--sp-m-300) var(--sp-ease-out) backwards}.sp-stagger>*:nth-child(2){animation-delay:30ms}.sp-stagger>*:nth-child(3){animation-delay:60ms}.sp-stagger>*:nth-child(4){animation-delay:90ms}.sp-stagger>*:nth-child(5){animation-delay:120ms}.sp-stagger>*:nth-child(6){animation-delay:150ms}.sp-stagger>*:nth-child(n+7){animation-delay:180ms}
.sp-check path{stroke-dasharray:24;stroke-dashoffset:24;animation:sp-draw var(--sp-m-300) var(--sp-ease-out) forwards}
@keyframes sp-draw{to{stroke-dashoffset:0}}
.sp-grow{transform-origin:left center;transition:transform var(--sp-m-300) var(--sp-ease-out)}
@media (prefers-reduced-motion:reduce){:where(button,[role=button],[role=radio],[role=tab],[role=menuitemradio],a[href]):active{scale:none}.sp-rn-strip,.sp-grow{transition:none}.sp-pop,.sp-rise,.sp-stagger>*{animation-name:sp-fade}.sp-check path{animation:none;stroke-dashoffset:0}}`;

// A page-wide reset overrides SVG font-size attributes, so chart text drew at
// 16px and spilled out of the space recharts reserves for it. Honour the
// attribute for the sizes the charts use.
const svgTextCss = ['9', '10', '11', '12', '13', '14', '16']
  .map((n) => `svg text[font-size="${n}"],svg tspan[font-size="${n}"]{font-size:${n}px}`)
  .join('');

// ── Tables ──
// .sp-pin on a table row (a grid inside the sideways scroller) keeps its first
// cell — the row's name — in place while the figures scroll under it. The cell
// takes the row's own background (hover, selected), so rows need a solid one.
// A transparent left border the width of the row's padding (--pin-px, 12px by
// default) is painted with that background, so the name keeps its margin from
// the edge. isolation keeps each row's pinned cell under the sticky header and
// Total rows. That cell covers the row's left edge, so a selected row's bar
// (aria-current, inset box-shadow on the row) is drawn on the cell as well.
const tableCss = `.sp-pin{isolation:isolate}
.sp-pin>:first-child{position:sticky;left:0;z-index:1;background:inherit;margin-left:calc(-1 * var(--pin-px,12px));border-left:var(--pin-px,12px) solid transparent}
.sp-pin[aria-current]>:first-child{background-image:linear-gradient(${v('brand')},${v('brand')});background-size:3px 100%;background-repeat:no-repeat;background-origin:border-box}
.sp-th,thead.sp-th th{background:${v('tableHead')}!important;border-bottom:2px solid ${v('tableHeadLine')}!important}
thead.sp-th{border-bottom:0!important}
.sp-th,.sp-th *:not(.sp-keep){color:${v('tableHeadInk')}!important}`;

// Cards: .sp-card picks the next accent along its row (a tone can set --acc
// itself); .sp-tint lays a faint wash of it from the top-left corner.
const cardCss = `.sp-card{--acc:${v('acc1')}}${[2, 3, 4, 5, 6].map((n) => `.sp-card:nth-child(6n+${n}){--acc:${v(`acc${n}`)}}`).join('')}
.sp-tint{background:linear-gradient(135deg,color-mix(in srgb,var(--acc,${v('brand')}) 11%,${v('cardBg')}) 0%,${v('cardBg')} 70%)}
html.dark .sp-tint{background:linear-gradient(135deg,color-mix(in srgb,var(--acc,${v('brand')}) 15%,${v('cardBg')}) 0%,${v('cardBg')} 70%)}`;

// Focus: nothing after a mouse click; a thin Cobalt ring when moving by keyboard.
const focusCss = `*:focus:not(:focus-visible),input:focus,textarea:focus,select:focus,[aria-haspopup]:focus{outline:none!important}:focus-visible:not(input,textarea,select,[aria-haspopup]){outline:2px solid ${v('brand')}!important;outline-offset:2px}`;

export const themeCss = baseCss + motionCss + svgTextCss + tableCss + cardCss + focusCss;

export const colors = {
  brand: v('brand'),
  brandHover: v('brandHover'),
  brandSoft: v('brandSoft'),
  onBrand: v('onBrand'),
  midnight: v('midnight'),
  accent: v('accent'),
  accentSoft: v('accentSoft'),
  /** Target lines and the 100% marker. */
  benchmark: v('target'),

  sales: v('sales'),
  salesSoft: v('salesSoft'),
  target: v('target'),
  targetSoft: v('targetSoft'),

  pageBg: v('pageBg'),
  cardBg: v('cardBg'),
  /** The card's accent (see cardCss): its title colour. */
  cardAccent: `var(--acc,${v('brand')})`,
  barBg: v('barBg'),
  sunkBg: v('sunkBg'),
  hoverBg: v('hoverBg'),
  border: v('border'),
  borderStrong: v('borderStrong'),
  filterBarBg: v('sunkBg'),
  footerBg: v('cardBg'),
  headerBg: v('cardBg'),
  buttonGroupBg: v('cardBg'),

  darkText: v('darkText'),
  bodyText: v('bodyText'),
  mutedText: v('mutedText'),

  good: v('good'),
  goodSoft: v('goodSoft'),
  bad: v('bad'),
  badSoft: v('badSoft'),
  warn: v('warn'),
  warnSoft: v('warnSoft'),

  navbarBg: v('navbarBg'),
  navbarHover: v('navbarHover'),
  navbarActive: v('navbarActive'),

  prior: v('prior'),
  lastYear: v('lastYear'),
  current: v('current'),

  gridStroke: v('gridStroke'),
  axisText: v('axisText'),
  chartBlue: v('sales'),
  chartTeal: v('target'),
  chartLightBlue: v('prior'),
  chartGreen: v('good'),
  chartRed: v('bad'),
  chartIndigo: v('prior'),

  controlBorder: v('border'),
  controlBorderHover: v('borderStrong'),
  selectActive: v('brand'),
  selectOptionHover: v('hoverBg'),

  tableHeaderBg: v('cardBg'),
  tableEvenRow: v('cardBg'),
  tableHoverRow: v('hoverBg'),
  tableTotalStart: v('tableTotal'),
  tableTotalEnd: v('tableTotal'),

  overlay: v('overlay'),
  shadow: v('shadow'),

  // The Midnight headline band on Pulse (dark in both themes)
  band: v('band'),
  bandInk: v('bandInk'),
  bandMuted: v('bandMuted'),
  bandLine: v('bandLine'),
  bandSales: v('bandSales'),
  bandTarget: v('bandTarget'),
} as const;

/**
 * One decimal at most, and none when it is zero: 222.2 · 222 · 1,027.7.
 * Every money, percent and points figure on the dashboard goes through this.
 */
export function fmt1(n: number): string {
  const s = n.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return s === '-0' ? '0' : s;
}

// One rule for every number on the dashboard: millions, never B or K.
//  - Below 100,000 → the exact number: 1,255 · 10,646 · 50,623
//  - 100,000 and up → millions with fmt1: 0.8M · 53.8M · 2,906.6M · 240M
export const SMALL_LIMIT = 100_000;

// One rule for money across the dashboard (FR-EXEC-030): never billions,
// K from 100K, the value itself under 100K.
//  - formatCompact: tables, charts, insights, pop-ups → 3,040.0M · 53.8M · 505K · 45,230
//  - formatCompactValue: tiles, chips and labels      → 3,040.0M · 53.8M · 505.4K · 45,230
export function formatCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return compact(n);
}

// Shared number formatting for tiles, chips and labels.
export function formatCompactValue(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return compact(n, 1, 1);
}
