'use client'

import { useSession } from '@/lib/auth-client'
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
  const { data: session, isPending: isLoading } = useSession()
  const router = useRouter()

  // Extend session user type for admin properties
  const user = session?.user as {
    id?: string
    email?: string
    name?: string
    image?: string
    isAdmin?: boolean
    role?: string
    organizationName?: string
  } | undefined

  const isAdmin = user?.isAdmin ?? false
  const isNapaAdmin = user?.role === 'napaAdmin'

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!hasRequiredRole(requiredRole, isAdmin, isNapaAdmin)) {
      router.push('/')
      return
    }
  }, [isLoading, user, router, requiredRole, isAdmin, isNapaAdmin])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!hasRequiredRole(requiredRole, isAdmin, isNapaAdmin)) {
    return null
  }

  return (
    <div className="min-h-screen bg-muted">
      <AppHeader
        user={{
          name: user.name,
          email: user.email,
          image: user.image,
          organizationName: user.organizationName,
          isAdmin: user.isAdmin,
          isNapaAdmin,
        }}
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
