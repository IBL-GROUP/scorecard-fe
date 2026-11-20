import { Box } from '@chakra-ui/react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown } from 'react-icons/fi';
import { colors } from '@/constants/theme';

/**
 * A row of tabs that shows as many as fit and puts the rest behind a ⌄ button,
 * instead of scrolling sideways. Used by the main tab bar and every Segmented
 * switch, so a long row reads the same wherever it is.
 *
 * Every item is laid out once more in an invisible copy to learn its width; the
 * row asks for the full width (so it grows back when there is room) but may
 * shrink, and then keeps the items that fit beside the ⌄ button. The selected
 * item is always among the shown ones: when it would be hidden it takes the
 * last shown place.
 */
export function useOverflow(count: number, gap: number, moreWidth = 34) {
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(count);
  const [full, setFull] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const calc = () => {
      const widths = [...measure.children].map((c) => (c as HTMLElement).offsetWidth);
      const total = widths.reduce((a, w) => a + w, 0) + gap * Math.max(0, widths.length - 1);
      setFull(total);
      const room = row.clientWidth;
      if (total <= room + 0.5) return setFit(count);
      let used = moreWidth;
      let k = 0;
      while (k < widths.length && used + widths[k] + gap <= room) {
        used += widths[k] + gap;
        k++;
      }
      setFit(Math.max(1, k));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(row);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [count, gap, moreWidth]);

  return { rowRef, measureRef, fit, full };
}

/** Which indexes to show and which go in the menu, keeping `active` shown. */
export function splitShown(count: number, fit: number, active: number) {
  const all = Array.from({ length: count }, (_, i) => i);
  if (fit >= count) return { shown: all, hidden: [] as number[] };
  let shown = all.slice(0, fit);
  if (active >= fit) shown = [...all.slice(0, fit - 1), active];
  const set = new Set(shown);
  return { shown, hidden: all.filter((i) => !set.has(i)) };
}

/** The hidden copy every item is measured in. */
export function MeasureRow({ measureRef, gap, children }: { measureRef: React.Ref<HTMLDivElement>; gap: number; children: ReactNode }) {
  return (
    <Box
      ref={measureRef}
      aria-hidden
      position="absolute"
      visibility="hidden"
      pointerEvents="none"
      display="flex"
      gap={`${gap}px`}
      top={0}
      left={0}
      whiteSpace="nowrap"
      css={{ '& > *': { flexShrink: 0 } }}
    >
      {children}
    </Box>
  );
}

/**
 * The ⌄ button and the menu of the items that did not fit. The menu opens in a
 * portal, so a card's overflow cannot clip it; Esc, a click elsewhere or a pick
 * closes it.
 */
export function MoreMenu({
  items,
  onPick,
  h,
  label = 'More',
  bg = colors.sunkBg,
}: {
  items: { key: string; label: ReactNode; title?: string; disabled?: boolean; active?: boolean }[];
  onPick: (key: string) => void;
  h: string;
  label?: string;
  bg?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!at) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node))
        setAt(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [at]);

  const toggle = () => {
    if (at) return setAt(null);
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setAt({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  return (
    <>
      <Box
        as="button"
        ref={btnRef}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={!!at}
        onClick={toggle}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        w="30px"
        h={h}
        borderRadius="4px"
        bg={at ? colors.border : bg}
        color={colors.darkText}
        cursor="pointer"
        _hover={{ bg: colors.border }}
        _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: '1px' }}
      >
        <FiChevronDown size={15} />
      </Box>
      {at &&
        createPortal(
          <Box
            ref={menuRef}
            role="menu"
            position="fixed"
            top={`${at.top}px`}
            right={`${at.right}px`}
            zIndex={1700}
            minW="180px"
            maxH="min(420px, 70vh)"
            overflowY="auto"
            bg={colors.cardBg}
            border="1px solid"
            borderColor={colors.border}
            borderRadius="4px"
            boxShadow="0 8px 24px rgba(22,22,49,.14)"
            py={1}
          >
            {items.map((it) => (
              <Box
                as="button"
                key={it.key}
                role="menuitem"
                title={it.title}
                display="block"
                w="100%"
                textAlign="left"
                px={3}
                py="7px"
                fontSize="13px"
                fontWeight={it.active ? 600 : 500}
                color={it.active ? colors.brand : colors.darkText}
                whiteSpace="nowrap"
                opacity={it.disabled ? 0.45 : 1}
                cursor={it.disabled ? 'not-allowed' : 'pointer'}
                _hover={it.disabled ? undefined : { bg: colors.hoverBg }}
                onClick={() => {
                  if (it.disabled) return;
                  setAt(null);
                  onPick(it.key);
                }}
              >
                {it.label}
              </Box>
            ))}
          </Box>,
          document.body
        )}
    </>
  );
}
