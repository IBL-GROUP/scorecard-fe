// Tab 3: Service Measure. Since 19 Nov 2026 (user: "follow supply chain 1.0, as Summary
// follows 1.0's Summary") it keeps 1.0's layout and names in Sales Pulse 2.0's cards:
//   highlight cards (2.0) on top, then
//   row 1 — Inventory Days, class › SKU by branch (IN-17), full width;
//   row 2 — Service Measure by Branch (IN-10: a heatmap, worst branch first; 1.0's lines,
//           the ranking IN-11 and cover days by branch IN-12 as its other views) · Cover Days
//           vs Threshold (IN-15) · SKUs vs Threshold (IN-16).
// The same 1.0 figures, drawn to be read at a glance (user, 19 Nov 2026): status colours
// against each class's threshold, one row per class, legends in the card header.
// On a desktop the tab fills the screen; long content scrolls inside its card, ⤢ opens it full size.

import { Box, Button, Flex, Grid, Input, Text } from '@chakra-ui/react';
import { Fragment, useMemo, useState } from 'react';
import { FiChevronDown, FiChevronRight, FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { ChartCard } from '@/ui/chart-card';
import { useCardLegend, type LegendItem } from '@/ui/chart-card/legend';
import { BarChart, LineChart } from '@/ui/charts';
import { Segmented } from '@/ui/segmented';
import { HighlightCard, HighlightGrid } from '@/ui/highlights';
import { ClassBadge } from '@/ui/class-badge';
import { MatrixTable } from '@/ui/matrix';
import { RowBars } from '@/ui/row-bars';
import { CardState } from '@/components/card-state';
import { colors } from '@/constants/theme';
import { CLASS_HEX } from '@/constants/classColors';
import { INV_BRANCHES, RATED_CLASSES, n0, num, type TgtVsActualRow } from '@/api/types';
import { rowsOf, type DashboardData } from '@/features/data';
import { service, status, stock, workingCapitalTrend } from '@/features/derive';
import { inventoryClassRows } from '@/features/kpis';
import { kpiThresholds, rag, type Rag } from '@/features/kpiThresholds';
import { DASH, change, days, full, pct1, pkr } from '@/features/format';
import { useStore } from '@/features/store';
import { ACTIVE_ROW, useDetail, useOpenedRow } from '@/features/detail';
import { useFitScreen } from '@/features/fit';

const CLASSES = [...RATED_CLASSES, 'Others'] as const;
const clsName = (c: string) => (c === 'Others' ? 'Other' : `Class ${c}`);
const INK: Record<Rag, string> = { green: colors.good, amber: colors.warn, red: colors.bad };
const SOFT: Record<Rag, string> = { green: colors.goodSoft, amber: colors.warnSoft, red: colors.badSoft };
const ink = (r: Rag | null | undefined) => (r ? INK[r] : colors.bodyText);
const soft = (r: Rag | null | undefined) => (r ? SOFT[r] : undefined);
/** 1.0 shows Inventory Days figures cut to whole days, not rounded. */
const trunc = (v: number) => String(Math.trunc(v));

/** Hands a card its legend (Sales Pulse 2.0: legends sit in the card header) and draws nothing itself. */
function CardLegend({ items }: { items: LegendItem[] }) {
  useCardLegend(items);
  return null;
}

export function InventoryPage({ data }: { data: DashboardData }) {
  const d = data.tabs.inventory;
  const st = useStore();
  const detail = useDetail();
  const fit = useFitScreen();
  const [svcView, setSvcView] = useState<'heat' | 'line' | 'rank' | 'cover'>('heat');

  const s = stock(d);
  const sv = service(d, st.filters.classification);
  const trend = workingCapitalTrend(d, data.window.end);
  const cur = trend[trend.length - 1];
  const prevMonth = trend[trend.length - 2];
  const tgt = rowsOf<TgtVsActualRow>(d.tgt);
  const invRaw = rowsOf<Record<string, unknown>>(d.invDays);
  const invClasses = useMemo(() => inventoryClassRows(invRaw), [invRaw]);

  const sSvc = status(d, 'aboveBelow');
  const sMatrix = status(d, 'serviceAll');
  const sInv = status(d, 'invDays', 'bench');
  const sTgt = status(d, 'tgt');

  const thOf = (c: string) => s.cls.find((r) => r.cls === c)?.th ?? null;
  const bmOf = (c: string) => s.cls.find((r) => r.cls === c)?.bm ?? null;
  const showCls = (c: string) => !st.filters.classification.length || st.filters.classification.includes(c);
  const openClass = (c: string) => detail.open({ kind: 'class', cls: c });
  const openBranch = (b: string) => detail.open({ kind: 'branch', branch: b });

  // ── Highlights (2.0) ──
  const lowest = sv.matrix.find((m) => m.avg != null);
  const belowByClass = sv.ab.map((r) => ({ cls: r.classification, below: n0(r['No Of SKUs < Threshold']) })).sort((a, b) => b.below - a.below);
  const lowCover = s.cls
    .map((r) => ({ cls: r.cls, cd: r.cd, bm: r.bm, cov: r.cd != null && r.bm ? (r.cd / r.bm) * 100 : null }))
    .filter((r) => r.cov != null)
    .sort((a, b) => (a.cov ?? 0) - (b.cov ?? 0))[0];
  const wcChange = change(cur?.total, prevMonth?.total);

  const highlights = (
    <HighlightGrid isLoading={sSvc.isLoading && sMatrix.isLoading}>
      <Box data-kpi="IN-10" minW={0}>
        <HighlightCard label="Service Level" tone="sales" name="Network, All Branches" value={pct1(sv.level)} caption={`${full(sv.above)} Of ${full(sv.above + sv.below)} SKUs Above Threshold`} />
      </Box>
      <Box data-kpi="IN-06" minW={0}>
        <HighlightCard
          label="Stock-Out Risk"
          tone="bad"
          name={`${full(sv.below)} SKUs Below Threshold`}
          value={pct1(sv.risk)}
          caption={belowByClass[0] ? `Most In ${clsName(belowByClass[0].cls)}: ${full(belowByClass[0].below)} SKUs` : 'No SKU Below Its Threshold'}
        />
      </Box>
      <Box data-kpi="IN-11" minW={0}>
        <HighlightCard label="Lowest Service" tone="bad" name={lowest?.branch ?? DASH} value={pct1(lowest?.avg ?? null)} caption={`Average Of Its Classes · Target ${kpiThresholds.serviceLevel.green}%`} />
      </Box>
      <Box data-kpi="IN-12" minW={0}>
        <HighlightCard label="Lowest Cover" tone="target" name={lowCover ? clsName(lowCover.cls) : DASH} value={lowCover ? days(lowCover.cd) : DASH} caption={lowCover ? `${pct1(lowCover.cov)} Of Its ${days(lowCover.bm)} Benchmark` : 'No Class Benchmark'} />
      </Box>
      <Box data-kpi="IN-01 IN-02" minW={0}>
        <HighlightCard
          label="Working Capital"
          tone="sales"
          name="FG + WIP + RMPM, At Cost"
          value={pkr(cur?.total ?? null)}
          caption={`FG ${pkr(s.fgCost)}${wcChange != null ? ` · ${wcChange >= 0 ? '▲' : '▼'} ${pct1(Math.abs(wcChange))} vs Previous Month-End` : ''}`}
        />
      </Box>
    </HighlightGrid>
  );

  // Service heatmap: one row per branch, worst average first, so the problems sit on top.
  const worstFirst = [...sv.matrix].sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0));
  const byName = [...sv.matrix].sort((a, b) => a.branch.localeCompare(b.branch));
  const heatRows = worstFirst.map((m) => ({
    name: m.branch,
    cells: [
      ...m.cells.map((v) => ({ text: v == null ? DASH : pct1(v), color: ink(rag(v, 'serviceLevel')), bg: soft(rag(v, 'serviceLevel')) })),
      { text: m.avg == null ? DASH : pct1(m.avg), color: ink(rag(m.avg, 'serviceLevel')) },
    ],
  }));
  // Cover days by branch and class (IN-12), against each class's benchmark.
  const coverRows = INV_BRANCHES.map((b, bi) => ({
    name: b.label,
    cells: CLASSES.map((c) => {
      const v = invClasses.find((r) => r.cls === c)?.vals[bi];
      const bm = bmOf(c);
      const has = v != null && v > 0;
      const r = has && bm ? rag((v / bm) * 100, 'coverage') : null;
      return { text: has ? trunc(v) : DASH, color: r ? ink(r) : undefined, bg: soft(r) };
    }),
  }));
  const classHead = (cs: readonly string[]) => cs.map((c) => ({ key: c, label: <ClassBadge cls={c} /> }));

  return (
    <Flex direction="column" gap={3} h={fit ? '100%' : undefined} minH={0}>
      {highlights}

      <Grid
        templateColumns={{ base: '1fr', lg: 'repeat(12, minmax(0, 1fr))' }}
        templateRows={{ lg: 'repeat(2, minmax(0, 1fr))' }}
        gap={3}
        flex={1}
        minH={fit ? 0 : undefined}
      >
        {/* Row 1 — 1.0's Inventory Days, the full width. (1.0's Inventory Days Threshold card left this tab on 19 Nov 2026,
            user: the cover days are set and worked out in the control panel above; each figure here is still coloured
            against its class threshold.) */}
        <InventoryDaysCard classes={invClasses.filter((c) => showCls(c.cls))} thOf={thOf} state={sInv} onSku={(sku) => detail.open({ kind: 'sku', sku })} />

        {/* Row 2 — 1.0's Service Measure by Branch: a heatmap first; 1.0's lines and the 2.0 views beside it. */}
        <ChartCard
          dataKpi="IN-10 IN-11 IN-12"
          title="Service measure by branch"
          colSpan={{ base: 12, lg: 6 }}
          isLoading={sMatrix.isLoading}
          variant={svcView === 'heat' ? 'table' : svcView === 'line' ? 'line' : 'rows'}
          headerRight={
            <Segmented
              size="xs"
              ariaLabel="Service view"
              value={svcView}
              onChange={setSvcView}
              options={[
                { value: 'heat' as const, label: 'Heatmap' },
                { value: 'line' as const, label: 'Line' },
                { value: 'rank' as const, label: 'Ranking' },
                { value: 'cover' as const, label: 'Cover Days' },
              ]}
            />
          }
        >
          {CardState({ ...sMatrix, empty: !sv.matrix.length }) ??
            (svcView === 'heat' ? (
              <>
                <CardLegend
                  items={[
                    { label: `≥ ${kpiThresholds.serviceLevel.green}% of SKUs above threshold`, color: colors.good },
                    { label: `${kpiThresholds.serviceLevel.amber}–${kpiThresholds.serviceLevel.green}%`, color: colors.warn },
                    { label: `< ${kpiThresholds.serviceLevel.amber}%`, color: colors.bad },
                  ]}
                />
                <MatrixTable cols={[...classHead(RATED_CLASSES), { key: 'avg', label: 'Average' }]} rows={heatRows} onRow={openBranch} />
              </>
            ) : svcView === 'line' ? (
              <LineChart
                data={byName.map((m) => ({ branch: m.branch, ...Object.fromEntries(RATED_CLASSES.map((c, i) => [c, m.cells[i] ?? 0])) }))}
                xKey="branch"
                lines={RATED_CLASSES.filter(showCls).map((c) => ({ key: c, label: `SKU-${c}%`, color: CLASS_HEX[c] }))}
                labelFormatter={(v) => `${v.toFixed(1).replace(/[.]0$/, '')}%`}
                height="100%"
              />
            ) : svcView === 'rank' ? (
              <BarChart
                data={sv.matrix.map((m, i) => ({ branch: m.branch, avg: m.avg ?? 0, worst: i < 5 }))}
                xKey="branch"
                orientation="horizontal"
                // Worst first, as 1.0's ranking; the bottom five in the brand blue (red and green are for +/− bars only).
                rankAscending
                bars={[{ key: 'avg', label: 'Average of its classes', color: colors.borderStrong, cellColor: (e) => (e.worst ? colors.sales : colors.borderStrong) }]}
                referenceValue={kpiThresholds.serviceLevel.green}
                referenceLabel={`Target ${kpiThresholds.serviceLevel.green}%`}
                labelFormatter={(v) => pct1(v)}
                showLabels
                onBarClick={openBranch}
                height="100%"
              />
            ) : (
              <>
                <CardLegend
                  items={[
                    { label: '80–120% of class benchmark', color: colors.good },
                    { label: '60–150%', color: colors.warn },
                    { label: 'outside', color: colors.bad },
                  ]}
                />
                <MatrixTable cols={classHead(CLASSES)} rows={coverRows} onRow={openBranch} />
              </>
            ))}
        </ChartCard>

        {/* Row 2 — 1.0's Cover Days Threshold vs Actual: one row per class, the threshold as a tick. */}
        <ChartCard dataKpi="IN-15" title="Cover days vs threshold" colSpan={{ base: 12, lg: 3 }} isLoading={sTgt.isLoading} variant="rows">
          {CardState({ ...sTgt, empty: !tgt.length }) ?? (
            <CoverVsThreshold rows={tgt.filter((r) => showCls(r.classification)).map((r) => ({ cls: r.classification, actual: num(r.cover_days) ?? 0, th: num(r.cover_days_tgt) ?? 0 }))} onPick={openClass} />
          )}
        </ChartCard>

        {/* Row 2 — 1.0's SKUs vs Threshold: each class's SKUs split above / below. */}
        <ChartCard dataKpi="IN-16" title="SKUs vs threshold" colSpan={{ base: 12, lg: 3 }} isLoading={sSvc.isLoading} variant="rows">
          {CardState({ ...sSvc, empty: !sv.ab.length }) ?? (
            <SkuSplit rows={sv.ab.map((r) => ({ cls: r.classification, above: n0(r['No Of SKUs > Threshold']), below: n0(r['No Of SKUs < Threshold']) }))} onPick={openClass} />
          )}
        </ChartCard>
      </Grid>
    </Flex>
  );
}

