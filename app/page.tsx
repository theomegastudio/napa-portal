'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Search, FileText } from "lucide-react"
import AppHeader from "@/components/AppHeader"
import ResourceCard from "@/components/ResourceCard"
import UploadResourceDialog from "@/components/UploadResourceDialog"
import OrganizationSetup from "@/components/OrganizationSetup"
import { useDebouncedCallback } from "use-debounce"

// Type for resource from API
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
  deletedAt: string | null
  files: ResourceFile[]
}

// Transform to old format for components
function transformResource(r: Resource) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    resource_type: r.resourceType as 'Policy' | 'Procedure' | 'Document' | 'Vendor',
    external_link: r.externalLink,
    organization: r.organization,
    uploaded_by: r.uploadedBy,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    deleted_at: r.deletedAt,
    resource_files: r.files.map(f => ({
      id: f.id,
      resource_id: f.resourceId,
      file_url: f.fileUrl,
      file_name: f.fileName,
      created_at: f.createdAt,
    })),
  }
}

export default function App() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [searchText, setSearchText] = useState("")
  const [resourceType, setResourceType] = useState("all")
  const [needsOrgSetup, setNeedsOrgSetup] = useState(false)

  const fetchResources = async (search?: string, type?: string, showLoading = true) => {
    try {
      // Only show skeleton on initial load, not on filter changes
      if (showLoading && isInitialLoad) {
        setIsLoading(true)
      }
      const params = new URLSearchParams()
      if (search) params.set('searchText', search)
      if (type && type !== 'all') params.set('resourceType', type)

      const response = await fetch(`/api/v2/resources?${params.toString()}`)

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch resources')
      }

      const data = await response.json()
      setResources(data)
    } catch (error) {
      toast.error("Failed to load resources")
      console.error(error)
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      // Check approval status first
      if (session?.user?.approvalStatus === 'pending') {
        router.push('/pending-approval')
        return
      }
      if (session?.user?.approvalStatus === 'rejected') {
        router.push('/account-rejected')
        return
      }

      // Check if email verification is required
      if (session?.user?.emailVerificationRequired) {
        router.push('/verify-email')
        return
      }

      // Check if user needs org setup
      if (!session?.user?.organizationName) {
        setNeedsOrgSetup(true)
        setIsLoading(false)
      } else {
        setNeedsOrgSetup(false)
        // Only fetch on initial load - subsequent fetches handled by filter effect
        if (isInitialLoad) {
          fetchResources(searchText, resourceType, true)
        }
      }
    }
  }, [status, session, router])

  const debouncedFetch = useDebouncedCallback(
    (search: string, type: string) => {
      fetchResources(search, type, false)
    },
    300
  )

  // Handle search/filter changes - but skip initial render
  useEffect(() => {
    if (session?.user && !needsOrgSetup && !isInitialLoad) {
      debouncedFetch(searchText, resourceType)
    }
  }, [searchText, resourceType])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return

    try {
      const response = await fetch(`/api/v2/resources/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete resource')
      }

      toast.success("Resource deleted successfully")
      fetchResources(searchText, resourceType, false)
    } catch (error) {
      toast.error("Failed to delete resource")
      console.error(error)
    }
  }

  const handleRefresh = () => {
    fetchResources(searchText, resourceType, false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const user = session.user

  if (needsOrgSetup) {
    return (
      <OrganizationSetup
        onComplete={() => {
          setNeedsOrgSetup(false)
          window.location.reload()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted">
      <AppHeader user={user} variant="main" />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Filters and Upload */}
        <div className="mb-6">
          <div className="bg-card rounded-lg shadow p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger className="w-full sm:w-48">
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
              <UploadResourceDialog
                onSuccess={handleRefresh}
                userEmail={user.email || ''}
                userOrganization={user.organizationName || ''}
              />
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No resources found</h3>
            <p className="text-muted-foreground mb-4">
              {searchText || resourceType !== "all"
                ? "Try adjusting your filters"
                : "Be the first to add a resource"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={transformResource(resource)}
                onDelete={() => handleDelete(resource.id)}
                onUpdate={handleRefresh}
                canEdit={
                  resource.uploadedBy === user.email ||
                  user.isNapaAdmin ||
                  (user.isAdmin && user.organizationName === resource.organization)
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
