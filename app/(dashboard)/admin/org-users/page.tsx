'use client'

import { useSession } from '@/lib/auth-client'
import OrgUsersClient from '@/components/OrgUsersClient'
import { Building2 } from 'lucide-react'
import { NAPA_ORG_NAME } from '@/lib/constants'

interface ExtendedUser {
  id?: string
  organizationName?: string
  role?: string
}

export default function OrgUsersPage() {
  const { data: session, isPending } = useSession()
  const user = session?.user as ExtendedUser | undefined

  if (isPending) return null

  const isNapaAdmin = user?.role === 'napaBoard' || user?.role === 'napaDirector'
  // NAPA Board/Director users may have organizationName unset if promoted
  // manually rather than via signup; fall back to the canonical NAPA org.
  const organizationName = user?.organizationName || (isNapaAdmin ? NAPA_ORG_NAME : null)

  if (!organizationName) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Org Users</h2>
          <p className="text-sm text-muted-foreground">Manage members of your organization.</p>
        </div>
        <div className="text-center py-16 border rounded-lg">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No organization assigned</h3>
          <p className="text-sm text-muted-foreground">
            You aren&apos;t associated with an organization, so there are no members to manage here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <OrgUsersClient
      organizationName={organizationName}
      currentUserId={user?.id || ''}
    />
  )
}
