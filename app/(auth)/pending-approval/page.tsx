'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Clock, LogOut, Mail } from 'lucide-react'
import NapaAuthLogo from '@/components/NapaAuthLogo'

interface ExtendedUser {
  id?: string
  email?: string
  name?: string
  image?: string
  organizationName?: string
  isAdmin?: boolean
  approvalStatus?: string
}

export default function PendingApprovalPage() {
  const { data: session, isPending: isLoading } = useSession()
  const router = useRouter()
  const [isPageLoading, setIsPageLoading] = useState(true)

  const user = session?.user as ExtendedUser | undefined

  useEffect(() => {
    if (isLoading) return
    if (!session) { router.push('/login'); return }
    if (user?.approvalStatus === 'approved') { router.push('/'); return }
    if (user?.approvalStatus === 'rejected') { router.push('/account-rejected'); return }
    setIsPageLoading(false)
  }, [session, isLoading, user, router])

  const handleSignOut = async () => {
    await signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })
  }

  if (isPageLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <NapaAuthLogo size="xl" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Account Pending Approval</h1>
                <p className="text-muted-foreground">Your account request is being reviewed by an administrator.</p>
              </div>
              <div className="w-full rounded-lg border bg-muted/50 p-4 text-left">
                <p className="text-sm text-muted-foreground mb-2">Account Details:</p>
                <p className="text-sm"><strong>Email:</strong> {user?.email}</p>
                {user?.organizationName && (
                  <p className="text-sm"><strong>Organization:</strong> {user.organizationName}</p>
                )}
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>You will receive an email once your account has been approved.</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleSignOut} className="mt-4">
                <LogOut className="mr-2 h-4 w-4" />Sign Out
              </Button>
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          <a href="/terms" className="hover:text-primary underline underline-offset-4">Terms of Service</a>
          {' · '}
          <a href="/privacy" className="hover:text-primary underline underline-offset-4">Privacy Policy</a>
        </div>
      </div>
      <div className="bg-primary relative hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="text-center space-y-6">
          <div className="flex justify-center"><NapaAuthLogo size="xl" /></div>
          <h2 className="text-3xl font-bold text-primary-foreground">NAPA Resource Hub</h2>
          <p className="text-lg text-primary-foreground/80 max-w-md mx-auto">
            A shared resource library for NAPA organizations to collaborate and share best practices.
          </p>
        </div>
      </div>
    </div>
  )
}
