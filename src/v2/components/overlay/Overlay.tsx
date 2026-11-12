import { Box, Flex, Text } from '@chakra-ui/react';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { colors } from '@/v2/constants/theme';
import type { HelpText } from '@/v2/constants/help';

/** True inside an expanded chart: charts grow and show every row. */
export const ExpandedContext = createContext(false);
export const useExpanded = () => useContext(ExpandedContext);

export interface OverlayProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}

/** Modal dialog in the Odoo style: dimmed page, white sheet, close on Esc. */
export function Overlay({ title, subtitle, onClose, children, width = 'min(1200px, 94vw)' }: OverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <Flex
      position="fixed"
      inset={0}
      zIndex={1400}
      bg={colors.overlay}
      align="flex-start"
      justify="center"
      pt="5vh"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <Flex
        role="dialog"
        aria-modal="true"
        direction="column"
        w={width}
        maxH="90vh"
        bg={colors.cardBg}
        borderRadius="6px"
        boxShadow="0 20px 50px rgba(0,0,0,.25)"
      >
        <Flex align="flex-start" gap={3} px={5} py={4} borderBottom="1px solid" borderColor={colors.border}>
          <Box flex={1} minW={0}>
            <Text fontSize="17px" fontWeight={600} color={colors.darkText}>
              {title}
            </Text>
            {subtitle && (
              <Text fontSize="13px" color={colors.mutedText}>
                {subtitle}
              </Text>
            )}
          </Box>
          <Box
            as="button"
            aria-label="Close"
            onClick={onClose}
            p={1}
            borderRadius="4px"
            color={colors.mutedText}
            cursor="pointer"
            _hover={{ bg: colors.hoverBg, color: colors.darkText }}
          >
            <FiX size={18} />
          </Box>
        </Flex>
        <Box flex={1} overflowY="auto" px={5} py={4}>
          {children}
        </Box>
      </Flex>
    </Flex>,
    document.body
  );
}

/**
 * Small "?" that explains a number in plain words: what it means and where it
 * comes from. Opens only on click (or Enter/Space), so moving the mouse across
 * the dashboard never pops anything up. A click anywhere else, its ×, or Esc
 * closes it, and opening one closes any other.
 */
let closeOpenTip: (() => void) | null = null;

export function InfoTip({ text, help, size = 15 }: { text?: ReactNode; help?: HelpText; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const W = 280;

  const close = () => setPos(null);

  const open = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    if (closeOpenTip && closeOpenTip !== close) closeOpenTip();
    closeOpenTip = close;
    const left = Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8);
    const below = r.bottom + 8;
    const top = below + 170 > window.innerHeight ? Math.max(8, r.top - 8 - 160) : below;
    setPos({ top, left });
  };

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (tipRef.current?.contains(t) || ref.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onScroll = () => close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('scroll', onScroll, true);
      if (closeOpenTip === close) closeOpenTip = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  const toggle = (e: React.SyntheticEvent) => {
    // Don't let a click on the ? sort a column or open a row.
    e.stopPropagation();
    e.preventDefault();
    if (pos) close();
    else open();
  };

  return (
    <Box
      as="span"
      ref={ref}
      display="inline-flex"
      flexShrink={0}
      tabIndex={0}
      role="button"
      aria-expanded={!!pos}
      aria-label={help ? `What is this? ${help.what}` : 'What is this?'}
      color={pos ? colors.brand : colors.mutedText}
      cursor="pointer"
      onClick={toggle}
      onKeyDown={(e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && toggle(e)}
      _hover={{ color: colors.brand }}
      _focusVisible={{ outline: `2px solid ${colors.brand}`, borderRadius: '50%' }}
    >
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M6.1 6.2a1.95 1.95 0 1 1 2.75 1.78c-.55.25-.85.6-.85 1.17v.35"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="8" cy="11.6" r=".85" fill="currentColor" />
      </svg>
      {pos &&
        createPortal(
          <Box
            ref={tipRef}
            role="dialog"
            aria-label="Explanation"
            position="fixed"
            top={`${pos.top}px`}
            left={`${pos.left}px`}
            w={`${W}px`}
            p={3}
            pr={8}
            bg={colors.darkText}
            color={colors.cardBg}
            fontSize="12.5px"
            lineHeight="1.45"
            borderRadius="6px"
            boxShadow="0 8px 24px rgba(0,0,0,.25)"
            zIndex={2000}
            textAlign="left"
            fontWeight={400}
            textTransform="none"
            letterSpacing="normal"
            whiteSpace="normal"
            cursor="default"
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <Box
              as="button"
              aria-label="Close"
              onClick={close}
              position="absolute"
              top="6px"
              right="6px"
              p="3px"
              borderRadius="4px"
              color={colors.cardBg}
              opacity={0.75}
              cursor="pointer"
              _hover={{ opacity: 1, bg: 'rgba(255,255,255,.12)' }}
            >
              <FiX size={13} />
            </Box>
            {help ? (
              <>
                <Text fontWeight={700} mb="2px">
                  What it means
                </Text>
                <Text mb={2}>{help.what}</Text>
                <Text fontWeight={700} mb="2px">
                  Where it comes from
                </Text>
                <Text opacity={0.85}>{help.source}</Text>
              </>
            ) : (
              text
            )}
          </Box>,
          document.body
        )}
    </Box>
  );
}