/**
 * IN-15 in Sales Pulse 2.0's breakdown bars: each class's cover days against its threshold
 * (the tick), "threshold · %" on top in green at or above it, red below.
 */
function CoverVsThreshold({ rows, onPick }: { rows: { cls: string; actual: number; th: number }[]; onPick: (c: string) => void }) {
  return (
    <RowBars
      fmt={(v) => `${trunc(v)} d`}
      targetLabel="threshold"
      status={(pct) => (pct >= 100 ? colors.good : colors.bad)}
      legend={[
        { label: 'Cover days', color: colors.sales },
        { label: 'Threshold', color: colors.target, shape: 'tick' },
      ]}
      rows={rows.map((r) => ({ key: r.cls, name: clsName(r.cls), parts: [{ value: r.actual, color: colors.sales, label: 'Cover days' }], target: r.th }))}
      onPick={onPick}
    />
  );
}

/** IN-16 in Sales Pulse 2.0's breakdown bars: each class's SKUs above and below its threshold. */
function SkuSplit({ rows, onPick }: { rows: { cls: string; above: number; below: number }[]; onPick: (c: string) => void }) {
  return (
    <RowBars
      fmt={full}
      legend={[
        { label: 'Above threshold', color: colors.sales },
        { label: 'Below threshold', color: colors.prior },
      ]}
      rows={rows.map((r) => {
        const total = r.above + r.below;
        const share = total ? (r.below / total) * 100 : 0;
        return {
          key: r.cls,
          name: clsName(r.cls),
          note: (
            <>
              <Box as="span" color={ink(rag(share, 'stockoutRisk'))} fontWeight={700}>
                {pct1(share)} Below
              </Box>{' '}
              · {full(total)} SKUs
            </>
          ),
          parts: [
            { value: r.above, color: colors.sales, label: 'Above threshold' },
            { value: r.below, color: colors.prior, label: 'Below threshold' },
          ],
        };
      })}
      onPick={onPick}
    />
  );
}

