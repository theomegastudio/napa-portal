'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { isOTPVerificationRequired } from "@/lib/auth-client"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { MagnifyingGlass, FileText, Archive } from "@phosphor-icons/react"
import ResourceTable, { type ResourceRow } from "@/components/ResourceTable"
import UploadResourceDialog from "@/components/UploadResourceDialog"
import OrganizationSetup from "@/components/OrganizationSetup"
import { useDebouncedCallback } from "use-debounce"

interface ExtendedUser {
  id?: string
  email?: string
  name?: string
  image?: string
  organizationName?: string
  isAdmin?: boolean
  role?: string
  approvalStatus?: string
  lastOtpVerifiedAt?: string | null
}

export default function ResourcesPage() {
  const router = useRouter()
  const { data: session, isPending: isLoading } = useSession()

  const [resources, setResources] = useState<ResourceRow[]>([])
  const [isResourcesLoading, setIsResourcesLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [searchText, setSearchText] = useState("")
  const [resourceType, setResourceType] = useState("all")
  const [showArchived, setShowArchived] = useState(false)
  const [needsOrgSetup, setNeedsOrgSetup] = useState(false)

  const user = session?.user as ExtendedUser | undefined
  const isNapaAdmin = user?.role === 'napaAdmin'

  const fetchResources = async (search?: string, type?: string, showLoading = true) => {
    try {
      if (showLoading && isInitialLoad) setIsResourcesLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('searchText', search)
      if (type && type !== 'all') params.set('resourceType', type)

      const response = await fetch(`/api/v2/resources?${params}`)
      if (!response.ok) {
        if (response.status === 401) { router.push('/login'); return }
        throw new Error('Failed to fetch resources')
      }
      setResources(await response.json())
    } catch (error) {
      toast.error("Failed to load resources")
      console.error(error)
    } finally {
      setIsResourcesLoading(false)
      setIsInitialLoad(false)
    }
  }

  useEffect(() => {
    if (isLoading || !user) return
    if (user.approvalStatus === 'pending') { router.push('/pending-approval'); return }
    if (user.approvalStatus === 'rejected') { router.push('/account-rejected'); return }
    if (isOTPVerificationRequired(user as Parameters<typeof isOTPVerificationRequired>[0])) {
      router.push('/verify-email'); return
    }
    if (!user.organizationName) {
      setNeedsOrgSetup(true)
      setIsResourcesLoading(false)
    } else {
      setNeedsOrgSetup(false)
      if (isInitialLoad) fetchResources(searchText, resourceType, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, router])

  const debouncedFetch = useDebouncedCallback(
    (search: string, type: string) => fetchResources(search, type, false),
    300
  )

  useEffect(() => {
    if (user && !needsOrgSetup && !isInitialLoad) {
      debouncedFetch(searchText, resourceType)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, resourceType])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return
    try {
      const response = await fetch(`/api/v2/resources/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete resource')
      toast.success("Resource deleted")
      fetchResources(searchText, resourceType, false)
    } catch (error) {
      toast.error("Failed to delete resource")
      console.error(error)
    }
  }

  const handleArchive = async (id: string) => {
    try {
      const response = await fetch(`/api/v2/resources/${id}/archive`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to archive resource')
      const { archived } = await response.json()
      toast.success(archived ? "Resource archived" : "Resource unarchived")
      fetchResources(searchText, resourceType, false)
    } catch (error) {
      toast.error("Failed to archive resource")
      console.error(error)
    }
  }

  const canEdit = (resource: ResourceRow) =>
    resource.uploadedBy === user?.email ||
    isNapaAdmin ||
    (user?.isAdmin === true && user?.organizationName === resource.organization)

  const canDelete = (resource: ResourceRow) =>
    isNapaAdmin || (user?.isAdmin === true && user?.organizationName === resource.organization)

  const canArchive = (resource: ResourceRow) =>
    isNapaAdmin || (user?.isAdmin === true && user?.organizationName === resource.organization)

  const displayed = showArchived
    ? resources
    : resources.filter(r => r.status !== 'archived')

  if (isLoading) {
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

  if (needsOrgSetup) {
    return (
      <OrganizationSetup
        onComplete={() => { setNeedsOrgSetup(false); window.location.reload() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={resourceType} onValueChange={setResourceType}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Policy">Policy</SelectItem>
              <SelectItem value="Procedure">Procedure</SelectItem>
              <SelectItem value="Document">Document</SelectItem>
              <SelectItem value="Vendor">Vendor</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showArchived ? "secondary" : "outline"}
            onClick={() => setShowArchived(v => !v)}
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
          <UploadResourceDialog
            onSuccess={() => fetchResources(searchText, resourceType, false)}
            userEmail={user.email || ''}
            userOrganization={user.organizationName || ''}
          />
        </div>
      </div>

      {isResourcesLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" weight="duotone" size={64} />
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            {searchText || resourceType !== "all"
              ? "Try adjusting your filters"
              : "Be the first to add a resource"}
          </p>
        </div>
      ) : (
        <ResourceTable
          resources={displayed}
          canEdit={canEdit}
          canDelete={canDelete}
          canArchive={canArchive}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onEdit={() => {}}
        />
      )}
    </div>
  )
}
