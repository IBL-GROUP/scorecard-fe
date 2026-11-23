import { Box } from '@chakra-ui/react';
import { useMemo, useState, type ReactNode } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { ACTIVE_ROW, useOpenedRow } from '@/features/detail';
import { colors, fmt1 } from '@/constants/theme';
import { InfoTip } from '@/ui/overlay';
import { HELP } from '@/ui/help';
import { byName } from '@/ui/byName';
import { useRowWindow } from '@/features/rowWindow';

export interface BreakdownRow {
  name: string;
  sale: number;
  prior: number;
  target: number;
  /** The same days last year, when that comparison is on. */
  ly?: number;
  /** A count shown in its own column when countLabel is set (Supply Chain: SKUs sold). */
  count?: number;
}

type SortKey = 'count' | 'name' | 'sale' | 'prior' | 'ly' | 'target' | 'ach' | 'share' | 'growth';

const COL_HELP: Partial<Record<SortKey, (typeof HELP)[keyof typeof HELP]>> = {
  sale: HELP.colSales,
  prior: HELP.colPrior,
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
  /** Heads the sales column with its period ("Oct '26") instead of "Sales". */
  saleLabel?: string;
  /** Shows the comparison period's sales in a column of its own, headed with this ("Sept '26"). */
  priorLabel?: string;
  /** Shows last year's sales in a column of its own, headed with this ("Oct '25"). */
  lyLabel?: string;
  /** Shows each row's count in a column of its own, headed with this ("SKUs"). */
  countLabel?: string;
  /** A marker before a row's name (Supply Chain: the 1.0 class badge); not on the Total. */
  nameMark?: (name: string) => ReactNode;
  /** Hides the Share column (default shown), for a narrow card where it adds little. */
  showShare?: boolean;
}

