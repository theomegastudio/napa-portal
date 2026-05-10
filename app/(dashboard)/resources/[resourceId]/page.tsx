'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft, CalendarBlank, Buildings, User, ArrowSquareOut,
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

interface ExtendedUser {
  id?: string
  email?: string
  organizationName?: string
  isAdmin?: boolean
  role?: string
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

export default function ResourceDetailPage() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)

  const user = session?.user as ExtendedUser | undefined
  const isNapaAdmin = user?.role === 'napaAdmin'
  const isOrgAdmin = user?.isAdmin === true
  const canManage = isNapaAdmin || (isOrgAdmin && user?.organizationName === resource?.organization)
  const canEdit = canManage || resource?.uploadedBy === user?.email
  const isArchived = resource?.status === 'archived'

  useEffect(() => {
    fetch(`/api/v2/resources/${resourceId}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then(setResource)
      .catch(() => {
        toast.error('Resource not found')
        router.push('/')
      })
      .finally(() => setLoading(false))
  }, [resourceId, router])

  const handleArchive = async () => {
    try {
      const res = await fetch(`/api/v2/resources/${resourceId}/archive`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const { archived } = await res.json()
      setResource(prev => prev ? { ...prev, status: archived ? 'archived' : 'active' } : prev)
      toast.success(archived ? 'Resource archived' : 'Resource unarchived')
    } catch {
      toast.error('Failed to update archive status')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this resource?')) return
    try {
      const res = await fetch(`/api/v2/resources/${resourceId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success('Resource deleted')
      router.push('/')
    } catch {
      toast.error('Failed to delete resource')
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!resource) return null

  const hasFile = resource.files.length > 0
  const iconName = getFileIconName(resource.mimeType, resource.originalFilename ?? resource.files[0]?.fileName)
  const Icon = ICON_MAP[iconName]
  const iconColor = getFileIconColor(iconName)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg bg-muted shrink-0`}>
              <Icon weight="duotone" className={`h-8 w-8 ${iconColor}`} />
            </div>
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
              <CardTitle className="text-xl leading-tight">{resource.title}</CardTitle>
              {resource.description && (
                <p className="text-muted-foreground mt-2 text-sm">{resource.description}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Buildings className="h-4 w-4 shrink-0" />
              <span>{resource.organization}</span>
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

          <Separator />

          <div className="flex flex-wrap gap-2">
            {hasFile && resource.allowDownload !== false && (
              <Button asChild>
                <a href={`/api/v2/resources/${resource.id}/serve`}>
                  <DownloadSimple className="h-4 w-4 mr-2" weight="bold" />
                  Download
                  {resource.fileSizeBytes ? ` (${formatBytes(resource.fileSizeBytes)})` : ''}
                </a>
              </Button>
            )}

            {resource.externalLink && (
              <Button variant="outline" asChild>
                <a href={resource.externalLink} target="_blank" rel="noopener noreferrer">
                  <ArrowSquareOut className="h-4 w-4 mr-2" />Open Link
                </a>
              </Button>
            )}

            {canManage && (
              <Button variant="outline" onClick={handleArchive} className="gap-1.5">
                <Archive className="h-4 w-4" />
                {isArchived ? 'Unarchive' : 'Archive'}
              </Button>
            )}

            {canManage && (
              <Button variant="destructive" onClick={handleDelete} className="gap-1.5 ml-auto">
                <Trash className="h-4 w-4" />Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {resource.files.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attached Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resource.files.map(file => {
              const fIconName = getFileIconName(null, file.fileName)
              const FIcon = ICON_MAP[fIconName]
              const fColor = getFileIconColor(fIconName)
              return (
                <div key={file.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                  <FIcon weight="duotone" className={`h-5 w-5 ${fColor}`} />
                  <span className="flex-1 text-sm truncate">{file.fileName || 'Unnamed file'}</span>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/api/v2/resources/${resource.id}/serve?fileId=${file.id}`}>
                      <DownloadSimple className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
