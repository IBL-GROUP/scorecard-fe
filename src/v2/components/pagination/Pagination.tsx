import { colors } from '@/v2/constants/theme';
import { HStack, Pagination, Button } from '@chakra-ui/react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from 'react-icons/fi';

export interface TablePaginationProps {
  count: number;
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export function TablePagination({
  count,
  pageSize,
  page,
  onPageChange,
  siblingCount = 1,
}: TablePaginationProps) {
  const totalPages = Math.ceil(count / pageSize);

  return (
    <Pagination.Root
      count={count}
      pageSize={pageSize}
      page={page}
      onPageChange={({ page: p }) => onPageChange(p)}
      siblingCount={siblingCount}
    >
      <HStack gap={1}>
        <Button
          size="xs"
          variant="outline"
          bg={colors.cardBg}
          onClick={() => onPageChange(1)}
          disabled={page === 1}
        >
          <FiChevronsLeft />
        </Button>

        <Pagination.PrevTrigger asChild>
          <Button size="xs" variant="outline" bg={colors.cardBg}>
            <FiChevronLeft />
          </Button>
        </Pagination.PrevTrigger>

        <Pagination.Items
          render={(pg) => (
            <Button
              size="xs"
              variant={pg.value === page ? 'solid' : 'outline'}
              colorPalette={pg.value === page ? 'primary' : undefined}
              bg={pg.value === page ? undefined : 'var(--sp-card-bg)'}
            >
              {pg.value}
            </Button>
          )}
        />

        <Pagination.NextTrigger asChild>
          <Button size="xs" variant="outline" bg={colors.cardBg}>
            <FiChevronRight />
          </Button>
        </Pagination.NextTrigger>

        <Button
          size="xs"
          variant="outline"
          bg={colors.cardBg}
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
        >
          <FiChevronsRight />
        </Button>
      </HStack>
    </Pagination.Root>
  );
}
