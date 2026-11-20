// The five Supply Chain Pulse 2.0 tabs, named as the 1.0 menu (user request, 17 Nov 2026; FR-EXEC-050) (PRD section 3.1) and the permission
// sections that govern them (PRD section 3.2). Hiding a tab or a tile is a
// convenience, not security (SEC-PERM-001): scorecard-be enforces the token.

export type Section = 'SUMMARY' | 'SERVICE_MEASURE' | 'DISPATCH_WIP' | 'RD_DATA_STATUS';
export const ALL_SECTIONS: Section[] = ['SUMMARY', 'SERVICE_MEASURE', 'DISPATCH_WIP', 'RD_DATA_STATUS'];

export type TabKey = 'overview' | 'revenue' | 'inventory' | 'fulfilment' | 'distribution';

export const TABS: { key: TabKey; label: string; mid: string; short: string; anyOf: Section[] }[] = [
  { key: 'overview', label: 'Pulse', mid: 'Pulse', short: 'Pulse', anyOf: ALL_SECTIONS },
  { key: 'revenue', label: 'Summary', mid: 'Summary', short: 'Summary', anyOf: ['SUMMARY'] },
  { key: 'inventory', label: 'Service Measure', mid: 'Service Measure', short: 'Service', anyOf: ['SUMMARY', 'SERVICE_MEASURE'] },
  { key: 'fulfilment', label: 'Dispatch & WIP', mid: 'Dispatch & WIP', short: 'Dispatch', anyOf: ['DISPATCH_WIP'] },
  { key: 'distribution', label: 'RD Data Status', mid: 'RD Data Status', short: 'RD Status', anyOf: ['RD_DATA_STATUS'] },
];

/** Tabs that still scroll on a desktop; each leaves this list once rebuilt to fit the screen like Sales Pulse 2.0. */
export const SCROLL_TABS: TabKey[] = [];

/** Which section an endpoint's data belongs to. */
export const SECTION_OF: Record<string, Section> = {
  '/sales-summary': 'SUMMARY',
  '/sales-summary/by-sales-type': 'SUMMARY',
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
