import { useMemo, useState } from 'react';
import { useGetSalesSummary } from '@/api/salesSummary';
import {
  useGetCoverDays,
  useGetCoverDaysTotal,
  useGetCoverDaysClosingInv,
  useGetCoverDaysBenchmarks,
  type CoverDaysBenchmarkRow,
} from '@/api/coverDays';
import {
  useGetForecastAccuracyMonthly,
  useGetForecastAccuracyMonthlyDaysGone,
} from '@/api/forecastAccuracyMonthly';
import { useGetForecastAccuracyYearly } from '@/api/forecastAccuracyYearly';
import { useGetInventoryDays } from '@/api/inventoryDays';
import { useGetAboveBelowThreshold } from '@/api/aboveBelowThreshold';
import { useGetForecastAccuracyCategoryMonthly } from '@/api/forcastAccuracyCategoryMonthly';
import { useGetForecastAccuracyCategoryYearly } from '@/api/forcastAccuracyCategoryYearly';
import { useGetIblVsTscl } from '@/api/iblVsTscl';
import { useGetDispatchVsOrder } from '@/api/dispatchVsOrder';
import {
  isQuerySettled,
  useReleaseNextTab,
  useTabLoadQueue,
  type QueryProgress,
  type TabSettledMap,
} from '@/features/salesDashboard/tabs';
import type { MainTab } from '@/features/salesDashboard/salesDashboardSlice';
import { useAppSelector } from '@/app/hooks';
import { ChartCard } from '@/components/chart-card';
import { BarChart, GaugeChart, LineChart } from '@/components/charts';
import { DataTable, DataTableRow } from '@/components/data-table';
import { MultiSelect } from '@/components/select/MultiSelect';
import { RmpmDetails } from '@/dialog/rmpm-details';
import { WipDetails } from '@/dialog/wip-details';
import { FilterBar } from '@/components/filter-bar';
import { HeaderActions } from '@/components/header-actions';
import { UserMenu } from '@/components/user-menu';
import { clsColors, colors, gradients } from '@/constants/theme';
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  Separator,
  Skeleton,
  Text,
} from '@chakra-ui/react';
import { SalesSummaryCard } from '@/components/sales-summary/SalesSummaryCard';
import { useGetWip } from '@/api/wip';
import { useGetRpm } from '@/api/rpm';
import { useGetServiceMeasure } from '@/api/serviceMeasure';
import { useGetTgtVsActual } from '@/api/tgtVsActual';
import { useGetTotalSku } from '@/api/totalSku';
import { RegionalDistributorTab } from '@/components/regional-distributor';
import {
  useGetRdStatus,
  rdStatusDate,
  type RdStatusApiRow,
} from '@/api/rdStatus';

/**
 * The classification rows of the Benchmark card (Summary) and the Inventory
 * Days Threshold card (Service Measure). Only the styling lives here: the days
 * come from the cover_days table (GET /cover-days/benchmarks), which is
 * versioned by effective date — `days` feeds the Benchmark, `threshold` the
 * Inventory Days Threshold. A class with nothing set reads "—".
 */
const DAYS_BENCHMARKS = [
  {
    cls: 'A',
    bm: 92,
    rd: 99,
    color: clsColors.A,
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    cls: 'B',
    bm: 80,
    rd: 95,
    color: clsColors.B,
    bg: '#f0fdf4',
    border: '#a7f3d0',
  },
  {
    cls: 'C',
    bm: 70,
    rd: 90,
    color: clsColors.C,
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    cls: 'N',
    bm: null,
    rd: null,
    color: clsColors.N,
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
];

/** Same rows, same styling — only the figure they carry differs. */
const INV_BENCHMARKS = DAYS_BENCHMARKS;

const COVER_DAYS = [
  {
    label: 'Total Days',
    value: 54,
    inv: '54,188',
    inv_efp: '0',
    quantity: '0',
    color: '#0891b2',
    bg: '#fff',
    border: 'transparent',
    dot: '=',
  },
  {
    label: 'A – Cover Days',
    value: 28,
    inv: '28,408',
    inv_efp: '0',
    quantity: '0',
    color: clsColors.A,
    bg: clsColors.Abg,
    border: clsColors.Aborder,
    dot: '●',
  },
  {
    label: 'B – Cover Days',
    value: 18,
    inv: '13,608',
    inv_efp: '0',
    quantity: '0',
    color: clsColors.B,
    bg: clsColors.Bbg,
    border: clsColors.Bborder,
    dot: '●',
  },
  {
    label: 'C – Cover Days',
    value: 8,
    inv: '7,188',
    inv_efp: '0',
    quantity: '0',
    color: clsColors.C,
    bg: clsColors.Cbg,
    border: clsColors.Cborder,
    dot: '●',
  },
  {
    label: 'N – Cover Days',
    value: 0,
    inv: '0',
    inv_efp: '0',
    quantity: '0',
    color: clsColors.N,
    bg: clsColors.Nbg,
    border: clsColors.Nborder,
    dot: '●',
  },
  {
    label: 'Others – Cover Days',
    value: 0,
    inv: '0',
    inv_efp: '0',
    quantity: '0',
    color: '#64748b',
    bg: '#64748b15',
    border: '#64748b35',
    dot: '●',
  },
];

type CoverDaysCardRow = (typeof COVER_DAYS)[number] & {
  value_efp: number;
};

const CHART_COLORS = ['#87805E', '#5AC8D8', '#16476A'] as const;
const Threshold_Actual = ['#5AC8D8', '#16476A'] as const;

const INV_API_BRANCHES = [
  { key: 'bahawalpur', label: 'Bahawalpur' },
  { key: 'dss_korangi', label: 'DSS Korangi' },
  { key: 'faisalabad', label: 'Faisalabad' },
  { key: 'gujranwala', label: 'Gujranwala' },
  { key: 'hyderabad', label: 'Hyderabad' },
  { key: 'islamabad', label: 'Islamabad' },
  { key: 'karachi', label: 'Karachi' },
  { key: 'korangi', label: 'Korangi' },
  { key: 'lahore', label: 'Lahore' },
  { key: 'mingora', label: 'Mingora' },
  { key: 'multan', label: 'Multan' },
  { key: 'peshawar', label: 'Peshawar' },
  { key: 'quetta', label: 'Quetta' },
  { key: 'sukkur', label: 'Sukkur' },
] as const;

type CoverDaysInventoryView = 'TP' | 'EFP';

function parseFilterDate(value?: string) {
  if (!value) return new Date();

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if ([year, month, day].every((part) => Number.isFinite(part))) {
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  height = 36,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  height?: number;
}) {
  const h = `${height}px`;
  return (
    <Box display="inline-flex" h={h} flexShrink={0}>
      {options.map(({ label, value: v }, idx) => (
        <Box
          key={v}
          as="button"
          px={3}
          h={h}
          cursor="pointer"
          fontSize="12px"
          fontWeight="700"
          bg={value === v ? 'blue.600' : 'white'}
          color={value === v ? 'white' : 'gray.600'}
          _hover={{ bg: value === v ? 'blue.600' : 'gray.50' }}
          onClick={() => onChange(v)}
          border="1px solid"
          borderColor={value === v ? 'blue.600' : 'gray.200'}
          borderLeftRadius={idx === 0 ? 'md' : 0}
          borderRightRadius={idx === options.length - 1 ? 'md' : 0}
          ml={idx > 0 ? '-1px' : 0}
          zIndex={value === v ? 1 : 0}
          position="relative"
          transition="background 0.15s, border-color 0.15s"
        >
          {label}
        </Box>
      ))}
    </Box>
  );
}

function BenchmarkBanner({
  cls,
  days,
  color,
  bg,
  border,
  sku,
}: Omit<(typeof INV_BENCHMARKS)[0], 'rd' | 'bm'> & {
  /** From the cover_days table; null when nothing is set, shown as "—". */
  days?: number | null;
  isLast?: boolean;
  sku?: string;
}) {
  return (
    <Box
      border="1.5px dashed"
      borderColor={border}
      borderRadius="md"
      overflow="hidden"
      opacity={0.9}
    >
      <Flex>
        <Flex flex={1} align="center" gap={3} bg={bg} px={3} py={2}>
          <Flex
            w={9}
            h={9}
            borderRadius="sm"
            bg={color}
            color="white"
            align="center"
            justify="center"
            fontWeight="900"
            fontSize="lg"
            flexShrink={0}
          >
            {cls}
          </Flex>
          <Flex align="center" gap={1}>
            <Text
              fontSize="1.4rem"
              fontWeight="900"
              color={color}
              lineHeight="1"
            >
              {days ?? '—'}
            </Text>
            <Text
              fontSize="11px"
              fontWeight="600"
              color={color}
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Days
            </Text>
          </Flex>
        </Flex>
        {/* Divider + SKU cell — only when sku is provided */}
        {sku !== undefined && (
          <>
            <Box w="1.5px" bg={border} />
            <Flex flex={1} align="center" bg={bg} px={3} py={2} gap={0}>
              <Text
                fontSize="12px"
                fontWeight="700"
                color="gray.400"
                textTransform="uppercase"
                letterSpacing="wide"
                mt={0.5}
              >
                SKUs :
              </Text>
              <Text
                ml={2}
                fontSize="1.4rem"
                fontWeight="900"
                color={color}
                lineHeight="1"
              >
                {sku}
              </Text>
            </Flex>
          </>
        )}
      </Flex>
    </Box>
  );
}

// function TruncatedCell({ text, maxW }: { text: string; maxW: string }) {
//   const ref = useRef<HTMLDivElement>(null);
//   const [isTruncated, setIsTruncated] = useState(false);
//
//   useEffect(() => {
//     const el = ref.current;
//     if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
//   }, [text]);
//
//   const inner = (
//     <div
//       ref={ref}
//       style={{
//         maxWidth: maxW,
//         overflow: 'hidden',
//         textOverflow: 'ellipsis',
//         whiteSpace: 'nowrap',
//         cursor: 'default',
//       }}
//     >
//       {text}
//     </div>
//   );
//
//   if (!isTruncated) return inner;
//
//   return (
//     <Tooltip.Root positioning={{ placement: 'top' }}>
//       <Tooltip.Trigger asChild>{inner}</Tooltip.Trigger>
//       <Tooltip.Positioner>
//         <Tooltip.Content
//           bg="gray.700"
//           color="white"
//           borderRadius="6px"
//           px="10px"
//           py="6px"
//           fontSize="12px"
//           fontWeight="500"
//           boxShadow="sm"
//         >
//           {text}
//         </Tooltip.Content>
//       </Tooltip.Positioner>
//     </Tooltip.Root>
//   );
// }

function CoverDaysSection({
  coverDaysRows,
  isLoadingCoverDays,
  endDate,
}: {
  coverDaysRows: CoverDaysCardRow[];
  isLoadingCoverDays: boolean;
  endDate?: string;
}) {
  const [coverDaysInventoryView, setCoverDaysInventoryView] =
    useState<CoverDaysInventoryView>('TP');

  return (
    <Box bg="white" borderRadius="xl" p={4} boxShadow="md" h="full">
      <Flex justify="space-between" align="center" gap={3} mb={3}>
        <Text
          fontSize="13px"
          fontWeight="800"
          color="gray.700"
          textTransform="uppercase"
          letterSpacing="wide"
        >
          Cover Days (IBL)
        </Text>
        <ToggleGroup
          options={[
            { label: 'TP', value: 'TP' },
            { label: 'EFP', value: 'EFP' },
          ]}
          value={coverDaysInventoryView}
          onChange={setCoverDaysInventoryView}
          height={28}
        />
      </Flex>
      {isLoadingCoverDays ? (
        <Grid templateColumns="1fr 1fr" gap={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="72px" borderRadius="md" />
          ))}
        </Grid>
      ) : (
        // Two by two: Total | A, B | C, N | O. Each card fills its grid cell,
        // so the two cards in a row always match in height.
        <Grid templateColumns="1fr 1fr" gap={2}>
          {coverDaysRows.map((c) => (
            <CoverDaysCard
              key={c.label}
              {...c}
              endDate={endDate}
              inventoryView={coverDaysInventoryView}
            />
          ))}
        </Grid>
      )}
    </Box>
  );
}

