import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useGetFilterBranches, useGetFilters } from '@/api/filters';
import {
  useGetRdStatus,
  rdStatusDate,
  type RdStatusApiRow,
} from '@/api/rdStatus';
import { DatePicker } from '@/components/date-picker';
import { Select } from '@/components/select';
import { MultiSelect } from '@/components/select/MultiSelect';
import { colors } from '@/constants/theme';
import {
  resetFilters,
  setFilter,
  type UploadCountFilter,
} from '@/features/salesDashboard/salesDashboardSlice';
import { Button, Flex, Grid } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';

interface Filters {
  classification: string;
  branch: string[];
  sku: string[];
  distributor: string[];
  branchName: string[];
  distributorName: string[];
  uploadCount: UploadCountFilter;
  dateFrom: string;
  dateTo: string;
}

export interface FilterBarProps {
  initialFilters: Filters;
}

type FilterRow = {
  item_code?: string;
  item_description?: string;
  sap_code?: string;
  item_desc?: string;
  classification: string | null;
};

const CLS_LABEL: Record<string, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
};

// Did the RD upload stock for the selected date? "Uploaded" is a current stock
// count of 1 or more; "Not Uploaded" is 0, meaning it is still carrying the
// figure from an earlier upload.
const UPLOAD_COUNT_OPTIONS: { value: UploadCountFilter; label: string }[] = [
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'not-uploaded', label: 'Not Uploaded' },
];

