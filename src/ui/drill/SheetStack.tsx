import { Box } from '@chakra-ui/react';
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { colors } from '@/constants/theme';

export interface SheetStackProps {
  /** One stable key per open sheet, outermost first. */
  keys: string[];
  /** Label for the strip of an earlier sheet ("Back to …"). */
  labels: string[];
  renderSheet: (depth: number, isTop: boolean) => ReactNode;
  /** Go back to the given depth (0 = first sheet). */
  onPopTo: (depth: number) => void;
  onClose: () => void;
}

const PEEK = 140; // px of each earlier sheet left visible
const MAX_PEEK = 4;

/**
 * The stacks open right now, oldest first, with how many sheets each holds.
 *
 * One stack can open over another — a group's sheets, then a SKU's detail
 * sheet on top. They read as ONE book: the newer stack's sheets count as
 * deeper pages, so the older stack's sheets slide further left and keep
 * peeking out behind them, and only the oldest dims the page. Only the
 * newest answers Esc.
 */
type OpenStack = { id: symbol; count: number };
let openStacks: OpenStack[] = [];
let pageOverflow = '';
const listeners = new Set<() => void>();

function setSheetCount(id: symbol, count: number) {
  const before = openStacks.length;
  const i = openStacks.findIndex((s) => s.id === id);
  if (count === 0) {
    if (i < 0) return;
    openStacks = openStacks.filter((s) => s.id !== id);
  } else if (i < 0) {
    openStacks = [...openStacks, { id, count }];
  } else if (openStacks[i].count !== count) {
    openStacks = openStacks.map((s) => (s.id === id ? { id, count } : s));
  } else return;
  // The page stops scrolling under the first stack and gets it back after the last.
  if (!before && openStacks.length) {
    pageOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  } else if (before && !openStacks.length) {
    document.body.style.overflow = pageOverflow;
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => openStacks;

/**
 * The "book" every drill-down in Sales Pulse uses. Each deeper level slides
 * in from the right on top; earlier levels stay visible behind it to the left,
 * dimmed, and clicking one goes back to that level. Esc goes back one level,
 * a click on the dimmed page closes everything.
 */
export function SheetStack({ keys, labels, renderSheet, onPopTo, onClose }: SheetStackProps) {
  const n = keys.length;

  // This stack's place among the open ones (see openStacks).
  const me = useRef(Symbol('sheet-stack')).current;
  useLayoutEffect(() => setSheetCount(me, n), [me, n]);
  useEffect(() => () => setSheetCount(me, 0), [me]);
  const stacks = useSyncExternalStore(subscribe, snapshot);
  const at = stacks.findIndex((s) => s.id === me);
  // Sheets of the stacks opened over this one: they push this one's left.
  const over = at < 0 ? 0 : stacks.slice(at + 1).reduce((a, s) => a + s.count, 0);
  const isTopStack = at === stacks.length - 1;

  useEffect(() => {
    if (!n) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Only the newest stack answers; one opened over this one goes first,
      // and a dialog open over the sheets closes before any of them.
      if (openStacks[openStacks.length - 1]?.id !== me) return;
      if (document.querySelector('[data-sp-modal]')) return;
      // The top sheet owns Esc, so a dialog underneath doesn't close too.
      e.stopPropagation();
      if (n > 1) onPopTo(n - 2);
      else onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [n, onPopTo, onClose, me]);

  if (!n) return null;

  return createPortal(
    <Box
      position="fixed"
      inset={0}
      zIndex={1500}
      // One dimming for the whole book: a stack opened over another adds none.
      bg={at > 0 ? 'transparent' : colors.overlay}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {keys.map((k, i) => {
        const behind = n - 1 - i + over; // 0 = the top sheet of the whole book
        const hidden = behind > MAX_PEEK;
        return (
          <Box
            key={k}
            position="absolute"
            top={0}
            bottom={0}
            right={0}
            // Full width on phones; a 72% book on larger screens.
            w={{ base: '100vw', md: 'min(860px, 72vw)' }}
            // Earlier sheets move left so a strip of each stays visible.
            transform={`translateX(-${behind * PEEK}px)`}
            transition="transform var(--sp-m-300) var(--sp-ease-out), opacity var(--sp-m-200) var(--sp-ease-out), filter var(--sp-m-200) var(--sp-ease-out)"
            opacity={hidden ? 0 : 1}
            pointerEvents={hidden ? 'none' : 'auto'}
            filter={behind ? 'brightness(.94)' : undefined}
            zIndex={i + 1}
            css={{
              animation: 'sp-sheet-in var(--sp-m-300) var(--sp-ease-out)',
              '@keyframes sp-sheet-in': { from: { transform: 'translateX(40px)', opacity: 0 }, to: {} },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {renderSheet(i, behind === 0)}
            {behind > 0 && !hidden && isTopStack && (
              // The visible strip of an earlier sheet: click it to go back.
              <Box
                as="button"
                aria-label={`Back to ${labels[i]}`}
                title={`Back to ${labels[i]}`}
                position="absolute"
                inset={0}
                cursor="pointer"
                bg="transparent"
                _hover={{ bg: 'rgba(35,58,135,.06)' }}
                onClick={() => onPopTo(i)}
              />
            )}
          </Box>
        );
      })}
    </Box>,
    document.body
  );
}
