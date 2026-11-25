// "Analyze the supply chain": Sales Pulse 2.0's "Analyze the month" sheet
// (dsr-fe components/pulse/PlanSheet), laid out the same way, with the supply
// chain's questions instead of sales: where we stand, stock against benchmark,
// which classes are short or long, what would fix it (with a what-if), what is
// missing or at risk, and where service is lost. Worked out by rules from the
// figures already on the Pulse tab (no AI); every figure explains itself behind its ?.

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiArrowUpRight, FiX } from 'react-icons/fi';
import { InfoTip } from '@/ui/overlay';
import { AnimatedValue } from '@/ui/motion';
import { colors, fmt1 } from '@/constants/theme';
import type { HelpText } from '@/constants/help';
import { RATED_CLASSES } from '@/api/types';
import { kpiThresholds, rag, riskRules, type Rag } from '@/features/kpiThresholds';
import { DASH, full, money, pct1 } from '@/features/format';
import { useDetail } from '@/features/detail';
import type { PulseModel } from '@/pages/PulsePage';

const h = (what: string, source: string): HelpText => ({ what, source });
export const REVIEW_HELP = {
  sheet: h('The supply chain in numbers: where it stands, what is short or long, what would fix it and what is missing.', 'The figures on the Pulse tab: /above-below-threshold, /service-measure, /dispatch-vs-order, /cover-days, /wip, /rpm, /rd-status.'),
  service: h('Share of SKUs above their stock threshold.', 'SKUs above threshold ÷ all SKUs, from /above-below-threshold.'),
  fill: h('Ordered quantity that was dispatched.', 'Σ delivered ÷ Σ ordered, from /dispatch-vs-order.'),
  cover: h('Days the finished-goods stock lasts at the daily target, against the weighted benchmark.', '/cover-days/total; benchmark weighted by each class’s daily target.'),
  wc: h('Cash in the supply chain at cost.', 'Finished goods (inv_val_efp) + WIP value + RMPM total value.'),
  stock: h('Finished goods at cost against the right-sized stock: every class at its benchmark, and none below its threshold.', 'Right-sized = stock − excess above benchmark + what is needed to reach the threshold.'),
  shortLong: h('Classes below their threshold (stock-out risk) and above their benchmark (excess).', 'Below: (threshold − cover days) × daily target, at cost. Above: (cover days − benchmark) × daily target, at cost.'),
  fix: h('Release the excess and build the shortfall: what that does to working capital.', 'Excess and shortfall at cost, per class.'),
  whatIf: h('Move the slider to hold every class at a share of its benchmark cover.', 'Σ benchmark × share × daily target × cost ÷ TP, per class with a benchmark; classes without one keep their stock.'),
  checks: h('Risks the data shows, and gaps in the data.', 'Classes below threshold, channels below fill target, held RMPM, open production orders, silent distributors, stale data.'),
  owners: h('Branches below the service target, biggest gap first.', 'Simple average of each branch’s class service levels, from /service-measure.'),
};

const INK: Record<Rag, string> = { green: colors.good, amber: colors.warn, red: colors.bad };
const ink = (r: Rag | null) => (r ? INK[r] : colors.darkText);
const dayText = (n: number | null | undefined) => (n == null ? DASH : `${Math.round(n)} d`);
const clsName = (c: string) => (c === 'Others' ? 'Others' : `Class ${c}`);

