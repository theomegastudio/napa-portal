import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, SquarePen, Trash2, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import OrganizationMembersClient from '@/components/OrganizationMembersClient'

export default async function OrganizationMembersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check if user is an admin of their organization
  if (!userProfile?.is_admin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Organization Members</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage members for {userProfile.organization_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrganizationMembersClient
          organizationName={userProfile.organization_name}
          currentUserId={user.id}
        />
      </main>
    </div>
  )
}
