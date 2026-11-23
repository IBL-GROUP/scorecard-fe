import { Box, Flex, Grid, HStack, Text } from '@chakra-ui/react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { FiCalendar, FiCheck, FiChevronDown, FiChevronLeft, FiChevronRight, FiInfo } from 'react-icons/fi';
import { Segmented } from '@/ui/segmented';
import { colors } from '@/constants/theme';
import { comparisonWindow } from '@/features/period';

// Sales Pulse 2.0's period picker (dsr-fe components/period-picker), the same
// layout and behaviour, wired to Supply Chain Pulse's store through props.
// Differences: Quarter to date and Year to date are quick picks and "Qtr" is a
// pick mode, because this dashboard reads multi-month windows (rule F1); FY
// stays off (no fiscal-year rule is defined here); the comparison hints use
// Supply Chain's own windows (rule F2); and the comparison can be switched
// off as a whole (compareEnabled), leaving its choices visible but disabled.

/** Previous period / same period last year; both may be on (Sales Pulse), Supply Chain uses one. */
export type CompareMode = 'previous' | 'off';

// ─── Date helpers (all ISO "YYYY-MM-DD", local time) ─────────────────────────

/** First day with sales history in the source view, BigQuery's vw_mv_tsc_data (VITE_DATA_START overrides). */
export const DATA_START: string = (() => {
  const v = import.meta.env.VITE_DATA_START as string | undefined;
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '2000-01-01';
})();
export const DATA_START_LABEL = new Date(`${DATA_START}T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => new Date(`${s}T00:00:00`);
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const monthOf = (s: string) => `${s.slice(0, 7)}-01`;
const monthEnd = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return `${month.slice(0, 7)}-${pad(new Date(y, m, 0).getDate())}`;
};
const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return iso(d);
};
const todayIso = () => iso(new Date());
const minIso = (a: string, b: string) => (a < b ? a : b);
const maxIso = (a: string, b: string) => (a > b ? a : b);

export const fmtMonth = (month: string, style: 'long' | 'short' = 'short') =>
  parse(month).toLocaleDateString('en-GB', { month: style, year: 'numeric' });

/** The month(s) a range falls in, short: "Nov '26", "Oct–Nov '26", "Dec '25–Jan '26". */
export function monthTag(start: string, end: string) {
  if (!start || !end) return '';
  const tag = (iso: string, withYear: boolean) => {
    const d = parse(iso);
    const mon = d.toLocaleDateString('en-GB', { month: 'short' });
    return withYear ? `${mon} '${String(d.getFullYear()).slice(2)}` : mon;
  };
  if (start.slice(0, 7) === end.slice(0, 7)) return tag(end, true);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${tag(start, !sameYear)}–${tag(end, true)}`;
}

/** The same days one year earlier (29 Feb falls back to the 28th). */
export function lastYearRange(start: string, end: string) {
  const back = (d: string) => {
    const s = `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
    return s.slice(5) === '02-29' ? `${s.slice(0, 8)}28` : s;
  };
  return { start: back(start), end: back(end) };
}

