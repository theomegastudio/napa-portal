'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getResources, deleteResource } from "@/lib/services/resources"
import { getUserProfile, isNapaAdmin } from "@/lib/services/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Search, LogOut, Settings, FileText, Users } from "lucide-react"
import ResourceCard from "@/components/ResourceCard"
import UploadResourceDialog from "@/components/UploadResourceDialog"
import OrganizationSetup from "@/components/OrganizationSetup"
import NapaPortalLogo from "@/components/NapaPortalLogo"
import { useDebouncedCallback } from "use-debounce"
import type { Resource, User } from "@/lib/types"

export default function App() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [searchText, setSearchText] = useState("")
  const [resourceType, setResourceType] = useState("all")
  const [needsOrgSetup, setNeedsOrgSetup] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/login')
        return
      }

      setAuthUser(authUser)

      // Get user profile
      const profile = await getUserProfile(authUser.id)
      setUser(profile)

      // Check if user is NAPA admin
      const adminStatus = await isNapaAdmin(authUser.id)
      setIsAdmin(adminStatus)

      // Check if organization setup is needed
      if (!profile.organization_name || profile.organization_name.trim() === '') {
        setNeedsOrgSetup(true)
      } else {
        setNeedsOrgSetup(false)
        fetchResources()
      }
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    } finally {
      setAuthLoading(false)
    }
  }

  const fetchResources = async (search?: string, type?: string) => {
    try {
      setIsLoading(true)
      const data = await getResources({
        searchText: search || undefined,
        resourceType: type === "all" ? undefined : type
      })
      setResources(data)
    } catch (error) {
      toast.error("Failed to load resources")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const debouncedFetch = useDebouncedCallback(
    (search: string, type: string) => {
      fetchResources(search, type)
    },
    500
  )

  useEffect(() => {
    if (user && !needsOrgSetup) {
      debouncedFetch(searchText, resourceType)
    }
  }, [searchText, resourceType, user, needsOrgSetup])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return

    try {
      await deleteResource(id)
      toast.success("Resource deleted successfully")
      fetchResources(searchText, resourceType)
    } catch (error) {
      toast.error("Failed to delete resource")
      console.error(error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

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
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <NapaPortalLogo size="md" />
              <div>
                <h1 className="text-2xl font-bold">NAPA Resource Hub</h1>
                <p className="text-sm text-muted-foreground">
                  {user.organization_name || user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="outline" onClick={() => router.push('/admin/users')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

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
        onSuccess={() => fetchResources(searchText, resourceType)}
        userEmail={user.email}
        userOrganization={user.organization_name || ''}
      />
      {user.is_admin && (
        <Button
          variant="outline"
          onClick={() => router.push('/admin/members')}
          className="hover:bg-gray-200"
        >
          <Users className="mr-2 h-4 w-4" />
          Manage Members
        </Button>
      )}
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
                resource={resource}
                onDelete={handleDelete}
                onUpdate={() => fetchResources(searchText, resourceType)}
                canEdit={
                  resource.uploaded_by === user.email ||
                  (user.is_admin && user.organization_name === 'National APIDA Panhellenic Association') ||
                  (user.is_admin && user.organization_name === resource.organization)
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}