'use client'

import { useSession } from '@/lib/auth-client'
import AdminLayout from '@/components/AdminLayout'
import OrganizationMembersClient from '@/components/OrganizationMembersClient'

// Extend session user type
interface ExtendedUser {
  id?: string
  organizationName?: string
}

export default function OrganizationMembersPage() {
  const { data: session } = useSession()

  // Cast user to extended type
  const user = session?.user as ExtendedUser | undefined

  return (
    <AdminLayout
      title="Manage Organization Members"
      description={`Manage members for ${user?.organizationName || 'your organization'}`}
    >
      <OrganizationMembersClient
        organizationName={user?.organizationName || ''}
        currentUserId={user?.id || ''}
      />
    </AdminLayout>
  )
}
