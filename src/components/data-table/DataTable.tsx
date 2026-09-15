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
import {
  Children,
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  FiArrowDown,
  FiArrowUp,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiMinus,
  FiPlus,
} from 'react-icons/fi';
import { colors, gradients } from '@/constants/theme';
import { TablePagination } from '@/components/pagination';
import { recordExport } from '@/utils/usage';
import * as XLSX from 'xlsx';

export interface SubRowData {
  cells: string[];
  cellColors?: (string | undefined)[];
  cellWeights?: (string | undefined)[];
}

export interface DataTableProps {
  title?: string;
  /** Export filename when the table renders without a visible title. */
  exportName?: string;
  headerGradient: string;
  headers: string[];
  children: ReactNode;
  pageSize?: number;
  searchable?: boolean;
  isLoading?: boolean;
  collapsible?: boolean;
  rowCollapsible?: boolean;
  maxHeight?: string;
  height?: string;
  minHeight?: string;
  colAligns?: ('left' | 'right' | 'center')[];
  colWidths?: (string | undefined)[];
  headerActions?: ReactNode;
  filterRow?: ReactNode;
  headerMinH?: string;
  stickyFirstCol?: boolean;
}

function getCellValue(child: ReactNode, col: number): string {
  if (isValidElement(child)) {
    const cells = (child.props as { cells?: string[] }).cells;
    return cells?.[col] ?? '';
  }
  return '';
}

function compareValues(a: string, b: string): number {
  const numA = Number(a.replace(/[^0-9.-]/g, ''));
  const numB = Number(b.replace(/[^0-9.-]/g, ''));
  if (!isNaN(numA) && !isNaN(numB) && a !== '' && b !== '') {
    return numA - numB;
  }
  return a.localeCompare(b);
}

