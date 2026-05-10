'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FilePdf, FileDoc, FileXls, FilePpt, FileZip, FileImage,
  FileVideo, FileAudio, FileCsv, FileText, File,
  ArrowUp, ArrowDown, ArrowsDownUp, DotsThree,
  ArrowSquareOut, Trash, Archive, PencilSimple,
  DownloadSimple,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { getFileIconName, getFileIconColor, type FileIconName } from '@/lib/file-icons'

const ICON_MAP: Record<FileIconName, React.ElementType> = {
  FilePdf, FileDoc, FileXls, FilePpt, FileZip,
  FileImage, FileVideo, FileAudio, FileCsv, FileText, File,
}

function FileTypeIcon({ mimeType, filename, className }: { mimeType?: string | null; filename?: string | null; className?: string }) {
  const iconName = getFileIconName(mimeType, filename)
  const Icon = ICON_MAP[iconName]
  const color = getFileIconColor(iconName)
  return <Icon weight="duotone" className={`h-5 w-5 ${color} ${className ?? ''}`} />
}

type SortField = 'title' | 'resourceType' | 'organization' | 'createdAt'
type SortDir = 'asc' | 'desc'

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
}

const TYPE_COLORS: Record<string, string> = {
  Policy: 'bg-blue-100 text-blue-800 border-blue-200',
  Procedure: 'bg-green-100 text-green-800 border-green-200',
  Document: 'bg-purple-100 text-purple-800 border-purple-200',
  Vendor: 'bg-orange-100 text-orange-800 border-orange-200',
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ArrowsDownUp className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />
  return sortDir === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 ml-1" weight="bold" />
    : <ArrowDown className="h-3.5 w-3.5 ml-1" weight="bold" />
}

export default function ResourceTable({
  resources,
  canEdit,
  canDelete,
  canArchive,
  onDelete,
  onArchive,
  onEdit,
}: ResourceTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...resources].sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'title': cmp = a.title.localeCompare(b.title); break
      case 'resourceType': cmp = a.resourceType.localeCompare(b.resourceType); break
      case 'organization': cmp = a.organization.localeCompare(b.organization); break
      case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (sorted.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>
              <button className="flex items-center font-medium hover:text-foreground" onClick={() => toggleSort('title')}>
                Title <SortIcon field="title" sortField={sortField} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead>
              <button className="flex items-center font-medium hover:text-foreground" onClick={() => toggleSort('resourceType')}>
                Type <SortIcon field="resourceType" sortField={sortField} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead>
              <button className="flex items-center font-medium hover:text-foreground" onClick={() => toggleSort('organization')}>
                Organization <SortIcon field="organization" sortField={sortField} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead>
              <button className="flex items-center font-medium hover:text-foreground" onClick={() => toggleSort('createdAt')}>
                Added <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(resource => {
            const hasFile = resource.files.length > 0
            const hasLink = !!resource.externalLink
            const isArchived = resource.status === 'archived'

            return (
              <TableRow key={resource.id} className={isArchived ? 'opacity-60' : ''}>
                <TableCell className="pr-0">
                  {hasFile ? (
                    <FileTypeIcon
                      mimeType={resource.mimeType ?? resource.files[0] ? null : null}
                      filename={resource.originalFilename ?? resource.files[0]?.fileName}
                    />
                  ) : hasLink ? (
                    <ArrowSquareOut className="h-5 w-5 text-muted-foreground" weight="duotone" />
                  ) : (
                    <File className="h-5 w-5 text-muted-foreground" weight="duotone" />
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <Link
                      href={`/resources/${resource.id}`}
                      className="font-medium hover:underline hover:text-primary"
                    >
                      {resource.title}
                    </Link>
                    {resource.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {resource.description}
                      </p>
                    )}
                    {isArchived && (
                      <Badge variant="outline" className="text-xs mt-1 text-muted-foreground">
                        Archived
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${TYPE_COLORS[resource.resourceType] ?? ''}`}
                  >
                    {resource.resourceType}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {resource.organization}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(resource.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <DotsThree className="h-4 w-4" weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/resources/${resource.id}`}>
                          <FileText className="h-4 w-4 mr-2" />View Details
                        </Link>
                      </DropdownMenuItem>

                      {(hasFile || hasLink) && resource.allowDownload !== false && (
                        <DropdownMenuItem asChild>
                          <a
                            href={hasFile ? `/api/v2/resources/${resource.id}/serve` : resource.externalLink!}
                            target={hasLink ? '_blank' : undefined}
                            rel={hasLink ? 'noopener noreferrer' : undefined}
                          >
                            <DownloadSimple className="h-4 w-4 mr-2" />
                            {hasFile ? 'Download' : 'Open Link'}
                          </a>
                        </DropdownMenuItem>
                      )}

                      {canEdit(resource) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEdit(resource)}>
                            <PencilSimple className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                        </>
                      )}

                      {canArchive(resource) && (
                        <DropdownMenuItem onClick={() => onArchive(resource.id)}>
                          <Archive className="h-4 w-4 mr-2" />
                          {isArchived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                      )}

                      {canDelete(resource) && (
                        <DropdownMenuItem
                          onClick={() => onDelete(resource.id)}
                          variant="destructive"
                        >
                          <Trash className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
