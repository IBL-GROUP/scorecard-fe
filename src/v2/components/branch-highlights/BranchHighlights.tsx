import { Box, Grid, Skeleton, Text } from '@chakra-ui/react';
import { useMemo, type ReactNode } from 'react';
import { colors } from '@/v2/constants/theme';
import { InfoTip } from '@/v2/components/overlay';
import { HELP, type HelpText } from '@/v2/constants/help';

export interface BranchHighlightsProps {
  /** Branch × SKU rows from the branch table endpoint. */
  rows: Record<string, unknown>[];
  isLoading?: boolean;
  compareOn: boolean;
  bLabel: string;
  fmt: (n: number) => string;
  /** Row field holding the entity's name. Default: the branch. */
  nameKey?: string;
  /** What one entity is called, singular and plural. */
  noun?: [string, string];
}

interface BranchTotal {
  name: string;
  sale: number;
  prior: number;
  target: number;
}

type Tone = 'sales' | 'target' | 'good' | 'bad';
const toneColor: Record<Tone, string> = {
  sales: colors.sales,
  target: colors.target,
  good: colors.good,
  bad: colors.bad,
};

export function HighlightCard({
  label,
  tone,
  name,
  value,
  caption,
  help,
}: {
  help?: HelpText;
  label: string;
  tone: Tone;
  name: string;
  value: ReactNode;
  caption: ReactNode;
}) {
  return (
    <Box
      bg={colors.cardBg}
      border="1px solid"
      borderColor={colors.border}
      borderTop={`3px solid ${toneColor[tone]}`}
      borderRadius="4px"
      px={4}
      py="10px"
      minW={0}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <Text fontSize="12.5px" fontWeight={500} color={toneColor[tone]} truncate flex={1}>
          {label}
        </Text>
        {help && <InfoTip help={help} size={14} />}
      </Box>
      <Text fontSize="16px" fontWeight={700} color={colors.darkText} truncate title={name} mt="2px">
        {name}
      </Text>
      <Text
        fontSize="20px"
        fontWeight={700}
        color={colors.darkText}
        lineHeight="1.25"
        fontVariantNumeric="tabular-nums"
        truncate
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </Text>
      <Text fontSize="12px" color={colors.mutedText} truncate mt="2px">
        {caption}
      </Text>
    </Box>
  );
}

