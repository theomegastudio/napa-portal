'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppHeader from './AppHeader'
import { hasRequiredRole, type AdminRole } from '@/lib/admin-config'
import { Loader2 } from 'lucide-react'

interface AdminLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
  requiredRole?: AdminRole
}

export default function AdminLayout({
  title,
  description,
  children,
  requiredRole = 'admin',
}: AdminLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isAdmin = session?.user?.isAdmin ?? false
  const isNapaAdmin = session?.user?.isNapaAdmin ?? false

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/login')
      return
    }

    if (!hasRequiredRole(requiredRole, isAdmin, isNapaAdmin)) {
      router.push('/')
      return
    }
  }, [status, session, router, requiredRole, isAdmin, isNapaAdmin])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  if (!hasRequiredRole(requiredRole, isAdmin, isNapaAdmin)) {
    return null
  }

  return (
    <div className="min-h-screen bg-muted">
      <AppHeader
        user={session.user}
        title={title}
        description={description}
        showBackButton
        variant="admin"
      />
      <main className="container mx-auto py-8 px-4">
        {children}
      </main>
    </div>
  )
}
