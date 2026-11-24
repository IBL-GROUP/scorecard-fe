// Series colours for the product classes A, B, C, N and Others.
//
// Since 17 Nov 2026 (user request, BR-EXEC-011, GAP-029 resolved) these are Sales Pulse 2.0's
// (DSR-fe) categorical hues, in its order: DSR has no colour per class, its
// share donut colours slices by rank (SharePie HUES), which reads A, B, C, N.
// Fixed to the classes here so a class is one colour everywhere. Others takes
// DSR's 'Other / unmapped' grey. Same hex in light and dark, as in DSR.
// (Before: a non-RAG set, A #2563EB, B #0891B2, C #C026D3, N #7C3AED.)

// 24 Nov 2026 (user): no red or green outside +/− bars, so B (was teal #12A594) and C (was
// orange #E8590C) moved to Sales Pulse's new categorical hues.
const light = { A: '#3B5BDB', B: '#D69E2E', C: '#9C36B5', N: '#A0703C', Others: '#6B7280' };
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
