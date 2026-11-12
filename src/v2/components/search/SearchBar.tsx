import { Box, Flex, Grid, HStack, Input, Text } from '@chakra-ui/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiFilter,
  FiSearch,
  FiSliders,
  FiStar,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { colors } from '@/v2/constants/theme';
import { DatePicker } from '@/v2/components/date-picker';
import { Select } from '@/v2/components/select';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SearchOption {
  value: string;
  label: string;
}

export interface SearchField {
  key: string;
  label: string;
  options: SearchOption[];
  /** Field accepts several values (stored comma-separated). */
  multi?: boolean;
  /** Remote lookup for fields too large to load up front. */
  loadOptions?: (q: string) => Promise<SearchOption[]>;
}

export interface SearchPeriod {
  month: string; // "YYYY-MM-01"
  start: string; // "YYYY-MM-DD"
  end: string;
  isDefaultRange: boolean;
  onMonth: (month: string) => void;
  onRange: (start: string, end: string) => void;
  onReset: () => void;
}

export interface SearchBarProps {
  fields: SearchField[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  /** Fields whose options appear as one-click toggles under "Filters". */
  quickFilterKeys?: string[];
  period?: SearchPeriod;
  /** localStorage key for saved searches. */
  favoritesKey?: string;
  loading?: boolean;
  placeholder?: string;
}

interface Favorite {
  name: string;
  values: Record<string, string>;
  month?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MAX_MATCHES = 8;

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function recentMonths(count: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  }
  return out;
}

function readFavorites(key?: string): Favorite[] {
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Favorite[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(key: string, favs: Favorite[]) {
  try {
    localStorage.setItem(key, JSON.stringify(favs));
  } catch {
    /* storage unavailable: favourites just won't persist */
  }
}

// ─── Small pieces ───────────────────────────────────────────────────────────

function Facet({
  icon,
  label,
  value,
  onRemove,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  onRemove?: () => void;
}) {
  return (
    <HStack
      gap={0}
      h="24px"
      borderRadius="4px"
      overflow="hidden"
      flexShrink={0}
      maxW="360px"
      fontSize="12.5px"
      border="1px solid"
      borderColor={colors.border}
    >
      <HStack
        gap="4px"
        h="100%"
        px="7px"
        bg={colors.brand}
        color={colors.onBrand}
        fontWeight={600}
        flexShrink={0}
      >
        {icon}
        <Text as="span">{label}</Text>
      </HStack>
      <Text
        as="span"
        px="7px"
        h="100%"
        display="flex"
        alignItems="center"
        bg={colors.sunkBg}
        color={colors.darkText}
        truncate
        title={value}
      >
        {value}
      </Text>
      {onRemove && (
        <Box
          as="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          h="100%"
          px="5px"
          display="flex"
          alignItems="center"
          bg={colors.sunkBg}
          color={colors.mutedText}
          cursor="pointer"
          _hover={{ color: colors.bad }}
        >
          <FiX size={12} />
        </Box>
      )}
    </HStack>
  );
}

function MenuColumn({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Flex direction="column" minW={0} py={2}>
      <HStack gap={2} px={4} pb={2} color={colors.darkText} fontWeight={700} fontSize="13.5px">
        <Box color={colors.brand}>{icon}</Box>
        <Text>{title}</Text>
      </HStack>
      {children}
    </Flex>
  );
}

function MenuItem({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      title={title}
      display="flex"
      alignItems="center"
      gap={2}
      w="100%"
      textAlign="left"
      px={4}
      py="5px"
      fontSize="13.5px"
      color={colors.bodyText}
      cursor="pointer"
      _hover={{ bg: colors.hoverBg }}
    >
      <Box w="14px" flexShrink={0} color={colors.brand}>
        {active && <FiCheck size={14} />}
      </Box>
      <Text as="span" truncate fontWeight={active ? 600 : 400} color={active ? colors.darkText : undefined}>
        {children}
      </Text>
    </Box>
  );
}

const Divider = () => <Box h="1px" bg={colors.sunkBg} my={1} mx={4} />;

// ─── Main component ─────────────────────────────────────────────────────────

/**
 * Odoo-style search: applied filters are facets inside the box, typing offers
 * "Search <field> for: …" with expandable matches, and the caret opens the
 * Filters / Period / Favorites menu. Every change applies immediately.
 */
export function SearchBar({
  fields,
  values,
  onChange,
  quickFilterKeys = [],
  period,
  favoritesKey,
  loading,
  placeholder = 'Search…',
}: SearchBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [cursor, setCursor] = useState(0);
  const [remote, setRemote] = useState<Record<string, SearchOption[]>>({});
  const [labelCache, setLabelCache] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<Favorite[]>(() => readFavorites(favoritesKey));
  const [savingName, setSavingName] = useState<string | null>(null);
  const [rangeDraft, setRangeDraft] = useState<{ start: string; end: string } | null>(null);

  const fieldByKey = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.key, f])),
    [fields]
  );

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setQuery('');
        setCustomOpen(false);
        setSavingName(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Remote lookups (e.g. customers) as the user types.
  useEffect(() => {
    const q = query.trim();
    const remoteFields = fields.filter((f) => f.loadOptions);
    if (!q || remoteFields.length === 0) return;
    let cancelled = false;
    const t = setTimeout(() => {
      for (const f of remoteFields) {
        f.loadOptions!(q)
          .then((opts) => {
            if (!cancelled) setRemote((r) => ({ ...r, [f.key]: opts }));
          })
          .catch(() => undefined);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, fields]);

  const labelFor = useCallback(
    (key: string, value: string) =>
      fieldByKey[key]?.options.find((o) => o.value === value)?.label ??
      labelCache[`${key}:${value}`] ??
      value,
    [fieldByKey, labelCache]
  );

  const setValue = (key: string, value: string) => {
    const field = fieldByKey[key];
    let next = value;
    if (field?.multi && value && values[key]) {
      const list = values[key].split(',').filter(Boolean);
      next = list.includes(value) ? list.join(',') : [...list, value].join(',');
    }
    onChange({ ...values, [key]: next });
  };

  const clearValue = (key: string) => onChange({ ...values, [key]: '' });

  // ── Suggestions while typing ──
  type Row =
    | { kind: 'field'; field: SearchField; matches: SearchOption[] }
    | { kind: 'value'; field: SearchField; option: SearchOption };

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Row[] = [];
    for (const f of fields) {
      const pool = f.loadOptions ? remote[f.key] ?? [] : f.options;
      const matches = pool.filter((o) => o.label.toLowerCase().includes(q)).slice(0, MAX_MATCHES);
      if (matches.length === 0 && !f.loadOptions) continue;
      out.push({ kind: 'field', field: f, matches });
      if (expanded[f.key]) {
        for (const m of matches) out.push({ kind: 'value', field: f, option: m });
      }
    }
    return out;
  }, [query, fields, expanded, remote]);

  useEffect(() => setCursor(0), [query]);

  const pick = (field: SearchField, option: SearchOption) => {
    if (field.loadOptions) {
      setLabelCache((c) => ({ ...c, [`${field.key}:${option.value}`]: option.label }));
    }
    setValue(field.key, option.value);
    setQuery('');
    setExpanded({});
    inputRef.current?.focus();
  };

  const activate = (row: Row) => {
    if (row.kind === 'value') return pick(row.field, row.option);
    if (row.matches.length === 1) return pick(row.field, row.matches[0]);
    setExpanded((e) => ({ ...e, [row.field.key]: !e[row.field.key] }));
  };

  // Facets in display order: period first, then fields in config order.
  const activeKeys = fields.map((f) => f.key).filter((k) => values[k]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !query && activeKeys.length) {
      clearValue(activeKeys[activeKeys.length - 1]);
      return;
    }
    if (e.key === 'Escape') {
      setQuery('');
      setMenuOpen(false);
      return;
    }
    if (!rows.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(rows.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'ArrowRight') {
      const r = rows[cursor];
      if (r?.kind === 'field') setExpanded((x) => ({ ...x, [r.field.key]: true }));
    } else if (e.key === 'ArrowLeft') {
      const r = rows[cursor];
      if (r) setExpanded((x) => ({ ...x, [r.field.key]: false }));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = rows[cursor];
      if (r) activate(r);
    }
  };

  // ── Favorites ──
  const saveFavorite = () => {
    if (!favoritesKey || !savingName?.trim()) return;
    const fav: Favorite = { name: savingName.trim(), values, month: period?.month };
    const next = [...favorites.filter((f) => f.name !== fav.name), fav];
    setFavorites(next);
    writeFavorites(favoritesKey, next);
    setSavingName(null);
  };
  const applyFavorite = (fav: Favorite) => {
    onChange({ ...Object.fromEntries(fields.map((f) => [f.key, ''])), ...fav.values });
    if (fav.month && period && fav.month !== period.month) period.onMonth(fav.month);
    setMenuOpen(false);
  };
  const deleteFavorite = (name: string) => {
    if (!favoritesKey) return;
    const next = favorites.filter((f) => f.name !== name);
    setFavorites(next);
    writeFavorites(favoritesKey, next);
  };

  const periodText = period
    ? period.isDefaultRange
      ? monthLabel(period.month)
      : `${shortDate(period.start)} – ${shortDate(period.end)} ${period.month.slice(0, 4)}`
    : '';

  const monthStart = period?.month ?? '';
  const monthEnd = useMemo(() => {
    if (!period) return '';
    const [y, m] = period.month.split('-').map(Number);
    return `${period.month.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
  }, [period]);

  const showSuggestions = rows.length > 0 || (query.trim() && !loading);

  return (
    <Box ref={rootRef} position="relative" w="100%" maxW="760px">
      {/* ── The search box ── */}
      <Flex
        align="center"
        minH="34px"
        border="1px solid"
        borderColor={menuOpen || query ? colors.brand : colors.border}
        borderRadius="4px"
        bg={colors.cardBg}
        transition="border-color .12s"
      >
        <Box px="9px" color={colors.mutedText} flexShrink={0}>
          <FiSearch size={15} />
        </Box>
        <Flex
          flex={1}
          minW={0}
          align="center"
          gap="5px"
          py="4px"
          wrap="wrap"
          onClick={() => inputRef.current?.focus()}
          cursor="text"
        >
          {period && (
            <Facet
              icon={<FiCalendar size={12} />}
              label="Period"
              value={periodText}
              onRemove={period.isDefaultRange ? undefined : period.onReset}
            />
          )}
          {activeKeys.map((key) => {
            const f = fieldByKey[key];
            const vals = values[key].split(',').filter(Boolean);
            return (
              <Facet
                key={key}
                label={f.label}
                value={vals.map((v) => labelFor(key, v)).join(' or ')}
                onRemove={() => clearValue(key)}
              />
            );
          })}
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setMenuOpen(false)}
            placeholder={activeKeys.length ? '' : loading ? 'Loading filters…' : placeholder}
            aria-label="Search"
            border="none"
            outline="none"
            _focus={{ boxShadow: 'none', outline: 'none' }}
            h="24px"
            px={1}
            flex={1}
            minW="120px"
            fontSize="13.5px"
            bg="transparent"
          />
        </Flex>
        <Box
          as="button"
          aria-label="Toggle search panel"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((o) => !o);
            setQuery('');
            setCustomOpen(false);
          }}
          alignSelf="stretch"
          px="10px"
          display="flex"
          alignItems="center"
          borderLeft="1px solid"
          borderColor={colors.border}
          color={menuOpen ? colors.brand : colors.bodyText}
          bg={menuOpen ? colors.brandSoft : 'transparent'}
          cursor="pointer"
          _hover={{ bg: colors.brandSoft }}
          _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: '-2px' }}
          borderTopRightRadius="3px"
          borderBottomRightRadius="3px"
        >
          <FiChevronDown size={15} />
        </Box>
      </Flex>

      {/* ── Typed suggestions ── */}
      {showSuggestions && (
        <Box
          position="absolute"
          top="calc(100% + 2px)"
          left={0}
          right={0}
          zIndex={60}
          bg={colors.cardBg}
          border="1px solid"
          borderColor={colors.border}
          borderRadius="4px"
          boxShadow="0 6px 16px rgba(0,0,0,.12)"
          py={1}
          maxH="380px"
          overflowY="auto"
        >
          {rows.length === 0 && (
            <Text px={4} py={2} fontSize="13.5px" color={colors.mutedText}>
              No matches for “{query}”.
            </Text>
          )}
          {rows.map((row, i) => {
            const isCursor = i === cursor;
            if (row.kind === 'field') {
              const open = !!expanded[row.field.key];
              return (
                <Flex
                  key={`f-${row.field.key}`}
                  align="center"
                  gap={1}
                  px={2}
                  py="5px"
                  bg={isCursor ? colors.hoverBg : undefined}
                  cursor="pointer"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => activate(row)}
                  fontSize="13.5px"
                >
                  <Box
                    as="span"
                    w="18px"
                    color={colors.mutedText}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setExpanded((x) => ({ ...x, [row.field.key]: !open }));
                    }}
                  >
                    {row.matches.length > 1 &&
                      (open ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />)}
                  </Box>
                  <Text as="span" color={colors.bodyText}>
                    Search <b style={{ color: colors.darkText }}>{row.field.label}</b> for:{' '}
                    <i style={{ color: colors.brand, fontWeight: 600 }}>{query}</i>
                  </Text>
                  <Text as="span" ml="auto" fontSize="12px" color={colors.mutedText}>
                    {row.matches.length === MAX_MATCHES
                      ? `${MAX_MATCHES}+ matches`
                      : `${row.matches.length} match${row.matches.length === 1 ? '' : 'es'}`}
                  </Text>
                </Flex>
              );
            }
            return (
              <Box
                key={`v-${row.field.key}-${row.option.value}`}
                pl="38px"
                pr={3}
                py="4px"
                fontSize="13.5px"
                color={colors.darkText}
                bg={isCursor ? colors.hoverBg : undefined}
                cursor="pointer"
                onMouseEnter={() => setCursor(i)}
                onClick={() => activate(row)}
                truncate
              >
                {row.option.label}
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Filters / Period / Favorites menu ── */}
      {menuOpen && (
        <Box
          position="absolute"
          top="calc(100% + 2px)"
          left={0}
          right={0}
          zIndex={60}
          bg={colors.cardBg}
          border="1px solid"
          borderColor={colors.border}
          borderRadius="4px"
          boxShadow="0 6px 16px rgba(0,0,0,.12)"
        >
          {customOpen ? (
            <Box p={4}>
              <Flex justify="space-between" align="center" mb={3}>
                <Text fontWeight={700} fontSize="14px" color={colors.darkText}>
                  Custom filter
                </Text>
                <Box
                  as="button"
                  fontSize="13px"
                  color={colors.brand}
                  fontWeight={600}
                  cursor="pointer"
                  onClick={() => setCustomOpen(false)}
                >
                  Done
                </Box>
              </Flex>
              <Grid templateColumns="repeat(auto-fill, minmax(210px, 1fr))" gap={3}>
                {fields
                  .filter((f) => !f.loadOptions)
                  .map((f) => (
                    <Flex key={f.key} direction="column" gap="4px" minW={0}>
                      <Text fontSize="12.5px" fontWeight={600} color={colors.bodyText}>
                        {f.label}
                      </Text>
                      <Select
                        value={f.multi ? '' : values[f.key] ?? ''}
                        options={f.options}
                        onChange={(v) => (v ? setValue(f.key, v) : clearValue(f.key))}
                        isClearable
                        placeholder={
                          f.multi && values[f.key]
                            ? `${values[f.key].split(',').length} selected · add more`
                            : 'Any'
                        }
                      />
                    </Flex>
                  ))}
              </Grid>
              <Text fontSize="12px" color={colors.mutedText} mt={3}>
                Choices apply straight away. Each choice narrows the others.
              </Text>
            </Box>
          ) : (
            <>
              <Grid
                templateColumns={{
                  base: '1fr',
                  md: `repeat(${1 + (period ? 1 : 0) + (favoritesKey ? 1 : 0)}, minmax(0, 1fr))`,
                }}
              >
                <MenuColumn icon={<FiFilter size={14} />} title="Filters">
                  {quickFilterKeys.map((key, gi) => {
                    const f = fieldByKey[key];
                    if (!f) return null;
                    return (
                      <Box key={key}>
                        {gi > 0 && <Divider />}
                        {f.options.slice(0, 8).map((o) => (
                          <MenuItem
                            key={o.value}
                            active={values[key] === o.value}
                            title={`${f.label}: ${o.label}`}
                            onClick={() =>
                              values[key] === o.value ? clearValue(key) : setValue(key, o.value)
                            }
                          >
                            {o.label}
                          </MenuItem>
                        ))}
                      </Box>
                    );
                  })}
                  <Divider />
                  <MenuItem onClick={() => setCustomOpen(true)}>
                    <HStack as="span" gap={2} display="inline-flex">
                      <FiSliders size={13} /> <span>Add custom filter</span>
                    </HStack>
                  </MenuItem>
                </MenuColumn>

                {period && (
                  <MenuColumn icon={<FiCalendar size={14} />} title="Period">
                    {recentMonths(6).map((m) => (
                      <MenuItem
                        key={m}
                        active={period.month === m && period.isDefaultRange}
                        onClick={() => {
                          period.onMonth(m);
                          setRangeDraft(null);
                        }}
                      >
                        {monthLabel(m)}
                      </MenuItem>
                    ))}
                    <Divider />
                    {rangeDraft ? (
                      <Flex direction="column" gap={2} px={4} py={1}>
                        <Text fontSize="12.5px" color={colors.mutedText}>
                          Days within {monthLabel(period.month)}
                        </Text>
                        <HStack gap={0}>
                          <Box flex={1}>
                            <DatePicker
                              variant="range-start"
                              value={rangeDraft.start}
                              minDate={monthStart}
                              maxDate={rangeDraft.end || monthEnd}
                              onChange={(v) => setRangeDraft((r) => ({ start: v, end: r?.end ?? '' }))}
                              placeholder="From"
                            />
                          </Box>
                          <Box flex={1}>
                            <DatePicker
                              variant="range-end"
                              value={rangeDraft.end}
                              minDate={rangeDraft.start || monthStart}
                              maxDate={monthEnd}
                              onChange={(v) => setRangeDraft((r) => ({ start: r?.start ?? '', end: v }))}
                              placeholder="To"
                            />
                          </Box>
                        </HStack>
                        <HStack gap={2}>
                          <Box
                            as="button"
                            px={3}
                            h="28px"
                            borderRadius="4px"
                            bg={colors.brand}
                            color={colors.onBrand}
                            fontSize="13px"
                            fontWeight={600}
                            cursor="pointer"
                            opacity={rangeDraft.start && rangeDraft.end ? 1 : 0.5}
                            onClick={() => {
                              if (!rangeDraft.start || !rangeDraft.end) return;
                              period.onRange(rangeDraft.start, rangeDraft.end);
                              setRangeDraft(null);
                              setMenuOpen(false);
                            }}
                          >
                            Apply
                          </Box>
                          <Box
                            as="button"
                            px={2}
                            h="28px"
                            fontSize="13px"
                            color={colors.bodyText}
                            cursor="pointer"
                            onClick={() => setRangeDraft(null)}
                          >
                            Cancel
                          </Box>
                        </HStack>
                      </Flex>
                    ) : (
                      <MenuItem
                        active={!period.isDefaultRange}
                        onClick={() => setRangeDraft({ start: period.start, end: period.end })}
                      >
                        {period.isDefaultRange ? 'Custom range…' : `Custom: ${periodText}`}
                      </MenuItem>
                    )}
                  </MenuColumn>
                )}

                {favoritesKey && (
                  <MenuColumn icon={<FiStar size={14} />} title="Favorites">
                    {favorites.length === 0 && savingName === null && (
                      <Text px={4} py="5px" fontSize="13px" color={colors.mutedText}>
                        No saved searches yet.
                      </Text>
                    )}
                    {favorites.map((fav) => (
                      <Flex key={fav.name} align="center" pr={2} _hover={{ bg: colors.hoverBg }}>
                        <Box flex={1} minW={0}>
                          <MenuItem onClick={() => applyFavorite(fav)}>{fav.name}</MenuItem>
                        </Box>
                        <Box
                          as="button"
                          aria-label={`Delete ${fav.name}`}
                          color={colors.mutedText}
                          cursor="pointer"
                          p={1}
                          _hover={{ color: colors.bad }}
                          onClick={() => deleteFavorite(fav.name)}
                        >
                          <FiTrash2 size={13} />
                        </Box>
                      </Flex>
                    ))}
                    <Divider />
                    {savingName === null ? (
                      <MenuItem onClick={() => setSavingName('')}>Save current search</MenuItem>
                    ) : (
                      <Flex direction="column" gap={2} px={4} py={1}>
                        <Input
                          autoFocus
                          size="sm"
                          h="30px"
                          borderRadius="4px"
                          placeholder="e.g. Division-1 retail"
                          value={savingName}
                          onChange={(e) => setSavingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveFavorite()}
                        />
                        <Box
                          as="button"
                          alignSelf="flex-start"
                          px={3}
                          h="28px"
                          borderRadius="4px"
                          bg={colors.brand}
                          color={colors.onBrand}
                          fontSize="13px"
                          fontWeight={600}
                          cursor="pointer"
                          opacity={savingName.trim() ? 1 : 0.5}
                          onClick={saveFavorite}
                        >
                          Save
                        </Box>
                      </Flex>
                    )}
                  </MenuColumn>
                )}
              </Grid>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
