// Fixed-screen mode (FR-EXEC-025, NFR-EXEC-004): on a desktop screen the tab
// fills the window below the header and the page does not scroll. Smaller
// windows keep the normal scrolling layout.

import { useEffect, useState } from 'react';

export const FIT_QUERY = '(min-width: 1280px) and (min-height: 720px)';

const matches = () => typeof window !== 'undefined' && !!window.matchMedia?.(FIT_QUERY).matches;

/** Whether the window is large enough for the fixed-screen layout. */
export function useFitScreen(): boolean {
  const [fit, setFit] = useState(matches);
  useEffect(() => {
    const m = window.matchMedia?.(FIT_QUERY);
    if (!m) return;
    const on = () => setFit(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return fit;
}
