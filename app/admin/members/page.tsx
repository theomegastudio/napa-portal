'use client'

import { useSession } from 'next-auth/react'
import AdminLayout from '@/components/AdminLayout'
import OrganizationMembersClient from '@/components/OrganizationMembersClient'

export default function OrganizationMembersPage() {
  const { data: session } = useSession()

  return (
    <AdminLayout
      title="Manage Organization Members"
      description={`Manage members for ${session?.user?.organizationName || 'your organization'}`}
    >
      <OrganizationMembersClient
        organizationName={session?.user?.organizationName || ''}
        currentUserId={session?.user?.id || ''}
      />
    </AdminLayout>
  )
}
