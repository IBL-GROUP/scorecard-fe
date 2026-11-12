// The five Supply Chain Pulse 2.0 tabs (PRD section 3.1) and the permission
// sections that govern them (PRD section 3.2). Hiding a tab or a tile is a
// convenience, not security (SEC-PERM-001): scorecard-be enforces the token.

export type Section = 'SUMMARY' | 'SERVICE_MEASURE' | 'DISPATCH_WIP' | 'RD_DATA_STATUS';
export const ALL_SECTIONS: Section[] = ['SUMMARY', 'SERVICE_MEASURE', 'DISPATCH_WIP', 'RD_DATA_STATUS'];

export type TabKey = 'overview' | 'revenue' | 'inventory' | 'fulfilment' | 'distribution';

export const TABS: { key: TabKey; label: string; mid: string; short: string; anyOf: Section[] }[] = [
  { key: 'overview', label: 'Executive Overview', mid: 'Overview', short: 'Overview', anyOf: ALL_SECTIONS },
  { key: 'revenue', label: 'Revenue & Plan', mid: 'Revenue & Plan', short: 'Revenue', anyOf: ['SUMMARY'] },
  { key: 'inventory', label: 'Inventory & Working Capital', mid: 'Inventory & Capital', short: 'Inventory', anyOf: ['SUMMARY', 'SERVICE_MEASURE'] },
  { key: 'fulfilment', label: 'Fulfilment & Operations', mid: 'Fulfilment & Ops', short: 'Fulfilment', anyOf: ['DISPATCH_WIP'] },
  { key: 'distribution', label: 'Distribution & Data Health', mid: 'Distribution & Data', short: 'Distribution', anyOf: ['RD_DATA_STATUS'] },
];

/** Which section an endpoint's data belongs to. */
export const SECTION_OF: Record<string, Section> = {
  '/sales-summary': 'SUMMARY',
  '/total-sku': 'SUMMARY',
  '/cover-days': 'SUMMARY',
  '/cover-days/total': 'SUMMARY',
  '/cover-days/closing-inv': 'SUMMARY',
  '/cover-days/benchmarks': 'SUMMARY',
  '/forecast-accuracy-monthly': 'SUMMARY',
  '/forecast-accuracy-monthly/daysgone': 'SUMMARY',
  '/forecast-accuracy-yearly': 'SUMMARY',
  '/forecast-accuracy-category-monthly': 'SUMMARY',
  '/forecast-accuracy-category-yearly': 'SUMMARY',
  '/ibl-vs-tscl': 'SUMMARY',
  '/inventory-days': 'SERVICE_MEASURE',
  '/above-below-threshold': 'SERVICE_MEASURE',
  '/service-measure': 'SERVICE_MEASURE',
  '/tgt-vs-actual': 'SERVICE_MEASURE',
  '/dispatch-vs-order': 'DISPATCH_WIP',
  '/wip': 'DISPATCH_WIP',
  '/rpm': 'DISPATCH_WIP',
  '/rd-status': 'RD_DATA_STATUS',
};

export const SECTION_LABEL: Record<Section, string> = {
  SUMMARY: 'Summary',
  SERVICE_MEASURE: 'Service Measure',
  DISPATCH_WIP: 'Dispatch & WIP',
  RD_DATA_STATUS: 'RD Data Status',
};