function CoverDaysCard({
  label,
  value,
  value_efp,
  inv,
  inv_efp,
  quantity,
  color,
  bg,
  border,
  dot,
  endDate,
  inventoryView,
}: CoverDaysCardRow & {
  endDate?: string;
  inventoryView: CoverDaysInventoryView;
}) {
  const isClassified = dot === '●';
  const letter = label.charAt(0);
  const inventoryLabel = 'Inventory Value:';
  const inventoryValue = inventoryView === 'TP' ? inv : inv_efp;
  const displayValue = inventoryView === 'TP' ? value : value_efp;

  if (!isClassified) {
    return (
      <Flex
        gap={4}
        bg="white"
        borderRadius="lg"
        px={4}
        py={3}
        border="1px solid"
        borderColor="gray.100"
        boxShadow="sm"
        w="full"
        h="full"
        align="center"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          bottom={0}
          w="3px"
          bg={color}
          borderLeftRadius="lg"
        />
        <Text
          fontSize="2.8rem"
          fontWeight="900"
          color={color}
          lineHeight="1"
          pl={1}
        >
          {displayValue}
        </Text>
        <Box>
          <Text fontSize="13px" fontWeight="700" color="gray.600">
            {endDate
              ? (() => {
                  const d = new Date(endDate);
                  const day = d.getDate();
                  const ord =
                    day % 10 === 1 && day !== 11
                      ? 'st'
                      : day % 10 === 2 && day !== 12
                        ? 'nd'
                        : day % 10 === 3 && day !== 13
                          ? 'rd'
                          : 'th';
                  const mon = d.toLocaleDateString('en-US', { month: 'short' });
                  const yr = String(d.getFullYear()).slice(-2);
                  return `days (Closing Date: ${day}${ord} ${mon}'${yr})`;
                })()
              : 'Closing Date: -'}
          </Text>
          <Text fontSize="12px" color="gray.400" mt={0.5}>
            {inventoryLabel}{' '}
            <Box as="span" fontWeight="600" color="gray.600">
              {inventoryValue}
            </Box>
          </Text>
          <Text fontSize="12px" color="gray.400" mt={0.5}>
            Units:{' '}
            <Box as="span" fontWeight="600" color="gray.600">
              {quantity}
            </Box>
          </Text>
        </Box>
      </Flex>
    );
  }

  return (
    <Box
      bg={bg}
      borderRadius="md"
      px={3}
      py={2}
      boxShadow="sm"
      border="1px solid"
      borderColor={border}
      h="full"
    >
      <Flex gap={3}>
        <Flex
          w={10}
          h={10}
          borderRadius="sm"
          bg={color}
          color="white"
          align="center"
          justify="center"
          fontWeight="900"
          fontSize="xl"
          flexShrink={0}
        >
          {letter}
        </Flex>
        <Box>
          {!label.startsWith('Others') && (
            <Flex align="center" gap={2}>
              <Text
                fontSize="1.6rem"
                fontWeight="900"
                color={color}
                lineHeight="1"
              >
                {displayValue}
              </Text>
              <Text
                fontSize="12px"
                fontWeight="600"
                color={color}
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Days
              </Text>
            </Flex>
          )}
          <Text fontSize="12px" color="gray.500" mt={0.5}>
            {inventoryLabel}{' '}
            <Box as="span" fontWeight="600" color="gray.600">
              {inventoryValue}
            </Box>
          </Text>
          <Text fontSize="12px" color="gray.500" mt={0.5}>
            Units:{' '}
            <Box as="span" fontWeight="600" color="gray.600">
              {quantity}
            </Box>
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}

const LABEL_MAP: Record<string, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  Other: 'Other',
  Others: 'Others',
};

interface SupplyChainTabProps {
  salesRows: {
    label: string;
    sku: string;
    sales: string;
    pct: string;
    up: boolean | null;
  }[];
  salesTotal: { sales: string; pct: string };
  coverDaysRows: CoverDaysCardRow[];
  tsclAccuracy: number | null;
  tsclSalesDisplay?: { achieved: string; target: string };
  tsclDaysGoneInfo?: { daysGone: number; totalDays: number; target: string };
  forecastBarData: Record<string, string | number>[];
  forecastMonths: string[];
  iblAccuracy: number | null;
  iblSalesDisplay?: { achieved: string; target: string };
  iblDaysGoneInfo?: { daysGone: number; totalDays: number; target: string };
  iblBarData: Record<string, string | number>[];
  iblMonths: string[];
  isLoadingSales: boolean;
  isLoadingCoverDays: boolean;
  isLoadingForecastTscl: boolean;
  isLoadingForecastIbl: boolean;
  pctSkusData: { class: string; pct: number }[];
  isLoadingPctSkus: boolean;
  skuCounts: Record<string, number>;
  /** Benchmark cover days per classification, from the cover_days table. */
  benchmarkDays: Record<string, number>;
  endDate?: string;
}

