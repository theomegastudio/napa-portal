import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/lib/types'

export async function getOrgMembers(organizationName: string): Promise<Member[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('organization_name', organizationName)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function inviteUser(email: string, organizationName: string, isAdmin: boolean) {
  const supabase = createClient()

  // Send magic link invitation
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: {
        organization_name: organizationName,
        is_admin: isAdmin
      }
    }
  })

  if (error) throw error
}