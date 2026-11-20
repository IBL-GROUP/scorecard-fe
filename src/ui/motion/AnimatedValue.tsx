import type { ReactNode } from 'react';
import { RollingNumber } from './RollingNumber';

/**
 * A box's headline figure. Text with digits in it rolls into place (see
 * RollingNumber); anything else — "—", a name, an element — shows as it is.
 * Every tile, highlight card and ring in Sales Pulse puts its number through
 * this, so they all animate the same way.
 */
export function AnimatedValue({ value }: { value: ReactNode }) {
  return typeof value === 'string' && /\d/.test(value) ? <RollingNumber value={value} /> : <>{value}</>;
}
