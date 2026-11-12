// Tab 5: Distribution & Data Health (PRD v2 section 4.5, wireframe 5.2).
// Can we see stock at our distributors, and can executives trust the numbers?

import { Box, Flex, Grid, Text } from '@chakra-ui/react';
import { useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/v2/components/chart-card';
import { DataTable } from '@/v2/components/data-table';
import { Segmented } from '@/v2/components/segmented';
import { MultiSelect } from '@/v2/components/select/MultiSelect';
import { ExecTile } from '@/v2/components/exec/ExecTile';
import { CardGrid, CardState, ChipBar, OperationalDetail, TileRow, ViewDetails, Zone } from '@/v2/components/exec/Panels';
import { axis, grid, tooltipStyle } from '@/v2/components/exec/charts';
import { RagBadge, RAG_META } from '@/v2/components/exec/Rag';
import { InfoTip } from '@/v2/components/overlay';
import { colors } from '@/v2/constants/theme';
import { helpFor } from '@/v2/constants/help';
import { n0, type RdStatusRow } from '@/v2/api/types';
import type { DashboardData } from '@/v2/features/data';
import { distribution, status, trust } from '@/v2/features/derive';
import { chronicNonReporters, rdAgeBuckets, rdComplianceByBranch, uploaded } from '@/v2/features/kpis';
import { rag } from '@/v2/features/kpiThresholds';
import { useStore } from '@/v2/features/store';
import { DASH, full, money, pct0, pct1, pkr, units } from '@/v2/features/format';

type UploadFilter = 'all' | 'uploaded' | 'not';

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : DASH;

function TrustPanel({ t, isLoading, locked }: { t: ReturnType<typeof trust>; isLoading: boolean; locked: boolean }) {
  const { shows } = useStore();
  const fRag = rag(t.freshness, 'freshnessDays');
  const uRag = rag(t.unclassified, 'unclassifiedPct');
  const versions = [...new Set(t.bench.map((b) => b.effective_date).filter(Boolean))];
  const Item = ({ id, label, children }: { id: string; label: string; children: ReactNode }) => (
    <Box py="6px" borderBottom="1px solid" borderColor={colors.border} _last={{ borderBottom: 'none' }}>
      <Flex align="center" gap="6px" mb="2px">
        <Text fontSize="12px" color={colors.mutedText}>
          {label}
        </Text>
        <Text fontSize="10.5px" color={colors.mutedText}>
          {id}
        </Text>
        <Box ml="auto">{helpFor(id) && <InfoTip help={helpFor(id)} size={13} />}</Box>
      </Flex>
      {children}
    </Box>
  );
  // 2.0-only: hidden in "1.0 only" mode (FR-EXEC-024).
  if (!shows('DH-07 DH-08 DH-09 DH-10')) return null;
  return (
    <Box data-kpi="DH-07 DH-08 DH-09 DH-10" scrollMarginTop="140px" bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderTop={`3px solid ${colors.brand}`} borderRadius="4px" px={4} py="8px" minW={0}>
      <Text fontSize="13px" fontWeight={700} color={colors.darkText} mb="2px">
        Data trust
      </Text>
      {locked ? (
        <Text fontSize="12.5px" color={colors.mutedText}>
          Needs Summary access
        </Text>
      ) : isLoading ? (
        <Text fontSize="12.5px" color={colors.mutedText}>
          Loading…
        </Text>
      ) : (
        <>
          <Item id="DH-07" label="Data freshness">
            <Flex align="center" gap="8px">
              <Text fontSize="14px" fontWeight={700} color={colors.darkText}>
                {t.freshness == null ? DASH : `${t.freshness} day${t.freshness === 1 ? '' : 's'} old`}
              </Text>
              <Text fontSize="12px" color={colors.mutedText}>
                stock as of {fmtDate(t.closing)}
              </Text>
              <Box ml="auto">
                <RagBadge rag={fRag} size="sm" />
              </Box>
            </Flex>
          </Item>
          <Item id="DH-08" label="Plan data loaded">
            <Flex direction="column" gap="2px">
              {t.checks.map((c) => (
                <Flex key={c.label} align="center" gap="6px" fontSize="12.5px" color={c.ok ? colors.good : colors.bad} fontWeight={600}>
                  <Text as="span" aria-hidden>
                    {c.ok ? '✓' : '✕'}
                  </Text>
                  <Text as="span" color={colors.bodyText} fontWeight={500}>
                    {c.label}
                  </Text>
                  <Text as="span" ml="auto" fontSize="11.5px">
                    {c.ok ? 'Loaded' : 'Missing'}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Item>
          <Item id="DH-09" label="Unclassified sales share">
            <Flex align="center" gap="8px">
              <Text fontSize="14px" fontWeight={700} color={colors.darkText}>
                {pct1(t.unclassified)}
              </Text>
              <Box ml="auto">
                <RagBadge rag={uRag} size="sm" />
              </Box>
            </Flex>
          </Item>
          <Item id="DH-10" label="Benchmark version in force">
            <Text fontSize="12.5px" color={colors.bodyText}>
              {versions.length === 0
                ? DASH
                : versions.length === 1
                  ? `Effective from ${fmtDate(versions[0])} (all classes)`
                  : t.bench.map((b) => `${b.classification}: ${fmtDate(b.effective_date)}`).join(' · ')}
            </Text>
          </Item>
        </>
      )}
    </Box>
  );
}

const AGE_COLOR = (min: number) => (min <= 1 ? colors.good : min <= 3 ? colors.warn : colors.bad);

import { useDetail } from '@/v2/features/detail';

export function DistributionPage({ data }: { data: DashboardData }) {
  const d = data.tabs.distribution;
  const st = useStore();
  const detail = useDetail();
  const chip = st.chips.distribution;
  const rd = distribution(d);
  const t = trust(d);
  const sRd = status(d, 'rd');
  const sRdCmp = status(d, 'rd', 'rdCmp');
  const sTrust = status(d, 'closing', 'fam', 'fay', 'bench', 'sales');

  const chipRows = chip?.key === 'branch' ? rd.rows.filter((r) => (r.branch_desc ?? DASH) === chip.value) : rd.rows;
  const ages = rdAgeBuckets(chipRows);
  const byBranch = rdComplianceByBranch(rd.rows);
  const chronic = chronicNonReporters(chipRows).slice(0, 10);
  const empty = !sRd.isLoading && !sRd.locked && !sRd.error && rd.rows.length === 0;
  const complianceDelta = rd.compliance != null && rd.cmp.compliance != null ? rd.compliance - rd.cmp.compliance : null;

  // ── 1.0 RD filters (FR-RD-002), applied in the browser; all must match ──
  const [branchCodes, setBranchCodes] = useState<string[]>([]);
  const [distributors, setDistributors] = useState<string[]>([]);
  const [upload, setUpload] = useState<UploadFilter>('all');
  const branchOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rd.rows) m.set(String(r.branch_code ?? ''), r.branch_desc ?? DASH);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([v, l]) => ({ value: v, label: `${v} · ${l}` }));
  }, [rd.rows]);
  const distOptions = useMemo(
    () =>
      rd.rows
        .filter((r) => !branchCodes.length || branchCodes.includes(String(r.branch_code ?? '')))
        .map((r) => ({ value: String(r.ibl_distributor_code), label: `${r.ibl_distributor_code} · ${r.distributor_desc ?? DASH}` })),
    [rd.rows, branchCodes],
  );
  const onBranches = (v: string[]) => {
    setBranchCodes(v);
    // Choosing branch codes drops distributors outside them (FR-FILT-008).
    if (v.length) {
      const allowed = new Set(rd.rows.filter((r) => v.includes(String(r.branch_code ?? ''))).map((r) => String(r.ibl_distributor_code)));
      setDistributors((cur) => cur.filter((x) => allowed.has(x)));
    }
  };
  const tableRows = chipRows.filter(
    (r: RdStatusRow) =>
      (!branchCodes.length || branchCodes.includes(String(r.branch_code ?? ''))) &&
      (!distributors.length || distributors.includes(String(r.ibl_distributor_code))) &&
      (upload === 'all' || (upload === 'uploaded' ? uploaded(r) : !uploaded(r))),
  );

  return (
    <Box>
      <ChipBar tab="distribution" />

      <Zone label="Verdict">
        <Grid gap={3} templateColumns={{ base: '1fr', md: 'repeat(2, minmax(0,1fr))', xl: 'repeat(3, minmax(0,1fr)) 2fr' }} mb={3}>
          <ExecTile
            id="DH-01"
            label="RD Reporting Compliance"
            value={pct1(rd.compliance)}
            rag={rag(rd.compliance, 'rdCompliance')}
            band="rdCompliance"
            caption={`${rd.reporting} of ${rd.count} RDs reported today`}
            delta={{ value: complianceDelta, unit: 'pts', label: 'vs previous day' }}
            {...sRdCmp}
          />
          <ExecTile id="DH-02" label="Stock Reported Today" value={pkr(rd.reportedToday)} caption="Value of stock RDs reported today" {...sRd} />
          <ExecTile
            id="DH-03"
            label="Stale Stock Value"
            value={pkr(rd.staleValue)}
            rag={rag(rd.staleValuePct, 'staleValuePct')}
            band="staleValuePct"
            caption={`${pct1(rd.staleValuePct)} of stock known only from older reports`}
            delta={{ value: rd.staleValue != null && rd.cmp.staleValue ? ((rd.staleValue - rd.cmp.staleValue) / rd.cmp.staleValue) * 100 : null, label: 'vs previous day', upIsGood: false }}
            {...sRdCmp}
          />
          <TrustPanel t={t} isLoading={sTrust.isLoading} locked={!!sTrust.locked} />
        </Grid>
        <TileRow max={3}>
          <ExecTile id="DH-11" label="Current Stock in Hand" value={units(rd.current.qty)} valueSuffix={pkr(rd.current.value)} caption={`${pct1(rd.current.share)} of total`} {...sRd} />
          <ExecTile id="DH-12" label="Previous Stock in Hand" value={units(rd.previous.qty)} valueSuffix={pkr(rd.previous.value)} caption={`${pct1(rd.previous.share)} of total`} {...sRd} />
          <ExecTile id="DH-13" label="Total Stock in Hand" value={units(rd.total.qty)} valueSuffix={pkr(rd.total.value)} caption="Includes earlier reports" {...sRd} />
        </TileRow>
      </Zone>

      <Zone label="Why">
        <CardGrid>
          <ChartCard title="RD Reporting Age" subtitle="Distributors by days since their last stock report" colSpan={{ base: 1, lg: 5 }} height="260px" isLoading={sRd.isLoading} help={helpFor('DH-04')} dataKpi="DH-04">
            {CardState({ ...sRd, empty }) ?? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ages} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid {...grid} vertical={false} />
                  <XAxis dataKey="bucket" {...axis} />
                  <YAxis allowDecimals={false} {...axis} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v} RDs`, 'Distributors']} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {ages.map((a) => (
                      <Cell key={a.bucket} fill={AGE_COLOR(a.min)} />
                    ))}
                    <LabelList dataKey="count" position="top" fontSize={11} fill={colors.bodyText} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard
            title="Compliance by Branch"
            subtitle="Share of each branch's RDs that reported today · click a bar to filter this tab"
            colSpan={{ base: 1, lg: 7 }}
            height={`${Math.max(260, byBranch.length * 24 + 40)}px`}
            isLoading={sRd.isLoading}
            help={helpFor('DH-05')}
            dataKpi="DH-05"
          >
            {CardState({ ...sRd, empty }) ?? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBranch} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                  <CartesianGrid {...grid} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow {...axis} unit="%" />
                  <YAxis type="category" dataKey="branch" width={110} {...axis} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [pct0(Number(v)), 'Reported today']} />
                  <ReferenceLine x={90} stroke={colors.target} strokeDasharray="4 3" label={{ value: 'Target 90%', fontSize: 10, fill: colors.target, position: 'top' }} />
                  <Bar dataKey="pct" radius={[0, 3, 3, 0]} cursor="pointer" onClick={(e) => { const b = (e as unknown as { branch?: string; payload?: { branch?: string } }); const name = b.branch ?? b.payload?.branch; if (name) st.setChip('distribution', { key: 'branch', value: name }); }}>
                    {byBranch.map((b) => {
                      const r = rag(b.pct, 'rdCompliance');
                      return <Cell key={b.branch} fill={r ? RAG_META[r].color : colors.sales} opacity={chip?.key === 'branch' && chip.value !== b.branch ? 0.35 : 1} />;
                    })}
                    <LabelList dataKey="pct" position="right" fontSize={11} fill={colors.bodyText} formatter={(v) => pct0(Number(v))} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </CardGrid>
      </Zone>

      <Zone label="Where">
        <CardGrid>
          <ChartCard
            title="Chronic Non-Reporters"
            subtitle="RDs silent for more than 7 days, largest last-reported stock first"
            colSpan={{ base: 1, lg: 12 }}
            isLoading={sRd.isLoading}
            help={helpFor('DH-06')}
            headerRight={<ViewDetails detailId="rd-list" />}
            expandable={false}
            dataKpi="DH-06"
          >
            {CardState({ ...sRd, empty }) ??
              (chronic.length === 0 ? (
                <Text fontSize="13px" color={colors.good} py={4} textAlign="center" fontWeight={600}>
                  ✓ No distributor has been silent for more than 7 days
                </Text>
              ) : (
                <DataTable
                  headerGradient={colors.tableHeaderBg}
                  headers={['Distributor', 'Branch', 'Days silent', 'Last stock value', 'Last report date']}
                  rows={chronic.map((r) => ({
                    onClick: () => detail.open({ kind: 'rd', code: String(r.ibl_distributor_code) }),
                    cells: [r.distributor_desc ?? DASH, r.branch_desc ?? DASH, String(n0(r.day_diff)), money(n0(r.last_stock_value)), fmtDate(r.last_stock_date)],
                    cellColors: [undefined, undefined, colors.bad, undefined, undefined],
                  }))}
                  pageSize={10}
                  autoTotal={false}
                  searchable={false}
                />
              ))}
          </ChartCard>
        </CardGrid>
      </Zone>

      <Zone label="Operational detail">
        <OperationalDetail id="rd-list" kpi="DH-14" title="RD Distributor List" subtitle="1.0 RD Data Status table, with its filters">
          {CardState({ ...sRd, empty }) ?? (
            <>
              <Flex gap="10px" wrap="wrap" align="flex-end" px={2} py={2}>
                <Box minW="220px">
                  <MultiSelect label="Branch Code / Branch" value={branchCodes} onChange={onBranches} options={branchOptions} placeholder="All branches" />
                </Box>
                <Box minW="260px">
                  <MultiSelect label="Distributor" value={distributors} onChange={setDistributors} options={distOptions} placeholder="All distributors" />
                </Box>
                <Flex direction="column" gap="2px">
                  <Text fontSize="11px" color={colors.mutedText}>
                    Upload Count
                  </Text>
                  <Segmented<UploadFilter>
                    size="xs"
                    ariaLabel="Upload count"
                    value={upload}
                    onChange={setUpload}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'uploaded', label: 'Uploaded' },
                      { value: 'not', label: 'Not uploaded' },
                    ]}
                  />
                </Flex>
                <Text ml="auto" fontSize="12px" color={colors.mutedText}>
                  {tableRows.length} of {rd.rows.length} RDs
                </Text>
              </Flex>
              <DataTable
                headerGradient={colors.tableHeaderBg}
                headers={['RD Code', 'Distributor', 'Branch Code', 'Branch', 'Current Units', 'Current Value', 'Previous Date', 'Previous Units', 'Previous Value', 'Days Difference', 'Upload Status']}
                rows={tableRows.map((r) => {
                  const dRag = rag(n0(r.day_diff), 'staleRdDays');
                  return {
                    onClick: () => detail.open({ kind: 'rd', code: String(r.ibl_distributor_code) }),
                    cells: [
                      String(r.ibl_distributor_code ?? DASH),
                      r.distributor_desc ?? DASH,
                      String(r.branch_code ?? DASH),
                      r.branch_desc ?? DASH,
                      full(n0(r.stock_qty)),
                      full(n0(r.stock_value)),
                      fmtDate(r.last_stock_date),
                      full(n0(r.last_stock_qty)),
                      full(n0(r.last_stock_value)),
                      String(n0(r.day_diff)),
                      uploaded(r) ? '✓ Uploaded' : '✕ Not uploaded',
                    ],
                    cellColors: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, dRag ? RAG_META[dRag].color : undefined, uploaded(r) ? colors.good : colors.bad],
                  };
                })}
                pageSize={25}
              />
            </>
          )}
        </OperationalDetail>
      </Zone>
    </Box>
  );
}
