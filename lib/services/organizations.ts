import { createClient } from '@/lib/supabase/client'
import type { Organization } from '@/lib/types'

export async function getOrganizations(): Promise<Organization[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('organization_name')
  
  if (error) throw error
  return data || []
}

export async function updateUserOrganization(userId: string, organizationName: string) {
  const supabase = createClient()
  
  // Check if user profile exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (existingUser) {
    // Update existing profile
    const { error } = await supabase
      .from('users')
      .update({ organization_name: organizationName })
      .eq('id', userId)
    
    if (error) throw error
  } else {
    // Create new profile
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: user?.email || '',
        organization_name: organizationName,
        is_admin: false
      })
    
    if (error) throw error
  }
}