/** "1–4 Nov 2026", or "Nov 2026" when the range is the whole month to date. */
export function rangeLabel(start: string, end: string) {
  if (!start || !end) return '';
  const s = parse(start);
  const e = parse(end);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const mon = e.toLocaleDateString('en-GB', { month: 'short' });
  if (sameMonth) {
    return start === end
      ? `${e.getDate()} ${mon} ${e.getFullYear()}`
      : `${s.getDate()}–${e.getDate()} ${mon} ${e.getFullYear()}`;
  }
  return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** B period for "previous": the same day numbers one month earlier (what the API compares). */
export function previousRange(start: string, end: string) {
  const prevMonth = shiftMonth(monthOf(start), -1);
  const last = Number(monthEnd(prevMonth).slice(8, 10));
  const day = (s: string) => Math.min(Number(s.slice(8, 10)), last);
  return {
    start: `${prevMonth.slice(0, 7)}-${pad(day(start))}`,
    end: `${prevMonth.slice(0, 7)}-${pad(day(end))}`,
  };
}

const dayCount = (start: string, end: string) =>
  Math.round((parse(end).getTime() - parse(start).getTime()) / 86_400_000) + 1;

// ─── Component ──────────────────────────────────────────────────────────────

type PickBy = 'day' | 'week' | 'month' | 'qtr';

interface Preset {
  label: string;
  range: () => { start: string; end: string };
}

const PRESETS: Preset[] = [
  { label: 'Month To Date', range: () => ({ start: monthOf(todayIso()), end: todayIso() }) },
  { label: 'Today', range: () => ({ start: todayIso(), end: todayIso() }) },
  { label: 'Yesterday', range: () => ({ start: addDays(todayIso(), -1), end: addDays(todayIso(), -1) }) },
  {
    label: 'This Week',
    range: () => {
      const t = parse(todayIso());
      const monday = addDays(todayIso(), -((t.getDay() + 6) % 7));
      return { start: monday, end: todayIso() };
    },
  },
  { label: 'Last 7 Days', range: () => ({ start: addDays(todayIso(), -6), end: todayIso() }) },
  {
    label: 'Last Month',
    range: () => {
      const m = shiftMonth(monthOf(todayIso()), -1);
      return { start: m, end: monthEnd(m) };
    },
  },
  {
    label: 'Quarter To Date',
    range: () => {
      const t = parse(todayIso());
      return { start: iso(new Date(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3, 1)), end: todayIso() };
    },
  },
  { label: 'Year To Date', range: () => ({ start: `${todayIso().slice(0, 4)}-01-01`, end: todayIso() }) },
];

/** The calendar quarter of a day: its first day and its last day. */
const quarterOf = (d: string) => {
  const t = parse(d);
  const q0 = Math.floor(t.getMonth() / 3) * 3;
  return { start: iso(new Date(t.getFullYear(), q0, 1)), end: iso(new Date(t.getFullYear(), q0 + 3, 0)) };
};

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export interface PeriodValue {
  start: string;
  end: string;
  compare: CompareMode;
  ly: boolean;
}

export interface PeriodPickerProps {
  /** The applied period and comparison. */
  value: PeriodValue;
  /** Apply: the chosen period and comparison. */
  onApply: (v: PeriodValue) => void;
  /** Off: the comparison choices are shown but cannot be picked, and "No comparison" is on. */
  compareEnabled?: boolean;
  /** Days in the applied month that have sales, shown as dots. */
  dataDays?: Set<string>;
  /** Last day with data; month-to-date ends here. */
  dataAsOf?: string;
}

export function PeriodPicker({ value, onApply, compareEnabled = true, dataDays, dataAsOf }: PeriodPickerProps) {
  const selectedStartDate = value.start;
  const selectedEndDate = value.end;
  const selectedMonth = monthOf(value.start);
  const compareMode: CompareMode = compareEnabled ? value.compare : 'off';
  const compareLy = compareEnabled && value.ly;
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Draft state, committed on Apply.
  const [month, setMonth] = useState(selectedMonth);
  const [start, setStart] = useState(selectedStartDate);
  const [end, setEnd] = useState(selectedEndDate);
  const [compare, setCompare] = useState<CompareMode>(compareMode);
  const [ly, setLy] = useState(compareLy);
  const [pickBy, setPickBy] = useState<PickBy>('day');
  const [anchor, setAnchor] = useState<string | null>(null); // first click of a day range
  const [hover, setHover] = useState<string | null>(null);
  const [focusDay, setFocusDay] = useState(selectedEndDate);

  const reset = () => {
    setMonth(selectedMonth);
    setStart(selectedStartDate);
    setEnd(selectedEndDate);
    setCompare(compareMode);
    setLy(compareLy);
    setAnchor(null);
    setHover(null);
    setFocusDay(selectedEndDate || selectedMonth);
  };
  useEffect(reset, [selectedMonth, selectedStartDate, selectedEndDate, compareMode, compareLy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        reset();
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = todayIso();
  const mEnd = monthEnd(month);
  const lastSelectable = minIso(mEnd, today);
  const isDisabledDay = (d: string) => d > today || d < DATA_START;

  const applyRange = (s: string, e: string) => {
    setMonth(monthOf(s));
    setStart(s);
    setEnd(e);
    setAnchor(null);
    setHover(null);
    setFocusDay(e);
  };

  const pickDay = (d: string) => {
    if (isDisabledDay(d)) return;
    if (pickBy === 'month') return applyRange(month, lastSelectable);
    if (pickBy === 'qtr') {
      const q = quarterOf(d);
      return applyRange(q.start, minIso(q.end, today));
    }
    if (pickBy === 'week') {
      const dow = (parse(d).getDay() + 6) % 7;
      const s = maxIso(addDays(d, -dow), month);
      const e = minIso(addDays(d, 6 - dow), lastSelectable);
      return applyRange(s, e);
    }
    if (!anchor) {
      setAnchor(d);
      setStart(d);
      setEnd(d);
      return;
    }
    const [s, e] = d < anchor ? [d, anchor] : [anchor, d];
    applyRange(s, e);
  };

  // Calendar grid for the draft month, Monday first.
  const cells = useMemo(() => {
    const first = parse(month);
    const lead = (first.getDay() + 6) % 7;
    const days = Number(mEnd.slice(8, 10));
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= days; i++) out.push(`${month.slice(0, 7)}-${pad(i)}`);
    while (out.length % 7) out.push(null);
    return out;
  }, [month, mEnd]);

  // Range shown in the calendar, including the hover preview while choosing an end.
  const shownStart = anchor && hover ? minIso(anchor, hover) : start;
  const shownEnd = anchor && hover ? maxIso(anchor, hover) : end;
  const b = comparisonWindow({ start, end }, 'prev');
  const lyR = comparisonWindow({ start, end }, 'ly');

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (moves[e.key] != null) {
      e.preventDefault();
      const next = addDays(focusDay, moves[e.key]);
      if (next < month || next > mEnd) return;
      setFocusDay(next);
      if (anchor) setHover(next);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pickDay(focusDay);
    }
  };

  useEffect(() => {
    if (!open) return;
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`);
    el?.focus({ preventScroll: true });
  }, [focusDay, open]);

  // "Month to date" stops at the last day with sales, so A and B stay like for like.
  const rangeOf = (p: Preset) => {
    const r = p.range();
    if (p.label === 'Month To Date' && dataAsOf && dataAsOf.slice(0, 7) === r.start.slice(0, 7) && dataAsOf < r.end) {
      return { start: r.start, end: dataAsOf };
    }
    return r;
  };

  const presetState = (p: Preset) => {
    const r = rangeOf(p);
    if (r.start < DATA_START) return { disabled: true, reason: `No sales data before ${DATA_START_LABEL}.` };
    return { disabled: false, reason: '' };
  };

  const appliedLabel = rangeLabel(selectedStartDate, selectedEndDate);
  const appliedB = comparisonWindow({ start: selectedStartDate, end: selectedEndDate }, 'prev');
  const isFullMonthToDate =
    selectedStartDate === selectedMonth &&
    (selectedEndDate === minIso(monthEnd(selectedMonth), today) ||
      (!!dataAsOf && selectedEndDate === dataAsOf && dataAsOf.slice(0, 7) === selectedMonth.slice(0, 7)));
  const buttonA = isFullMonthToDate ? fmtMonth(selectedMonth) : appliedLabel;
  const appliedLy = comparisonWindow({ start: selectedStartDate, end: selectedEndDate }, 'ly');
  const buttonB =
    [
      compareMode !== 'off' && (isFullMonthToDate ? fmtMonth(monthOf(appliedB.start)) : rangeLabel(appliedB.start, appliedB.end)),
      compareLy && (isFullMonthToDate ? fmtMonth(monthOf(appliedLy.start)) : rangeLabel(appliedLy.start, appliedLy.end)),
    ]
      .filter(Boolean)
      .join(' & ') || 'No Comparison';

  const recent = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 12; i++) out.push(shiftMonth(monthOf(today), -i));
    return out.reverse();
  }, [today]);

  return (
    <Box ref={rootRef} position="relative" flexShrink={0}>
      <Box
        as="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={compareMode !== 'off' || compareLy ? `A: ${appliedLabel} vs ${buttonB}` : `A: ${appliedLabel}`}
        onClick={() => setOpen((o) => !o)}
        display="inline-flex"
        alignItems="center"
        gap="8px"
        h="34px"
        px="12px"
        borderRadius="4px"
        bg={open ? colors.brandHover : colors.brand}
        color={colors.onBrand}
        fontSize="13px"
        fontWeight={600}
        cursor="pointer"
        _hover={{ bg: colors.brandHover }}
        whiteSpace="nowrap"
      >
        <FiCalendar size={14} />
        <span>{buttonA}</span>
        {(compareMode !== 'off' || compareLy) && (
          <Text as="span" fontWeight={400} opacity={0.65}>
            vs {buttonB}
          </Text>
        )}
        <FiChevronDown size={14} />
      </Box>

      {open && (
        <Box
          role="dialog"
          aria-label="Choose period"
          position="absolute"
          right={0}
          top="calc(100% + 8px)"
          zIndex={70}
          w="min(900px, calc(100vw - 32px))"
          maxH="calc(100vh - 110px)"
          overflowY="auto"
          bg={colors.cardBg}
          border="1px solid"
          borderColor={colors.border}
          borderRadius="8px"
          boxShadow="0 16px 40px rgba(22,22,49,.18)"
        >
          <Grid templateColumns={{ base: '1fr', md: '188px minmax(0, 1fr) 232px' }}>
            {/* Presets */}
            <Flex direction="column" gap="2px" px={3} py={5} borderRight={{ md: '1px solid' }} borderColor={colors.sunkBg}>
              <SectionLabel>Quick picks</SectionLabel>
              {PRESETS.map((p) => {
                const st = presetState(p);
                const r = rangeOf(p);
                const active = !st.disabled && r.start === start && r.end === end;
                return (
                  <Box
                    as="button"
                    key={p.label}
                    title={st.reason || rangeLabel(r.start, r.end)}
                    onClick={() => !st.disabled && applyRange(r.start, r.end)}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    textAlign="left"
                    px={3}
                    h="36px"
                    borderRadius="6px"
                    fontSize="13px"
                    fontWeight={active ? 600 : 400}
                    color={st.disabled ? colors.borderStrong : active ? colors.brand : colors.bodyText}
                    bg={active ? colors.brandSoft : 'transparent'}
                    cursor={st.disabled ? 'not-allowed' : 'pointer'}
                    _hover={st.disabled || active ? undefined : { bg: colors.hoverBg }}
                  >
                    {p.label}
                    {active && <FiCheck size={14} />}
                  </Box>
                );
              })}
            </Flex>

            {/* Period A: month strip + calendar */}
            <Box px={6} py={5} minW={0}>
              <Flex justify="space-between" align="center" gap={3} mb={4} wrap="wrap">
                <HStack gap={2}>
                  <Badge letter="A" tone="a" />
                  <Text fontWeight={700} fontSize="15px" color={colors.darkText}>
                    Period
                  </Text>
                </HStack>
                <HStack gap={2}>
                  <Text fontSize="13px" color={colors.mutedText}>
                    Pick By
                  </Text>
                  <Segmented
                    size="xs"
                    ariaLabel="Pick by"
                    options={[
                      { value: 'day' as const, label: 'Day' },
                      { value: 'week' as const, label: 'Week' },
                      { value: 'month' as const, label: 'Month' },
                      { value: 'qtr' as const, label: 'Qtr', title: 'Click any day to take its quarter, to date' },
                      { value: 'fy' as const, label: 'FY', disabled: true, title: 'Not available yet' },
                    ]}
                    value={pickBy}
                    onChange={(v) => (v === 'day' || v === 'week' || v === 'month' || v === 'qtr') && setPickBy(v)}
                  />
                </HStack>
              </Flex>

              {/* Month strip: the last twelve months, two rows of six */}
              <Grid templateColumns="repeat(6, 1fr)" gap="6px" mb={5}>
                {recent.map((m) => {
                  const disabled = monthEnd(m) < DATA_START;
                  const active = m === month;
                  return (
                    <Box
                      as="button"
                      key={m}
                      title={disabled ? `No sales data before ${DATA_START_LABEL}` : fmtMonth(m, 'long')}
                      onClick={() => {
                        if (disabled) return;
                        setMonth(m);
                        setAnchor(null);
                        setFocusDay(m);
                        if (pickBy === 'month' || monthOf(start) !== m) {
                          applyRange(m, minIso(monthEnd(m), today));
                        }
                      }}
                      h="32px"
                      borderRadius="6px"
                      fontSize="13px"
                      fontWeight={active ? 600 : 500}
                      whiteSpace="nowrap"
                      bg={active ? colors.brand : 'transparent'}
                      border="1px solid"
                      borderColor={active ? colors.brand : disabled ? 'transparent' : colors.border}
                      color={active ? colors.onBrand : disabled ? colors.borderStrong : colors.darkText}
                      cursor={disabled ? 'not-allowed' : 'pointer'}
                      _hover={active || disabled ? undefined : { bg: colors.hoverBg }}
                    >
                      {parse(m).toLocaleDateString('en-GB', { month: 'short' })} {m.slice(2, 4)}
                    </Box>
                  );
                })}
              </Grid>

              {/* Calendar */}
              <HStack justify="space-between" mb={3}>
                <Box
                  as="button"
                  aria-label="Previous month"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  w="30px"
                  h="30px"
                  borderRadius="6px"
                  border="1px solid"
                  borderColor={colors.border}
                  cursor={shiftMonth(month, -1) < monthOf(DATA_START) ? 'not-allowed' : 'pointer'}
                  opacity={shiftMonth(month, -1) < monthOf(DATA_START) ? 0.3 : 1}
                  _hover={{ bg: colors.hoverBg }}
                  onClick={() => {
                    const m = shiftMonth(month, -1);
                    if (m < monthOf(DATA_START)) return;
                    setMonth(m);
                    setFocusDay(m);
                  }}
                >
                  <FiChevronLeft />
                </Box>
                <Text fontWeight={600} fontSize="15px" color={colors.darkText}>
                  {fmtMonth(month, 'long')}
                </Text>
                <Box
                  as="button"
                  aria-label="Next month"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  w="30px"
                  h="30px"
                  borderRadius="6px"
                  border="1px solid"
                  borderColor={colors.border}
                  cursor={shiftMonth(month, 1) > today ? 'not-allowed' : 'pointer'}
                  opacity={shiftMonth(month, 1) > today ? 0.3 : 1}
                  _hover={{ bg: colors.hoverBg }}
                  onClick={() => {
                    const m = shiftMonth(month, 1);
                    if (m > today) return;
                    setMonth(m);
                    setFocusDay(m);
                  }}
                >
                  <FiChevronRight />
                </Box>
              </HStack>
              <Grid templateColumns="repeat(7, 1fr)" mb={2}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} textAlign="center" fontSize="11px" fontWeight={600} letterSpacing=".04em" textTransform="uppercase" color={colors.mutedText}>
                    {w}
                  </Text>
                ))}
              </Grid>
              <Grid
                ref={gridRef}
                role="grid"
                aria-label={fmtMonth(month, 'long')}
                templateColumns="repeat(7, 1fr)"
                rowGap="4px"
                onKeyDown={onGridKey}
                onMouseLeave={() => setHover(null)}
              >
                {cells.map((d, i) => {
                  if (!d) return <Box key={`e${i}`} h="40px" />;
                  const disabled = isDisabledDay(d);
                  const inRange = d >= shownStart && d <= shownEnd;
                  const isEdge = d === shownStart || d === shownEnd;
                  const isToday = d === today;
                  const hasData = dataDays?.has(d);
                  return (
                    <Box
                      as="button"
                      key={d}
                      data-day={d}
                      tabIndex={d === focusDay ? 0 : -1}
                      aria-selected={inRange}
                      aria-disabled={disabled}
                      onClick={() => {
                        setFocusDay(d);
                        pickDay(d);
                      }}
                      onMouseEnter={() => anchor && !disabled && setHover(d)}
                      position="relative"
                      h="40px"
                      fontSize="13px"
                      fontVariantNumeric="tabular-nums"
                      fontWeight={isEdge ? 700 : 400}
                      color={disabled ? colors.borderStrong : isEdge ? colors.onBrand : colors.darkText}
                      bg={isEdge ? colors.brand : inRange ? colors.brandSoft : 'transparent'}
                      borderRadius={isEdge ? '6px' : inRange ? 0 : '6px'}
                      outline={isToday && !isEdge ? `1px solid ${colors.borderStrong}` : undefined}
                      outlineOffset="-3px"
                      cursor={disabled ? 'not-allowed' : 'pointer'}
                      _hover={disabled || isEdge ? undefined : { bg: inRange ? colors.border : colors.hoverBg }}
                      _focusVisible={{ boxShadow: `0 0 0 2px ${colors.accent}`, zIndex: 1 }}
                    >
                      {Number(d.slice(8, 10))}
                      {hasData && (
                        <Box
                          position="absolute"
                          bottom="5px"
                          left="50%"
                          transform="translateX(-50%)"
                          w="4px"
                          h="4px"
                          borderRadius="50%"
                          bg={isEdge ? colors.onBrand : colors.good}
                        />
                      )}
                    </Box>
                  );
                })}
              </Grid>
              <Flex direction="column" gap="6px" mt={4} fontSize="12px" color={colors.mutedText} lineHeight="1.45">
                <Text>
                  {anchor
                    ? 'Now click the last day of the range.'
                    : pickBy === 'day'
                      ? 'Click a start day, then an end day.'
                      : pickBy === 'week'
                        ? 'Click any day to take its week (Mon–Sun, kept inside the month).'
                        : pickBy === 'qtr'
                          ? 'Click any day to take its quarter, up to today.'
                          : 'Click any day to take the whole month.'}
                  {dataDays && dataDays.size > 0 && (
                    <>
                      {' '}
                      <Box as="span" display="inline-block" w="6px" h="6px" borderRadius="50%" bg={colors.good} mx="3px" verticalAlign="middle" />
                      days with sales.
                    </>
                  )}
                </Text>
                {dataAsOf && month.slice(0, 7) === dataAsOf.slice(0, 7) && dataAsOf < today && (
                  <HStack gap="6px" align="flex-start">
                    <Box mt="2px" flexShrink={0}>
                      <FiInfo size={12} />
                    </Box>
                    <Text>Sales are loaded up to {rangeLabel(dataAsOf, dataAsOf)}; later days compare against nothing yet.</Text>
                  </HStack>
                )}
              </Flex>
            </Box>

            {/* Compare B */}
            <Flex direction="column" px={5} py={5} gap={3} borderLeft={{ md: '1px solid' }} borderColor={colors.sunkBg}>
              <HStack gap={2} mb={1}>
                <Badge letter="B" tone="b" />
                <Text fontWeight={700} fontSize="15px" color={colors.darkText}>
                  Compare With
                </Text>
              </HStack>
              {/* Previous month and last year are each on or off — both can show at once. */}
              <CompareOption
                kind="check"
                label="Previous Month"
                hint={rangeLabel(b.start, b.end)}
                active={compare === 'previous'}
                disabled={!compareEnabled}
                onClick={() => setCompare(compare === 'previous' ? 'off' : 'previous')}
              />
              <CompareOption
                kind="check"
                label="Same Period Last Year"
                hint={`${rangeLabel(lyR.start, lyR.end)}${lyR.start < DATA_START ? ` · No Sales Before ${DATA_START_LABEL}` : ''}`}
                active={ly}
                disabled={!compareEnabled}
                onClick={() => setLy(!ly)}
              />
              <CompareOption
                label="No Comparison"
                hint={compareEnabled ? 'Show This Period Only' : 'Comparisons are not available yet'}
                active={compare === 'off' && !ly}
                onClick={() => {
                  setCompare('off');
                  setLy(false);
                }}
              />
            </Flex>
          </Grid>

          {/* Footer */}
          <Flex
            align="center"
            gap={3}
            wrap="wrap"
            px={6}
            py={4}
            borderTop="1px solid"
            borderColor={colors.sunkBg}
            bg={colors.pageBg}
            borderBottomRadius="8px"
          >
            <HStack gap={2} fontSize="13px" color={colors.bodyText} flex={1} minW={0} wrap="wrap">
              <Badge letter="A" tone="a" />
              <Text as="span" fontWeight={600} color={colors.darkText}>
                {rangeLabel(start, end)}
              </Text>
              <Text as="span" color={colors.mutedText}>
                ({dayCount(start, end)} day{dayCount(start, end) > 1 ? 's' : ''})
              </Text>
              {(compare !== 'off' || ly) && (
                <Text as="span" color={colors.mutedText}>
                  vs
                </Text>
              )}
              {compare !== 'off' && (
                <>
                  <Badge letter="B" tone="b" />
                  <Text as="span" fontWeight={600} color={colors.darkText}>
                    {rangeLabel(b.start, b.end)}
                  </Text>
                </>
              )}
              {compare !== 'off' && ly && (
                <Text as="span" color={colors.mutedText}>
                  &
                </Text>
              )}
              {ly && (
                <>
                  <Badge letter="LY" tone="ly" />
                  <Text as="span" fontWeight={600} color={colors.darkText}>
                    {rangeLabel(lyR.start, lyR.end)}
                  </Text>
                </>
              )}
            </HStack>
            <HStack gap={3}>
              <Box
                as="button"
                h="36px"
                px={5}
                borderRadius="6px"
                bg={colors.sunkBg}
                color={colors.darkText}
                fontSize="13px"
                fontWeight={500}
                cursor="pointer"
                _hover={{ bg: colors.border }}
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
              >
                Cancel
              </Box>
              <Box
                as="button"
                h="36px"
                px={5}
                borderRadius="6px"
                bg={colors.brand}
                color={colors.onBrand}
                fontSize="13px"
                fontWeight={600}
                cursor={anchor ? 'not-allowed' : 'pointer'}
                opacity={anchor ? 0.5 : 1}
                title={anchor ? 'Pick the end day first' : undefined}
                _hover={{ bg: colors.brandHover }}
                onClick={() => {
                  if (anchor) return;
                  onApply({ start, end, compare: compareEnabled ? compare : 'off', ly: compareEnabled && ly });
                  setOpen(false);
                }}
              >
                Apply
              </Box>
            </HStack>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

function Badge({ letter, tone }: { letter: string; tone: 'a' | 'b' | 'ly' }) {
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      minW="18px"
      px={letter.length > 1 ? '3px' : 0}
      h="18px"
      borderRadius="4px"
      fontSize="11px"
      fontWeight={700}
      bg={tone === 'a' ? colors.brand : tone === 'ly' ? colors.lastYear : colors.prior}
      color={tone === 'a' ? colors.onBrand : colors.darkText}
      flexShrink={0}
    >
      {letter}
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text px={3} pb={2} fontSize="11px" fontWeight={700} letterSpacing=".06em" textTransform="uppercase" color={colors.mutedText}>
      {children}
    </Text>
  );
}

/** One way to compare: a card with a radio mark, its name and what it means. */
function CompareOption({
  label,
  hint,
  active = false,
  disabled = false,
  kind = 'radio',
  onClick,
}: {
  label: string;
  hint: string;
  active?: boolean;
  disabled?: boolean;
  /** 'check' for a comparison that is on or off by itself; 'radio' for "none". */
  kind?: 'check' | 'radio';
  onClick?: () => void;
}) {
  return (
    <Box
      as="button"
      role={kind === 'check' ? 'checkbox' : 'radio'}
      aria-checked={active}
      aria-disabled={disabled || undefined}
      title={disabled ? hint : undefined}
      onClick={() => !disabled && onClick?.()}
      display="flex"
      gap={3}
      alignItems="flex-start"
      textAlign="left"
      px={3}
      py="10px"
      borderRadius="6px"
      border="1px solid"
      borderColor={active ? colors.brand : colors.border}
      bg={active ? colors.brandSoft : colors.cardBg}
      opacity={disabled ? 0.55 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      _hover={disabled || active ? undefined : { bg: colors.hoverBg }}
    >
      <Box
        mt="2px"
        w="14px"
        h="14px"
        borderRadius={kind === 'check' ? '3px' : '50%'}
        border="1.5px solid"
        borderColor={active ? colors.brand : colors.borderStrong}
        bg={kind === 'check' && active ? colors.brand : undefined}
        color={colors.onBrand}
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        {active && (kind === 'check' ? <FiCheck size={10} strokeWidth={3} /> : <Box w="6px" h="6px" borderRadius="50%" bg={colors.brand} />)}
      </Box>
      <Box minW={0}>
        <Text fontSize="13px" fontWeight={active ? 600 : 500} color={active ? colors.brand : colors.darkText}>
          {label}
        </Text>
        <Text fontSize="12px" color={colors.mutedText} mt="1px">
          {hint}
        </Text>
      </Box>
    </Box>
  );
}
