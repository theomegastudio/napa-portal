'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  CalendarBlank, Buildings, User, ArrowSquareOut,
  DownloadSimple, Archive, Trash,
  File, FilePdf, FileDoc, FileXls, FilePpt, FileZip,
  FileImage, FileVideo, FileAudio, FileCsv, FileText,
} from '@phosphor-icons/react'
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

interface Resource {
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
  fileSizeBytes?: number | null
  allowDownload?: boolean
  topicArea?: string | null
  tags?: string[] | null
  files: ResourceFile[]
}

interface ResourceDetailDialogProps {
  resourceId: string | null
  onClose: () => void
  canManage: boolean
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}

const TYPE_COLORS: Record<string, string> = {
  Policy: 'bg-blue-100 text-blue-800 border-blue-200',
  Procedure: 'bg-green-100 text-green-800 border-green-200',
  Document: 'bg-purple-100 text-purple-800 border-purple-200',
  Vendor: 'bg-orange-100 text-orange-800 border-orange-200',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ResourceDetailDialog({
  resourceId,
  onClose,
  canManage,
  onArchive,
  onDelete,
}: ResourceDetailDialogProps) {
  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!resourceId) { setResource(null); return }
    setLoading(true)
    fetch(`/api/v2/resources/${resourceId}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then(setResource)
      .catch(() => toast.error('Resource not found'))
      .finally(() => setLoading(false))
  }, [resourceId])

  const handleArchive = async () => {
    if (!resource) return
    try {
      const res = await fetch(`/api/v2/resources/${resource.id}/archive`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const { archived } = await res.json()
      setResource(prev => prev ? { ...prev, status: archived ? 'archived' : 'active' } : prev)
      toast.success(archived ? 'Resource archived' : 'Resource unarchived')
      onArchive?.(resource.id)
    } catch {
      toast.error('Failed to update archive status')
    }
  }

  const handleDelete = async () => {
    if (!resource) return
    if (!confirm('Are you sure you want to permanently delete this resource?')) return
    try {
      const res = await fetch(`/api/v2/resources/${resource.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success('Resource deleted')
      onDelete?.(resource.id)
      onClose()
    } catch {
      toast.error('Failed to delete resource')
    }
  }

  const isArchived = resource?.status === 'archived'

  return (
    <Dialog open={!!resourceId} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        {loading || !resource ? (
          <div className="space-y-4 py-2">
            <VisuallyHidden>
              <DialogTitle>Loading resource</DialogTitle>
              <DialogDescription>Resource details are loading.</DialogDescription>
            </VisuallyHidden>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                {(() => {
                  const iconName = getFileIconName(resource.mimeType, resource.originalFilename ?? resource.files[0]?.fileName)
                  const Icon = ICON_MAP[iconName]
                  const iconColor = getFileIconColor(iconName)
                  return (
                    <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">
                      <Icon weight="duotone" className={`h-6 w-6 ${iconColor}`} />
                    </div>
                  )
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className={TYPE_COLORS[resource.resourceType] ?? ''}>
                      {resource.resourceType}
                    </Badge>
                    {isArchived && (
                      <Badge variant="outline" className="text-muted-foreground">Archived</Badge>
                    )}
                    {resource.topicArea && (
                      <Badge variant="secondary">{resource.topicArea}</Badge>
                    )}
                  </div>
                  <DialogTitle className="text-lg leading-tight text-left">{resource.title}</DialogTitle>
                  <VisuallyHidden>
                    <DialogDescription>{resource.description || `Details for ${resource.title}`}</DialogDescription>
                  </VisuallyHidden>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground mt-1.5">{resource.description}</p>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Buildings className="h-4 w-4 shrink-0" />
                  <span className="truncate">{resource.organization}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">{resource.uploadedBy}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarBlank className="h-4 w-4 shrink-0" />
                  <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {resource.tags && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {resource.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}

              {resource.files.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attached Files</p>
                  {resource.files.map(file => {
                    const fIconName = getFileIconName(null, file.fileName)
                    const FIcon = ICON_MAP[fIconName]
                    const fColor = getFileIconColor(fIconName)
                    return (
                      <div key={file.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                        <FIcon weight="duotone" className={`h-4 w-4 ${fColor} shrink-0`} />
                        <span className="flex-1 text-sm truncate">{file.fileName || 'Unnamed file'}</span>
                        <Button variant="ghost" size="sm" render={<a href={`/api/v2/resources/${resource.id}/serve?fileId=${file.id}`} />}>
                          <DownloadSimple className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              <Separator />

              <div className="flex flex-wrap items-center gap-2">
                {resource.files.length > 0 && resource.allowDownload !== false && (
                  <Button size="sm" render={<a href={`/api/v2/resources/${resource.id}/serve`} />}>
                    <DownloadSimple className="h-4 w-4 mr-1.5" weight="bold" />
                    Download
                    {resource.fileSizeBytes ? ` (${formatBytes(resource.fileSizeBytes)})` : ''}
                  </Button>
                )}

                {resource.externalLink && (
                  <Button variant="outline" size="sm" render={<a href={resource.externalLink} target="_blank" rel="noopener noreferrer" />}>
                    <ArrowSquareOut className="h-4 w-4 mr-1.5" />
                    Open Link
                  </Button>
                )}

                {canManage && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleArchive} className="gap-1.5 ml-auto">
                      <Archive className="h-4 w-4" />
                      {isArchived ? 'Unarchive' : 'Archive'}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                      <Trash className="h-4 w-4" />Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
