import type { SVGProps } from 'react';

// ONEThunder mark and wordmark (Cobalt #233a87 / Midnight #161631).

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinejoin: 'miter' as const,
  strokeLinecap: 'butt' as const,
  'aria-hidden': true,
});

/** The ONEThunder mark: a rising line that resolves to one node. */
export function ThunderMark({ size = 22, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M1.5 14 6 9.5l3 2.2 4.2-6" />
      <circle cx="13.6" cy="3.4" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** ONE (Midnight) + Thunder (Cobalt italic), per the element system. */
export function Wordmark({ midnight, cobalt }: { midnight: string; cobalt: string }) {
  return (
    <span
      style={{
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: midnight }}>ONE</span>
      <span style={{ color: cobalt, fontStyle: 'italic', fontWeight: 600 }}>Thunder</span>
    </span>
  );
}
