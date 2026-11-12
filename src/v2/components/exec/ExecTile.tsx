import { Box, Flex, Skeleton, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { FiAlertCircle, FiClock, FiLock } from 'react-icons/fi';
import { InfoTip } from '@/v2/components/overlay';
import { RollingNumber } from '@/v2/components/motion';
import { colors } from '@/v2/constants/theme';
import { helpFor, type HelpText } from '@/v2/constants/help';
import { bandText, type BandKey, type Rag } from '@/v2/features/kpiThresholds';
import { SECTION_LABEL, type Section } from '@/v2/features/tabs';
import { RagBadge } from './Rag';
import { useDetail } from '@/v2/features/detail';
import { useNav } from '@/v2/features/nav';
import { TABS, type TabKey } from '@/v2/features/tabs';
import { Sparkline } from './charts';

export interface TileDelta {
  /** Change, in % or points. null = "No comparison". */
  value: number | null;
  label: string;
  unit?: '%' | 'pts';
  /** Whether a rise is good for this KPI (Excess ▲ is bad). Default true. */
  upIsGood?: boolean;
}

export interface ExecTileProps {
  /** PRD item ID, e.g. "EX-01". */
  id: string;
  label: string;
  value: string;
  valueSuffix?: string;
  rag?: Rag | null;
  band?: BandKey;
  bandUnit?: string;
  /** Variance against target, e.g. "vs pace: −PKR 18.3M". */
  variance?: ReactNode;
  delta?: TileDelta;
  spark?: (number | null)[];
  caption?: ReactNode;
  isLoading?: boolean;
  /** true = failed to load; 'pending' = source not in BigQuery yet (SOURCE_PENDING). */
  error?: boolean | 'pending';
  /** Section the user lacks; shows a locked placeholder. */
  locked?: Section | null;
  /** Small marker for tiles whose source ignores filters (rule F5). */
  scopeNote?: string;
  /** Extra action inside the detail sheet (e.g. go to another view). */
  onClick?: () => void;
  /** Where "Open in …" in the detail sheet goes. */
  goTo?: { tab: TabKey; focus: string };
  help?: HelpText;
  children?: ReactNode;
}

function DeltaLine({ d }: { d: TileDelta }) {
  if (d.value == null || Number.isNaN(d.value))
    return (
      <Text fontSize="12px" color={colors.mutedText} fontStyle="italic">
        No comparison
      </Text>
    );
  const up = d.value > 0;
  const flat = Math.abs(d.value) < 0.05;
  const good = flat ? null : up === (d.upIsGood ?? true);
  return (
    <Flex fontSize="12px" gap="6px" align="center" wrap="wrap">
      <Text as="span" fontWeight={700} color={good == null ? colors.mutedText : good ? colors.good : colors.bad} fontVariantNumeric="tabular-nums">
        {flat ? '■' : up ? '▲' : '▼'} {Math.abs(d.value).toFixed(1)}
        {d.unit === 'pts' ? ' pts' : '%'}
      </Text>
      <Text as="span" color={colors.mutedText}>
        {d.label}
      </Text>
    </Flex>
  );
}

export function ExecTile(p: ExecTileProps) {
  const baseHelp = p.help ?? helpFor(p.id);
  const help = baseHelp && p.band ? { ...baseHelp, source: `${baseHelp.source}` } : baseHelp;
  const detail = useDetail();
  const nav = useNav();
  // Clicking a tile opens its detail sheet (design-system SheetStack).
  const action = p.goTo
    ? { label: `Open in ${TABS.find((t) => t.key === p.goTo!.tab)?.label ?? 'its tab'}`, run: () => nav(p.goTo!.tab, p.goTo!.focus) }
    : p.onClick
      ? { label: 'Open full view', run: p.onClick }
      : undefined;
  const clickable = !p.locked && !p.isLoading && !p.error;
  const openSheet = () =>
    detail.open({ kind: 'kpi', id: p.id, label: p.label, value: p.value, valueSuffix: p.valueSuffix, rag: p.rag, band: p.band, bandUnit: p.bandUnit, variance: p.variance, delta: p.delta, caption: p.caption, action });
  return (
    <Flex
      data-kpi={p.id}
      scrollMarginTop="140px"
      direction="column"
      gap="5px"
      bg={colors.cardBg}
      border="1px solid"
      borderColor={colors.border}
      borderRadius="4px"
      px={4}
      py="10px"
      minW={0}
      minH="128px"
      data-tile
      cursor={clickable ? 'pointer' : undefined}
      // The whole tile is clickable with a mouse. For keyboard and screen
      // readers the title is the button, so the info button inside the tile is
      // not nested in another control (WCAG 4.1.2, story S5).
      onClick={clickable ? openSheet : undefined}
      title={clickable ? 'Click for details' : undefined}
      _hover={clickable ? { borderColor: colors.borderStrong, boxShadow: `0 2px 10px ${colors.shadow}` } : undefined}
      _focusWithin={clickable ? { borderColor: colors.brand } : undefined}
    >
      <Flex align="center" gap="6px" color={colors.mutedText}>
        {clickable ? (
          <Box
            as="button"
            fontSize="13px"
            fontWeight={500}
            textAlign="left"
            minW={0}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            title={p.label}
            aria-label={`${p.label}: details`}
            onClick={(e) => (e.stopPropagation(), openSheet())}
            _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: '2px', borderRadius: '2px' }}
          >
            {p.label}
          </Box>
        ) : (
          <Text fontSize="13px" fontWeight={500} truncate title={p.label}>
            {p.label}
          </Text>
        )}
        <Box ml="auto" display="flex" alignItems="center" gap="6px" onClick={(e) => e.stopPropagation()}>
          {help && <InfoTip help={p.band ? { what: help.what, source: `${help.source}${help.source.includes('Band') ? '' : ` Band: ${bandText(p.band, p.bandUnit)}.`}` } : help} />}
        </Box>
      </Flex>
      {p.locked ? (
        <Flex align="center" gap="8px" color={colors.mutedText} fontSize="12.5px" mt="6px">
          <FiLock aria-hidden />
          <Text>Needs {SECTION_LABEL[p.locked]} access</Text>
        </Flex>
      ) : p.isLoading ? (
        <>
          <Skeleton h="28px" w="55%" borderRadius="md" />
          <Skeleton h="14px" w="80%" borderRadius="md" />
          <Skeleton h="14px" w="65%" borderRadius="md" />
        </>
      ) : p.error === 'pending' ? (
        <Flex align="center" gap="8px" color={colors.mutedText} fontSize="12.5px" mt="6px" data-state="pending">
          <FiClock aria-hidden />
          <Text>Not available yet: source still moving to BigQuery.</Text>
        </Flex>
      ) : p.error ? (
        <Flex align="center" gap="8px" color={colors.bad} fontSize="12.5px" mt="6px">
          <FiAlertCircle aria-hidden />
          <Text>Couldn’t load this figure. Others are unaffected.</Text>
        </Flex>
      ) : (
        <Flex direction="column" gap="4px" className="sp-fade">
          <Flex align="center" gap="8px" wrap="wrap">
            <Text fontSize="24px" fontWeight={700} lineHeight="1.1" color={colors.darkText} fontVariantNumeric="tabular-nums">
              {/\d/.test(p.value) ? <RollingNumber value={p.value} /> : p.value}
            </Text>
            {p.valueSuffix && (
              <Text fontSize="12.5px" color={colors.mutedText} fontWeight={500}>
                {p.valueSuffix}
              </Text>
            )}
            <Box ml="auto">
              <RagBadge rag={p.rag} size="sm" />
            </Box>
          </Flex>
          {p.variance && (
            <Text fontSize="12px" color={colors.bodyText}>
              {p.variance}
            </Text>
          )}
          {p.delta && <DeltaLine d={p.delta} />}
          {p.children}
          {p.caption && (
            <Text fontSize="12px" color={colors.mutedText}>
              {p.caption}
            </Text>
          )}
          {p.spark && p.spark.filter((v) => v != null).length > 1 && <Sparkline values={p.spark} />}
          {p.scopeNote && (
            <Text fontSize="11px" color={colors.mutedText}>
              ⓘ {p.scopeNote}
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
}
