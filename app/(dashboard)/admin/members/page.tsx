'use client'

import { useSession } from '@/lib/auth-client'
import OrganizationMembersClient from '@/components/OrganizationMembersClient'

interface ExtendedUser {
  id?: string
  organizationName?: string
}

export default function OrganizationMembersPage() {
  const { data: session } = useSession()
  const user = session?.user as ExtendedUser | undefined

  return (
    <OrganizationMembersClient
      organizationName={user?.organizationName || ''}
      currentUserId={user?.id || ''}
    />
  )
}
