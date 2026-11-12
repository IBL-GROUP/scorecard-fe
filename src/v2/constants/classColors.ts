// Series colours for the product classes A, B, C, N and Others.
//
// PRD v2 section 5.3 asks for two things that conflict: keep the 1.0 class
// colours, and never reuse RAG colours as class colours. In 1.0, B is green
// (#059669) and C is amber (#fca311), which read as status. 2.0 therefore uses
// a non-RAG set: A keeps its 1.0 blue, N keeps its 1.0 violet, and B and C
// move to cyan and magenta. Flagged for the S1 review.

const light = { A: '#2563EB', B: '#0891B2', C: '#C026D3', N: '#7C3AED', Others: '#6B7280' };
const dark = { A: '#7EA6F8', B: '#4FC3DC', C: '#E07BEF', N: '#B69CF6', Others: '#A19B92' };

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