export function ReviewSheet({ open, onClose, periodLabel, m }: { open: boolean; onClose: () => void; periodLabel: string; m: PulseModel }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <Box position="fixed" inset={0} zIndex={1400} bg={colors.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Flex
        direction="column"
        position="absolute"
        top={0}
        bottom={0}
        right={0}
        w="min(880px, 100vw)"
        bg={colors.pageBg}
        boxShadow={`-12px 0 32px ${colors.shadow}`}
        css={{
          animation: 'sp-sheet-in .25s ease-out',
          '@keyframes sp-sheet-in': { from: { transform: 'translateX(40px)', opacity: 0 }, to: {} },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        <Body onClose={onClose} periodLabel={periodLabel} m={m} />
      </Flex>
    </Box>,
    document.body,
  );
}

function Tip({ help }: { help: HelpText }) {
  return <InfoTip help={help} size={13} />;
}

interface ClassLine {
  key: string;
  name: string;
  cover: number | null;
  ref: number | null; // threshold (short) or benchmark (long)
  value: number; // at cost
}

function Body({ onClose, periodLabel, m }: { onClose: () => void; periodLabel: string; m: PulseModel }) {
  const { s, sv, f, pr, rd, wc, working } = m;
  const detail = useDetail();
  const openClass = (cls: string) => detail.open({ kind: 'class', cls });
  const openBranch = (branch: string) => detail.open({ kind: 'branch', branch });

  // ── Classes short of threshold / long over benchmark, at cost ──
  const ratio = (c: (typeof s.cls)[number]) => (c.invTp > 0 ? c.invCost / c.invTp : 0);
  const short: ClassLine[] = s.cls
    .filter((c) => c.cd != null && c.th != null && c.cd < c.th)
    .map((c) => ({ key: c.cls, name: clsName(c.cls), cover: c.cd, ref: c.th, value: (c.th! - c.cd!) * c.dailyTarget * ratio(c) }))
    .sort((a, b) => b.value - a.value);
  const long: ClassLine[] = s.cls
    .filter((c) => c.cd != null && c.bm != null && c.cd > c.bm)
    .map((c) => ({ key: c.cls, name: clsName(c.cls), cover: c.cd, ref: c.bm, value: (c.cd! - c.bm!) * c.dailyTarget * ratio(c) }))
    .sort((a, b) => b.value - a.value);
  const build = short.reduce((t, c) => t + c.value, 0);
  const release = long.reduce((t, c) => t + c.value, 0);
  const fg = wc.fg;
  const rightSized = fg - release + build;
  const wcAfter = working - release + build;
  // Over the right-sized stock is excess (amber); under it is a shortfall (red).
  const over = fg > rightSized * 1.05 ? colors.warn : fg < rightSized * 0.95 ? colors.bad : colors.good;

  // ── What-if: every class held at a share of its benchmark cover ──
  const [share, setShare] = useState<number | null>(null); // null = as it is
  const atShare = useMemo(() => {
    if (share == null) return fg;
    return s.cls.reduce((t, c) => t + (c.bm != null ? c.bm * share * c.dailyTarget * ratio(c) : c.invCost), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [share, s.cls, fg]);

  // ── Missing and risks: one line each, what and the figure ──
  const risks: { tone: 'bad' | 'good' | 'data'; title: string; value: string }[] = [];
  for (const c of short) risks.push({ tone: 'bad', title: `${c.name} · ${dayText(c.cover)} of cover, below its ${dayText(c.ref)} threshold`, value: money(c.value) });
  for (const ch of f.channels.filter((x) => x.pct != null && x.pct < riskRules.channelFillBelow))
    risks.push({ tone: 'bad', title: `Channel “${ch.channel}” · ${pct1(ch.pct)} dispatched, ${full(ch.unfulfilled)} units short`, value: pct1(ch.pct) });
  if (rag(pr.r.onHoldPct, 'onHoldPct') !== 'green' && pr.r.held > 0)
    risks.push({ tone: 'bad', title: `RMPM on hold (blocked, quality inspection, restricted, returns) · ${pct1(pr.r.onHoldPct)} of RMPM`, value: money(pr.r.held) });
  if (pr.w.openOrders > 0)
    risks.push({ tone: rag(pr.w.completion, 'productionCompletion') === 'green' ? 'good' : 'bad', title: `${full(pr.w.openOrders)} production orders open · ${pct1(pr.w.completion)} received`, value: money(pr.w.value) });
  if (rd.count > rd.reporting)
    risks.push({ tone: 'bad', title: `${full(rd.count - rd.reporting)} of ${full(rd.count)} distributors not reported today · stock unseen`, value: money(rd.staleValue) });
  // The RD line above already says what D3 says.
  for (const c of m.dataChecks.filter((x) => x.id !== 'D3')) risks.push({ tone: 'data', title: `${c.title} · ${c.detail}`, value: '' });

  // ── Where service is lost: branches below target ──
  const target = kpiThresholds.serviceLevel.green;
  const lost = sv.matrix
    .filter((r) => r.avg != null && r.avg < target)
    .map((r) => ({ branch: r.branch, avg: r.avg as number, gap: target - (r.avg as number), weak: RATED_CLASSES.filter((_, i) => r.cells[i] != null && (r.cells[i] as number) < target) }))
    .sort((a, b) => b.gap - a.gap);
  const totalGap = lost.reduce((t, r) => t + r.gap, 0);

  return (
    <>
      <Flex align="center" gap={3} px={5} py={3} bg={colors.cardBg} borderBottom="1px solid" borderColor={colors.border} flexShrink={0}>
        <Box minW={0}>
          <Text fontSize="16px" fontWeight={700} color={colors.darkText}>
            Supply Chain Review
          </Text>
          <Text fontSize="12px" color={colors.mutedText}>
            {periodLabel}
          </Text>
        </Box>
        <Box ml="auto" display="flex" alignItems="center" gap={2}>
          <Tip help={REVIEW_HELP.sheet} />
          <Box as="button" aria-label="Close" onClick={onClose} color={colors.mutedText} _hover={{ color: colors.darkText }} cursor="pointer" display="flex">
            <FiX size={18} />
          </Box>
        </Box>
      </Flex>

      <Box flex={1} minH={0} overflowY="auto" px={5} py={4}>
        <Flex direction="column" gap={4} className="sp-stagger">
          {/* A. Where we stand */}
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} className="sp-stagger">
            <Stat label="Service Level" value={pct1(sv.level)} valueInk={ink(rag(sv.level, 'serviceLevel'))} sub={`${full(sv.above)} Of ${full(sv.above + sv.below)} SKUs Above Threshold`} help={REVIEW_HELP.service} tone="sales" />
            <Stat label="Order Fill Rate" value={pct1(f.pct)} valueInk={ink(rag(f.pct, 'fillRate'))} sub={`${full(f.unfulfilled)} Of ${full(f.ordered)} Units Not Dispatched`} help={REVIEW_HELP.fill} tone="sales" />
            <Stat label="Days Of Cover" value={dayText(s.totalCd)} valueInk={ink(rag(s.coverage, 'coverage'))} sub={`Benchmark ${dayText(s.wBm)} · ${pct1(s.coverage)}`} help={REVIEW_HELP.cover} tone="target" />
            <Stat label="Working Capital" value={money(working)} sub={`FG ${money(wc.fg)} · WIP ${money(wc.wip)} · RMPM ${money(wc.rmpm)}`} help={REVIEW_HELP.wc} tone="target" />
          </Grid>

          {/* B. Stock against benchmark */}
          <Card title="Finished Goods Against Benchmark" help={REVIEW_HELP.stock}>
            <Box px={4} py={3}>
              <Flex align="baseline" gap={3} wrap="wrap" fontVariantNumeric="tabular-nums">
                <Text fontSize="24px" fontWeight={700} color={colors.darkText}>
                  {money(fg)}
                </Text>
                <Text fontSize="15px" fontWeight={700} color={over}>
                  {pct1(rightSized > 0 ? (fg / rightSized) * 100 : null)}
                </Text>
                <Text fontSize="13px" fontWeight={600} color={over}>
                  {fg >= rightSized ? `+${money(fg - rightSized)} Over Right-Sized` : `−${money(rightSized - fg)} Under Right-Sized`}
                </Text>
                <Text fontSize="12px" color={colors.mutedText} ml="auto">
                  At Cost
                </Text>
              </Flex>
              <ResultBar value={fg} target={rightSized} />
            </Box>
          </Card>

          {/* C. Short and long */}
          <Card title="Short And Long On Cover" help={REVIEW_HELP.shortLong}>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }}>
              <SideList title="Below Threshold" ink={colors.bad} list={short} sum={build} refLabel="threshold" onOpen={openClass} />
              <SideList title="Above Benchmark" ink={colors.warn} list={long} sum={release} refLabel="benchmark" onOpen={openClass} divider />
            </Grid>
          </Card>

          {/* D. What would fix it */}
          <Card title="What Would Fix It" help={REVIEW_HELP.fix}>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3} px={4} py={3}>
              <Figure label="Release The Excess" value={`−${money(release)}`} sub={long.length ? long.slice(0, 3).map((c) => c.name).join(', ') : 'No Class Above Benchmark'} ink={colors.good} />
              <Figure label="Build To Threshold" value={`+${money(build)}`} sub={short.length ? short.slice(0, 3).map((c) => c.name).join(', ') : 'No Class Below Threshold'} ink={short.length ? colors.bad : undefined} />
              <Figure label="Working Capital After" value={money(wcAfter)} sub={`${wcAfter <= working ? '−' : '+'}${money(Math.abs(working - wcAfter))} vs Now`} ink={wcAfter <= working ? colors.good : colors.bad} />
            </Grid>
            <Box px={4} py={3} borderTop="1px solid" borderColor={colors.sunkBg}>
              <Flex align="center" gap={3} wrap="wrap">
                <Text fontSize="13px" color={colors.bodyText} minW="200px">
                  What if every class holds <b>{share == null ? 'today’s cover' : `${Math.round(share * 100)}% of its benchmark`}</b>
                </Text>
                <input
                  type="range"
                  min={50}
                  max={150}
                  step={5}
                  value={Math.round((share ?? (s.coverage ?? 100) / 100) * 100)}
                  onChange={(e) => setShare(Number(e.target.value) / 100)}
                  aria-label="Cover as a share of benchmark"
                  style={{ flex: 1, minWidth: 160, accentColor: 'var(--sp-brand)' }}
                />
                {share != null && (
                  <Box as="button" fontSize="12px" color={colors.brand} fontWeight={600} cursor="pointer" onClick={() => setShare(null)}>
                    Reset
                  </Box>
                )}
                <Tip help={REVIEW_HELP.whatIf} />
              </Flex>
              <Flex justify="space-between" mt={2} fontSize="13px" wrap="wrap" gap={2} fontVariantNumeric="tabular-nums">
                <Text color={colors.darkText}>
                  Finished goods at <b>{money(atShare)}</b> · working capital {money(working - fg + atShare)}
                </Text>
                <Text color={share == null ? colors.mutedText : atShare <= fg ? colors.good : colors.bad} fontWeight={600}>
                  {share == null ? 'As Today' : atShare <= fg ? `−${money(fg - atShare)} Cash Freed` : `+${money(atShare - fg)} Cash Needed`}
                </Text>
              </Flex>
            </Box>
          </Card>

          {/* E. Missing and risks */}
          <Card title="Missing And Risks" help={REVIEW_HELP.checks}>
            {risks.length === 0 ? (
              <Text px={4} py={3} fontSize="13px" color={colors.mutedText}>
                Nothing missing or at risk that the data can see.
              </Text>
            ) : (
              risks.map((r, k) => {
                const c = { bad: colors.bad, good: colors.good, data: colors.brand }[r.tone];
                return (
                  <Flex key={k} align="center" gap={3} px={4} py="8px" borderBottom="1px solid" borderColor={colors.sunkBg} fontSize="13px">
                    <Box w="8px" h="8px" borderRadius="full" bg={c} flexShrink={0} />
                    <Text flex={1} minW={0} color={colors.bodyText}>
                      {r.title}
                    </Text>
                    <Text fontWeight={700} color={c} fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                      {r.value}
                    </Text>
                  </Flex>
                );
              })
            )}
          </Card>

          {/* F. Where service is lost */}
          <Card title="Where Service Is Lost" help={REVIEW_HELP.owners}>
            <LostTable rows={lost} totalGap={totalGap} target={target} onOpen={openBranch} />
          </Card>
        </Flex>
      </Box>
    </>
  );
}

