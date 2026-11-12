import { Box, Flex, Text } from '@chakra-ui/react';
import { useSyncExternalStore } from 'react';
import { colors } from '@/v2/constants/theme';

// Small message ("toast") system. Anything can call notify(); <NotifyHost />
// shows one message at a time from the left. Each stays 5 s and fades away;
// hovering pauses it. A `key` stops the same message from queueing twice.

export type NotifyTone = 'info' | 'good' | 'bad' | 'data';

export interface NotifyMessage {
  title: string;
  detail?: string;
  tone?: NotifyTone;
  action?: { label: string; onClick: () => void };
  key?: string;
}

type Queued = NotifyMessage & { id: number };

let queue: Queued[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function notify(m: NotifyMessage) {
  if (m.key && queue.some((q) => q.key === m.key)) return;
  queue = [...queue, { ...m, id: ++seq }];
  emit();
}

function dismiss(id: number) {
  queue = queue.filter((q) => q.id !== id);
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const TONE: Record<NotifyTone, string> = {
  info: colors.brand,
  good: colors.good,
  bad: colors.bad,
  data: colors.target,
};

export function NotifyHost() {
  const list = useSyncExternalStore(subscribe, () => queue);
  const m = list[0];
  if (!m) return null;
  return (
    <Box
      key={m.id}
      role="status"
      aria-live="polite"
      position="fixed"
      top="112px"
      left="16px"
      zIndex={2100}
      w="min(380px, calc(100vw - 32px))"
      bg={colors.cardBg}
      border="1px solid"
      borderColor={colors.border}
      borderLeft={`4px solid ${TONE[m.tone ?? 'info']}`}
      borderRadius="4px"
      boxShadow={`0 8px 24px ${colors.shadow}`}
      pl={4}
      pr={2}
      py="10px"
      onAnimationEnd={() => dismiss(m.id)}
      css={{
        // Slides in from the left, holds, then fades away (5 s in all).
        animation: 'sp-toast 5s ease forwards',
        '&:hover': { animationPlayState: 'paused' },
        '@keyframes sp-toast': {
          '0%': { transform: 'translateX(calc(-100% - 24px))', opacity: 0 },
          '6%': { transform: 'translateX(0)', opacity: 1 },
          '84%': { opacity: 1 },
          '100%': { transform: 'translateX(0)', opacity: 0 },
        },
        '@media (prefers-reduced-motion: reduce)': {
          animationName: 'sp-toast-fade',
          '@keyframes sp-toast-fade': { '0%, 84%': { opacity: 1 }, '100%': { opacity: 0 } },
        },
      }}
    >
      <Flex align="flex-start" gap={2}>
        <Box flex={1} minW={0}>
          <Text fontSize="13px" fontWeight={700} color={colors.darkText}>
            {m.title}
          </Text>
          {m.detail && (
            <Text fontSize="12px" color={colors.bodyText} mt="2px">
              {m.detail}
            </Text>
          )}
          {m.action && (
            <Box
              as="button"
              mt="6px"
              fontSize="12px"
              fontWeight={600}
              color={colors.brand}
              cursor="pointer"
              _hover={{ textDecoration: 'underline' }}
              onClick={() => {
                m.action!.onClick();
                dismiss(m.id);
              }}
            >
              {m.action.label}
            </Box>
          )}
        </Box>
        <Flex direction="column" align="flex-end" gap={1} flexShrink={0}>
          <Box
            as="button"
            aria-label="Close message"
            onClick={() => dismiss(m.id)}
            color={colors.mutedText}
            _hover={{ color: colors.darkText }}
            cursor="pointer"
            fontSize="16px"
            lineHeight="1"
            px="4px"
          >
            ×
          </Box>
          {list.length > 1 && (
            <Text fontSize="10.5px" color={colors.mutedText} whiteSpace="nowrap">
              +{list.length - 1} more
            </Text>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}
