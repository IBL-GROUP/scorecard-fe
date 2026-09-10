import { Box, Flex, Grid, Skeleton, Text } from '@chakra-ui/react';
import { FiArchive, FiLayers, FiPackage } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { DataTable, DataTableRow } from '@/components/data-table';
import { gradients } from '@/constants/theme';

// ─── Column / box labels ────────────────────────────────────────────────────
// Display order (name before code, and the previous-stock date leading its
// qty/value pair). Source columns, in the same order: distributor_desc,
// ibl_distributor_code, branch_desc, branch_code, stock_qty, stock_value,
// last_stock_date, last_stock_qty, last_stock_value, day_diff. Rename or
// reorder here — the table body and the export follow this list.
const COLUMNS = [
  'RD Name',
  'RD Code',
  'Branch Name',
  'Branch Code',
  'Current Stock in Hand Units',
  'Current Stock in Hand Value',
  'Previous Stock Date',
  'Previous Stock Units',
  'Previous Stock Value',
  'Days Difference',
] as const;

const COL_ALIGNS: ('left' | 'right' | 'center')[] = [
  'left',
  'left',
  'left',
  'left',
  'right',
  'right',
  'center',
  'right',
  'right',
  'right',
];

export interface RegionalDistributorRow {
  iblDistributorCode: string;
  distributorDesc: string;
  branchCode: string;
  branchDesc: string;
  stockQty: number | string;
  stockValue: number | string;
  lastStockQty: number | string;
  lastStockValue: number | string;
  lastStockDate: string | null;
  dayDiff: number | string;
}

// Card palette — accent only carries the icon tile and the badge, so the three
// cards stay a matched set of plain white panels.
const CURRENT_ACCENT = '#2563eb';
const CURRENT_TINT = '#eff6ff';
const PREVIOUS_ACCENT = '#0891b2';
const PREVIOUS_TINT = '#ecfeff';
const TOTAL_ACCENT = '#ea580c';
const TOTAL_TINT = '#fff7ed';

// Table figures: the live side reads green, the carried-over side red.
const CURRENT_STOCK_COLOR = '#067242';
const PREVIOUS_STOCK_COLOR = '#dc2626';

const pct = (part: number, whole: number) =>
  whole > 0 ? (part / whole) * 100 : 0;

interface StatCardProps {
  label: string;
  /** The headline figure — units. */
  value: string;
  /** The same stock valued, shown on its own line under the units. */
  stockValue?: string;
  caption: string;
  badge: string;
  accent: string;
  tint: string;
  icon: IconType;
  isLoading?: boolean;
}

function StatCard({
  label,
  value,
  stockValue,
  caption,
  badge,
  accent,
  tint,
  icon: Icon,
  isLoading = false,
}: StatCardProps) {
  return (
    <Box
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="gray.200"
      boxShadow="sm"
      h="full"
      px={4}
      py={3.5}
      transition="box-shadow 0.2s"
      _hover={{ boxShadow: 'md' }}
    >
      <Flex direction="column" gap={3}>
        <Flex align="center" gap={2.5}>
          <Flex
            w="34px"
            h="34px"
            borderRadius="10px"
            bg={tint}
            color={accent}
            align="center"
            justify="center"
            fontSize="17px"
            flexShrink={0}
          >
            <Icon />
          </Flex>
          <Text
            fontSize="11px"
            fontWeight="700"
            color="gray.500"
            textTransform="uppercase"
            letterSpacing="0.06em"
            lineHeight="1.3"
          >
            {label}
          </Text>
        </Flex>

        <Flex align="flex-end" justify="space-between" gap={3}>
          {isLoading ? (
            <Skeleton height="30px" width="55%" borderRadius="sm" />
          ) : (
            // Units, then the same stock valued beside them: "3,786,109 |
            // Value: 664,654,871". Wraps under the units on a narrow card.
            <Flex align="baseline" gap={3} minW={0} wrap="wrap">
              <Text
                fontSize="2rem"
                fontWeight="800"
                color="gray.800"
                lineHeight="1"
                letterSpacing="-0.02em"
              >
                {value}
              </Text>
              {stockValue !== undefined && (
                <>
                  <Box w="1px" h="22px" bg="gray.300" alignSelf="center" />
                  <Text
                    fontSize="15px"
                    fontWeight="600"
                    color="gray.500"
                    whiteSpace="nowrap"
                  >
                    Value:{' '}
                    <Box as="span" fontWeight="800" color="gray.800">
                      {stockValue}
                    </Box>
                  </Text>
                </>
              )}
            </Flex>
          )}
          {!isLoading && (
            <Box px={2} py="2px" borderRadius="full" bg={tint} flexShrink={0}>
              <Text fontSize="11px" fontWeight="700" color={accent}>
                {badge}
              </Text>
            </Box>
          )}
        </Flex>

        <Text fontSize="11px" fontWeight="600" color="gray.500">
          {caption}
        </Text>
      </Flex>
    </Box>
  );
}