const UNMAPPED = 'Other / Unmapped';
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
  saleLabel,
  priorLabel,
  lyLabel,
  countLabel,
  nameMark,
  showShare = true,
}: BreakdownTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  const opened = useOpenedRow();

  const { body, other, total } = useMemo(() => {
    const named = rows.filter((r) => !isJunk(r.name) && (r.sale !== 0 || r.target !== 0 || r.prior !== 0));
    const junk = rows.filter((r) => isJunk(r.name));
    const other = junk.length
      ? junk.reduce(
          (a, r) => ({ name: UNMAPPED, sale: a.sale + r.sale, prior: a.prior + r.prior, target: a.target + r.target, ly: (a.ly ?? 0) + (r.ly ?? 0), count: (a.count ?? 0) + (r.count ?? 0) }),
          { name: UNMAPPED, sale: 0, prior: 0, target: 0, ly: 0, count: 0 }
        )
      : null;
    const all = other ? [...named, other] : named;
    const total = all.reduce(
      (a, r) => ({ name: 'Total', sale: a.sale + r.sale, prior: a.prior + r.prior, target: a.target + r.target, ly: (a.ly ?? 0) + (r.ly ?? 0), count: (a.count ?? 0) + (r.count ?? 0) }),
      { name: 'Total', sale: 0, prior: 0, target: 0, ly: 0, count: 0 }
    );
    return { body: named, other: other && (other.sale || other.target || other.prior || other.ly) ? other : null, total };
  }, [rows]);

  const ach = (r: BreakdownRow) => (r.target > 0 ? (r.sale / r.target) * 100 : null);
  const growth = (r: BreakdownRow) => (r.prior > 0 ? ((r.sale - r.prior) / r.prior) * 100 : null);
  const share = (r: BreakdownRow) => (total.sale ? (r.sale / total.sale) * 100 : 0);

  const sorted = useMemo(() => {
    const val = (r: BreakdownRow): number | string => {
      switch (sort.key) {
        case 'name': // handled by byName below
          return r.name;
        case 'sale':
          return r.sale;
        case 'count':
          return r.count ?? 0;
        case 'prior':
          return r.prior;
        case 'ly':
          return r.ly ?? 0;
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
    if (sort.key === 'name') return [...body].sort((a, b) => byName(a.name, b.name) * sort.dir);
    return [...body].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [body, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const win = useRowWindow(sorted, sorted);

  const paceColor = (pct: number) =>
    pct >= timeGonePct ? colors.good : pct >= timeGonePct * 0.8 ? colors.warn : colors.bad;

  // Wide enough for each heading on one line ("Sept '26" + help icon).
  const cols: { key: SortKey; label: string; align: 'start' | 'center'; show: boolean; w?: string }[] = [
    { key: 'name', label: 'Name', align: 'start', show: true },
    { key: 'count', label: countLabel ?? '', align: 'center', show: !!countLabel, w: '64px' },
    { key: 'sale', label: saleLabel ?? 'Sales', align: 'center', show: true, w: '92px' },
    { key: 'prior', label: priorLabel ?? '', align: 'center', show: !!priorLabel, w: '92px' },
    { key: 'ly', label: lyLabel ?? '', align: 'center', show: !!lyLabel, w: '92px' },
    { key: 'target', label: targetLabel, align: 'center', show: showTarget, w: '84px' },
    { key: 'ach', label: 'Ach %', align: 'center', show: showTarget, w: '72px' },
    { key: 'share', label: 'Share', align: 'center', show: showShare, w: '64px' },
    { key: 'growth', label: 'Growth', align: 'center', show: showGrowth, w: '74px' },
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
        case 'name':
          // The whole row is the click target (see the rows below).
          return (
            <Box
              key={c.key}
              {...base}
              className="bd-name"
              title={r.name}
              color={isTotal ? colors.darkText : r.name === UNMAPPED ? colors.mutedText : colors.brand}
              fontStyle={r.name === UNMAPPED ? 'italic' : undefined}
              display={nameMark && !isTotal ? 'flex' : undefined}
              alignItems="center"
              gap={2}
            >
              {nameMark && !isTotal && nameMark(r.name)}
              {r.name}
            </Box>
          );
        case 'count':
          return (
            <Box key={c.key} {...base}>
              {(r.count ?? 0).toLocaleString('en-US')}
            </Box>
          );
        case 'sale':
          return (
            <Box key={c.key} {...base} color={colors.sales} fontWeight={isTotal ? 700 : 600}>
              {fmt(r.sale)}
            </Box>
          );
        case 'prior':
          return (
            <Box key={c.key} {...base} color={r.prior ? colors.bodyText : colors.mutedText} title={`${priorLabel}: the comparison period`}>
              {r.prior ? fmt(r.prior) : '—'}
            </Box>
          );
        case 'ly':
          return (
            <Box key={c.key} {...base} color={r.ly ? colors.bodyText : colors.mutedText} title={`${lyLabel}: same days last year`}>
              {r.ly ? fmt(r.ly) : '—'}
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
                No Target
              </Box>
            );
          }
          return (
            // The % alone, coloured by pace (no bar), to leave room for the period columns.
            <Box key={c.key} {...base} fontWeight={600} color={paceColor(a)} title={`${fmt1(a)}% of target`}>
              {fmt1(a)}%
            </Box>
          );
        }
        case 'share':
          return <Box key={c.key} {...base}>{isTotal ? '100%' : `${fmt1(share(r))}%`}</Box>;
        case 'growth': {
          const g = growth(r);
          if (g == null) {
            return (
              <Box key={c.key} {...base} color={r.sale > 0 ? colors.good : colors.mutedText} fontSize="12px">
                {r.sale > 0 ? 'New' : '—'}
              </Box>
            );
          }
          return (
            <Box key={c.key} {...base} color={g >= 0 ? colors.good : colors.bad} fontWeight={isTotal ? 700 : 600}>
              {g >= 0 ? '+' : ''}
              {fmt1(g)}%
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
        <Box minW="fit-content">
        <Box position="sticky" top={0} zIndex={1}>
        <Box
          className="sp-pin sp-th"
          display="grid"
          gridTemplateColumns={template}
          columnGap={3}
          rowGap={2}
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
                fontSize="13px"
                fontWeight={700}
                whiteSpace="nowrap"
                color={colors.darkText}
                cursor="pointer"
                display="inline-flex"
                alignItems="center"
                justifyContent={c.align === 'center' ? 'center' : 'flex-start'}
                gap="2px"
                onClick={() =>
                  setSort((s) => ({ key: c.key, dir: s.key === c.key ? ((s.dir * -1) as 1 | -1) : c.key === 'name' ? 1 : -1 }))
                }
              >
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
          className="sp-pin"
          display="grid"
          gridTemplateColumns={template}
          columnGap={3}
          rowGap={2}
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
        {win.rows.map((r) => {
          const clickable = !!onPick && r.name !== UNMAPPED;
          const on = opened.isActive(r.name);
          return (
            <Box
              key={r.name}
              className="sp-pin"
              display="grid"
              gridTemplateColumns={template}
              columnGap={3}
              rowGap={2}
              px={3}
              py="7px"
              borderBottom="1px solid"
              borderColor={colors.sunkBg}
              bg={on ? ACTIVE_ROW.bg : colors.cardBg}
              boxShadow={on ? ACTIVE_ROW.boxShadow : undefined}
              aria-current={on || undefined}
              _hover={{ bg: on ? ACTIVE_ROW.bg : colors.hoverBg }}
              css={clickable ? { '&:hover .bd-name': { textDecoration: 'underline' } } : undefined}
              cursor={clickable ? 'pointer' : 'default'}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              title={clickable ? `Open ${r.name}` : undefined}
              onClick={clickable ? () => opened.open(r.name, () => onPick!(r.name)) : undefined}
              onKeyDown={
                clickable
                  ? (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        opened.open(r.name, () => onPick!(r.name));
                      }
                    }
                  : undefined
              }
            >
              {cell(r)}
            </Box>
          );
        })}
        {win.marker}
        {other && (
          <Box
            className="sp-pin"
            display="grid"
            gridTemplateColumns={template}
            columnGap={3}
            rowGap={2}
            px={3}
            py="7px"
            borderBottom="1px solid"
            borderColor={colors.sunkBg}
            bg={colors.cardBg}
            title="Sales with no name for this dimension in the mapping"
          >
            {cell(other)}
          </Box>
        )}
        </Box>
      </Box>
    </Box>
  );
}
