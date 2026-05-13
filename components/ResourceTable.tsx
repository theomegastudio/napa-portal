'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  FilePdf, FileDoc, FileXls, FilePpt, FileZip, FileImage,
  FileVideo, FileAudio, FileCsv, FileText, File,
  DotsThree, ArrowSquareOut, Trash, Archive, PencilSimple,
  DownloadSimple,
} from '@phosphor-icons/react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination'
import { getFileIconName, getFileIconColor, type FileIconName } from '@/lib/file-icons'

const ICON_MAP: Record<FileIconName, React.ElementType> = {
  FilePdf, FileDoc, FileXls, FilePpt, FileZip,
  FileImage, FileVideo, FileAudio, FileCsv, FileText, File,
}

interface ResourceFile {
  id: string
  resourceId: string
  fileUrl: string
  fileName: string | null
  createdAt: string
}

export interface ResourceRow {
  id: string
  title: string
  description: string | null
  resourceType: string
  externalLink: string | null
  organization: string
  uploadedBy: string
  createdAt: string
  updatedAt: string
  status?: string
  mimeType?: string | null
  originalFilename?: string | null
  allowDownload?: boolean
  topicArea?: string | null
  files: ResourceFile[]
}

interface ResourceTableProps {
  resources: ResourceRow[]
  canEdit: (resource: ResourceRow) => boolean
  canDelete: (resource: ResourceRow) => boolean
  canArchive: (resource: ResourceRow) => boolean
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onEdit: (resource: ResourceRow) => void
  onRowClick?: (resource: ResourceRow) => void
}

const TYPE_COLORS: Record<string, string> = {
  Policy: 'bg-blue-100 text-blue-800 border-blue-200',
  Procedure: 'bg-green-100 text-green-800 border-green-200',
  Document: 'bg-purple-100 text-purple-800 border-purple-200',
  Vendor: 'bg-orange-100 text-orange-800 border-orange-200',
}

function FileTypeIcon({ mimeType, filename }: { mimeType?: string | null; filename?: string | null }) {
  const iconName = getFileIconName(mimeType, filename)
  const Icon = ICON_MAP[iconName]
  const color = getFileIconColor(iconName)
  return <Icon weight="duotone" className={`h-5 w-5 ${color}`} />
}

export default function ResourceTable({
  resources,
  canEdit,
  canDelete,
  canArchive,
  onDelete,
  onArchive,
  onEdit,
  onRowClick,
}: ResourceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  const columns = useMemo<ColumnDef<ResourceRow>[]>(() => [
    {
      id: 'icon',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        const hasFile = r.files.length > 0
        const hasLink = !!r.externalLink
        return hasFile ? (
          <FileTypeIcon
            mimeType={r.mimeType}
            filename={r.originalFilename ?? r.files[0]?.fileName}
          />
        ) : hasLink ? (
          <ArrowSquareOut className="h-5 w-5 text-muted-foreground" weight="duotone" />
        ) : (
          <File className="h-5 w-5 text-muted-foreground" weight="duotone" />
        )
      },
      size: 40,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const r = row.original
        const isArchived = r.status === 'archived'
        return (
          <div>
            {onRowClick ? (
              <button onClick={() => onRowClick(r)} className="font-medium hover:underline hover:text-primary text-left">
                {r.title}
              </button>
            ) : (
              <Link href={`/resources/${r.id}`} className="font-medium hover:underline hover:text-primary">
                {r.title}
              </Link>
            )}
            {r.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>
            )}
            {isArchived && (
              <Badge variant="outline" className="text-xs mt-1 text-muted-foreground">Archived</Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'resourceType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className={`text-xs ${TYPE_COLORS[row.original.resourceType] ?? ''}`}>
          {row.original.resourceType}
        </Badge>
      ),
      size: 120,
    },
    {
      accessorKey: 'organization',
      header: 'Organization',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.organization}</span>
      ),
      size: 240,
    },
    {
      accessorKey: 'createdAt',
      header: 'Added',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
      size: 110,
      sortingFn: (a, b) => new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime(),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        const hasFile = r.files.length > 0
        const hasLink = !!r.externalLink
        const isArchived = r.status === 'archived'
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                <DotsThree className="h-4 w-4" weight="bold" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRowClick ? (
                  <DropdownMenuItem onClick={() => onRowClick(r)}>
                    <FileText className="h-4 w-4 mr-2" />View Details
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem render={<Link href={`/resources/${r.id}`} />}>
                    <FileText className="h-4 w-4 mr-2" />View Details
                  </DropdownMenuItem>
                )}

                {(hasFile || hasLink) && r.allowDownload !== false && (
                  <DropdownMenuItem render={
                    <a
                      href={hasFile ? `/api/v2/resources/${r.id}/serve` : r.externalLink!}
                      target={hasLink ? '_blank' : undefined}
                      rel={hasLink ? 'noopener noreferrer' : undefined}
                    />
                  }>
                    <DownloadSimple className="h-4 w-4 mr-2" />
                    {hasFile ? 'Download' : 'Open Link'}
                  </DropdownMenuItem>
                )}

                {canEdit(r) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(r)}>
                      <PencilSimple className="h-4 w-4 mr-2" />Edit
                    </DropdownMenuItem>
                  </>
                )}
                {canArchive(r) && (
                  <DropdownMenuItem onClick={() => onArchive(r.id)}>
                    <Archive className="h-4 w-4 mr-2" />
                    {isArchived ? 'Unarchive' : 'Archive'}
                  </DropdownMenuItem>
                )}
                {canDelete(r) && (
                  <DropdownMenuItem onClick={() => onDelete(r.id)} variant="destructive">
                    <Trash className="h-4 w-4 mr-2" />Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      size: 48,
    },
  ], [canArchive, canDelete, canEdit, onArchive, onDelete, onEdit, onRowClick])

  const table = useReactTable({
    columns,
    data: resources,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: { pagination, sorting },
  })

  const rowCount = table.getRowCount()
  const pageStart = rowCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const pageEnd = Math.min((pagination.pageIndex + 1) * pagination.pageSize, rowCount)

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map(header => {
                const size = header.column.getSize()
                return (
                  <TableHead
                    key={header.id}
                    style={size ? { width: `${size}px` } : undefined}
                    className="h-9 px-3 text-xs font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex h-full cursor-pointer select-none items-center gap-1.5 hover:text-foreground"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUpIcon className="h-3.5 w-3.5 opacity-70" />,
                          desc: <ChevronDownIcon className="h-3.5 w-3.5 opacity-70" />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                className={row.original.status === 'archived' ? 'opacity-60' : ''}
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                No resources found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {rowCount > 0 && (
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-sm">
          <p className="text-muted-foreground tabular-nums">
            <strong className="font-medium text-foreground">{pageStart}-{pageEnd}</strong> of{' '}
            <strong className="font-medium text-foreground">{rowCount}</strong>
          </p>
          <Pagination className="justify-end mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  className="sm:*:[svg]:hidden"
                  render={
                    <Button
                      disabled={!table.getCanPreviousPage()}
                      onClick={() => table.previousPage()}
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
                      disabled={!table.getCanNextPage()}
                      onClick={() => table.nextPage()}
                      size="sm"
                      variant="outline"
                    />
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