function SupplyChainTab({
  salesRows,
  salesTotal,
  tsclAccuracy,
  tsclSalesDisplay,
  tsclDaysGoneInfo,
  forecastBarData,
  forecastMonths,
  iblAccuracy,
  iblSalesDisplay,
  iblDaysGoneInfo,
  iblBarData,
  iblMonths,
  coverDaysRows,
  isLoadingSales,
  isLoadingCoverDays,
  isLoadingForecastTscl,
  isLoadingForecastIbl,
  pctSkusData,
  isLoadingPctSkus,
  skuCounts,
  benchmarkDays,
  endDate,
}: SupplyChainTabProps) {
  return (
    <Flex direction="column" gap={4}>
      {/* Benchmarks + Sales Summary */}
      <Grid templateColumns="repeat(12, 1fr)" gap={4} alignItems="stretch">
        {/* Sales Summary — 6 cols */}
        <GridItem colSpan={{ base: 12, lg: 3 }}>
          <Box bg="gray.200" borderRadius="xl" p={4} boxShadow="md" h="full">
            <HStack mb={4} gap={2} justify="space-between">
              <HStack gap={2}>
                <Box w={1} h={5} bg="gray.700" borderRadius="full" />
                <Text
                  fontSize="13px"
                  fontWeight="800"
                  color="gray.700"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Benchmark
                </Text>
              </HStack>
              <Box px={2} py="2px" borderRadius="md" bg="gray.700">
                <Text
                  fontSize="12px"
                  fontWeight="800"
                  color="white"
                  textTransform="uppercase"
                  letterSpacing="widest"
                >
                  LEGEND
                </Text>
              </Box>
            </HStack>
            <Box>
              {/* Header row */}
              <Flex mb={1} px={1}>
                <Box w={10} flexShrink={0} />
                <Flex flex={1} justify="center">
                  <Text
                    fontSize="14px"
                    fontWeight="700"
                    color="gray.400"
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Cover Days
                  </Text>
                </Flex>
                <Flex flex={1} justify="center">
                  <Text
                    fontSize="14px"
                    fontWeight="700"
                    color="gray.400"
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    No. of SKUs
                  </Text>
                </Flex>
              </Flex>
              {/* Data rows */}
              <Flex direction="column" gap={3}>
                {DAYS_BENCHMARKS.map((b) => {
                  const dayVal = benchmarkDays[b.cls];
                  const skuVal =
                    skuCounts[b.cls] !== undefined
                      ? skuCounts[b.cls]
                      : undefined;
                  return (
                    <Box
                      key={b.cls}
                      border="1.5px dashed"
                      borderColor={b.border}
                      borderRadius="md"
                      overflow="hidden"
                    >
                      <Flex align="stretch">
                        <Flex
                          w={10}
                          flexShrink={0}
                          bg={b.color}
                          color="white"
                          align="center"
                          justify="center"
                          fontWeight="900"
                          fontSize="lg"
                        >
                          {b.cls}
                        </Flex>
                        <Flex
                          flex={1}
                          align="center"
                          justify="center"
                          bg={b.bg}
                          py={4}
                          borderLeft="1.5px dashed"
                          borderColor={b.border}
                        >
                          <Text
                            fontSize="1.4rem"
                            fontWeight="900"
                            color={b.color}
                            lineHeight="1"
                          >
                            {dayVal ?? '—'}
                          </Text>
                        </Flex>
                        {/* SKUs cell */}
                        <Flex
                          flex={1}
                          align="center"
                          justify="center"
                          bg={b.bg}
                          py={2}
                          borderLeft="1.5px dashed"
                          borderColor={b.border}
                        >
                          <Text
                            fontSize="1.4rem"
                            fontWeight="900"
                            color={b.color}
                            lineHeight="1"
                          >
                            {skuVal ?? '—'}
                          </Text>
                        </Flex>
                      </Flex>
                    </Box>
                  );
                })}
              </Flex>
            </Box>
          </Box>
        </GridItem>
        <GridItem colSpan={{ base: 12, lg: 5 }}>
          <SalesSummaryCard
            rows={salesRows}
            total={salesTotal}
            isLoading={isLoadingSales}
          />
        </GridItem>
        {/* Cover Days — 3 cols */}
        <GridItem colSpan={{ base: 12, lg: 4 }}>
          <CoverDaysSection
            coverDaysRows={coverDaysRows}
            isLoadingCoverDays={isLoadingCoverDays}
            endDate={endDate}
          />
        </GridItem>
      </Grid>

      {/* Forecast Accuracy Charts */}
      <Grid templateColumns="repeat(15, 1fr)" gap={4}>
        <ChartCard
          colSpan={6}
          title="Budget Accuracy TSCL"
          height="280px"
          isLoading={isLoadingForecastIbl}
          variant="gauge-bar"
        >
          <Flex h="100%" gap={0}>
            <Box
              w="175px"
              flexShrink={0}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              gap={2}
            >
              <Box px={3} py={2} borderRadius="md" bg="gray.50" w="100%">
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="gray.600" fontWeight="600">
                    Days Gone:
                  </Text>
                  <Text fontSize="13px" fontWeight="700">
                    <Text as="span" color="green.500">
                      {iblDaysGoneInfo?.daysGone ?? '-'}
                    </Text>
                    <Text as="span" color="gray.400" mx={1}>
                      /
                    </Text>
                    <Text as="span" color="gray.600">
                      {iblDaysGoneInfo?.totalDays ?? '-'}
                    </Text>
                  </Text>
                </Flex>
                <Separator my={1.5} borderColor="gray.200" />
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="gray.600" fontWeight="600">
                    Target:
                  </Text>
                  <Text fontSize="13px" color="gray.800" fontWeight="700">
                    {iblDaysGoneInfo?.target ?? '-'}
                  </Text>
                </Flex>
              </Box>
              <GaugeChart
                value={iblAccuracy ?? 0}
                target={100}
                title=""
                subtitle=""
                color={'#726A95'}
                displayAchieved={iblSalesDisplay?.achieved}
                displayTarget={iblSalesDisplay?.target}
                targetLabel="Budget"
                isLoading={isLoadingForecastIbl}
              />
            </Box>
            <Box w="1px" bg="gray.100" mx={3} flexShrink={0} />
            <Box flex={1} minW={0}>
              <BarChart
                data={iblBarData}
                xKey="classification"
                barSize={35}
                bars={
                  iblMonths.length
                    ? iblMonths.map((m, i) => ({
                        key: m,
                        label: m,
                        color: CHART_COLORS[i] ?? CHART_COLORS[0],
                      }))
                    : [
                        {
                          key: 'accuracy',
                          label: 'Forecast Accuracy',
                          color: CHART_COLORS[0],
                        },
                      ]
                }
                height={260}
                yTickFormatter={(v) => `${Math.round(Number(v))}%`}
                labelFormatter={(v) => `${Math.round(Number(v))}%`}
                showLabels
                xTickMargin={4}
                xLabelColors={{
                  A: clsColors.A,
                  B: clsColors.B,
                  C: clsColors.C,
                  N: clsColors.N,
                }}
              />
            </Box>
          </Flex>
        </ChartCard>
        <ChartCard
          colSpan={6}
          title="Forecast Accuracy IBL"
          height="280px"
          isLoading={isLoadingForecastTscl}
          variant="gauge-bar"
        >
          <Flex h="100%" gap={0}>
            <Box
              w="175px"
              flexShrink={0}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              gap={2}
            >
              <Box px={3} py={2} borderRadius="md" bg="gray.50" w="100%">
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="gray.600" fontWeight="600">
                    Days Gone:
                  </Text>
                  <Text fontSize="13px" fontWeight="700">
                    <Text as="span" color="green.500">
                      {tsclDaysGoneInfo?.daysGone ?? '-'}
                    </Text>
                    <Text as="span" color="gray.400" mx={1}>
                      /
                    </Text>
                    <Text as="span" color="gray.600">
                      {tsclDaysGoneInfo?.totalDays ?? '-'}
                    </Text>
                  </Text>
                </Flex>
                <Separator my={1.5} borderColor="gray.200" />
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="gray.600" fontWeight="600">
                    Target:
                  </Text>
                  <Text fontSize="13px" color="gray.800" fontWeight="700">
                    {tsclDaysGoneInfo?.target ?? '-'}
                  </Text>
                </Flex>
              </Box>
              <GaugeChart
                value={tsclAccuracy ?? 0}
                target={100}
                title=""
                subtitle=""
                color={'#726A95'}
                displayAchieved={tsclSalesDisplay?.achieved}
                displayTarget={tsclSalesDisplay?.target}
                isLoading={isLoadingForecastTscl}
              />
            </Box>
            <Box w="1px" bg="gray.100" mx={3} flexShrink={0} />
            <Box flex={1} minW={0}>
              <BarChart
                data={forecastBarData}
                xKey="classification"
                barSize={35}
                bars={
                  forecastMonths.length
                    ? forecastMonths.map((m, i) => ({
                        key: m,
                        label: m,
                        color: CHART_COLORS[i] ?? CHART_COLORS[0],
                      }))
                    : [
                        {
                          key: 'accuracy',
                          label: 'Forecast Accuracy',
                          color: CHART_COLORS[0],
                        },
                      ]
                }
                height={260}
                yTickFormatter={(v) => `${Math.round(Number(v))}%`}
                labelFormatter={(v) => `${Math.round(Number(v))}%`}
                showLabels
                xTickMargin={4}
                xLabelColors={{
                  A: clsColors.A,
                  B: clsColors.B,
                  C: clsColors.C,
                  N: clsColors.N,
                }}
              />
            </Box>
          </Flex>
        </ChartCard>
        <ChartCard
          colSpan={3}
          title="Forecast Vs Budget %"
          height="280px"
          isLoading={isLoadingPctSkus}
        >
          <Box pt="20px">
            <BarChart
              data={pctSkusData}
              xKey="class"
              barSize={28}
              height={226}
              barCategoryGap="3%"
              compact
              bars={[
                {
                  key: 'pct',
                  label: '% SKUs',
                  color: clsColors.A,
                  // Each class in its own colour; Total (and anything else)
                  // stays grey.
                  cellColor: (e) =>
                    (
                      {
                        A: clsColors.A,
                        B: clsColors.B,
                        C: clsColors.C,
                        N: clsColors.N,
                      } as Record<string, string>
                    )[String(e.class)] ?? '#6b7280',
                },
              ]}
              showLabels
              // showOthers
              showTotal
              yTickFormatter={(v) => `${v}%`}
              labelFormatter={(v) => `${v}%`}
              xLabelColors={{
                A: clsColors.A,
                B: clsColors.B,
                C: clsColors.C,
                N: clsColors.N,
              }}
            />
          </Box>
        </ChartCard>
      </Grid>
    </Flex>
  );
}

