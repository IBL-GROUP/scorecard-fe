import type { SVGProps } from 'react';
import { FiGrid } from 'react-icons/fi';

/**
 * Each dashboard's icon, drawn exactly as the portal draws it on that
 * dashboard's card (authenticator-fe components/dashboard-meta), so a dashboard
 * looks the same in the portal and in this menu.
 *
 * Keyed by menu_item.resource_code. menu_item.icon is not used: it named
 * generic react-icons (a truck for Supply Chain, a share arrow for
 * Distribution) that matched nothing the portal shows.
 */

type IconProps = { size?: number };

const svgProps = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  // The portal draws these at 32px with 1.8; at menu size that reads faint.
  strokeWidth: size < 24 ? 2 : 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

const SalesIcon = ({ size = 16 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M4 19h16" />
    <path d="M7 15l3-3 3 2 4-5" />
    <path d="M17 9h3v3" />
  </svg>
);

const SupplyChainIcon = ({ size = 16 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M12 21a9 9 0 1 0-9-9" />
    <path d="M12 12l5-5" />
    <path d="M17 7h-4" />
    <path d="M17 7v4" />
  </svg>
);

const DistributionIcon = ({ size = 16 }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="3" y="7" width="13" height="10" rx="2" />
    <path d="M16 10h2l3 3v4h-5" />
    <circle cx="8" cy="18" r="1.75" />
    <circle cx="18" cy="18" r="1.75" />
  </svg>
);

const MarketingIcon = ({ size = 16 }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M3 11l16-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    <path d="M22 9.5v5" />
  </svg>
);

const ICONS_BY_RESOURCE: Record<string, (props: IconProps) => JSX.Element> = {
  SALES_PULSE: SalesIcon,
  SUPPLYCHAIN_PULSE: SupplyChainIcon,
  DISTRIBUTION_PULSE: DistributionIcon,
  MARKETING_ADVANCE_ACTIVITY: MarketingIcon,
};

/** The icon for a dashboard; a plain grid for one the portal has no art for. */
export function DashboardIcon({ resourceCode, size = 16 }: { resourceCode: string; size?: number }) {
  const Icon = ICONS_BY_RESOURCE[resourceCode];
  return Icon ? <Icon size={size} /> : <FiGrid size={size} />;
}
