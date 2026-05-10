import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

interface SessionUser {
  isAdmin?: boolean
  role?: string
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/login')
  }

  const user = session.user as unknown as SessionUser
  const isAdmin = user.isAdmin ?? false
  const isNapaAdmin = user.role === 'napaAdmin'

  if (!isAdmin && !isNapaAdmin) {
    redirect('/unauthorized')
  }

  return <>{children}</>
}
