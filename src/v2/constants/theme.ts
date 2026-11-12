// ─── Sales Pulse 2.0 palette ────────────────────────────────────────────────
// ONEThunder: Cobalt (#233a87) and Midnight (#161631), with Odoo's grey scale
// for neutrals. Every colour is a CSS variable with a light and a dark value,
// so the theme switch re-colours charts, tables and cards alike.
//
// Colours carry meaning, the same way everywhere:
//   Sales        = Cobalt          → `sales` / `current`
//   earlier sales (B period) = light Cobalt → `prior` (same measure, earlier)
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
  // good / warn / target darkened slightly in story S5 so text in these
  // colours reaches WCAG 2.1 AA (4.5:1) on white and on their soft tints.
  target: '#0A746C',
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

  good: '#18703B',
  goodSoft: '#E3F3EA',
  bad: '#C0392B',
  badSoft: '#FBE7E5',
  warn: '#8F5C0E',
  warnSoft: '#FDF0DC',

  navbarBg: '#FFFFFF',
  navbarHover: '#F3F4F6',
  navbarActive: '#E9EDF8',

  prior: '#AFBCE6',
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
const svgTextCss = ['9', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '16']
  .map((n) => `svg text[font-size="${n}"],svg tspan[font-size="${n}"]{font-size:${n}px}`)
  .join('');

export const themeCss = baseCss + motionCss + svgTextCss;

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

// ─── Gradients ──────────────────────────────────────────────────────────────
// Kept for API compatibility. The 2.0 look is flat, so these resolve to solid
// surfaces; callers can keep passing them.

export const gradients = {
  blue: colors.cardBg,
  cyan: colors.cardBg,
  navy: colors.cardBg,
  orange: colors.cardBg,
  amber: colors.cardBg,
  teal: colors.cardBg,

  // Table headers
  tableBlue: colors.tableHeaderBg,
  tableIndigo: colors.tableHeaderBg,

  // Total row
  totalRow: colors.tableTotalStart,
} as const;

// One rule for money across the dashboard:
//  - formatCompact: tables, charts, insights, pop-ups → 3.04B · 53.8M · 505K
//  - formatPrecise: the headline KPI tiles only     → 3.04B · 53.82M · 505.0K
export function formatCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

// Shared number formatting for tiles, chips and labels.
export function formatCompactValue(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
