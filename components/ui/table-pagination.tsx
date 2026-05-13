'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

interface TablePaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/**
 * Pagination footer for shadcn tables. Shows "X-Y of N" + Prev/Next buttons.
 * Buttons clearly indicate enabled vs disabled state. `page` is zero-indexed.
 */
export function TablePagination({ page, pageSize, total, onPageChange }: TablePaginationProps) {
  if (total === 0) return null
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)
  const canPrev = page > 0
  const canNext = page < pageCount - 1

  return (
    <div className="flex items-center justify-between gap-2 border-t bg-card px-3 py-2 text-sm">
      <p className="text-muted-foreground tabular-nums">
        <strong className="font-medium text-foreground">{start}-{end}</strong> of{' '}
        <strong className="font-medium text-foreground">{total}</strong>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange(page - 1)}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span>Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => canNext && onPageChange(page + 1)}
        >
          <span>Next</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
