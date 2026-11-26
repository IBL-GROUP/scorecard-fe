// Zone › Market › Region › Branch, as Sales Pulse 2.0 (vw_zone_region_data, home-region rule in
// scorecard-be /filters/branches). A branch the view does not map is zone and region "Others".

import type { DashboardData } from './data';

export interface Geo {
  zone: string;
  market: string;
  region: string;
}

/** Each branch's zone, market and region, looked up by branch name. */
export function geoOf(data: DashboardData): (branch: string) => Geo {
  const m = new Map<string, Geo>();
  for (const b of data.options.branches) m.set(b.hub_branch_desc.trim().toLowerCase(), { zone: b.zone ?? 'Others', market: b.market ?? 'Others', region: b.region ?? 'Others' });
  return (branch: string) => m.get(branch.trim().toLowerCase()) ?? { zone: 'Others', market: 'Others', region: 'Others' };
}