/** One side of "Short and long": the five biggest, with the side's total. */
function SideList({ title, ink: c, list, sum, refLabel, onOpen, divider }: { title: string; ink: string; list: ClassLine[]; sum: number; refLabel: string; onOpen: (key: string) => void; divider?: boolean }) {
  return (
    <Box borderLeft={divider ? { md: '1px solid' } : undefined} borderTop={divider ? { base: '1px solid', md: 'none' } : undefined} borderColor={colors.border}>
      <Flex justify="space-between" px={4} py="7px" fontSize="13px" fontWeight={700} color={c} borderBottom="1px solid" borderColor={colors.sunkBg} fontVariantNumeric="tabular-nums">
        <Text>
          {title} · {list.length}
        </Text>
        <Text>{money(sum)}</Text>
      </Flex>
      {list.length === 0 ? (
        <Text px={4} py={3} fontSize="13px" color={colors.mutedText}>
          None
        </Text>
      ) : (
        list.slice(0, 5).map((i) => (
          <Grid
            key={i.key}
            as="button"
            w="100%"
            textAlign="left"
            templateColumns="minmax(0, 1fr) 96px 76px"
            columnGap={2}
            px={4}
            py="6px"
            fontSize="13px"
            alignItems="center"
            borderBottom="1px solid"
            borderColor={colors.sunkBg}
            cursor="pointer"
            _hover={{ bg: colors.hoverBg }}
            title={`Open ${i.name}`}
            onClick={() => onOpen(i.key)}
            fontVariantNumeric="tabular-nums"
          >
            <Text truncate color={colors.darkText}>
              {i.name}
            </Text>
            <Text textAlign="right" fontWeight={600} color={c} title={`${refLabel} ${dayText(i.ref)}`}>
              {dayText(i.cover)} / {dayText(i.ref)}
            </Text>
            <Text textAlign="right" fontWeight={600} color={c}>
              {money(i.value)}
            </Text>
          </Grid>
        ))
      )}
    </Box>
  );
}