function ServiceMeasureTab({
  inventoryDaysData,
  skusThresholdData,
  serviceMeasureData,
  allBranchesServiceMeasureData,
  tgtVsActualData,
  classification,
  isLoadingInventoryDays,
  isLoadingServiceMeasure,
  isLoadingTgtVsActual,
  isLoadingThreshold,
  thresholdDays,
}: {
  inventoryDaysData: unknown;
  skusThresholdData: { class: string; above: number; below: number }[];
  pctSkusData: { class: string; pct: number }[];
  serviceMeasureData: unknown;
  allBranchesServiceMeasureData: unknown;
  tgtVsActualData: unknown;
  classification: string;
  isLoadingInventoryDays: boolean;
  isLoadingServiceMeasure: boolean;
  isLoadingTgtVsActual: boolean;
  isLoadingThreshold: boolean;
  isLoadingPctSkus: boolean;
  /** Inventory Days Threshold per classification, from the cover_days table. */
  thresholdDays: Record<string, number>;
}) {
  type ServiceRow = {
    branch: string;
    'SKU-A%': string;
    'SKU-B%': string;
    'SKU-C%': string;
    'SKU-N%'?: string;
  };
  const allBranches = (
    (allBranchesServiceMeasureData as { data?: ServiceRow[] })?.data ?? []
  ).map((r) => r.branch);
  const filteredMap = new Map(
    ((serviceMeasureData as { data?: ServiceRow[] })?.data ?? []).map((r) => [
      r.branch,
      r,
    ])
  );
  const serviceMeasureChartData = allBranches.map((branch) => {
    const r = filteredMap.get(branch);
    return {
      branch,
      skuA: r && !isNaN(parseFloat(r['SKU-A%'])) ? parseFloat(r['SKU-A%']) : 0,
      skuB: r && !isNaN(parseFloat(r['SKU-B%'])) ? parseFloat(r['SKU-B%']) : 0,
      skuC: r && !isNaN(parseFloat(r['SKU-C%'])) ? parseFloat(r['SKU-C%']) : 0,
      skuN:
        r && !isNaN(parseFloat(r['SKU-N%'] ?? ''))
          ? parseFloat(r['SKU-N%'] ?? '')
          : 0,
    };
  });
  type TgtVsActualRow = {
    classification: string;
    cover_days_tgt: string | number;
    cover_days: string | number;
  };
  const coverDaysChartData = (
    (tgtVsActualData as { data?: TgtVsActualRow[] })?.data ?? []
  ).map((r) => ({
    class: r.classification,
    tgt: Number(r.cover_days_tgt ?? 0),
    actual: Number(r.cover_days ?? 0),
  }));

  type InvApiRow = Record<string, string | null>;
  const branchKeys = INV_API_BRANCHES.map((b) => b.key);
  const invApiRows = (inventoryDaysData as { data?: InvApiRow[] })?.data ?? [];

  const avgVals = (rows: InvApiRow[]) =>
    branchKeys.map((key) =>
      rows.length > 0
        ? rows.reduce((s, r) => s + Number(r[key] ?? 0), 0) / rows.length
        : 0
    );

  const grouped = invApiRows.reduce<Record<string, InvApiRow[]>>((acc, row) => {
    const cls = row.classification as string;
    const key = !cls || cls === 'Others' ? 'Others' : cls;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const computedRows = (['A', 'B', 'C', 'N', 'Others'] as const)
    .filter((c) => grouped[c]?.length)
    .map((cls) => ({
      cls,
      vals: avgVals(grouped[cls]),
      bold: false,
      isOther: cls === 'Others',
      subRows: grouped[cls].map((r: InvApiRow) => ({
        sku: (r.item_desc as string) ?? '',
        vals: branchKeys.map((k) => Number(r[k] ?? 0)),
      })),
    }));

  const tableHeaders = [
    'Class',
    ...INV_API_BRANCHES.map((b) => b.label),
    'Total',
  ];

  // Average of the classified rows (A, B, C and N) per branch — Others stays out.
  const abcRows = computedRows.filter((r) =>
    ['A', 'B', 'C', 'N'].includes(r.cls)
  );
  const totalVals = branchKeys.map((_, i) =>
    abcRows.length > 0
      ? abcRows.reduce((s, row) => s + row.vals[i], 0) / abcRows.length
      : 0
  );
  const totalRowTotal =
    totalVals.reduce((s, v) => s + v, 0) / branchKeys.length;

  return (
    <Flex direction="column" gap={4}>
      <Grid templateColumns="repeat(12, 1fr)" gap={4}>
        {/* Benchmark */}
        <GridItem colSpan={{ base: 12, lg: 3 }}>
          <Box
            bg="gray.50"
            borderRadius="xl"
            p={4}
            border="1.5px dashed"
            borderColor="gray.300"
            h="full"
          >
            <HStack mb={4} gap={2} justify="space-between">
              <HStack gap={2}>
                <Box w={1} h={5} bg="gray.700" borderRadius="full" />
                <Text
                  fontSize="13px"
                  fontWeight="800"
                  color="gray.700"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Inventory Days Threshold
                </Text>
              </HStack>
              <Box px={2} py="2px" borderRadius="md" bg="gray.700">
                <Text
                  fontSize="12px"
                  fontWeight="800"
                  color="white"
                  textTransform="uppercase"
                  letterSpacing="widest"
                >
                  LEGEND
                </Text>
              </Box>
            </HStack>
            <Flex direction="column" gap={3}>
              {INV_BENCHMARKS.map((b, i) => (
                <BenchmarkBanner
                  key={b.cls}
                  {...b}
                  days={thresholdDays[b.cls] ?? null}
                  isLast={i === INV_BENCHMARKS.length - 1}
                />
              ))}
            </Flex>
          </Box>
        </GridItem>
        <GridItem colSpan={{ base: 12, lg: 9 }}>
          <DataTable
            title="Inventory Days"
            headerGradient={gradients.tableBlue}
            headers={tableHeaders}
            searchable={false}
            rowCollapsible
            height="270px"
            isLoading={isLoadingInventoryDays}
            stickyFirstCol
          >
            {(() => {
              const locCount = branchKeys.length;
              const rows: React.ReactNode[] = [];
              computedRows.forEach((row, rowIdx) => {
                const isLastAbc =
                  row.cls !== 'Others' &&
                  (rowIdx === computedRows.length - 1 ||
                    computedRows[rowIdx + 1]?.isOther);
                const clsColor =
                  (
                    {
                      A: clsColors.A,
                      B: clsColors.B,
                      C: clsColors.C,
                      N: clsColors.N,
                    } as Record<string, string>
                  )[row.cls] ?? clsColors.Other;
                const clsRowBg =
                  (
                    {
                      A: clsColors.Abg,
                      B: clsColors.Bbg,
                      C: clsColors.Cbg,
                      N: clsColors.Nbg,
                    } as Record<string, string>
                  )[row.cls] ?? clsColors.Otherbg;
                const clsBadge =
                  row.cls === 'Others' ? (
                    <Box
                      display="inline-flex"
                      alignItems="center"
                      color={clsColors.Other}
                      fontSize="13px"
                      fontWeight="700"
                      py={'1px'}
                    >
                      Other
                    </Box>
                  ) : (
                    <Box
                      display="inline-flex"
                      alignItems="center"
                      justifyContent="center"
                      w="22px"
                      h="22px"
                      borderRadius="4px"
                      bg={clsColor}
                      color="white"
                      fontSize="12px"
                      fontWeight="700"
                    >
                      {row.cls}
                    </Box>
                  );
                // The class's threshold from the cover_days table — the same
                // figure the Inventory Days Threshold card beside it shows.
                const threshold = thresholdDays[row.cls] ?? null;
                const rowTotal = row.vals.reduce((s, v) => s + v, 0) / locCount;
                rows.push(
                  <DataTableRow
                    key={row.cls}
                    cells={[
                      row.cls,
                      ...row.vals.map((v) => String(Math.trunc(v))),
                      String(Math.trunc(rowTotal)),
                    ]}
                    isTotal={row.bold}
                    rowBg={clsRowBg}
                    cellColors={[clsColor]}
                    cellNodes={[clsBadge]}
                    cellWeights={['700', ...row.vals.map(() => '600'), '600']}
                    stickyRow
                    subRows={row.subRows.map((s) => ({
                      cells: [
                        s.sku,
                        ...s.vals.map((v) => String(Math.trunc(v))),
                        String(
                          Math.trunc(
                            s.vals.reduce((a, v) => a + v, 0) / locCount
                          )
                        ),
                      ],
                      cellColors: [
                        undefined,
                        ...s.vals.map((v) =>
                          threshold !== null && v >= threshold
                            ? '#067242'
                            : undefined
                        ),
                        undefined,
                      ],
                    }))}
                  />
                );
                if (isLastAbc) {
                  rows.push(
                    <DataTableRow
                      key="total"
                      cells={[
                        'Total',
                        ...totalVals.map((v) => String(Math.trunc(v))),
                        String(Math.trunc(totalRowTotal)),
                      ]}
                      rowBg="#e5e7eb"
                      cellWeights={[
                        '700',
                        ...totalVals.map(() => '700'),
                        '700',
                      ]}
                    />
                  );
                }
              });
              return rows;
            })()}
          </DataTable>
        </GridItem>
      </Grid>

      <Grid templateColumns="repeat(12, 1fr)" gap={4}>
        <ChartCard
          colSpan={6}
          title="Service Measure by Branch"
          height="330px"
          isLoading={isLoadingServiceMeasure}
          variant="line"
        >
          <LineChart
            variant="filled"
            data={serviceMeasureChartData}
            xKey="branch"
            lines={[
              { key: 'skuA', label: 'SKU-A%', color: clsColors.A },
              { key: 'skuB', label: 'SKU-B%', color: clsColors.B },
              { key: 'skuC', label: 'SKU-C%', color: clsColors.C },
              { key: 'skuN', label: 'SKU-N%', color: clsColors.N },
            ].filter(
              (l) => !classification || l.key === `sku${classification}`
            )}
            height={330}
            labelFormatter={(v) => `${v}%`}
          />
        </ChartCard>
        <ChartCard
          colSpan={3}
          title="Cover Days Threshold vs Actual"
          height="319px"
          isLoading={isLoadingTgtVsActual}
        >
          <BarChart
            data={coverDaysChartData}
            xKey="class"
            height={'100%'}
            bars={[
              { key: 'tgt', label: 'TGT', color: Threshold_Actual[0] },
              {
                key: 'actual',
                label: 'Actual',
                color: Threshold_Actual[1],
              },
            ]}
            showLabels
            labelFormatter={(v) => `${Math.round(Number(v))}`}
            yTickFormatter={(v) => `${Math.round(Number(v))}`}
            xLabelColors={{
              A: clsColors.A,
              B: clsColors.B,
              C: clsColors.C,
              N: clsColors.N,
            }}
          />
        </ChartCard>

        <ChartCard
          colSpan={3}
          title="SKUs Against Threshold"
          titleNode={
            <>
              SKU<span style={{ textTransform: 'lowercase' }}>s</span> VS
              Threshold
            </>
          }
          height="319px"
          isLoading={isLoadingThreshold}
        >
          <BarChart
            data={skusThresholdData}
            xKey="class"
            height={'100%'}
            compact
            barCategoryGap="10%"
            bars={[
              {
                key: 'above',
                label: 'Above',
                color: '#067242',
              },
              {
                key: 'below',
                label: 'Below',
                color: '#E52020',
              },
            ]}
            showLabels
            xLabelColors={{
              A: clsColors.A,
              B: clsColors.B,
              C: clsColors.C,
              N: clsColors.N,
            }}
          />
        </ChartCard>
      </Grid>
    </Flex>
  );
}

function DispatchWipTab({
  dispatchVsOrderData,
  wipData,
  rpmData,
  isLoadingDispatch,
  isLoadingWip,
  isLoadingRpm,
}: {
  dispatchVsOrderData: unknown;
  wipData: unknown;
  rpmData: unknown;
  isLoadingDispatch: boolean;
  isLoadingWip: boolean;
  isLoadingRpm: boolean;
}) {
  type DispatchRow = {
    material_name: string;
    delivery_pct: string;
    total_order_qty: string;
    total_delivery_qty: string;
    channel_type?: string;
  };
  type WipRow = {
    'Material Name': string;
    'WIP Value': number;
    Quantity: number;
    material_type_description?: string;
    good_received_qty?: number;
    item_qty?: number;
    order_number?: string;
    plant?: string | number;
    plnt_desc?: string;
    storage_loc?: string | number;
    storage_loc_desc?: string;
  };
  type RpmRow = {
    materialname: string;
    producttype?: string;
    total_qty?: string;
    total_val?: string;
    unrestricted_qty?: string;
    unrestricted_val?: string;
    restricted_qty?: string;
    restricted_val?: string;
    qualityinspection_qty?: string;
    quality_inspection_val?: string;
    blocked_qty?: string;
    blocked_val?: string;
    gr_blocked_val?: string;
    return_qty?: string;
    returns_val?: string;
    stockintransit_qty?: string;
    stock_in_transit_val?: string;
    stocktransferplant_qty?: string;
    stock_transfer_plant_val?: string;
    stocktransferstoragelocation_qty?: string;
    storage_location_val?: string;
    tiedempties_qty?: string;
    tied_empties_val?: string;
  };
  const allDispatchRows =
    (dispatchVsOrderData as { data?: DispatchRow[] })?.data ?? [];
  const [dispatchChannelFilter, setDispatchChannelFilter] = useState<string[]>(
    []
  );
  const dispatchChannelOptions = useMemo(() => {
    const set = new Set<string>();
    allDispatchRows.forEach((r) => {
      if (r.channel_type) set.add(r.channel_type);
    });
    return [...set].sort().map((v) => ({ value: v, label: v }));
  }, [allDispatchRows]);
  const dispatchRows =
    dispatchChannelFilter.length === 0
      ? allDispatchRows
      : allDispatchRows.filter((r) =>
          dispatchChannelFilter.includes(r.channel_type ?? '')
        );
  const wipRows = (wipData as { data?: WipRow[] })?.data ?? [];
  // WIP card defaults to "Pending GR" — only rows with good_received_qty = 0.
  // The detail dialog still receives the full `wipRows` so its own filter works.
  const wipPendingGrRows = wipRows.filter(
    (r) => Number(r.good_received_qty ?? 0) === 0
  );
  const allRpmRows = (rpmData as { data?: RpmRow[] })?.data ?? [];
  const [rpmProductFilter, setRpmProductFilter] = useState<
    'All' | 'TPKG' | 'TRAW'
  >('All');
  const [rmpmDialogOpen, setRmpmDialogOpen] = useState(false);
  const [wipDialogOpen, setWipDialogOpen] = useState(false);
  const filteredByType = allRpmRows;
  const rpmRows =
    rpmProductFilter === 'All'
      ? filteredByType
      : filteredByType.filter((r) => r.producttype === rpmProductFilter);

  return (
    <Grid templateColumns="repeat(27, 1fr)" gap={4}>
      <GridItem colSpan={10}>
        <DataTable
          title="Dispatch Vs Order"
          headerGradient={gradients.tableBlue}
          headers={['Material Name', 'Order Qty', 'Delivery Qty', '%']}
          colAligns={['left', 'left', 'left', 'right']}
          colWidths={[undefined, undefined, undefined, '40px']}
          headerMinH="52px"
          pageSize={15}
          isLoading={isLoadingDispatch}
          minHeight="calc(100vh - 305px)"
          headerActions={
            <MultiSelect
              placeholder="All"
              value={dispatchChannelFilter}
              options={dispatchChannelOptions}
              onChange={setDispatchChannelFilter}
              isClearable
              minW="200px"
            />
          }
        >
          {dispatchRows.map((row) => {
            const rawPct = parseFloat(row.delivery_pct);
            const safePct =
              isNaN(rawPct) || rawPct < 0 ? 0 : Math.round(rawPct);
            const pct = `${safePct}%`;
            const isBelow95 = safePct < 95;
            const orderQty = Number(row.total_order_qty ?? 0).toLocaleString(
              'en-US',
              { maximumFractionDigits: 0 }
            );
            const deliveryQty = Number(
              row.total_delivery_qty ?? 0
            ).toLocaleString('en-US', { maximumFractionDigits: 0 });
            return (
              <DataTableRow
                key={row.material_name}
                cells={[row.material_name, orderQty, deliveryQty, pct]}
                cellColors={[
                  undefined,
                  undefined,
                  undefined,
                  isBelow95 ? '#dc2626' : '#067242',
                ]}
                cellWeights={[undefined, undefined, undefined, '700']}
              />
            );
          })}
        </DataTable>
      </GridItem>

      {/* WIP */}
      <GridItem colSpan={8}>
        <DataTable
          title="WIP"
          headerGradient={gradients.tableBlue}
          headers={['Material Name', 'WIP Qty', 'Value']}
          colAligns={['left', 'right', 'right']}
          headerMinH="52px"
          pageSize={14}
          isLoading={isLoadingWip}
          minHeight="calc(100vh - 305px)"
          headerActions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWipDialogOpen(true)}
              flexShrink={0}
            >
              View Details
            </Button>
          }
        >
          <DataTableRow
            key="__wip_total__"
            pinnedTop
            cells={[
              'Total',
              wipPendingGrRows
                .reduce((s, r) => s + Number(r.Quantity ?? 0), 0)
                .toLocaleString('en-US', { maximumFractionDigits: 0 }),
              wipPendingGrRows
                .reduce((s, r) => s + Number(r['WIP Value'] ?? 0), 0)
                .toLocaleString('en-US', { maximumFractionDigits: 0 }),
            ]}
            cellWeights={['700', '700', '700']}
          />
          {wipPendingGrRows.map((row) => (
            <DataTableRow
              key={row['Material Name']}
              cells={[
                row['Material Name'],
                Number(row.Quantity ?? 0).toLocaleString('en-US', {
                  maximumFractionDigits: 0,
                }),
                Number(row['WIP Value'] ?? 0).toLocaleString('en-US', {
                  maximumFractionDigits: 0,
                }),
              ]}
              cellWeights={[undefined, undefined, '600']}
              onRowClick={() => setWipDialogOpen(true)}
            />
          ))}
        </DataTable>
      </GridItem>

      {/* RPM */}
      <GridItem colSpan={9}>
        <DataTable
          title="RMPM"
          headerGradient={gradients.tableIndigo}
          headerMinH="52px"
          headers={['Material Name', 'Total Qty', 'Total Cost']}
          colAligns={['left', 'right', 'right']}
          pageSize={14}
          isLoading={isLoadingRpm}
          minHeight="calc(100vh - 305px)"
          headerActions={
            <HStack gap={3} align="flex-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRmpmDialogOpen(true)}
                flexShrink={0}
              >
                View Details
              </Button>
              <HStack
                gap={0}
                borderRadius="md"
                overflow="hidden"
                border="1px solid"
                borderColor="gray.200"
                h="36px"
                flexShrink={0}
              >
                {(
                  [
                    ['All', 'All'],
                    ['PM', 'TPKG'],
                    ['RM', 'TRAW'],
                  ] as const
                ).map(([label, value]) => (
                  <Box
                    key={value}
                    as="button"
                    px={3}
                    h="36px"
                    cursor="pointer"
                    fontSize="12px"
                    fontWeight="700"
                    bg={rpmProductFilter === value ? 'blue.600' : 'white'}
                    color={rpmProductFilter === value ? 'white' : 'gray.600'}
                    _hover={{
                      bg: rpmProductFilter === value ? 'blue.600' : 'gray.50',
                    }}
                    onClick={() => setRpmProductFilter(value)}
                    borderRight={value !== 'TRAW' ? '1px solid' : undefined}
                    borderColor="gray.200"
                    transition="all 0.15s"
                  >
                    {label}
                  </Box>
                ))}
              </HStack>
            </HStack>
          }
        >
          <DataTableRow
            key="__rpm_total__"
            pinnedTop
            cells={[
              'Total',
              rpmRows
                .reduce((s, r) => s + Number(r.total_qty ?? 0), 0)
                .toLocaleString('en-US', { maximumFractionDigits: 2 }),
              rpmRows
                .reduce((s, r) => s + Number(r.total_val ?? 0), 0)
                .toLocaleString('en-US', { maximumFractionDigits: 0 }),
            ]}
            cellWeights={['700', '700', '700']}
          />
          {rpmRows.map((row) => (
            <DataTableRow
              key={row.materialname}
              cells={[
                row.materialname,
                Number(row.total_qty ?? 0).toLocaleString('en-US', {
                  maximumFractionDigits: 2,
                }),
                Number(row.total_val ?? 0).toLocaleString('en-US', {
                  maximumFractionDigits: 0,
                }),
              ]}
              cellWeights={[undefined, undefined, '600']}
              onRowClick={() => setRmpmDialogOpen(true)}
            />
          ))}
        </DataTable>
      </GridItem>
      <RmpmDetails
        open={rmpmDialogOpen}
        data={rpmRows}
        onClose={() => setRmpmDialogOpen(false)}
      />
      <WipDetails
        open={wipDialogOpen}
        data={wipRows}
        onClose={() => setWipDialogOpen(false)}
      />
    </Grid>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ScorecardDashboard() {
  const { mainTab, filters } = useAppSelector((state) => state.salesDashboard);

  // ── Load queue ────────────────────────────────────────────────────────────
  // Queries run tab by tab, in tab order: all of Summary's together, then —
  // once every one of them has settled — all of Service Measure's, and so on,
  // whichever tab is on screen. The tab being viewed always loads straight
  // away, and a tab the user holds no VIEW permission on never loads at all.
  // A filter change starts the queue again from the first tab.
  // See useTabLoadQueue in features/salesDashboard/tabs.ts.
  const restartKey = JSON.stringify([
    filters.classification,
    filters.branch,
    filters.sku,
    filters.dateFrom,
    filters.dateTo,
  ]);
  const queue = useTabLoadQueue(mainTab, restartKey);
  const loadSummary = queue.shouldLoad('supplyChain');
  const loadServiceMeasure = queue.shouldLoad('serviceMeasure');
  const loadDispatchWip = queue.shouldLoad('dispatchWip');
  const loadRdStatus = queue.shouldLoad('regionalDistributor');

  // Filled in by track() as each query below is declared: a tab is settled
  // once every query registered to it has finished for the current params.
  const settledByTab: TabSettledMap = {
    supplyChain: true,
    serviceMeasure: true,
    dispatchWip: true,
    regionalDistributor: true,
  };
  const track = <T extends QueryProgress>(tabs: MainTab[], query: T): T => {
    if (!isQuerySettled(query)) {
      for (const tab of tabs) settledByTab[tab] = false;
    }
    return query;
  };

  const params = {
    ...(filters.classification && { classification: filters.classification }),
    ...(filters.branch.length > 0 && { branch: filters.branch }),
    ...(filters.sku.length > 0 && { sku: filters.sku }),
    ...(filters.dateFrom && { startDate: filters.dateFrom }),
    ...(filters.dateTo && { endDate: filters.dateTo }),
  };

  // Cap endDate at today so daysgone never requests future days.
  const todayIso = new Date().toISOString().slice(0, 10);
  const cappedEndDate =
    filters.dateTo && filters.dateTo > todayIso ? todayIso : filters.dateTo;
  const daysGoneParams = {
    ...params,
    ...(cappedEndDate && { endDate: cappedEndDate }),
  };

  // RD stock position — the last tab in the queue.
  const { data: rdStatusData, isFetching: isLoadingRdStatus } = track(
    ['regionalDistributor'],
    useGetRdStatus(
      { date: rdStatusDate(filters.dateTo) },
      { enabled: loadRdStatus }
    )
  );
  // Branch/distributor are applied here rather than in SQL — the RD list is
  // ~100 rows and both filter lists are built from this same response.
  const rdStatusRows = useMemo(() => {
    const all = (rdStatusData as { data?: RdStatusApiRow[] })?.data ?? [];

    // An RD that uploaded for the selected date reports a current stock count
    // of 1 or more; one that did not sits at 0 and carries its previous figure
    // under last_stock_* instead.
    const matchesUploadCount = (currentStockQty: number) => {
      switch (filters.uploadCount) {
        case 'uploaded':
          return currentStockQty > 0;
        case 'not-uploaded':
          return currentStockQty === 0;
        default:
          return true;
      }
    };

    return all
      .filter(
        (r) =>
          // Code and name are separate dropdowns for the same thing, so both
          // narrow the list when set — picking a code and a name that do not
          // belong together correctly yields nothing.
          (filters.branch.length === 0 ||
            filters.branch.includes(String(r.branch_code ?? '').trim())) &&
          (filters.branchName.length === 0 ||
            filters.branchName.includes(String(r.branch_desc ?? '').trim())) &&
          (filters.distributor.length === 0 ||
            filters.distributor.includes(String(r.ibl_distributor_code).trim())) &&
          (filters.distributorName.length === 0 ||
            filters.distributorName.includes(
              String(r.distributor_desc ?? '').trim()
            )) &&
          matchesUploadCount(Number(r.stock_qty) || 0)
      )
      .map((r) => ({
        iblDistributorCode: String(r.ibl_distributor_code).trim(),
        distributorDesc: r.distributor_desc?.trim() ?? '',
        branchCode: String(r.branch_code ?? '').trim(),
        branchDesc: r.branch_desc?.trim() ?? '',
        stockQty: Number(r.stock_qty) || 0,
        stockValue: Number(r.stock_value) || 0,
        lastStockQty: Number(r.last_stock_qty) || 0,
        lastStockValue: Number(r.last_stock_value) || 0,
        lastStockDate: r.last_stock_date?.trim() || null,
        dayDiff: Number(r.day_diff) || 0,
      }));
  }, [
    rdStatusData,
    filters.branch,
    filters.branchName,
    filters.distributor,
    filters.distributorName,
    filters.uploadCount,
  ]);

  const { data: totalSkuData } = track(
    ['supplyChain'],
    useGetTotalSku(
      {
        ...(filters.classification && {
          classification: filters.classification,
        }),
        ...(filters.sku.length > 0 && { sku: filters.sku }),
      },
      { enabled: loadSummary }
    )
  );
  type TotalSkuRow = { classification: string; count: number };
  const skuCounts = (
    (totalSkuData as { data?: TotalSkuRow[] })?.data ?? []
  ).reduce<Record<string, number>>((acc, r) => {
    if (r.classification) acc[r.classification] = r.count;
    return acc;
  }, {});

  // Benchmark cover days (`days`) and Inventory Days Threshold (`threshold`)
  // per classification, from the cover_days table as of the window's end — the
  // table is versioned by effective date, so a past month shows its own. A 0
  // or missing value means nothing is set, and the card reads "—".
  // Read by both Summary (benchmark days) and Service Measure (thresholds), so
  // it loads with whichever of the two is released first.
  const { data: benchmarksData } = track(
    ['supplyChain', 'serviceMeasure'],
    useGetCoverDaysBenchmarks(
      { endDate: filters.dateTo || new Date().toISOString().slice(0, 10) },
      { enabled: loadSummary || loadServiceMeasure }
    )
  );
  const benchmarkRows =
    (benchmarksData as { data?: CoverDaysBenchmarkRow[] })?.data ?? [];
  const benchmarkDays: Record<string, number> = Object.fromEntries(
    benchmarkRows
      .filter((r) => Number(r.days) > 0)
      .map((r) => [r.classification, Number(r.days)])
  );
  const thresholdDays: Record<string, number> = Object.fromEntries(
    benchmarkRows
      .filter((r) => Number(r.threshold) > 0)
      .map((r) => [r.classification, Number(r.threshold)])
  );

  // ── Summary ───────────────────────────────────────────────────────────────
  const summaryOnly = { enabled: loadSummary };
  const summary = <T extends QueryProgress>(query: T) =>
    track(['supplyChain'], query);
  const { data: salesSummaryData, isFetching: isLoadingSales } = summary(
    useGetSalesSummary(params, summaryOnly)
  );
  const { data: coverDaysData, isFetching: isLoadingCoverDays } = summary(
    useGetCoverDays(params, summaryOnly)
  );
  const { data: coverDaysTotalData, isFetching: isLoadingCoverDaysTotal } =
    summary(useGetCoverDaysTotal(params, summaryOnly));
  const { data: coverDaysClosingInvData } = summary(
    useGetCoverDaysClosingInv(summaryOnly)
  );
  const closingDate =
    (coverDaysClosingInvData as { data?: { closing_date?: string }[] })
      ?.data?.[0]?.closing_date ?? undefined;
  const { data: forecastAccuracyMonthlyData } = summary(
    useGetForecastAccuracyMonthly(params, summaryOnly)
  );
  const { data: forecastAccuracyMonthlyDaysGoneData } = summary(
    useGetForecastAccuracyMonthlyDaysGone(daysGoneParams, summaryOnly)
  );
  const {
    data: forecastAccuracyCategoryMonthlyData,
    isFetching: isLoadingForecastTscl,
  } = summary(
    useGetForecastAccuracyCategoryMonthly(
      {
        ...params,
        endDate: filters.dateTo || new Date().toISOString().slice(0, 10),
      },
      summaryOnly
    )
  );

  const { data: forecastAccuracyYearlyData } = summary(
    useGetForecastAccuracyYearly(
      {
        ...params,
        date: filters.dateTo || new Date().toISOString().slice(0, 10),
      },
      summaryOnly
    )
  );
  const {
    data: forecastAccuracyCategoryYearlyData,
    isFetching: isLoadingForecastIbl,
  } = summary(
    useGetForecastAccuracyCategoryYearly(
      {
        ...params,
        endDate: filters.dateTo || new Date().toISOString().slice(0, 10),
      },
      summaryOnly
    )
  );
  const { data: iblVsTsclData, isFetching: isLoadingIblVsTscl } = summary(
    useGetIblVsTscl(params, summaryOnly)
  );

  // ── Service Measure ───────────────────────────────────────────────────────
  const serviceMeasureOnly = { enabled: loadServiceMeasure };
  const serviceMeasure = <T extends QueryProgress>(query: T) =>
    track(['serviceMeasure'], query);
  const { data: inventoryDaysData, isFetching: isLoadingInventoryDays } =
    serviceMeasure(useGetInventoryDays(params, serviceMeasureOnly));
  const { data: aboveBelowThresholdData, isFetching: isLoadingThreshold } =
    serviceMeasure(useGetAboveBelowThreshold(params, serviceMeasureOnly));

  // Dispatch vs Order ignores SKU and Classification filters.
  const dispatchParams = {
    ...(filters.branch.length > 0 && { branch: filters.branch }),
    ...(filters.dateFrom && { startDate: filters.dateFrom }),
    ...(filters.dateTo && { endDate: filters.dateTo }),
  };
  // ── Dispatch & WIP ────────────────────────────────────────────────────────
  const dispatchWipOnly = { enabled: loadDispatchWip };
  const dispatchWip = <T extends QueryProgress>(query: T) =>
    track(['dispatchWip'], query);
  const { data: dispatchVsOrderData, isFetching: isLoadingDispatch } =
    dispatchWip(useGetDispatchVsOrder(dispatchParams, dispatchWipOnly));

  // WIP & RPM only respect date filters — branch / classification / sku are
  // intentionally excluded.
  const dateOnlyParams = {
    ...(filters.dateFrom && { startDate: filters.dateFrom }),
    ...(filters.dateTo && { endDate: filters.dateTo }),
  };
  const { data: wipData, isFetching: isLoadingWip } = dispatchWip(
    useGetWip(dateOnlyParams, dispatchWipOnly)
  );
  const { data: rpmData, isFetching: isLoadingRpm } = dispatchWip(
    useGetRpm(dateOnlyParams, dispatchWipOnly)
  );

  // ── Service Measure (continued) ───────────────────────────────────────────
  const { data: serviceMeasureData, isFetching: isLoadingServiceMeasure } =
    serviceMeasure(useGetServiceMeasure(params, serviceMeasureOnly));
  const { data: allBranchesServiceMeasureData } = serviceMeasure(
    useGetServiceMeasure(
      {
        ...(filters.classification && {
          classification: filters.classification,
        }),
        ...(filters.sku.length > 0 && { sku: filters.sku }),
        ...(filters.dateFrom && { startDate: filters.dateFrom }),
        ...(filters.dateTo && { endDate: filters.dateTo }),
      },
      serviceMeasureOnly
    )
  );
  const { data: tgtVsActualData, isFetching: isLoadingTgtVsActual } =
    serviceMeasure(useGetTgtVsActual(params, serviceMeasureOnly));

  // Every query is declared, so settledByTab is complete: release the next tab
  // once the ones already released have all finished.
  useReleaseNextTab(queue, settledByTab);

  const apiRows = salesSummaryData?.data as
    | { classification: string; sku: string | number; amount: number }[]
    | undefined;

  const totalSales = apiRows
    ? apiRows.reduce((sum, item) => sum + Number(item.amount), 0)
    : null;

  const UP_MAP: Record<string, boolean | null> = {
    A: true,
    B: true,
    C: false,
    Other: null,
    Others: null,
  };

  const salesRows =
    apiRows && totalSales
      ? apiRows.map((item) => {
          const pct = ((Number(item.amount) / totalSales) * 100).toFixed(1);
          return {
            label: LABEL_MAP[item.classification] ?? item.classification,
            sku: String(item.sku),
            sales: Number(item.amount).toLocaleString('en-US', {
              maximumFractionDigits: 0,
            }),
            pct: `${pct}%`,
            up: UP_MAP[item.classification] ?? null,
          };
        })
      : [];

  const salesTotal = {
    sales: totalSales
      ? totalSales.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : '—',
    pct: '100%',
  };

  type CoverDayRow = {
    classification?: string;
    inv_val: string | number;
    inv_val_efp?: string | number;
    trg_value: string | number;
    cover_days: string | number;
    cover_days_efp?: string | number;
    daily_target: string | number;
    quantity?: string | number;
  };
  const coverDayApiRows =
    (coverDaysData as { data?: CoverDayRow[] })?.data ?? [];
  const coverDayTotalRow = ((coverDaysTotalData as { data?: CoverDayRow[] })
    ?.data ?? [])[0];

  const findCls = (cls: string) =>
    coverDayApiRows.find((r) => r.classification === cls);

  const fmtNumber = (
    v: string | number | undefined,
    maximumFractionDigits = 0
  ) => Number(v ?? 0).toLocaleString('en-US', { maximumFractionDigits });

  const totalInv = coverDayApiRows.reduce(
    (s, r) => s + Number(r.inv_val ?? 0),
    0
  );
  const totalInvEfp = coverDayApiRows.reduce(
    (s, r) => s + Number(r.inv_val_efp ?? 0),
    0
  );
  const totalDailyTarget = coverDayApiRows.reduce(
    (s, r) => s + Number(r.daily_target ?? 0),
    0
  );
  const totalCoverDays =
    totalDailyTarget > 0 ? Math.round(totalInv / totalDailyTarget) : 0;
  const totalCoverDaysEfp =
    totalDailyTarget > 0 ? Math.round(totalInvEfp / totalDailyTarget) : 0;

  const coverDaysRows: CoverDaysCardRow[] = [
    {
      ...COVER_DAYS[0],
      value:
        coverDayTotalRow?.cover_days !== undefined
          ? Math.round(Number(coverDayTotalRow.cover_days))
          : totalCoverDays,
      value_efp:
        coverDayTotalRow?.cover_days_efp !== undefined
          ? Math.round(Number(coverDayTotalRow.cover_days_efp))
          : totalCoverDaysEfp,
      inv: coverDayTotalRow
        ? fmtNumber(coverDayTotalRow.inv_val)
        : fmtNumber(totalInv),
      inv_efp: coverDayTotalRow
        ? fmtNumber(coverDayTotalRow.inv_val_efp)
        : fmtNumber(totalInvEfp),
      quantity: fmtNumber(coverDayTotalRow?.quantity),
    },
    {
      ...COVER_DAYS[1],
      value: Math.round(Number(findCls('A')?.cover_days ?? 0)),
      value_efp: Math.round(Number(findCls('A')?.cover_days_efp ?? 0)),
      inv: fmtNumber(findCls('A')?.inv_val),
      inv_efp: fmtNumber(findCls('A')?.inv_val_efp),
      quantity: fmtNumber(findCls('A')?.quantity),
    },
    {
      ...COVER_DAYS[2],
      value: Math.round(Number(findCls('B')?.cover_days ?? 0)),
      value_efp: Math.round(Number(findCls('B')?.cover_days_efp ?? 0)),
      inv: fmtNumber(findCls('B')?.inv_val),
      inv_efp: fmtNumber(findCls('B')?.inv_val_efp),
      quantity: fmtNumber(findCls('B')?.quantity),
    },
    {
      ...COVER_DAYS[3],
      value: Math.round(Number(findCls('C')?.cover_days ?? 0)),
      value_efp: Math.round(Number(findCls('C')?.cover_days_efp ?? 0)),
      inv: fmtNumber(findCls('C')?.inv_val),
      inv_efp: fmtNumber(findCls('C')?.inv_val_efp),
      quantity: fmtNumber(findCls('C')?.quantity),
    },
    {
      ...COVER_DAYS[4],
      value: Math.round(Number(findCls('N')?.cover_days ?? 0)),
      value_efp: Math.round(Number(findCls('N')?.cover_days_efp ?? 0)),
      inv: fmtNumber(findCls('N')?.inv_val),
      inv_efp: fmtNumber(findCls('N')?.inv_val_efp),
      quantity: fmtNumber(findCls('N')?.quantity),
    },
    {
      ...COVER_DAYS[5],
      value: Math.round(Number(findCls('Others')?.cover_days ?? 0)),
      value_efp: Math.round(Number(findCls('Others')?.cover_days_efp ?? 0)),
      inv: fmtNumber(findCls('Others')?.inv_val),
      inv_efp: fmtNumber(findCls('Others')?.inv_val_efp),
      quantity: fmtNumber(findCls('Others')?.quantity),
    },
  ];

  type ThresholdRow = {
    classification: string;
    'No Of SKUs > Threshold': string | number;
    'No Of SKUs < Threshold': string | number;
  };
  const thresholdRows =
    (aboveBelowThresholdData as { data?: ThresholdRow[] })?.data ?? [];
  const skusThresholdData = thresholdRows
    .filter(
      (r) =>
        !filters.classification || r.classification === filters.classification
    )
    .map((r) => ({
      class: r.classification,
      above: Number(r['No Of SKUs > Threshold']) ?? 0,
      below: Number(r['No Of SKUs < Threshold']) ?? 0,
    }));

  type IblVsTsclRow = {
    classification: string;
    ibl_vs_tscl_pct: string | number;
  };
  const iblVsTsclRows =
    (iblVsTsclData as { data?: IblVsTsclRow[] })?.data ?? [];
  const pctSkusData = (['Total', 'A', 'B', 'C', 'N', 'Others'] as const)
    .filter(
      (cls) =>
        cls === 'Total' ||
        !filters.classification ||
        cls === filters.classification
    )
    .map((cls) => {
      const row = iblVsTsclRows.find(
        (r) => (r.classification ?? 'Others') === cls
      );
      return {
        class: cls,
        pct: row ? Math.round(Number(row.ibl_vs_tscl_pct)) : 0,
      };
    });

  const tsclAccuracy = (() => {
    const row = (
      forecastAccuracyMonthlyData as {
        data?: {
          pct: string | number;
          amount: number;
          target_value: string | number;
        }[];
      }
    )?.data?.[0];
    return row ? Math.round(Number(row.pct) * 100 * 10) / 10 : null;
  })();

  const tsclSalesDisplay = (() => {
    const row = (
      forecastAccuracyMonthlyData as {
        data?: { amount: number; target_value: string | number }[];
      }
    )?.data?.[0];
    if (!row) return undefined;
    return {
      achieved: Number(row.amount).toLocaleString('en-US', {
        maximumFractionDigits: 0,
      }),
      target: Number(row.target_value).toLocaleString('en-US', {
        maximumFractionDigits: 0,
      }),
    };
  })();

  const tsclDaysGoneInfo = (() => {
    const refDate = parseFilterDate(filters.dateTo || filters.dateFrom);
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const monthEnd = new Date(year, month + 1, 0);
    const totalDays = monthEnd.getDate();
    const today = new Date();
    const isCurrentMonth =
      year === today.getFullYear() && month === today.getMonth();
    const cappedDay = isCurrentMonth
      ? Math.min(refDate.getDate(), today.getDate())
      : refDate.getDate();
    const daysGone = Math.max(1, Math.min(cappedDay, totalDays));

    const row = (
      forecastAccuracyMonthlyDaysGoneData as {
        data?: { amount: number; target_value: string | number }[];
      }
    )?.data?.[0];
    const target = row
      ? Number(row.target_value).toLocaleString('en-US', {
          maximumFractionDigits: 0,
        })
      : '-';

    return {
      daysGone,
      totalDays,
      target,
    };
  })();

  const iblAccuracy = (() => {
    const row = (
      forecastAccuracyYearlyData as {
        data?: {
          pct: string | number;
          amount: number;
          target_value: string | number;
        }[];
      }
    )?.data?.[0];
    return row ? Math.round(Number(row.pct) * 100 * 10) / 10 : null;
  })();

  const iblSalesDisplay = (() => {
    const row = (
      forecastAccuracyYearlyData as {
        data?: { amount: number; target_value: string | number }[];
      }
    )?.data?.[0];
    if (!row) return undefined;
    return {
      achieved: Number(row.amount).toLocaleString('en-US', {
        maximumFractionDigits: 0,
      }),
      target: Number(row.target_value).toLocaleString('en-US', {
        maximumFractionDigits: 0,
      }),
    };
  })();

  const iblDaysGoneInfo = (() => {
    const refDate = parseFilterDate(filters.dateTo || filters.dateFrom);
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const monthEnd = new Date(year, month + 1, 0);
    const totalDays = monthEnd.getDate();
    const today = new Date();
    const isCurrentMonth =
      year === today.getFullYear() && month === today.getMonth();
    const cappedDay = isCurrentMonth
      ? Math.min(refDate.getDate(), today.getDate())
      : refDate.getDate();
    const daysGone = Math.max(1, Math.min(cappedDay, totalDays));

    const row = (
      forecastAccuracyYearlyData as {
        data?: { target_value: string | number }[];
      }
    )?.data?.[0];
    const totalBudget = Number(row?.target_value ?? 0);
    const proratedTarget =
      totalDays > 0 ? (totalBudget / totalDays) * daysGone : 0;

    return {
      daysGone,
      totalDays,
      target: proratedTarget.toLocaleString('en-US', {
        maximumFractionDigits: 0,
      }),
    };
  })();

  const iblCategoryRows = (
    (
      forecastAccuracyCategoryYearlyData as {
        data?: {
          classification: string;
          month: string;
          pct: string | number;
        }[];
      }
    )?.data ?? []
  ).map((r) => ({ ...r, month: r.month.trim() }));

  const iblMonths = [...new Set(iblCategoryRows.map((r) => r.month))].sort(
    (a, b) => new Date(`1 ${a}`).getTime() - new Date(`1 ${b}`).getTime()
  );

  const iblBarData: Record<string, string | number>[] = Object.values(
    iblCategoryRows.reduce<Record<string, Record<string, string | number>>>(
      (acc, r) => {
        const label = r.classification || 'Others';
        if (!acc[label]) acc[label] = { classification: label };
        acc[label][r.month] = Math.round(Number(r.pct) * 10) / 10;
        return acc;
      },
      {}
    )
  );

  const forecastCategoryRows = (
    (
      forecastAccuracyCategoryMonthlyData as {
        data?: {
          classification: string;
          month: string;
          pct: string | number;
        }[];
      }
    )?.data ?? []
  ).map((r) => ({ ...r, month: r.month.trim() }));

  const forecastMonths = [
    ...new Set(forecastCategoryRows.map((r) => r.month)),
  ].sort((a, b) => new Date(`1 ${a}`).getTime() - new Date(`1 ${b}`).getTime());

  const forecastBarData: Record<string, string | number>[] = Object.values(
    forecastCategoryRows.reduce<
      Record<string, Record<string, string | number>>
    >((acc, r) => {
      const label = r.classification || 'Others';
      if (!acc[label]) acc[label] = { classification: label };
      acc[label][r.month] = Math.round(Number(r.pct) * 10) / 10;
      return acc;
    }, {})
  );

  return (
    <Flex direction="column" minH="100vh" bg={colors.pageBg}>
      {/* Header */}
      <Box
        bg={colors.headerBg}
        borderBottom="1px solid"
        borderColor="gray.200"
        px={4}
        py={2}
        boxShadow="sm"
      >
        <Flex align="center" gap={3}>
          {/* Logo */}
          <Box flexShrink={0}>
            <img
              width="80px"
              src={`${import.meta.env.BASE_URL}logo.png`}
              style={{ marginBottom: '2px' }}
              alt="Searle"
            />
            <Text fontSize="sm" color="gray.900" fontWeight="semibold">
              SupplyChain Pulse 1.0
            </Text>
          </Box>

          {/* Tabs + toggles */}
          <HeaderActions />

          {/* Quarter label */}
          {/* <HStack flexShrink={0} gap={2}>
            <Box w="1px" h={4} bg="gray.200" />
            <Text
              fontSize="xs"
              fontWeight="600"
              color="gray.500"
              whiteSpace="nowrap"
            >
              Q1 2025 · Jan — Mar
            </Text>
          </HStack> */}

          {/* User menu, in the top-right corner. */}
          <Box ml="auto" flexShrink={0}>
            <UserMenu />
          </Box>
        </Flex>
      </Box>

      {/* Filter Bar */}
      <Box
        px={4}
        py={2}
        bg={colors.headerBg}
        borderBottom="1px solid"
        borderColor="gray.100"
      >
        <FilterBar initialFilters={filters} />
      </Box>

      {/* Page content */}
      <Box flex={1} px={4} py={4} overflowY="auto">
        {mainTab === 'supplyChain' && (
          <SupplyChainTab
            salesRows={salesRows}
            salesTotal={salesTotal}
            coverDaysRows={coverDaysRows}
            tsclAccuracy={tsclAccuracy}
            tsclSalesDisplay={tsclSalesDisplay}
            tsclDaysGoneInfo={tsclDaysGoneInfo}
            forecastBarData={forecastBarData}
            forecastMonths={forecastMonths}
            iblAccuracy={iblAccuracy}
            iblSalesDisplay={iblSalesDisplay}
            iblDaysGoneInfo={iblDaysGoneInfo}
            iblBarData={iblBarData}
            iblMonths={iblMonths}
            isLoadingSales={isLoadingSales}
            isLoadingCoverDays={isLoadingCoverDays || isLoadingCoverDaysTotal}
            isLoadingForecastTscl={isLoadingForecastTscl}
            isLoadingForecastIbl={isLoadingForecastIbl}
            pctSkusData={pctSkusData}
            isLoadingPctSkus={isLoadingIblVsTscl}
            skuCounts={skuCounts}
            benchmarkDays={benchmarkDays}
            endDate={closingDate ?? filters.dateTo}
          />
        )}
        {mainTab === 'serviceMeasure' && (
          <ServiceMeasureTab
            thresholdDays={thresholdDays}
            inventoryDaysData={inventoryDaysData}
            skusThresholdData={skusThresholdData}
            pctSkusData={pctSkusData}
            serviceMeasureData={serviceMeasureData}
            allBranchesServiceMeasureData={allBranchesServiceMeasureData}
            tgtVsActualData={tgtVsActualData}
            classification={filters.classification}
            isLoadingInventoryDays={isLoadingInventoryDays}
            isLoadingServiceMeasure={isLoadingServiceMeasure}
            isLoadingTgtVsActual={isLoadingTgtVsActual}
            isLoadingThreshold={isLoadingThreshold}
            isLoadingPctSkus={isLoadingIblVsTscl}
          />
        )}
        {mainTab === 'regionalDistributor' && (
          <RegionalDistributorTab
            rows={rdStatusRows}
            isLoading={isLoadingRdStatus}
          />
        )}
        {mainTab === 'dispatchWip' && (
          <DispatchWipTab
            dispatchVsOrderData={dispatchVsOrderData}
            wipData={wipData}
            rpmData={rpmData}
            isLoadingDispatch={isLoadingDispatch}
            isLoadingWip={isLoadingWip}
            isLoadingRpm={isLoadingRpm}
          />
        )}
      </Box>
    </Flex>
  );
}
