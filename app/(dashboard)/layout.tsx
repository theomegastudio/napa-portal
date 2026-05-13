import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { isOTPVerificationRequired } from '@/lib/auth'
import { AppSidebar } from '@/components/layout/AppSidebar'
import TopNav from '@/components/layout/TopNav'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

interface SessionUser {
  id: string
  name?: string | null
  email: string
  image?: string | null
  role?: string
  isAdmin?: boolean
  approvalStatus?: string
  lastOtpVerifiedAt?: Date | string | null
  organizationName?: string | null
  canViewOrgHealth?: boolean
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) redirect('/login')

  const user = session.user as unknown as SessionUser

  if (user.approvalStatus === 'pending') redirect('/pending-approval')
  if (user.approvalStatus === 'rejected') redirect('/account-rejected')

  const lastVerified = user.lastOtpVerifiedAt
    ? new Date(user.lastOtpVerifiedAt as string)
    : null
  if (isOTPVerificationRequired(lastVerified)) redirect('/verify-email')

  const isAdmin = user.isAdmin ?? false
  const isNapaBoard = user.role === 'napaBoard'
  const isNapaDirector = user.role === 'napaDirector'
  const isNapaAdmin = isNapaBoard || isNapaDirector
  const canViewOrgHealth = isNapaBoard || (isNapaDirector && !!user.canViewOrgHealth)

  return (
    <SidebarProvider>
      <AppSidebar user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        isAdmin,
        isNapaAdmin,
        isNapaBoard,
        isNapaDirector,
        canViewOrgHealth,
        organizationName: user.organizationName,
      }} />
      <SidebarInset>
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