/** Every branch below the service target, biggest gap first, with its share of the total gap. */
function LostTable({ rows, totalGap, target, onOpen }: { rows: { branch: string; avg: number; gap: number; weak: string[] }[]; totalGap: number; target: number; onOpen: (b: string) => void }) {
  if (rows.length === 0)
    return (
      <Text px={4} py={3} fontSize="13px" color={colors.mutedText}>
        Every branch is at or above the {target}% service target.
      </Text>
    );
  const cols = 'minmax(0, 1.4fr) 72px 110px 72px minmax(0, 1.1fr) 28px';
  const row = { templateColumns: cols, columnGap: 3, px: 4, alignItems: 'center', fontVariantNumeric: 'tabular-nums' } as const;
  const avg = rows.reduce((t, r) => t + r.avg, 0) / rows.length;
  return (
    <>
      <Grid {...row} className="sp-th" py="7px" fontSize="13px" fontWeight={700} whiteSpace="nowrap" borderBottom="1px solid" borderColor={colors.border}>
        <Text>Branch</Text>
        <Text textAlign="right">Service</Text>
        <Text>Classes Below</Text>
        <Text textAlign="right">Gap</Text>
        <Text>Share Of The Gap</Text>
        <span />
      </Grid>
      <Grid {...row} py="7px" fontSize="13px" fontWeight={700} bg={colors.pageBg} borderBottom="1px solid" borderColor={colors.border}>
        <Text color={colors.darkText} truncate>
          Total · {rows.length} Branches
        </Text>
        <Text textAlign="right" color={ink(rag(avg, 'serviceLevel'))}>
          {pct1(avg)}
        </Text>
        <span />
        <Text textAlign="right" color={colors.bad}>
          {fmt1(totalGap / rows.length)} pts
        </Text>
        <Text fontSize="12px" color={colors.mutedText}>
          100%
        </Text>
        <span />
      </Grid>
      {rows.map((r) => {
        const shareOf = totalGap > 0 ? (r.gap / totalGap) * 100 : 0;
        return (
          <Grid key={r.branch} {...row} py="7px" fontSize="13px" borderBottom="1px solid" borderColor={colors.sunkBg}>
            <Text truncate title={r.branch} color={colors.darkText}>
              {r.branch}
            </Text>
            <Text textAlign="right" color={ink(rag(r.avg, 'serviceLevel'))} fontWeight={600}>
              {pct1(r.avg)}
            </Text>
            <Text color={colors.bodyText} truncate>
              {r.weak.length ? r.weak.join(', ') : DASH}
            </Text>
            <Text textAlign="right" color={colors.darkText} fontWeight={600}>
              {fmt1(r.gap)} pts
            </Text>
            <Text fontSize="12px" color={colors.mutedText} textAlign="right">
              {fmt1(shareOf)}%
            </Text>
            <Box as="button" aria-label={`Open ${r.branch}`} title={`Open ${r.branch}`} onClick={() => onOpen(r.branch)} color={colors.brand} cursor="pointer" display="flex" justifyContent="center">
              <FiArrowUpRight size={15} />
            </Box>
          </Grid>
        );
      })}
    </>
  );
}

