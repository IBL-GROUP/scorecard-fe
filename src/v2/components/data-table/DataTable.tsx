import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Skeleton,
  Table,
  Text,
} from '@chakra-ui/react';
import { Children, createContext, isValidElement, useContext, useState, type ReactNode } from 'react';
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiDownload,
} from 'react-icons/fi';
import { colors } from '@/v2/constants/theme';
import { InfoTip } from '@/v2/components/overlay';
import { TABLE_HEADER_HELP, type HelpText } from '@/v2/constants/help';
import { EmptyChart } from '@/v2/components/charts/EmptyChart';
import * as XLSX from 'xlsx';
import { recordExport } from '@/v2/features/usage';

/** Name for exports when a table has no title: set by the section around it (e.g. Operational Detail). */
export const ExportNameContext = createContext<string | undefined>(undefined);

export interface DataTableProps {
  title?: string;
  headerGradient: string;
  headers: string[];
  // Two ways to supply rows:
  //  - `children`: legacy mode (all <DataTableRow> elements are built up-front).
  //  - `rows`: data mode — only the visible page's elements are built, so large
  //    datasets (thousands of rows) don't freeze the UI. Prefer this for big tables.
  children?: ReactNode;
  rows?: DataTableRowProps[];
  // Pinned summary row rendered at the very top of the body — not sorted,
  // searched, or paginated. Stays visible on every page.
  totalRow?: DataTableRowProps;
  pageSize?: number;
  searchable?: boolean;
  isLoading?: boolean;
  // Optional controls rendered in the header, left of the search box.
  toolbar?: ReactNode;
  // Server-driven paging and sorting. `rows` then holds ONLY the current page,
  // and the caller refetches on page/sort change instead of the table slicing
  // and sorting in memory. For datasets too large to materialize client-side —
  // see the Sales Details tab, where the full set is ~500k rows. Search stays
  // client-side only, so it's hidden in this mode.
  /** Sum numeric columns into a footer row. Off for tables where a sum means nothing. */
  autoTotal?: boolean;
  server?: {
    totalCount: number;
    page: number;
    onPageChange: (page: number) => void;
    sortCol: number | null;
    sortDir: 'asc' | 'desc';
    onSortChange: (col: number, dir: 'asc' | 'desc') => void;
  };
}

// Normalize either source into plain row records (cheap to filter/sort/slice).
function toRecords(
  children: ReactNode,
  rows?: DataTableRowProps[]
): DataTableRowProps[] {
  if (rows) return rows;
  return Children.toArray(children).map((child) =>
    isValidElement(child)
      ? (child.props as DataTableRowProps)
      : { cells: [] }
  );
}

function compareValues(a: string, b: string): number {
  // Strip formatting (commas, %, etc.) to detect real numbers. Only treat as
  // numeric when BOTH stripped values are non-empty numbers — otherwise text
  // columns (Branch, Team, Brand…) strip to '' → Number('')=0 and every row
  // would compare equal (i.e. wouldn't sort).
  const sa = a.replace(/[^0-9.-]/g, '');
  const sb = b.replace(/[^0-9.-]/g, '');
  const numA = Number(sa);
  const numB = Number(sb);
  if (sa !== '' && sb !== '' && !isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }
  return a.localeCompare(b);
}

// Header names that get a ? explaining them, wherever they appear.
const HEADER_HELP: Record<string, HelpText> = TABLE_HEADER_HELP;
const headerHelp = (h: string): HelpText | undefined => HEADER_HELP[h];

const NUMERIC_RE = /^[-+]?[\d,]*\.?\d+\s*%?$|^-%?$|^—$/;
const GROWTH_HEADER_RE = /growth|grw/i;

// A column is numeric when (nearly) every visible cell parses as a number.
const IDENTIFIER_HEADER_RE = /code|\bid\b/i;

function detectNumericColumns(headers: string[], rows: DataTableRowProps[]): boolean[] {
  return headers.map((header, col) => {
    // Codes are digits but they are labels, not quantities.
    if (IDENTIFIER_HEADER_RE.test(header)) return false;
    let numeric = 0;
    let total = 0;
    for (const r of rows) {
      const c = (r.cells[col] ?? '').trim();
      if (!c) continue;
      total++;
      if (NUMERIC_RE.test(c)) numeric++;
    }
    return total > 0 && numeric / total >= 0.9;
  });
}

function isMissing(cell: string) {
  const c = cell.trim();
  return c === '-' || c === '-%' || c === '' || c === 'NaN%';
}