export function DataTable({
  title,
  exportName,
  // headerGradient,
  headers,
  children,
  pageSize = 15,
  searchable = true,
  isLoading = false,
  collapsible = false,
  rowCollapsible = false,
  maxHeight,
  height,
  minHeight,
  colAligns,
  colWidths,
  headerActions,
  filterRow,
  headerMinH,
  stickyFirstCol = false,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const allChildren = Children.toArray(children);

  // Separate top-pinned rows (always visible at top, outside sort/pagination)
  const pinnedTopRows = allChildren.filter(
    (row) =>
      isValidElement(row) && (row.props as { pinnedTop?: boolean }).pinnedTop
  );
  // Separate bottom-pinned total rows (always visible at bottom, outside pagination)
  const pinnedRows = allChildren.filter(
    (row) =>
      isValidElement(row) &&
      (row.props as { isTotal?: boolean }).isTotal &&
      !(row.props as { pinnedTop?: boolean }).pinnedTop
  );
  let allRows = allChildren.filter(
    (row) =>
      !(isValidElement(row) && (row.props as { isTotal?: boolean }).isTotal) &&
      !(isValidElement(row) && (row.props as { pinnedTop?: boolean }).pinnedTop)
  );

  if (searchable && searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    allRows = allRows.filter((row) =>
      headers.some((_, col) => getCellValue(row, col).toLowerCase().includes(q))
    );
  }

  if (sortCol !== null) {
    allRows = [...allRows].sort((a, b) => {
      const valA = getCellValue(a, sortCol);
      const valB = getCellValue(b, sortCol);
      const cmp = compareValues(valA, valB);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const handleSort = (col: number) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const totalCount = allRows.length;
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = allRows.slice(startIndex, startIndex + pageSize);
  const showPagination = totalCount > pageSize;

  const renderedRows = pageRows.map((row, i) =>
    isValidElement(row)
      ? cloneElement(row as ReactElement<DataTableRowProps>, {
          ...(rowCollapsible && { showToggleCol: true }),
          ...(colAligns && { colAligns }),
          ...(stickyFirstCol && { stickyFirstCol: true }),
          key: i,
        })
      : row
  );

  const renderedPinnedRows = pinnedRows.map((row, i) =>
    isValidElement(row)
      ? cloneElement(row as ReactElement<DataTableRowProps>, {
          ...(rowCollapsible && { showToggleCol: true }),
          ...(colAligns && { colAligns }),
          ...(stickyFirstCol && { stickyFirstCol: true }),
          key: `pinned-${i}`,
        })
      : row
  );

  const renderedPinnedTopRows = pinnedTopRows.map((row, i) =>
    isValidElement(row)
      ? cloneElement(row as ReactElement<DataTableRowProps>, {
          ...(rowCollapsible && { showToggleCol: true }),
          ...(colAligns && { colAligns }),
          ...(stickyFirstCol && { stickyFirstCol: true }),
          stickyRow: true,
          key: `pinned-top-${i}`,
        })
      : row
  );

  const handleExport = () => {
    const data: Record<string, string>[] = [];
    allRows.forEach((row) => {
      data.push(
        Object.fromEntries(headers.map((h, col) => [h, getCellValue(row, col)]))
      );
      if (isValidElement(row)) {
        const subRows = (row.props as { subRows?: SubRowData[] }).subRows;
        subRows?.forEach((sub) => {
          data.push(
            Object.fromEntries(
              headers.map((h, col) => [h, sub.cells[col] ?? ''])
            )
          );
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${exportName ?? title ?? 'export'}.xlsx`);
    recordExport(exportName ?? title);
  };

  return (
    <Box
      bg={colors.cardBg}
      backdropFilter="blur(10px)"
      borderRadius="lg"
      boxShadow="md"
      h="100%"
    >
      {(title || searchable || collapsible) && (
        <Flex
          align="center"
          justify="space-between"
          px={3}
          py={2}
          gap={3}
          minH={headerMinH}
        >
          <HStack gap={2} flexShrink={0}>
            {collapsible && (
              <Button
                size="xs"
                variant="ghost"
                px={1}
                color="gray.500"
                _hover={{ color: 'gray.800', bg: 'gray.100' }}
                onClick={() => setIsCollapsed((c) => !c)}
                aria-label={isCollapsed ? 'Expand rows' : 'Collapse rows'}
                title={isCollapsed ? 'Expand rows' : 'Collapse rows'}
              >
                {isCollapsed ? (
                  <FiChevronDown size={16} />
                ) : (
                  <FiChevronUp size={16} />
                )}
              </Button>
            )}
            {title && (
              <Text
                fontSize="md"
                fontWeight="black"
                color="gray.800"
                textTransform="uppercase"
                flexShrink={0}
              >
                {title}
              </Text>
            )}
          </HStack>
          <HStack
            gap={2}
            w="100%"
            justifyContent={'flex-end'}
            alignItems={'flex-end'}
            ml="auto"
          >
            {headerActions}
            {searchable && (
              <Input
                size="sm"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                maxW="170px"
                borderRadius="md"
              />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              flexShrink={0}
            >
              <FiDownload /> Export
            </Button>
          </HStack>
        </Flex>
      )}
      {filterRow && (
        <Flex
          align="center"
          px={3}
          py={2}
          gap={2}
          borderBottom="1px solid"
          borderColor="gray.100"
        >
          {filterRow}
        </Flex>
      )}
      <Box
        overflowX="auto"
        overflowY="auto"
        maxH={maxHeight}
        h={height}
        minH={minHeight}
        css={{
          '& thead tr': {
            position: 'sticky',
            top: 0,
            zIndex: 4,
          },
          ...(stickyFirstCol && {
            '& thead tr th:nth-of-type(1)': {
              position: 'sticky',
              left: 0,
              zIndex: 3,
            },
            '& tbody tr td:nth-of-type(1)': {
              position: 'sticky',
              left: 0,
              zIndex: 1,
              background: 'white',
            },
            ...(rowCollapsible
              ? {
                  '& thead tr th:nth-of-type(2)': {
                    position: 'sticky',
                    left: '34px',
                    zIndex: 3,
                    boxShadow: '2px 0 4px rgba(0,0,0,0.08)',
                  },
                  '& tbody tr td:nth-of-type(2)': {
                    position: 'sticky',
                    left: '34px',
                    zIndex: 1,
                    background: 'white',
                    boxShadow: '2px 0 4px rgba(0,0,0,0.08)',
                  },
                }
              : {
                  '& thead tr th:nth-of-type(1)': {
                    boxShadow: '2px 0 4px rgba(0,0,0,0.08)',
                  },
                  '& tbody tr td:nth-of-type(1)': {
                    boxShadow: '2px 0 4px rgba(0,0,0,0.08)',
                  },
                }),
          }),
        }}
      >
        <Table.Root
          size="sm"
          w="full"
          borderTopRadius="none"
          overflowX="auto"
          overflowY="auto"
        >
          <Table.Header>
            <Table.Row style={{ background: 'inherit' }}>
              {rowCollapsible && <Table.ColumnHeader w="40px" />}
              {headers.map((h, i) => (
                <Table.ColumnHeader
                  key={i}
                  onClick={() => handleSort(i)}
                  cursor="pointer"
                  userSelect="none"
                  _hover={{ opacity: 1 }}
                  textAlign={colAligns?.[i] ?? 'left'}
                  w={colWidths?.[i]}
                >
                  <HStack
                    gap={1}
                    display="inline-flex"
                    justifyContent={
                      colAligns?.[i] === 'right'
                        ? 'flex-end'
                        : colAligns?.[i] === 'center'
                          ? 'center'
                          : 'flex-start'
                    }
                  >
                    <span>{h}</span>
                    {sortCol === i ? (
                      sortDir === 'asc' ? (
                        <FiArrowUp size={12} />
                      ) : (
                        <FiArrowDown size={12} />
                      )
                    ) : (
                      <Box
                        display="flex"
                        flexDirection="column"
                        opacity={0.35}
                        lineHeight={1}
                      >
                        <FiArrowUp size={9} />
                        <FiArrowDown size={9} />
                      </Box>
                    )}
                  </HStack>
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          {!isCollapsed && (
            <Table.Body>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, rowIdx) => (
                  <Table.Row key={rowIdx} opacity={1 - rowIdx * 0.07}>
                    {rowCollapsible && <Table.Cell w="40px" />}
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
              ) : renderedRows.length === 0 &&
                pinnedRows.length === 0 &&
                pinnedTopRows.length === 0 ? (
                <Table.Row>
                  <Table.Cell
                    colSpan={headers.length + (rowCollapsible ? 1 : 0)}
                    textAlign="center"
                    py={8}
                    color="gray.400"
                    fontSize="sm"
                    fontWeight="500"
                  >
                    No data found
                  </Table.Cell>
                </Table.Row>
              ) : (
                <>
                  {renderedPinnedTopRows}
                  {renderedRows}
                  {renderedPinnedRows}
                </>
              )}
            </Table.Body>
          )}
        </Table.Root>
      </Box>

      {!isCollapsed && showPagination && (
        <HStack
          justify="space-between"
          align="center"
          px={3}
          py={2}
          borderTop="1px solid"
          borderColor="gray.100"
          flexWrap="wrap"
          gap={2}
        >
          <Text fontSize="xs" color="gray.500">
            {startIndex + 1}–{Math.min(startIndex + pageSize, totalCount)} of{' '}
            {totalCount} rows
          </Text>
          <TablePagination
            count={totalCount}
            pageSize={pageSize}
            page={currentPage}
            onPageChange={setCurrentPage}
          />
          <Text fontSize="xs" color="gray.500"></Text>
        </HStack>
      )}
    </Box>
  );
}

export interface DataTableRowProps {
  cells: string[];
  isTotal?: boolean;
  pinnedTop?: boolean;
  rowBg?: string;
  cellColors?: (string | undefined)[];
  cellWeights?: (string | undefined)[];
  cellNodes?: (ReactNode | undefined)[];
  subRows?: SubRowData[];
  /** Injected by DataTable when rowCollapsible={true} */
  showToggleCol?: boolean;
  /** Injected by DataTable from colAligns prop */
  colAligns?: ('left' | 'right' | 'center')[];
  /** Makes this row sticky below the thead when scrolling */
  stickyRow?: boolean;
  /** Injected by DataTable when stickyFirstCol={true} — carries row bg to sticky cells */
  stickyFirstCol?: boolean;
  onRowClick?: () => void;
}

export function DataTableRow({
  cells,
  isTotal = false,
  rowBg,
  cellColors,
  cellWeights,
  cellNodes,
  subRows,
  showToggleCol = false,
  colAligns,
  stickyRow = false,
  stickyFirstCol = false,
  onRowClick,
}: DataTableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubRows = showToggleCol && subRows && subRows.length > 0;

  const resolvedBg = isTotal ? gradients.totalRow : rowBg;

  return (
    <>
      <Table.Row
        style={{
          ...(resolvedBg ? { background: resolvedBg } : {}),
          ...(stickyRow
            ? {
                position: 'sticky',
                top: '36px',
                zIndex: 3,
                background: resolvedBg ?? '#ffffff',
              }
            : {}),
        }}
        fontWeight={isTotal ? 'bold' : undefined}
        onClick={
          onRowClick
            ? (e) => {
                e.stopPropagation();
                onRowClick();
              }
            : undefined
        }
        cursor={onRowClick ? 'pointer' : undefined}
        // transition="none"
        _hover={stickyRow ? undefined : { bg: '#f1f5f9' }}
      >
        {showToggleCol && (
          <Table.Cell
            w="40px"
            px={2}
            py={0}
            verticalAlign="middle"
            style={
              stickyFirstCol && resolvedBg
                ? { background: resolvedBg }
                : undefined
            }
          >
            {hasSubRows && (
              <button
                onClick={() => setIsExpanded((e) => !e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  borderRadius: '3px',
                  border: '1px solid #cbd5e1',
                  background: isExpanded ? '#dbeafe' : '#f8fafc',
                  cursor: 'pointer',
                  color: '#2563eb',
                  flexShrink: 0,
                }}
              >
                {isExpanded ? <FiMinus size={10} /> : <FiPlus size={10} />}
              </button>
            )}
          </Table.Cell>
        )}
        {cells.map((cell, i) => (
          <Table.Cell
            key={i}
            color={cellNodes?.[i] ? undefined : cellColors?.[i]}
            fontWeight={cellWeights?.[i]}
            textAlign={colAligns?.[i] ?? 'left'}
            style={
              stickyFirstCol && i === 0 && resolvedBg
                ? { background: resolvedBg }
                : undefined
            }
          >
            {cellNodes?.[i] ?? cell}
          </Table.Cell>
        ))}
      </Table.Row>

      {hasSubRows &&
        isExpanded &&
        subRows!.map((sub, i) => {
          const subBg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
          return (
            <Table.Row
              key={i}
              style={{ background: subBg }}
              css={{
                '&:hover': { background: '#e5e7eb !important' },
                '&:hover td': { background: '#e5e7eb !important' },
              }}
            >
              {/* indent spacer */}
              <Table.Cell
                w="40px"
                px={1}
                style={stickyFirstCol ? { background: subBg } : undefined}
              />
              {sub.cells.map((cell, j) => (
                <Table.Cell
                  key={j}
                  fontSize="xs"
                  color={sub.cellColors?.[j] ?? 'gray.500'}
                  fontWeight={sub.cellWeights?.[j]}
                  py={1}
                  pl={j === 0 ? 4 : undefined}
                  style={
                    stickyFirstCol && j === 0
                      ? { background: subBg }
                      : undefined
                  }
                >
                  {cell}
                </Table.Cell>
              ))}
            </Table.Row>
          );
        })}
    </>
  );
}
