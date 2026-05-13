'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { MagnifyingGlass, Archive as ArchiveIcon } from '@phosphor-icons/react'
import ResourceTable, { type ResourceRow } from '@/components/ResourceTable'
import ResourceDetailDialog from '@/components/ResourceDetailDialog'
import { useDebouncedCallback } from 'use-debounce'

interface ExtendedUser {
  id?: string
  email?: string
  organizationName?: string
  isAdmin?: boolean
  role?: string
}

export default function ArchivePage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const user = session?.user as ExtendedUser | undefined
  const isNapaAdmin = (user?.role === 'napaBoard' || user?.role === 'napaDirector')
  const isAdmin = user?.isAdmin === true

  const [resources, setResources] = useState<ResourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)

  const fetchArchived = async (search?: string) => {
    try {
      const params = new URLSearchParams({ status: 'archived' })
      if (search) params.set('searchText', search)
      const res = await fetch(`/api/v2/resources?${params}`)
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return }
        throw new Error('Failed to fetch')
      }
      setResources(await res.json())
    } catch (e) {
      toast.error('Failed to load archived resources')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isPending || !user) return
    fetchArchived(searchText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, user])

  const debouncedSearch = useDebouncedCallback((q: string) => fetchArchived(q), 300)
  useEffect(() => {
    if (!user) return
    debouncedSearch(searchText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText])

  const handleUnarchive = async (id: string) => {
    try {
      const res = await fetch(`/api/v2/resources/${id}/archive`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      toast.success('Resource restored')
      fetchArchived(searchText)
    } catch (e) {
      toast.error('Failed to restore resource')
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this resource? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/v2/resources/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success('Resource permanently deleted')
      fetchArchived(searchText)
    } catch (e) {
      toast.error('Failed to delete resource')
      console.error(e)
    }
  }

  const canManageRow = (r: ResourceRow) =>
    isNapaAdmin || (isAdmin && user?.organizationName === r.organization)

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <ResourceDetailDialog
        resourceId={selectedResourceId}
        onClose={() => setSelectedResourceId(null)}
        canManage={isNapaAdmin || isAdmin}
        onArchive={() => fetchArchived(searchText)}
        onDelete={() => fetchArchived(searchText)}
      />
      <div className="space-y-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search archived resources..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-16">
            <ArchiveIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" weight="duotone" size={64} />
            <h3 className="text-lg font-semibold mb-2">No archived resources</h3>
            <p className="text-muted-foreground">
              {searchText ? 'Try adjusting your search' : 'Archived resources will appear here'}
            </p>
          </div>
        ) : (
          <ResourceTable
            resources={resources}
            canEdit={() => false}
            canDelete={canManageRow}
            canArchive={canManageRow}
            onDelete={handleDelete}
            onArchive={handleUnarchive}
            onEdit={() => {}}
            onRowClick={(r) => setSelectedResourceId(r.id)}
          />
        )}
      </div>
    </>
  )
}
