// ─── Color Palette ──────────────────────────────────────────────────────────

export const colors = {
  // Page
  pageBg: '#f1f5f9',

  // Surfaces
  cardBg: 'rgba(255, 255, 255, 0.9)',
  filterBarBg: '#f5f5f5',
  footerBg: 'rgba(255,255,255,0.8)',
  headerBg: 'white',
  buttonGroupBg: 'white',

  // Text
  darkText: '#1f2937',
  bodyText: '#334155',

  // Chart
  gridStroke: '#e5e7eb',
  chartBlue: '#2D7DD2',
  chartTeal: '#1D9A96',
  chartLightBlue: '#45B7D1',
  chartGreen: '#06D6A0',
  chartRed: '#EF476F',
  chartIndigo: '#3730A3',

  // Select / Form
  controlBorder: '#e2e8f0',
  controlBorderHover: '#cbd5e1',
  selectActive: '#2563eb',
  selectOptionHover: '#f1f5f9',

  // Table
  tableEvenRow: '#f8fafc',
  tableHoverRow: '#dbeafe',
  tableTotalStart: '#f1f5f9',
  tableTotalEnd: '#dbeafe',
} as const;

// ─── Classification Colors ───────────────────────────────────────────────────

export const clsColors = {
  A: '#2563eb',
  B: '#059669',
  C: '#fca311',
  N: '#7c3aed',
  Other: '#6b7280',
  Abg: '#dbeafe',
  Bbg: '#d1fae5',
  Cbg: '#fef3c7',
  Nbg: '#ede9fe',
  Otherbg: '#f3f4f6',
  Aborder: '#eff6ff',
  Bborder: '#f0fdf4',
  Cborder: '#fffbeb',
  Nborder: '#f5f3ff',
  Otherborder: '#e5e7eb',
} as const;

// ─── Gradients ──────────────────────────────────────────────────────────────

export const gradients = {
  blue: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  cyan: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  navy: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
  orange: 'linear-gradient(135deg, #f97316, #ea580c)',
  amber: 'linear-gradient(135deg, #d97706, #b45309)',
  teal: 'linear-gradient(135deg, #14b8a6, #0d9488)',

  // Table headers
  tableBlue: '#2563eb',
  tableIndigo: '#3730a3',

  // Total row
  totalRow: `linear-gradient(to right, ${colors.tableTotalStart}, ${colors.tableTotalEnd})`,
} as const;