const fmt = (v: number | string | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

// Whole rupees for the card totals: at hundreds of millions the paisa are noise.
const fmtWhole = (v: number): string =>
  v.toLocaleString('en-US', { maximumFractionDigits: 0 });

// Only one of the two stock columns is populated per row, so a zero is "not
// applicable here" rather than a real quantity — show a dash instead.
const fmtOptional = (v: number | string | null | undefined): string => {
  const n = Number(v);
  if (!Number.isNaN(n) && n === 0) return '—';
  return fmt(v);
};

// Age of the carried-over upload. Green when the RD reported for this period
// (nothing gone by), amber once it starts ageing, red past a week.
const daysGoneColor = (days: number): string | undefined => {
  if (days <= 0) return undefined;
  if (days <= 7) return '#b45309';
  return '#dc2626';
};

export interface RegionalDistributorTabProps {
  rows?: RegionalDistributorRow[];
  isLoading?: boolean;
}

export function RegionalDistributorTab({
  rows = [],
  isLoading = false,
}: RegionalDistributorTabProps) {
  const sum = (key: keyof RegionalDistributorRow) =>
    rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

  const totalCurrent = sum('stockQty');
  const totalPrevious = sum('lastStockQty');
  const grandTotal = totalCurrent + totalPrevious;

  // The same three totals valued — the table's two Value columns, summed.
  const totalCurrentValue = sum('stockValue');
  const totalPreviousValue = sum('lastStockValue');
  const grandTotalValue = totalCurrentValue + totalPreviousValue;

  // An RD sits on exactly one side: it uploaded for this period, or it is
  // still carrying its previous figure.
  const reportedCount = rows.filter(
    (r) => (Number(r.stockQty) || 0) > 0
  ).length;
  const carriedCount = rows.filter(
    (r) => (Number(r.lastStockQty) || 0) > 0
  ).length;

  const currentShare = pct(totalCurrent, grandTotal);
  const previousShare = pct(totalPrevious, grandTotal);

  return (
    <Flex direction="column" gap={4}>
      {/* ── Three summary boxes ── */}
      <Grid
        templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
        gap={4}
        alignItems="stretch"
      >
        <StatCard
          label="Total Current Stock in Hand"
          value={fmt(totalCurrent)}
          stockValue={fmtWhole(totalCurrentValue)}
          caption={`${reportedCount} RD${reportedCount === 1 ? '' : 's'} uploaded this period`}
          badge={`${currentShare.toFixed(1)}% of total`}
          accent={CURRENT_ACCENT}
          tint={CURRENT_TINT}
          icon={FiPackage}
          isLoading={isLoading}
        />
        <StatCard
          label="Total Previous Stock in Hand"
          value={fmt(totalPrevious)}
          stockValue={fmtWhole(totalPreviousValue)}
          caption={`${carriedCount} RD${carriedCount === 1 ? '' : 's'} carrying an older upload`}
          badge={`${previousShare.toFixed(1)}% of total`}
          accent={PREVIOUS_ACCENT}
          tint={PREVIOUS_TINT}
          icon={FiArchive}
          isLoading={isLoading}
        />
        <StatCard
          label="Total Stock in Hand"
          value={fmt(grandTotal)}
          stockValue={fmtWhole(grandTotalValue)}
          caption="Current + previous stock in hand"
          badge={`${rows.length} distributor${rows.length === 1 ? '' : 's'}`}
          accent={TOTAL_ACCENT}
          tint={TOTAL_TINT}
          icon={FiLayers}
          isLoading={isLoading}
        />
      </Grid>

      {/* ── Detail table ── */}
      <DataTable
        exportName="RD Data Status"
        headerGradient={gradients.tableBlue}
        headers={[...COLUMNS]}
        colAligns={COL_ALIGNS}
        isLoading={isLoading}
        pageSize={12}
        maxHeight="calc(100vh - 420px)"
      >
        {rows.map((row, i) => {
          const daysGone = Number(row.dayDiff) || 0;
          const hasCurrent = (Number(row.stockQty) || 0) > 0;
          const hasPrevious = (Number(row.lastStockQty) || 0) > 0;
          // Colour only the side that actually holds a figure — the other side
          // is a dash, which stays neutral.
          const current = hasCurrent ? CURRENT_STOCK_COLOR : undefined;
          const previous = hasPrevious ? PREVIOUS_STOCK_COLOR : undefined;
          return (
            <DataTableRow
              key={i}
              cells={[
                String(row.distributorDesc || '—'),
                String(row.iblDistributorCode ?? '—'),
                String(row.branchDesc || '—'),
                String(row.branchCode ?? '—'),
                fmtOptional(row.stockQty),
                fmtOptional(row.stockValue),
                row.lastStockDate || '—',
                fmtOptional(row.lastStockQty),
                fmtOptional(row.lastStockValue),
                daysGone > 0 ? fmt(daysGone) : '—',
              ]}
              cellColors={[
                undefined,
                undefined,
                undefined,
                undefined,
                current,
                current,
                undefined,
                previous,
                previous,
                daysGoneColor(daysGone),
              ]}
              cellWeights={[
                undefined,
                undefined,
                undefined,
                undefined,
                hasCurrent ? '600' : undefined,
                hasCurrent ? '600' : undefined,
                undefined,
                hasPrevious ? '600' : undefined,
                hasPrevious ? '600' : undefined,
                daysGone > 0 ? '700' : undefined,
              ]}
            />
          );
        })}
      </DataTable>
    </Flex>
  );
}
