import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { isOTPVerificationRequired } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'

interface SessionUser {
  id: string
  name?: string | null
  email: string
  image?: string | null
  role?: string
  isAdmin?: boolean
  approvalStatus?: string
  lastOtpVerifiedAt?: Date | string | null
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/login')
  }

  const user = session.user as unknown as SessionUser

  if (user.approvalStatus === 'pending') {
    redirect('/pending-approval')
  }

  if (user.approvalStatus === 'rejected') {
    redirect('/account-rejected')
  }

  const lastVerified = user.lastOtpVerifiedAt
    ? new Date(user.lastOtpVerifiedAt as string)
    : null

  if (isOTPVerificationRequired(lastVerified)) {
    redirect('/verify-email')
  }

  const isAdmin = user.isAdmin ?? false
  const isNapaAdmin = user.role === 'napaAdmin'

  return (
    <div className="flex h-screen overflow-hidden bg-muted">
      <Sidebar user={{ isAdmin, isNapaAdmin }} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav user={{ name: user.name, email: user.email, image: user.image }} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
