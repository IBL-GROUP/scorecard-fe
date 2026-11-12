import { Box, Flex, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { colors } from '@/v2/constants/theme';
import { InfoTip } from '@/v2/components/overlay';
import { HELP } from '@/v2/constants/help';

export interface BreakdownRow {
  name: string;
  sale: number;
  prior: number;
  target: number;
}

type SortKey = 'name' | 'sale' | 'target' | 'ach' | 'share' | 'growth';

const COL_HELP: Partial<Record<SortKey, (typeof HELP)[keyof typeof HELP]>> = {
  sale: HELP.colSales,
  target: HELP.colTarget,
  ach: HELP.colAch,
  share: HELP.colShare,
  growth: HELP.colGrowth,
};

export interface BreakdownTableProps {
  rows: BreakdownRow[];
  /** % of the month gone; the Ach bar is green on pace, amber near it, red behind. */
  timeGonePct: number;
  showTarget: boolean;
  showGrowth: boolean;
  fmt: (n: number) => string;
  /** Clicking a row name filters the dashboard to it. */
  onPick?: (name: string) => void;
  maxHeight?: string;
  /** EFP is compared with the budget, TP with the target. */
  targetLabel?: 'Target' | 'Budget';
}

const UNMAPPED = 'Other / unmapped';
const isJunk = (n: string) => !n || n === 'Others' || n === 'null' || n === '—';

export function BreakdownTable({
  rows,
  timeGonePct,
  showTarget,
  showGrowth,
  fmt,
  onPick,
  maxHeight = '430px',
  targetLabel = 'Target',
}: BreakdownTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'sale', dir: -1 });

  const { body, other, total } = useMemo(() => {
    const named = rows.filter((r) => !isJunk(r.name) && (r.sale !== 0 || r.target !== 0 || r.prior !== 0));
    const junk = rows.filter((r) => isJunk(r.name));
    const other = junk.length
      ? junk.reduce(
          (a, r) => ({ name: UNMAPPED, sale: a.sale + r.sale, prior: a.prior + r.prior, target: a.target + r.target }),
          { name: UNMAPPED, sale: 0, prior: 0, target: 0 }
        )
      : null;
    const all = other ? [...named, other] : named;
    const total = all.reduce(
      (a, r) => ({ name: 'Total', sale: a.sale + r.sale, prior: a.prior + r.prior, target: a.target + r.target }),
      { name: 'Total', sale: 0, prior: 0, target: 0 }
    );
    return { body: named, other: other && (other.sale || other.target) ? other : null, total };
  }, [rows]);

  const ach = (r: BreakdownRow) => (r.target > 0 ? (r.sale / r.target) * 100 : null);
  const growth = (r: BreakdownRow) => (r.prior > 0 ? ((r.sale - r.prior) / r.prior) * 100 : null);
  const share = (r: BreakdownRow) => (total.sale ? (r.sale / total.sale) * 100 : 0);

  const sorted = useMemo(() => {
    const val = (r: BreakdownRow): number | string => {
      switch (sort.key) {
        case 'name':
          return r.name.toLowerCase();
        case 'sale':
          return r.sale;
        case 'target':
          return r.target;
        case 'ach':
          return ach(r) ?? -Infinity;
        case 'share':
          return share(r);
        case 'growth':
          return growth(r) ?? -Infinity;
      }
    };
    return [...body].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [body, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const paceColor = (pct: number) =>
    pct >= timeGonePct ? colors.good : pct >= timeGonePct * 0.8 ? colors.warn : colors.bad;

  const cols: { key: SortKey; label: string; align: 'start' | 'end'; show: boolean; w?: string }[] = [
    { key: 'name', label: 'Name', align: 'start', show: true },
    { key: 'sale', label: 'Sales', align: 'end', show: true, w: '70px' },
    { key: 'target', label: targetLabel, align: 'end', show: showTarget, w: '70px' },
    { key: 'ach', label: 'Ach %', align: 'end', show: showTarget, w: '104px' },
    { key: 'share', label: 'Share', align: 'end', show: true, w: '58px' },
    { key: 'growth', label: 'Growth', align: 'end', show: showGrowth, w: '62px' },
  ];
  const visible = cols.filter((c) => c.show);
  const template = visible.map((c) => c.w ?? 'minmax(96px, 1fr)').join(' ');

  const cell = (r: BreakdownRow, isTotal = false) =>
    visible.map((c) => {
      const base = {
        textAlign: c.align,
        fontVariantNumeric: 'tabular-nums',
        fontSize: '13px',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: colors.bodyText,
        fontWeight: isTotal ? 700 : 400,
      };
      switch (c.key) {
        case 'name': {
          const clickable = !!onPick && !isTotal && r.name !== UNMAPPED;
          return (
            <Box
              key={c.key}
              {...base}
              as={clickable ? 'button' : 'div'}
              title={clickable ? `Filter to ${r.name}` : r.name}
              onClick={clickable ? () => onPick!(r.name) : undefined}
              color={isTotal ? colors.darkText : r.name === UNMAPPED ? colors.mutedText : colors.brand}
              fontStyle={r.name === UNMAPPED ? 'italic' : undefined}
              cursor={clickable ? 'pointer' : 'default'}
              _hover={clickable ? { textDecoration: 'underline' } : undefined}
            >
              {r.name}
            </Box>
          );
        }
        case 'sale':
          return (
            <Box key={c.key} {...base} color={colors.sales} fontWeight={isTotal ? 700 : 600}>
              {fmt(r.sale)}
            </Box>
          );
        case 'target':
          return (
            <Box key={c.key} {...base} color={r.target > 0 ? colors.target : colors.mutedText} fontWeight={isTotal ? 700 : 500}>
              {r.target > 0 ? fmt(r.target) : '—'}
            </Box>
          );
        case 'ach': {
          const a = ach(r);
          if (a == null) {
            return (
              <Box key={c.key} {...base} color={colors.mutedText} fontSize="12px">
                No target
              </Box>
            );
          }
          return (
            <Flex key={c.key} {...base} align="center" justify="flex-end" gap={2} title={`${a.toFixed(1)}% of target`}>
              <Box flex={1} h="6px" bg={colors.sunkBg} borderRadius="3px" overflow="hidden" maxW="44px">
                <Box h="100%" w={`${Math.min(100, a)}%`} bg={paceColor(a)} borderRadius="3px" />
              </Box>
              <Text as="span" fontWeight={600} color={colors.darkText} minW="44px">
                {a > 999 ? '>999' : a.toFixed(1)}%
              </Text>
            </Flex>
          );
        }
        case 'share':
          return <Box key={c.key} {...base}>{isTotal ? '100%' : `${share(r).toFixed(1)}%`}</Box>;
        case 'growth': {
          const g = growth(r);
          if (g == null) {
            return (
              <Box key={c.key} {...base} color={r.sale > 0 ? colors.good : colors.mutedText} fontSize="12px">
                {r.sale > 0 ? 'new' : '—'}
              </Box>
            );
          }
          return (
            <Box key={c.key} {...base} color={g >= 0 ? colors.good : colors.bad} fontWeight={isTotal ? 700 : 600}>
              {g >= 0 ? '+' : ''}
              {g.toFixed(1)}%
            </Box>
          );
        }
      }
    });

  return (
    <Box
      border="1px solid"
      borderColor={colors.border}
      borderRadius="4px"
      overflow="hidden"
      h={maxHeight === '100%' ? '100%' : undefined}
      minH={0}
    >
      <Box maxH={maxHeight} h={maxHeight === '100%' ? '100%' : undefined} overflow="auto">
        {/* Header + Total, pinned together at the top: the total stays in
            view while the rows scroll, same as every table on the dashboard. */}
        <Box position="sticky" top={0} zIndex={1}>
        <Box
          display="grid"
          gridTemplateColumns={template}
          gap={2}
          px={3}
          py="8px"
          bg={colors.cardBg}
          borderBottom="1px solid"
          borderColor={colors.border}
        >
          {visible.map((c) => {
            const active = sort.key === c.key;
            return (
              <Box
                as="button"
                key={c.key}
                textAlign={c.align}
                fontSize="12.5px"
                fontWeight={700}
                color={colors.darkText}
                cursor="pointer"
                display="inline-flex"
                alignItems="center"
                justifyContent={c.align === 'end' ? 'flex-end' : 'flex-start'}
                gap="2px"
                onClick={() =>
                  setSort((s) => ({ key: c.key, dir: s.key === c.key ? ((s.dir * -1) as 1 | -1) : c.key === 'name' ? 1 : -1 }))
                }
              >
                {(c.key === 'sale' || c.key === 'target') && (
                  <Box
                    as="span"
                    w="8px"
                    h="8px"
                    borderRadius="2px"
                    bg={c.key === 'sale' ? colors.sales : colors.target}
                    mr="4px"
                  />
                )}
                {c.label}
                {active && (sort.dir === -1 ? <FiChevronDown size={12} /> : <FiChevronUp size={12} />)}
                {COL_HELP[c.key] && (
                  <Box as="span" ml="3px" display="inline-flex">
                    <InfoTip help={COL_HELP[c.key]!} size={12} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
        <Box
          display="grid"
          gridTemplateColumns={template}
          gap={2}
          px={3}
          py="8px"
          bg={colors.pageBg}
          borderBottom="1px solid"
          borderColor={colors.border}
        >
          {cell(total, true)}
        </Box>
        </Box>
        {/* Rows */}
        {sorted.map((r) => (
          <Box
            key={r.name}
            display="grid"
            gridTemplateColumns={template}
            gap={2}
            px={3}
            py="7px"
            borderBottom="1px solid"
            borderColor={colors.sunkBg}
            _hover={{ bg: colors.pageBg }}
          >
            {cell(r)}
          </Box>
        ))}
        {other && (
          <Box
            display="grid"
            gridTemplateColumns={template}
            gap={2}
            px={3}
            py="7px"
            borderBottom="1px solid"
            borderColor={colors.sunkBg}
            title="Sales with no name for this dimension in the mapping"
          >
            {cell(other)}
          </Box>
        )}
      </Box>
    </Box>
  );
}