export function DataTable({
  title,
  headerGradient,
  headers,
  children,
  rows,
  totalRow,
  pageSize = 80,
  searchable = true,
  isLoading = false,
  toolbar,
  server,
  autoTotal = true,
}: DataTableProps) {
  const sectionName = useContext(ExportNameContext);
  const exportName = title ?? sectionName;
  const isServer = !!server;
  const [localPage, setLocalPage] = useState(1);
  const [localSortCol, setLocalSortCol] = useState<number | null>(null);
  const [localSortDir, setLocalSortDir] = useState<'asc' | 'desc'>('asc');
  const [localSearch, setLocalSearch] = useState('');

  // Page and sort live in the caller in server mode (they're query params).
  // Search stays off there — it can only see the loaded page, so filtering
  // would silently hide matches from the rest of the set.
  const currentPage = server ? server.page : localPage;
  const sortCol = server ? server.sortCol : localSortCol;
  const sortDir = server ? server.sortDir : localSortDir;
  const searchQuery = server ? '' : localSearch;
  const showSearch = searchable && !isServer;

  let allRows = toRecords(children, rows);

  if (!isServer && searchable && searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    allRows = allRows.filter((row) =>
      row.cells.some((c) => (c ?? '').toLowerCase().includes(q))
    );
  }

  if (!isServer && sortCol !== null) {
    allRows = [...allRows].sort((a, b) => {
      const cmp = compareValues(a.cells[sortCol] ?? '', b.cells[sortCol] ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  // First click on a column sorts ascending; clicking the same column again
  // flips to descending.
  const handleSort = (col: number) => {
    const nextDir: 'asc' | 'desc' =
      sortCol === col && sortDir === 'asc' ? 'desc' : 'asc';
    if (server) {
      server.onSortChange(col, nextDir);
      return;
    }
    setLocalSortCol(col);
    setLocalSortDir(nextDir);
    setLocalPage(1);
  };

  const totalCount = server ? server.totalCount : allRows.length;
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = isServer ? allRows : allRows.slice(startIndex, startIndex + pageSize);
  const showPagination = totalCount > pageSize;
  const numericCols = detectNumericColumns(headers, pageRows);
  const growthCols = headers.map((h, i) => numericCols[i] && GROWTH_HEADER_RE.test(h));

  // Odoo-style aggregates: sum every quantity column across all (filtered)
  // rows, not just the visible page. Percentages are never summed.
  // Days, dates, codes and cover are never summed (Supply Chain Pulse 2.0).
  const PERCENT_HEADER_RE = /growth|grw|ach|%|days|date|code|cover/i;
  const footerCells: string[] | null = (() => {
    if (totalRow) return totalRow.cells;
    if (isServer || allRows.length === 0 || autoTotal === false) return null;
    let any = false;
    const cells = headers.map((h, col) => {
      if (!numericCols[col] || PERCENT_HEADER_RE.test(h)) return '';
      let sum = 0;
      for (const r of allRows) {
        const c = (r.cells[col] ?? '').trim();
        if (c.endsWith('%')) return '';
        const n = Number(c.replace(/[^0-9.-]/g, ''));
        if (!Number.isNaN(n)) sum += n;
      }
      any = true;
      return sum.toLocaleString(undefined, { maximumFractionDigits: 0 });
    });
    if (!any) return null;
    // Growth isn't a sum: work it out from the summed previous (PMV) and
    // current (CMV) columns, the same way each row's growth is.
    const num = (c: string) => Number(String(c).replace(/[^0-9.-]/g, ''));
    const pmvCol = headers.findIndex((h, i) => numericCols[i] && /\bpmv\b|previous/i.test(h));
    const cmvCol = headers.findIndex((h, i) => numericCols[i] && /\bcmv\b|current/i.test(h));
    headers.forEach((h, i) => {
      if (!GROWTH_HEADER_RE.test(h) || pmvCol < 0 || cmvCol < 0) return;
      const pmv = num(cells[pmvCol]);
      const cmv = num(cells[cmvCol]);
      if (pmv > 0) cells[i] = `${Math.round(((cmv - pmv) / pmv) * 100)}%`;
    });
    // The first column names the row, like Odoo's aggregate line.
    if (!cells[0]) cells[0] = 'Total';
    return cells;
  })();

  const handleExport = () => {
    const toRecord = (cells: string[]) => Object.fromEntries(headers.map((h, col) => [h, cells[col] ?? '']));
    const data = allRows.map((row) => toRecord(row.cells));
    // The Total row the table shows is exported too (GAP-024, Supply Chain Pulse 2.0).
    if (footerCells) data.push(toRecord(footerCells));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${exportName ?? 'export'}.xlsx`);
    // Engagement report: who exported what (FEAT-USG).
    recordExport(exportName);
  };

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const goTo = (p: number) => {
    // Odoo's pager wraps around at either end.
    const next = p < 1 ? pageCount : p > pageCount ? 1 : p;
    (server ? server.onPageChange : setLocalPage)(next);
  };
  const pagerBtn = {
    h: '28px',
    w: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    bg: colors.sunkBg,
    color: colors.darkText,
    cursor: 'pointer',
    _hover: { bg: colors.border },
  } as const;

  return (
    <Box
      data-table-root
      bg={colors.cardBg}
      border="1px solid"
      borderColor={colors.border}
      borderRadius="4px"
      overflow="hidden"
      // Fills whatever height the tab gives it; rows scroll inside, never the page.
      h="100%"
      minH={0}
      display="flex"
      flexDirection="column"
    >
      {(title || searchable || toolbar) && (
        <Flex
          flexShrink={0}
          align="center"
          justify="space-between"
          px={3}
          py={2}
          gap={3}
          wrap="wrap"
          borderBottom="1px solid"
          borderColor={colors.border}
        >
          {title && (
            <Text fontSize="14.5px" fontWeight={600} color={colors.darkText} flexShrink={0}>
              {title}
            </Text>
          )}
          {toolbar}
          <HStack gap={2} ml="auto">
            {showSearch && (
              <Input
                size="sm"
                h="30px"
                placeholder="Find in this list…"
                value={searchQuery}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setLocalPage(1);
                }}
                maxW="220px"
                borderRadius="4px"
                fontSize="13px"
              />
            )}
            <Button
              size="sm"
              h="30px"
              bg={colors.sunkBg}
              color={colors.darkText}
              _hover={{ bg: colors.border }}
              borderRadius="4px"
              onClick={handleExport}
              flexShrink={0}
              title={isServer ? 'Export the current page' : 'Export all rows in this list'}
            >
              <FiDownload /> Export{isServer ? ' page' : ''}
            </Button>
            {!isLoading && totalCount > 0 && (
              <HStack gap={2} pl={1}>
                <Text fontSize="13px" color={colors.bodyText} fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                  <b style={{ color: colors.darkText }}>
                    {startIndex + 1}-{Math.min(startIndex + pageSize, totalCount)}
                  </b>{' '}
                  / {totalCount.toLocaleString()}
                </Text>
                {showPagination && (
                  <HStack gap={0}>
                    <Box as="button" aria-label="Previous page" {...pagerBtn} borderLeftRadius="4px" onClick={() => goTo(currentPage - 1)}>
                      <FiChevronLeft />
                    </Box>
                    <Box as="button" aria-label="Next page" {...pagerBtn} borderRightRadius="4px" borderLeft={`1px solid ${colors.cardBg}`} onClick={() => goTo(currentPage + 1)}>
                      <FiChevronRight />
                    </Box>
                  </HStack>
                )}
              </HStack>
            )}
          </HStack>
        </Flex>
      )}
      {/* Focusable so keyboard users can scroll the table (WCAG 2.1.1, story S5). */}
      <Box
        overflow="auto"
        flex={1}
        minH={{ base: '320px', lg: 0 }}
        maxH={{ base: '70vh', lg: 'none' }}
        tabIndex={0}
        role="region"
        aria-label={exportName ?? 'Table'}
        _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: '-2px' }}
      >
        <Table.Root
          size="sm"
          w="full"
          borderTopRadius="none"
          stickyHeader
          overflow="visible"
          borderRadius="0"
        >
          {/* The whole header pins, not each row: the recipe makes every <tr>
              sticky at top 0, which would stack the Total row on top of the
              column names instead of under them. */}
          <Table.Header
            position="sticky"
            top={0}
            zIndex={2}
            bg={colors.cardBg}
            css={{ '& tr': { position: 'static' } }}
          >
            <Table.Row style={{ background: headerGradient }}>
              {headers.map((h, i) => (
                <Table.ColumnHeader
                  key={i}
                  onClick={() => handleSort(i)}
                  cursor="pointer"
                  userSelect="none"
                  textAlign={numericCols[i] ? 'end' : 'start'}
                  _hover={{ bg: colors.hoverBg }}
                  className="dt-th"
                >
                  <HStack
                    gap={1}
                    display="inline-flex"
                    flexDirection={numericCols[i] ? 'row-reverse' : 'row'}
                  >
                    <span>{h}</span>
                    {headerHelp(h) && <InfoTip help={headerHelp(h)!} size={12} />}
                    <Box
                      color={colors.mutedText}
                      opacity={sortCol === i ? 1 : 0}
                      css={{ '.dt-th:hover &': { opacity: 0.6 } }}
                    >
                      {sortCol === i && sortDir === 'desc' ? (
                        <FiChevronDown size={13} />
                      ) : (
                        <FiChevronUp size={13} />
                      )}
                    </Box>
                  </HStack>
                </Table.ColumnHeader>
              ))}
            </Table.Row>
            {/* Totals sit right under the column names and stay pinned with
                them, so the total is always in view while scrolling. */}
            {!isLoading && totalCount > 0 && footerCells && (
              <DataTableRow
                cells={footerCells}
                cellColors={totalRow?.cellColors}
                cellWeights={totalRow?.cellWeights}
                numericCols={numericCols}
                growthCols={growthCols}
                isTotal
              />
            )}
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, rowIdx) => (
                <Table.Row key={rowIdx} opacity={1 - rowIdx * 0.07}>
                  {headers.map((_, colIdx) => (
                    <Table.Cell key={colIdx} py={2}>
                      <Skeleton
                        height="12px"
                        width={`${65 + ((rowIdx * 13 + colIdx * 17) % 30)}%`}
                        borderRadius="sm"
                      />
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))
            ) : totalCount === 0 ? (
              <Table.Row _hover={{ bg: 'transparent' }}>
                <Table.Cell colSpan={headers.length} border="none">
                  <EmptyChart height={200} />
                </Table.Cell>
              </Table.Row>
            ) : (
              pageRows.map((r, i) => (
                <DataTableRow
                  key={startIndex + i}
                  cells={r.cells}
                  cellColors={r.cellColors}
                  cellWeights={r.cellWeights}
                  isTotal={r.isTotal}
                  onClick={r.onClick}
                  numericCols={numericCols}
                  growthCols={growthCols}
                />
              ))
            )}
          </Table.Body>

        </Table.Root>
      </Box>
    </Box>
  );
}

export interface DataTableRowProps {
  cells: string[];
  isTotal?: boolean;
  cellColors?: (string | undefined)[];
  cellWeights?: (string | undefined)[];
  // Makes the row clickable — used by drill-down tables where a row opens a
  // deeper view.
  onClick?: () => void;
  /** Set by DataTable: right-align these columns. */
  numericCols?: boolean[];
  /** Set by DataTable: tint these columns green/red by sign. */
  growthCols?: boolean[];
}

export function DataTableRow({
  cells,
  isTotal = false,
  cellColors,
  cellWeights,
  onClick,
  numericCols,
  growthCols,
}: DataTableRowProps) {
  return (
    <Table.Row
      data-total-row={isTotal || undefined}
      bg={isTotal ? colors.pageBg : undefined}
      fontWeight={isTotal ? 'bold' : undefined}
      _odd={isTotal ? { bg: colors.pageBg } : undefined}
      _even={isTotal ? { bg: colors.pageBg } : undefined}
      _hover={isTotal ? { bg: colors.pageBg } : undefined}
      cursor={onClick ? 'pointer' : undefined}
      onClick={onClick}
    >
      {cells.map((cell, i) => {
        // Totals leave non-summable columns empty, like Odoo's aggregate row.
        const missing = !(isTotal && !cell) && isMissing(cell ?? '');
        const n = parseFloat(String(cell).replace(/[^0-9.-]/g, ''));
        const tone =
          growthCols?.[i] && !missing && !Number.isNaN(n) && n !== 0
            ? n > 0
              ? 'good'
              : 'bad'
            : null;
        return (
          <Table.Cell
            key={i}
            textAlign={numericCols?.[i] ? 'end' : 'start'}
            fontVariantNumeric="tabular-nums"
            color={
              cellColors?.[i] ??
              (missing ? colors.mutedText : tone === 'good' ? colors.good : tone === 'bad' ? colors.bad : undefined)
            }
            fontWeight={cellWeights?.[i] ?? (tone ? 600 : undefined)}
          >
            {missing ? '—' : tone ? `${n > 0 ? '▲' : '▼'} ${String(cell).replace(/^-/, '')}` : cell}
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
}