export function FilterBar({ initialFilters }: FilterBarProps) {
  const dispatch = useAppDispatch();
  const mainTab = useAppSelector((state) => state.salesDashboard.mainTab);
  const isDispatchWip = mainTab === 'dispatchWip';
  // RD Status reads a different database, so it carries its own two filters
  // (branch + distributor, both drawn from the RD list) and a single as-of
  // date rather than a range.
  const isRdStatus = mainTab === 'regionalDistributor';
  const hideBranchAndSku = isDispatchWip || isRdStatus;
  const hideClassification = isDispatchWip || isRdStatus;

  // All filters staged locally — only flushed to Redux on Apply
  const [localClassification, setLocalClassification] = useState(
    initialFilters.classification
  );
  const [localBranch, setLocalBranch] = useState(initialFilters.branch);
  const [localSku, setLocalSku] = useState(initialFilters.sku);
  const [localDistributor, setLocalDistributor] = useState(
    initialFilters.distributor
  );
  const [localBranchName, setLocalBranchName] = useState(
    initialFilters.branchName
  );
  const [localDistributorName, setLocalDistributorName] = useState(
    initialFilters.distributorName
  );
  const [localUploadCount, setLocalUploadCount] = useState<UploadCountFilter>(
    initialFilters.uploadCount
  );
  const [localDateFrom, setLocalDateFrom] = useState(initialFilters.dateFrom);
  const [localDateTo, setLocalDateTo] = useState(initialFilters.dateTo);

  // Sync local state when Redux is reset externally (e.g. clear button)
  useEffect(() => {
    setLocalClassification(initialFilters.classification);
    setLocalBranch(initialFilters.branch);
    setLocalSku(initialFilters.sku);
    setLocalDistributor(initialFilters.distributor);
    setLocalDateFrom(initialFilters.dateFrom);
    setLocalDateTo(initialFilters.dateTo);
  }, [
    initialFilters.classification,
    initialFilters.branch,
    initialFilters.sku,
    initialFilters.distributor,
    initialFilters.dateFrom,
    initialFilters.dateTo,
  ]);

  const isDirty =
    localClassification !== initialFilters.classification ||
    localDateFrom !== initialFilters.dateFrom ||
    localDateTo !== initialFilters.dateTo ||
    localBranch.join(',') !== initialFilters.branch.join(',') ||
    localSku.join(',') !== initialFilters.sku.join(',') ||
    localDistributor.join(',') !== initialFilters.distributor.join(',') ||
    localBranchName.join(',') !== initialFilters.branchName.join(',') ||
    localDistributorName.join(',') !== initialFilters.distributorName.join(',') ||
    localUploadCount !== initialFilters.uploadCount;

  const hasActiveFilters =
    !!localClassification ||
    localBranch.length > 0 ||
    localSku.length > 0 ||
    localDistributor.length > 0 ||
    !!localDateFrom ||
    !!localDateTo;

  const handleApply = () => {
    dispatch(setFilter({ key: 'classification', value: localClassification }));
    dispatch(setFilter({ key: 'branch', value: localBranch }));
    dispatch(setFilter({ key: 'sku', value: localSku }));
    dispatch(setFilter({ key: 'distributor', value: localDistributor }));
    dispatch(setFilter({ key: 'branchName', value: localBranchName }));
    dispatch(setFilter({ key: 'distributorName', value: localDistributorName }));
    dispatch(setFilter({ key: 'uploadCount', value: localUploadCount }));
    dispatch(setFilter({ key: 'dateFrom', value: localDateFrom }));
    dispatch(setFilter({ key: 'dateTo', value: localDateTo }));
  };

  const handleClear = () => {
    setLocalClassification('');
    setLocalBranch([]);
    setLocalSku([]);
    setLocalDistributor([]);
    setLocalDateFrom('');
    setLocalDateTo('');
    dispatch(resetFilters());
  };

  const { data: filtersData } = useGetFilters({});
  const rows: FilterRow[] = (filtersData as { data?: FilterRow[] })?.data ?? [];

  const { data: branchesData } = useGetFilterBranches({});
  type BranchRow = {
    /** mv_scoreboard_hub_mapping — what /filters/branches returns now. */
    hub_branch_code?: string | number;
    hub_branch_desc?: string;
    storage_location_code?: string | number;
    branch_id?: string;
    branch_desc?: string;
    sale_loc?: string;
    sale_loc_desc?: string;
  };
  const branchRows: BranchRow[] =
    (branchesData as { data?: BranchRow[] })?.data ?? [];

  const classificationOptions = useMemo(() => {
    const seen = new Set<string>();
    return rows
      .filter(
        (r) =>
          r.classification != null &&
          !seen.has(r.classification) &&
          seen.add(r.classification)
      )
      .sort((a, b) =>
        (a.classification as string).localeCompare(b.classification as string)
      )
      .map((r) => ({
        value: r.classification as string,
        label:
          CLS_LABEL[r.classification as string] ?? (r.classification as string),
      }));
  }, [rows]);

  // One option per hub branch, sorted by name. /filters/branches returns one row
  // per storage location (mv_scoreboard_hub_mapping), so a hub repeats and is
  // deduped by its code — the code the reports filter their branch by.
  const branchOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    for (const r of branchRows) {
      const value = String(
        r.hub_branch_code ?? r.branch_id ?? r.sale_loc ?? ''
      ).trim();
      const label = String(
        r.hub_branch_desc ?? r.branch_desc ?? r.sale_loc_desc ?? ''
      ).trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      options.push({ value, label: label || value });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [branchRows]);

  // RD branch/distributor lists come from the RD Status response itself —
  // same query key as the tab, so both share one request.
  const { data: rdStatusData } = useGetRdStatus({
    date: rdStatusDate(initialFilters.dateTo),
  });
  const rdRows: RdStatusApiRow[] =
    (rdStatusData as { data?: RdStatusApiRow[] })?.data ?? [];

  // Code and name are offered as separate dropdowns, so each list carries only
  // its own kind of value. Codes sort numerically (8009 before 8010, which a
  // plain string sort gets backwards); names sort alphabetically.
  const byCode = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label, undefined, { numeric: true });
  const byName = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label);

  // Codes come back as numbers on some rows and strings on others, so
  // everything is normalised to a trimmed string before it becomes an option.
  const uniqueOptions = (values: (string | number | null | undefined)[]) => {
    const seen = new Set<string>();
    for (const v of values) {
      // branch_desc is a padded char column — trim before it reaches a label.
      const text = String(v ?? '').trim();
      if (text) seen.add(text);
    }
    return [...seen].map((value) => ({ value, label: value }));
  };

  // Distributor lists are scoped by whichever branch filters are set, so
  // picking a branch narrows the RDs on offer rather than listing all of them.
  const rdRowsForDistributor = useMemo(() => {
    if (localBranch.length === 0 && localBranchName.length === 0) return rdRows;
    return rdRows.filter(
      (r) =>
        (localBranch.length === 0 ||
          localBranch.includes(String(r.branch_code ?? '').trim())) &&
        (localBranchName.length === 0 ||
          localBranchName.includes(String(r.branch_desc ?? '').trim()))
    );
  }, [rdRows, localBranch, localBranchName]);

  const rdBranchCodeOptions = useMemo(
    () => uniqueOptions(rdRows.map((r) => r.branch_code)).sort(byCode),
    [rdRows]
  );

  const rdBranchNameOptions = useMemo(
    () => uniqueOptions(rdRows.map((r) => r.branch_desc)).sort(byName),
    [rdRows]
  );

  const rdDistributorCodeOptions = useMemo(
    () =>
      uniqueOptions(
        rdRowsForDistributor.map((r) => r.ibl_distributor_code)
      ).sort(byCode),
    [rdRowsForDistributor]
  );

  const rdDistributorNameOptions = useMemo(
    () =>
      uniqueOptions(rdRowsForDistributor.map((r) => r.distributor_desc)).sort(
        byName
      ),
    [rdRowsForDistributor]
  );

  const skuOptions = useMemo(() => {
    const seen = new Set<string>();
    return rows
      .map((r) => ({
        code: r.item_code ?? r.sap_code ?? '',
        description: r.item_description ?? r.item_desc ?? '',
        classification: r.classification,
      }))
      .filter(
        (r) =>
          r.code &&
          (!localClassification || r.classification === localClassification) &&
          !seen.has(r.code) &&
          seen.add(r.code)
      )
      .map((r) => ({ value: r.code, label: r.description }));
  }, [rows, localClassification]);

  return (
    <Flex align="center" gap={2} w="100%">
      <Flex
        position="relative"
        bg={colors.filterBarBg}
        border="1px solid"
        borderColor="gray.200"
        borderRadius="lg"
        align="center"
        w="100%"
        py={1}
        px={2}
        zIndex={10}
        gap={3}
        flexWrap={{ base: 'wrap', xl: 'nowrap' }}
      >
        <Grid
          gap={3}
          flex={{ base: '1 0 100%', xl: 1 }}
          // RD Status carries five filters — give it its own track count so
          // they sit on one line instead of wrapping onto a second row.
          // minmax(0, 1fr) rather than 1fr: a select's own min-content width
          // would otherwise push the tracks wider than the bar and overflow.
          templateColumns={
            isRdStatus
              ? {
                  base: 'repeat(1, minmax(0, 1fr))',
                  md: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                  xl: 'repeat(5, minmax(0, 1fr))',
                }
              : {
                  base: 'repeat(1, 1fr)',
                  md: 'repeat(2, 1fr)',
                  lg: 'repeat(3, 1fr)',
                }
          }
        >
          {!hideClassification && (
            /* Classification — single select */
            <Select
              label="Classification"
              value={localClassification}
              options={classificationOptions}
              onChange={(v) => setLocalClassification(v)}
              isClearable
              placeholder="Select..."
            />
          )}

          {!hideBranchAndSku && (
            <>
              {/* SKU — multi select */}
              <MultiSelect
                label="SKU"
                value={localSku}
                options={skuOptions}
                onChange={(v) => setLocalSku(v)}
                isClearable
                placeholder="Select..."
              />

              {/* Branches — multi select */}
              <MultiSelect
                label="Branches"
                value={localBranch}
                options={branchOptions}
                onChange={(v) => setLocalBranch(v)}
                isClearable
                placeholder="Select..."
              />
            </>
          )}

          {isRdStatus && (
            <>
              {/* Branch Code — franchise branch ids from the RD list */}
              <MultiSelect
                label="Branch Code"
                value={localBranch}
                options={rdBranchCodeOptions}
                onChange={(v) => {
                  setLocalBranch(v);
                  // Distributors are scoped to the chosen branches — drop any
                  // selection that no longer belongs to one.
                  setLocalDistributor((prev) =>
                    v.length === 0
                      ? prev
                      : prev.filter((code) =>
                          rdRows.some(
                            (r) =>
                              String(r.ibl_distributor_code).trim() === code &&
                              v.includes(String(r.branch_code ?? '').trim())
                          )
                        )
                  );
                }}
                isClearable
                placeholder="Select..."
              />

              {/* Branch — the same branches picked by name */}
              <MultiSelect
                label="Branch"
                value={localBranchName}
                options={rdBranchNameOptions}
                onChange={(v) => setLocalBranchName(v)}
                isClearable
                placeholder="Select..."
              />

              {/* Distributor Code — RD ids, scoped by the branch pickers */}
              <MultiSelect
                label="Distributor Code"
                value={localDistributor}
                options={rdDistributorCodeOptions}
                onChange={(v) => setLocalDistributor(v)}
                isClearable
                placeholder="Select..."
              />

              {/* Distributor — the same RDs picked by name */}
              <MultiSelect
                label="Distributor"
                value={localDistributorName}
                options={rdDistributorNameOptions}
                onChange={(v) => setLocalDistributorName(v)}
                isClearable
                placeholder="Select..."
              />

              {/* Upload Count — did this RD upload for the selected date? */}
              <Select
                label="Upload Count"
                value={localUploadCount}
                options={UPLOAD_COUNT_OPTIONS}
                onChange={(v) => setLocalUploadCount((v ?? '') as UploadCountFilter)}
                isClearable
                placeholder="Select..."
              />
            </>
          )}
        </Grid>

        <Flex align="center" flexShrink={0}>
          {/* RD Status is a position on one date, not a range — one picker. */}
          {!isRdStatus && (
            <DatePicker
              value={localDateFrom}
              onChange={setLocalDateFrom}
              placeholder="From"
              variant="range-start"
            />
          )}
          <DatePicker
            value={localDateTo}
            onChange={setLocalDateTo}
            placeholder={isRdStatus ? 'As of' : 'To'}
            variant={isRdStatus ? 'outline' : 'range-end'}
            minDate={isRdStatus ? undefined : localDateFrom || undefined}
          />
        </Flex>

        <Flex align="center" gap={2} flexShrink={0}>
          <Button
            size="sm"
            borderRadius="md"
            bg={isDirty ? 'blue.500' : 'white'}
            color={isDirty ? 'white' : 'gray.400'}
            border="1px solid"
            borderColor={isDirty ? 'blue.500' : 'gray.300'}
            disabled={!isDirty}
            _hover={{ bg: 'blue.600', color: 'white', borderColor: 'blue.600' }}
            onClick={handleApply}
          >
            Apply
          </Button>
          <Button
            size="sm"
            borderRadius="md"
            bg="white"
            border="1px solid"
            borderColor={hasActiveFilters ? 'red.400' : 'gray.300'}
            color={hasActiveFilters ? 'red.500' : 'gray.400'}
            disabled={!hasActiveFilters}
            _hover={{ borderColor: 'red.400', color: 'red.500' }}
            onClick={handleClear}
          >
            Clear
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
