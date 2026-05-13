'use client'

import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

interface TablePaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/**
 * Footer for tables built with Coss `<Table variant="card">`.
 * Shows "X-Y of N" on the left and Prev/Next on the right.
 * `page` is zero-indexed.
 */
export function TablePagination({ page, pageSize, total, onPageChange }: TablePaginationProps) {
  if (total === 0) return null
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)
  const canPrev = page > 0
  const canNext = page < pageCount - 1

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <p className="text-muted-foreground tabular-nums">
        <strong className="font-medium text-foreground">{start}-{end}</strong> of{' '}
        <strong className="font-medium text-foreground">{total}</strong>
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              className="sm:*:[svg]:hidden"
              render={
                <Button
                  disabled={!canPrev}
                  onClick={() => canPrev && onPageChange(page - 1)}
                  size="sm"
                  variant="outline"
                />
              }
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              className="sm:*:[svg]:hidden"
              render={
                <Button
                  disabled={!canNext}
                  onClick={() => canNext && onPageChange(page + 1)}
                  size="sm"
                  variant="outline"
                />
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