function Stat({ label, value, sub, help, tone, valueInk }: { label: string; value: string; sub: string; help: HelpText; tone?: 'sales' | 'target'; valueInk?: string }) {
  const c = tone === 'sales' ? colors.sales : tone === 'target' ? colors.target : colors.brand;
  return (
    <Box bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderRadius="4px" px={3} py="8px" minW={0}>
      <Flex align="center" gap={1}>
        <Text fontSize="12px" fontWeight={500} color={c} truncate flex={1}>
          {label}
        </Text>
        <Tip help={help} />
      </Flex>
      <Text fontSize="20px" fontWeight={700} color={valueInk ?? colors.darkText} fontVariantNumeric="tabular-nums" lineHeight="1.3">
        <AnimatedValue value={value} />
      </Text>
      <Text fontSize="11px" color={colors.mutedText} truncate title={sub}>
        {sub}
      </Text>
    </Box>
  );
}

function Figure({ label, value, sub, ink: c }: { label: string; value: string; sub: string; ink?: string }) {
  return (
    <Box minW={0}>
      <Text fontSize="12px" color={colors.mutedText} truncate>
        {label}
      </Text>
      <Text fontSize="20px" fontWeight={700} lineHeight="1.3" fontVariantNumeric="tabular-nums" color={c ?? colors.darkText}>
        {value}
      </Text>
      <Text fontSize="11px" color={colors.mutedText} truncate title={sub}>
        {sub}
      </Text>
    </Box>
  );
}

