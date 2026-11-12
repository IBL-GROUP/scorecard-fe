import { Box } from '@chakra-ui/react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { colors } from '@/v2/constants/theme';

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
const MAX_PEEK = 2;

/**
 * The "book" every drill-down in Sales Pulse uses. Each deeper level slides
 * in from the right on top; earlier levels stay visible behind it to the left,
 * dimmed, and clicking one goes back to that level. Esc goes back one level,
 * a click on the dimmed page closes everything.
 */
export function SheetStack({ keys, labels, renderSheet, onPopTo, onClose }: SheetStackProps) {
  const n = keys.length;

  useEffect(() => {
    if (!n) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // The top sheet owns Esc, so a dialog underneath doesn't close too.
      e.stopPropagation();
      if (n > 1) onPopTo(n - 2);
      else onClose();
    };
    window.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prev;
    };
  }, [n, onPopTo, onClose]);

  if (!n) return null;

  return createPortal(
    <Box
      position="fixed"
      inset={0}
      zIndex={1500}
      bg={colors.overlay}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {keys.map((k, i) => {
        const behind = n - 1 - i; // 0 = top sheet
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
            {behind > 0 && !hidden && (
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
