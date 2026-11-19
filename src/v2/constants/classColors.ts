// Series colours for the product classes A, B, C, N and Others.
//
// Since 17 Nov 2026 (user request, BR-EXEC-011, GAP-029 resolved) these are Sales Pulse 2.0's
// (DSR-fe) categorical hues, in its order: DSR has no colour per class, its
// share donut colours slices by rank (SharePie HUES), which reads A, B, C, N.
// Fixed to the classes here so a class is one colour everywhere. Others takes
// DSR's 'Other / unmapped' grey. Same hex in light and dark, as in DSR.
// (Before: a non-RAG set, A #2563EB, B #0891B2, C #C026D3, N #7C3AED.)

const light = { A: '#3B5BDB', B: '#12A594', C: '#E8590C', N: '#8B5CF6', Others: '#6B7280' };
const dark = light;

/** The class hues as hex, for SVG attributes (axis tick fills) that cannot read a CSS variable. */
export const CLASS_HEX: Record<string, string> = light;

const css = (p: Record<string, string>) => Object.entries(p).map(([k, v]) => `--sp-cls-${k.toLowerCase()}:${v};`).join('');

export const classColorCss = `:root{${css(light)}}html.dark{${css(dark)}}`;

export const CLS_COLOR: Record<string, string> = {
  A: 'var(--sp-cls-a)',
  B: 'var(--sp-cls-b)',
  C: 'var(--sp-cls-c)',
  N: 'var(--sp-cls-n)',
  Others: 'var(--sp-cls-others)',
  Total: 'var(--sp-dark-text)',
};

export const clsColor = (c: string) => CLS_COLOR[c] ?? CLS_COLOR.Others;
