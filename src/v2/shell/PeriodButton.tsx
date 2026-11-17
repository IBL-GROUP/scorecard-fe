// The period button, as in Sales Pulse 2.0 (FR-EXEC-043): "Nov 2026 vs Oct 2026"
// on the right of the control panel; it opens the period presets, custom dates
// and the comparison. Choices apply at once (FR-FILT-002 as changed for 2.0).

import { Box, Flex, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { FiCalendar, FiChevronDown } from 'react-icons/fi';
import { Button } from '@/v2/components/button';
import { DatePicker } from '@/v2/components/date-picker';
import { Segmented } from '@/v2/components/segmented';
import { colors } from '@/v2/constants/theme';
import { PRESETS, periodTag, rangeLabel, todayIso, type CompareKey, type PresetKey, type Window } from '@/v2/features/period';
import { useStore } from '@/v2/features/store';

const COMPARE: { value: CompareKey; label: string }[] = [
  { value: 'prev', label: 'Previous period' },
  { value: 'ly', label: 'Same period last year' },
];

function Badge({ letter, tone }: { letter: 'A' | 'B'; tone: 'a' | 'b' }) {
  return (
    <Flex
      align="center"
      justify="center"
      w="18px"
      h="18px"
      borderRadius="4px"
      fontSize="11px"
      fontWeight={800}
      flexShrink={0}
      bg={tone === 'a' ? colors.brand : colors.prior}
      color={tone === 'a' ? colors.onBrand : colors.darkText}
    >
      {letter}
    </Flex>
  );
}

export function PeriodButton({ cmpWindow }: { cmpWindow: Window }) {
  const st = useStore();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(st.window);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => setCustom(st.window), [st.window]);

  // Click outside or Esc closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => rootRef.current && !rootRef.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const a = periodTag(st.window);
  const b = periodTag(cmpWindow);
  return (
    <Box position="relative" ref={rootRef} flexShrink={0}>
      <Box
        as="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Period: ${a} vs ${b}`}
        data-period-button
        display="inline-flex"
        alignItems="center"
        gap="8px"
        h="34px"
        px="12px"
        borderRadius="4px"
        bg={colors.brand}
        color={colors.onBrand}
        fontSize="13.5px"
        cursor="pointer"
        _hover={{ bg: colors.brandHover }}
        _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: '2px' }}
      >
        <FiCalendar size={14} aria-hidden />
        <Text as="span" fontWeight={700}>
          {a}
        </Text>
        <Text as="span" opacity={0.8} fontWeight={500}>
          vs {b}
        </Text>
        <FiChevronDown size={14} aria-hidden />
      </Box>
      {open && (
        <Box
          role="dialog"
          aria-label="Period and comparison"
          position="absolute"
          right={0}
          top="calc(100% + 6px)"
          zIndex={40}
          w="380px"
          maxW="calc(100vw - 32px)"
          bg={colors.cardBg}
          border="1px solid"
          borderColor={colors.border}
          borderRadius="6px"
          boxShadow={`0 12px 32px ${colors.shadow}`}
          p={4}
        >
          <Text fontSize="11px" fontWeight={700} color={colors.mutedText} textTransform="uppercase" letterSpacing=".04em" mb={2}>
            Period
          </Text>
          <Segmented<PresetKey> size="xs" ariaLabel="Period" value={st.preset} onChange={st.setPreset} options={PRESETS.map((p) => ({ value: p.key, label: p.label }))} />
          {st.preset === 'custom' && (
            <Flex gap="6px" align="flex-end" mt={3} wrap="wrap">
              <Box>
                <Text fontSize="11px" color={colors.mutedText}>
                  From
                </Text>
                <DatePicker variant="range-start" value={custom.start} maxDate={custom.end} onChange={(v) => setCustom({ ...custom, start: v })} />
              </Box>
              <Box>
                <Text fontSize="11px" color={colors.mutedText}>
                  To
                </Text>
                <DatePicker variant="range-end" value={custom.end} minDate={custom.start} maxDate={todayIso()} onChange={(v) => setCustom({ ...custom, end: v })} />
              </Box>
              <Button size="sm" variant="primary" onClick={() => custom.start && custom.end && custom.start <= custom.end && st.setCustom(custom)}>
                Set
              </Button>
            </Flex>
          )}
          <Text fontSize="11px" fontWeight={700} color={colors.mutedText} textTransform="uppercase" letterSpacing=".04em" mt={4} mb={2}>
            Compare with
          </Text>
          <Segmented<CompareKey> size="xs" ariaLabel="Compare to" value={st.compare} onChange={st.setCompare} options={COMPARE} />
          <Flex direction="column" gap="6px" mt={4} pt={3} borderTop="1px solid" borderColor={colors.border} fontSize="12.5px" color={colors.bodyText}>
            <Flex align="center" gap="8px">
              <Badge letter="A" tone="a" />
              <Text>
                <b>{a}</b> · {rangeLabel(st.window)}
              </Text>
            </Flex>
            <Flex align="center" gap="8px">
              <Badge letter="B" tone="b" />
              <Text>
                <b>{b}</b> · {rangeLabel(cmpWindow)}
              </Text>
            </Flex>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