function Card({ title, help, children }: { title: string; help: HelpText; children: ReactNode }) {
  return (
    <Box bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderRadius="4px">
      <Flex align="center" gap={2} px={4} py="9px" borderBottom="1px solid" borderColor={colors.border}>
        <Text fontSize="14px" fontWeight={700} color={colors.darkText}>
          {title}
        </Text>
        <Tip help={help} />
      </Flex>
      {children}
    </Box>
  );
}

/** Finished goods against the right-sized stock (the teal mark). */
function ResultBar({ value, target }: { value: number; target: number }) {
  const max = Math.max(target, value) * 1.05 || 1;
  return (
    <Box mt={3}>
      <Box position="relative" h="14px" bg={colors.sunkBg} borderRadius="4px">
        <Box position="absolute" left={0} top={0} bottom={0} w="100%" bg={value > target ? colors.warn : colors.sales} borderRadius="4px" className="sp-grow" style={{ transform: `scaleX(${Math.min(1, value / max)})` }} />
        <Box position="absolute" top="-4px" bottom="-4px" w="2px" bg={colors.target} left={`${Math.min(100, (target / max) * 100)}%`} title={`Right-sized ${money(target)}`} />
      </Box>
      <Text fontSize="11px" color={colors.mutedText} mt="6px">
        <Box as="span" color={colors.target} fontWeight={700}>
          │
        </Box>{' '}
        right-sized {money(target)} · every class at its benchmark, none below its threshold
      </Text>
    </Box>
  );
}
