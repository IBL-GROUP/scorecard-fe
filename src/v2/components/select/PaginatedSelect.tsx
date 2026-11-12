import { Box, Flex, Text } from '@chakra-ui/react';
import ReactSelect, { type StylesConfig } from 'react-select';
import { useCallback, useEffect, useRef, useState } from 'react';
import { colors } from '@/v2/constants/theme';
import type { SelectOption } from './Select';

export interface PaginatedPage {
  options: SelectOption[];
  hasMore: boolean;
}

export interface PaginatedSelectProps {
  label?: string;
  // The selected option is held whole, not just its value — the full option
  // list is never loaded, so a label can't be looked up from a bare value.
  value: SelectOption | null;
  onChange: (option: SelectOption | null) => void;
  // Fetches one page. `q` is the (debounced) search term, '' when not searching.
  loadPage: (args: { q: string; offset: number }) => Promise<PaginatedPage>;
  // Changing this discards cached options — e.g. when the date window moves and
  // the previous list no longer applies.
  resetKey?: string;
  placeholder?: string;
  isDisabled?: boolean;
  debounceMs?: number;
}

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base) => ({
    ...base,
    borderWidth: '1px',
    borderColor: colors.controlBorder,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    minHeight: '36px',
    boxShadow: 'none',
    w: '100%',
    backgroundColor: colors.cardBg,
    '&:hover': { borderColor: colors.controlBorderHover },
  }),
  // WCAG 2.1 AA (S5): react-select's default placeholder grey is 3.9:1 on white.
  placeholder: (base) => ({ ...base, color: colors.mutedText }),
  singleValue: (base) => ({ ...base, color: colors.bodyText }),
  input: (base) => ({ ...base, color: colors.bodyText }),
  option: (base, state) => ({
    ...base,
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: state.isSelected ? colors.selectActive : colors.cardBg,
    color: state.isSelected ? colors.onBrand : colors.bodyText,
    '&:hover': {
      backgroundColor: state.isSelected
        ? colors.selectActive
        : colors.selectOptionHover,
    },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 10,
    backgroundColor: colors.cardBg,
  }),
};

// A select whose options arrive a page at a time: it shows the first page on
// open and appends the next as the user scrolls to the bottom. Searching
// restarts the paging server-side. Built for dimensions with far too many
// distinct values to ship at once — Customer has 42k+.
export function PaginatedSelect({
  label,
  value,
  onChange,
  loadPage,
  resetKey = '',
  placeholder = 'Select...',
  isDisabled,
  debounceMs = 350,
}: PaginatedSelectProps) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  // Refs so fetches read current values without being re-created on each
  // keystroke (and without stale closures inside async callbacks).
  const offsetRef = useRef(0);
  const searchRef = useRef('');
  // Guards against out-of-order responses: a slow early request must not
  // overwrite the results of a later one.
  const requestRef = useRef(0);

  // Debounce typing into the term we actually query with.
  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), debounceMs);
    return () => clearTimeout(t);
  }, [input, debounceMs]);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      const requestId = ++requestRef.current;
      const offset = reset ? 0 : offsetRef.current;
      setIsLoading(true);
      try {
        const page = await loadPage({ q: searchRef.current, offset });
        if (requestId !== requestRef.current) return; // superseded
        setOptions((prev) =>
          reset ? page.options : [...prev, ...page.options]
        );
        offsetRef.current = offset + page.options.length;
        setHasMore(page.hasMore);
      } catch {
        // A failed lookup shouldn't wedge the control — stop asking for more.
        if (requestId === requestRef.current) setHasMore(false);
      } finally {
        if (requestId === requestRef.current) setIsLoading(false);
      }
    },
    [loadPage]
  );

  // New search term (or a new date window) — throw the list away and reload
  // from the top, but only while the menu is actually open.
  useEffect(() => {
    searchRef.current = search;
    offsetRef.current = 0;
    setOptions([]);
    setHasMore(true);
    if (menuOpen) fetchPage(true);
    // fetchPage is stable via useCallback on loadPage; menuOpen intentionally
    // read but not depended on, so merely opening doesn't refire this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, resetKey]);

  const handleMenuOpen = () => {
    setMenuOpen(true);
    // First open (or after a reset) — load the first page.
    if (options.length === 0 && !isLoading) fetchPage(true);
  };

  const handleMenuClose = () => {
    setMenuOpen(false);
    // Start clean next time rather than reopening onto a stale search.
    setInput('');
  };

  return (
    <Flex direction="row" gap={2} alignItems="center" wrap="nowrap" minW={0}>
      {label && (
        <Text
          fontSize="xs"
          fontWeight="bold"
          color="var(--sp-muted-text)"
          textTransform="uppercase"
          whiteSpace="nowrap"
          flexShrink={0}
        >
          {label}
        </Text>
      )}
      <Box flex={1} minW={0}>
        <ReactSelect<SelectOption, false>
          value={value}
          onChange={(selected) => onChange(selected ?? null)}
          options={options}
          // The server already filtered — filtering again would hide rows that
          // matched on a field the label doesn't show.
          filterOption={null}
          inputValue={input}
          onInputChange={(next, meta) => {
            if (meta.action === 'input-change') setInput(next);
          }}
          onMenuOpen={handleMenuOpen}
          onMenuClose={handleMenuClose}
          onMenuScrollToBottom={() => {
            if (hasMore && !isLoading) fetchPage(false);
          }}
          isLoading={isLoading}
          isClearable
          isSearchable
          isDisabled={isDisabled}
          placeholder={placeholder}
          aria-label={label || placeholder}
          styles={selectStyles}
          loadingMessage={() => 'Loading…'}
          noOptionsMessage={() => (isLoading ? 'Loading…' : 'No matches')}
        />
      </Box>
    </Flex>
  );
}