/** Five answers about branches (or distributors), computed from entity × SKU rows. */
export function BranchHighlights({
  rows,
  isLoading,
  compareOn,
  bLabel,
  fmt,
  nameKey = 'hub_branch_desc',
  noun = ['branch', 'branches'],
}: BranchHighlightsProps) {
  const [one, many] = noun;
  const branches = useMemo(() => {
    const acc = new Map<string, BranchTotal>();
    for (const r of rows) {
      const name = String(r[nameKey] ?? '').trim() || 'Other / unmapped';
      const b = acc.get(name) ?? { name, sale: 0, prior: 0, target: 0 };
      b.sale += Number(r.current_month) || 0;
      b.prior += Number(r.previous_month) || 0;
      b.target += Number(r.value) || 0;
      acc.set(name, b);
    }
    return [...acc.values()].filter((b) => b.sale || b.prior || b.target);
  }, [rows, nameKey]);

  if (isLoading && !branches.length) {
    return (
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }} gap={3} flexShrink={0} className="sp-stagger">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} h="104px" borderRadius="4px" />
        ))}
      </Grid>
    );
  }
  if (!branches.length) return null;

  const total = branches.reduce((s, b) => s + b.sale, 0);
  const pct = (n: number) => `${n.toFixed(1)}%`;
  const growth = (b: BranchTotal) => (b.prior > 0 ? ((b.sale - b.prior) / b.prior) * 100 : null);
  const ach = (b: BranchTotal) => (b.target > 0 ? (b.sale / b.target) * 100 : null);

  const top = [...branches].sort((a, b) => b.sale - a.sale)[0];

  // Growth only counts for branches big enough to matter (at least 2% of the
  // average branch's prior sales), so a tiny base can't top the list.
  const avgPrior = branches.reduce((s, b) => s + b.prior, 0) / branches.length;
  const growers = branches
    .filter((b) => growth(b) != null && b.prior >= avgPrior * 0.02)
    .sort((a, b) => (growth(b) ?? 0) - (growth(a) ?? 0));
  const fastest = growers[0];

  const withTarget = branches.filter((b) => ach(b) != null);
  const best = [...withTarget].sort((a, b) => (ach(b) ?? 0) - (ach(a) ?? 0))[0];
  const behind = withTarget.filter((b) => (ach(b) ?? 0) < 100).sort((a, b) => (ach(a) ?? 0) - (ach(b) ?? 0));
  const worst = behind[0];

  const drops = branches.filter((b) => b.sale < b.prior).sort((a, b) => a.sale - a.prior - (b.sale - b.prior));
  const drop = drops[0];

  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }} gap={3} flexShrink={0}>
      <HighlightCard
        label={`Top ${one} by sales`}
        help={HELP.topBySales}
        tone="sales"
        name={top.name}
        value={fmt(top.sale)}
        caption={`${pct(total ? (top.sale / total) * 100 : 0)} of all sales`}
      />
      {compareOn && fastest ? (
        <HighlightCard
          label="Fastest growing"
          help={HELP.fastestGrowing}
          tone="good"
          name={fastest.name}
          value={`▲ ${pct(growth(fastest) ?? 0)}`}
          caption={`${fmt(fastest.sale)} vs ${fmt(fastest.prior)} in ${bLabel}`}
        />
      ) : (
        <HighlightCard label="Fastest growing"
          help={HELP.fastestGrowing} tone="good" name="—" value="—" caption="Turn on a comparison to see growth" />
      )}
      {best ? (
        <HighlightCard
          label="Best against target"
          help={HELP.bestTarget}
          tone="target"
          name={best.name}
          value={pct(ach(best) ?? 0)}
          caption={`${fmt(best.sale)} of ${fmt(best.target)} target to date`}
        />
      ) : (
        <HighlightCard label="Best against target"
          help={HELP.bestTarget} tone="target" name="—" value="—" caption="No targets for this selection" />
      )}
      <HighlightCard
        label="Behind target"
        help={HELP.behindTarget}
        tone="bad"
        name={
          behind.length
            ? `${behind.length} of ${withTarget.length} ${many}`
            : `All ${withTarget.length} on target`
        }
        value={worst ? `▼ ${pct(ach(worst) ?? 0)}` : '—'}
        caption={
          worst
            ? `Furthest behind: ${worst.name}, ${fmt(worst.target - worst.sale)} short`
            : `Every ${one} is at or above target`
        }
      />
      {compareOn && drop ? (
        <HighlightCard
          label="Biggest drop"
          help={HELP.biggestDrop}
          tone="bad"
          name={drop.name}
          value={`▼ ${fmt(drop.prior - drop.sale)}`}
          caption={`${fmt(drop.sale)} vs ${fmt(drop.prior)} in ${bLabel} (${pct(Math.abs(growth(drop) ?? 0))})`}
        />
      ) : compareOn && growers.length ? (
        // No branch fell: point at the weakest grower instead of an empty card.
        <HighlightCard
          label="Slowest growth"
          help={HELP.biggestDrop}
          tone="bad"
          name={growers[growers.length - 1].name}
          value={`▲ ${pct(growth(growers[growers.length - 1]) ?? 0)}`}
          caption={`No ${one} fell vs ${bLabel}; this one grew least`}
        />
      ) : (
        <HighlightCard label="Biggest drop"
          help={HELP.biggestDrop} tone="bad" name="—" value="—" caption="Turn on a comparison to see drops" />
      )}
    </Grid>
  );
}
