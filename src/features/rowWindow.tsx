// Tables draw 50 rows at a time (user, 23 Nov 2026): the first 50, then 50 more each time the
// scroll nears the bottom, so a long table never lags the page. Only what is drawn is windowed:
// totals, search, sort and Export still use every row.

import { Box, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { colors } from '@/constants/theme';

export const ROW_STEP = 50;

/** The box the table scrolls in (its card), so "near the bottom" is measured there. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY;
    if (y === 'auto' || y === 'scroll') return p;
  }
  return null;
}

/**
 * The rows to draw, and the marker to place after them. Back to the first 50 whenever
 * `resetKey` changes (new data, search, sort or grouping); opening a group keeps the count.
 */
export function useRowWindow<T>(items: readonly T[], resetKey: unknown, step = ROW_STEP) {
  const [count, setCount] = useState(step);
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setCount(step);
  }
  const more = items.length > count;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !more) return;
    // Starts drawing the next rows a little before the end is on screen.
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setCount((c) => c + step), { root: scrollParent(el), rootMargin: '300px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more, count, step]);

  const note = (
    <Text fontSize="12px" color={colors.mutedText}>
      Showing {count.toLocaleString('en-US')} of {items.length.toLocaleString('en-US')} Rows · Scroll For More
    </Text>
  );
  /** After div rows. */
  const marker = more ? (
    <Box ref={ref} px={3} py="10px" textAlign="center">
      {note}
    </Box>
  ) : null;
  /** After the rows of an HTML table body, spanning its columns. */
  const markerRow = (colSpan: number) =>
    more ? (
      <tr key="row-window-more">
        <td ref={ref} colSpan={colSpan} style={{ padding: '10px 12px', textAlign: 'center' }}>
          {note}
        </td>
      </tr>
    ) : null;
  return { rows: more ? items.slice(0, count) : items, marker, markerRow };
}