/**
 * 1.0's Inventory Days, in Sales Pulse 2.0's table style: a class row (1.0: the average of its
 * SKUs at each branch) unfolds into its SKUs. Every figure is coloured against its class
 * threshold — green at or above, red below (1.0 coloured only the green) — so a short branch
 * stands out. The Total row is the average of classes A–N (Others stays out); the Total column,
 * pinned on the right, the row's average over the branches. Header, Total and names stay put.
 */
function InventoryDaysCard({
  classes,
  thOf,
  state,
  onSku,
}: {
  classes: ReturnType<typeof inventoryClassRows>;
  thOf: (c: string) => number | null;
  state: ReturnType<typeof status>;
  onSku: (sku: string) => void;
}) {
  // As Sales Pulse 2.0's grouped tables: one level open by default (each class with its SKUs),
  // 'Expand to' Class | SKU in the header; a class row still opens or closes on its own.
  const opened = useOpenedRow();
  const [depth, setDepth] = useState(1);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // While searching, only the matching SKUs, every class open.
  const shown = q ? classes.map((c) => ({ ...c, skus: c.skus.filter((k) => k.sku.toLowerCase().includes(q)) })).filter((c) => c.skus.length) : classes;
  const isOpenCls = (c: string) => !!q || (depth === 1) !== flipped.has(c);
  // Every SKU, ungrouped, as Sales Pulse's Export.
  const exportRows = () => {
    const ws = XLSX.utils.json_to_sheet(
      classes.flatMap((c) => c.skus.map((k) => ({ Class: clsName(c.cls), SKU: k.sku, ...Object.fromEntries(INV_BRANCHES.map((b, i) => [b.label, Math.trunc(k.vals[i])])), Total: Math.trunc(avg(k.vals)) }))),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Days');
    XLSX.writeFile(wb, 'Inventory Days.xlsx');
  };
  const n = INV_BRANCHES.length;
  const avg = (vals: number[]) => vals.reduce((t, v) => t + v, 0) / n;
  const abc = classes.filter((c) => c.cls !== 'Others');
  const totalVals = INV_BRANCHES.map((_, i) => (abc.length ? abc.reduce((t, c) => t + c.vals[i], 0) / abc.length : 0));
  const toggle = (c: string) =>
    setFlipped((s0) => {
      const s1 = new Set(s0);
      if (s1.has(c)) s1.delete(c);
      else s1.add(c);
      return s1;
    });
  // At or above the class threshold: fine (green); below: short (red); no threshold (Other): plain.
  const tone = (cls: string, v: number) => {
    const th = thOf(cls);
    return th == null ? colors.bodyText : v >= th ? colors.good : colors.bad;
  };

  const cell = { px: '8px', py: '7px', fontSize: '13px', textAlign: 'center' as const, fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid', borderColor: colors.sunkBg, whiteSpace: 'nowrap' as const };
  const first = { position: 'sticky' as const, left: 0, zIndex: 1, textAlign: 'left' as const, minW: '210px', maxW: '240px', pl: 3 };
  const last = { position: 'sticky' as const, right: 0, zIndex: 1, borderLeft: '1px solid', borderLeftColor: colors.border, fontWeight: 700 };
  const th = { position: 'sticky' as const, top: 0, zIndex: 2, bg: colors.pageBg, px: '8px', py: '7px', fontSize: '12px', fontWeight: 700, color: colors.darkText, borderBottom: '1px solid', borderColor: colors.border, whiteSpace: 'nowrap' as const, textAlign: 'center' as const };
  // An open class row stays pinned under the header and Total while its SKUs scroll (Sales Pulse 2.0).
  const pin = { position: 'sticky' as const, top: '66px' };
  const tot = { position: 'sticky' as const, top: '33px', zIndex: 2, bg: colors.tableTotalStart, fontWeight: 700, color: colors.darkText, borderColor: colors.border };

  return (
    <ChartCard
      dataKpi="IN-17"
      title="Inventory days"
      colSpan={12}
      isLoading={state.isLoading}
      variant="table"
      headerRight={
        <Flex align="center" gap={2} flexShrink={0}>
          <Text fontSize="13px" color={colors.mutedText} whiteSpace="nowrap">
            Expand To
          </Text>
          <Segmented
            size="xs"
            ariaLabel="Expand to level"
            // (kept whole: the Find box beside it has a fixed width)
            value={String(depth)}
            onChange={(v) => {
              setDepth(Number(v));
              setFlipped(new Set());
            }}
            options={[
              { value: '0', label: 'Class' },
              { value: '1', label: 'SKU' },
            ]}
          />
          <Input size="sm" h="30px" placeholder="Find SKU…" value={query} onChange={(e) => setQuery(e.target.value)} w="170px" flexShrink={0} borderRadius="4px" fontSize="13px" />
          <Button size="sm" h="30px" bg={colors.sunkBg} color={colors.darkText} _hover={{ bg: colors.border }} borderRadius="4px" onClick={exportRows} title="Export every SKU, ungrouped">
            <FiDownload /> Export
          </Button>
        </Flex>
      }
    >
      <CardLegend
        items={[
          { label: 'At or above the class threshold', color: colors.good },
          { label: 'Below it (0 = no stock)', color: colors.bad },
        ]}
      />
      {CardState({ ...state, empty: !classes.length }) ?? (
        <Box h="100%" overflow="auto" border="1px solid" borderColor={colors.border} borderRadius="4px">
          <Box as="table" w="100%" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead className="sp-th">
              <tr>
                <Box as="th" {...th} {...first} zIndex={3}>
                  Class
                </Box>
                {INV_BRANCHES.map((b) => (
                  <Box as="th" key={b.key} {...th}>
                    {b.label}
                  </Box>
                ))}
                <Box as="th" {...th} {...last} zIndex={3}>
                  Total
                </Box>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Box as="td" {...cell} {...first} {...tot} zIndex={3}>
                  Total
                </Box>
                {totalVals.map((v, i) => (
                  <Box as="td" key={i} {...cell} {...tot}>
                    {trunc(v)}
                  </Box>
                ))}
                <Box as="td" {...cell} {...last} {...tot} zIndex={3}>
                  {trunc(avg(totalVals))}
                </Box>
              </tr>
              {shown.map((c) => {
                const isOpen = isOpenCls(c.cls);
                return (
                  <Fragment key={c.cls}>
                    <Box as="tr" cursor="pointer" onClick={() => toggle(c.cls)} _hover={{ '& td': { bg: colors.hoverBg } }}>
                      <Box as="td" {...cell} {...first} {...pin} zIndex={2} bg={colors.pageBg} fontWeight={600} color={colors.darkText}>
                        <Flex align="center" gap={2}>
                          {isOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                          <ClassBadge cls={c.cls} />
                          <Text as="span">{clsName(c.cls)}</Text>
                          <Text as="span" fontSize="12px" color={colors.mutedText} fontWeight={400}>
                            {c.skus.length} SKUs
                          </Text>
                        </Flex>
                      </Box>
                      {c.vals.map((v, i) => (
                        <Box as="td" key={i} {...cell} {...pin} bg={colors.pageBg} fontWeight={700} color={tone(c.cls, v)}>
                          {trunc(v)}
                        </Box>
                      ))}
                      <Box as="td" {...cell} {...last} {...pin} zIndex={2} bg={colors.pageBg} color={tone(c.cls, avg(c.vals))}>
                        {trunc(avg(c.vals))}
                      </Box>
                    </Box>
                    {isOpen &&
                      [...c.skus]
                        .sort((a, b) => a.sku.localeCompare(b.sku))
                        .map((k, ki) => (
                          // An SKU name can repeat within a class (one row per item code): keyed by position too.
                          <Box
                            as="tr"
                            key={`${k.sku}-${ki}`}
                            cursor="pointer"
                            onClick={() => opened.open(`${c.cls}|${k.sku}`, () => onSku(k.sku))}
                            _hover={{ '& td': { bg: colors.hoverBg } }}
                            css={opened.isActive(`${c.cls}|${k.sku}`) ? { '& td': { background: ACTIVE_ROW.bg }, '& td:first-of-type': { boxShadow: ACTIVE_ROW.boxShadow, fontWeight: 600 } } : undefined}
                            aria-current={opened.isActive(`${c.cls}|${k.sku}`) || undefined}
                          >
                            <Box as="td" {...cell} {...first} bg={colors.cardBg} pl={9} color={colors.brand}>
                              <Text as="span" truncate display="block" title={k.sku}>
                                {k.sku}
                              </Text>
                            </Box>
                            {k.vals.map((v, i) => (
                              <Box as="td" key={i} {...cell} bg={colors.cardBg} color={tone(c.cls, v)} fontWeight={500}>
                                {trunc(v)}
                              </Box>
                            ))}
                            <Box as="td" {...cell} {...last} bg={colors.cardBg} color={tone(c.cls, avg(k.vals))}>
                              {trunc(avg(k.vals))}
                            </Box>
                          </Box>
                        ))}
                  </Fragment>
                );
              })}
            </tbody>
          </Box>
        </Box>
      )}
    </ChartCard>
  );
}
