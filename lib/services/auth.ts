import { createClient } from '@/lib/supabase/client'

export async function checkUserExists(email: string): Promise<boolean> {
  const supabase = createClient()

  // Check if user exists in the users table
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (error) throw error

  // User exists if they have a record in the users table
  return !!data
}

export async function signInWithMagicLink(email: string) {
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw error
}

export async function signUpWithMagicLink(email: string, organizationName: string) {
  const supabase = createClient()

  // Send magic link with organization metadata
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        organization_name: organizationName,
      },
    },
  })

  if (error) throw error
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export async function getUserProfile(userId: string) {
  const supabase = createClient()

  // Try to get existing profile
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  // If profile doesn't exist, create it
  if (error && error.code === 'PGRST116') {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('No authenticated user')

    const { data: newProfile, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: user.email || '',
        organization_name: null,
        is_admin: false
      })
      .select()
      .single()

    if (insertError) throw insertError
    return newProfile
  }

  if (error) throw error
  return data
}

export async function getAllUsers() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateUser(userId: string, updates: { email?: string; organization_name?: string; is_admin?: boolean }) {
  const supabase = createClient()

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)

  if (error) throw error
}

export async function deleteUser(userId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) throw error
}

export async function isNapaAdmin(userId: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('is_admin, organization_name')
    .eq('id', userId)
    .single()

  if (error) return false
  return data.is_admin && data.organization_name === 'National APIDA Panhellenic Association'
}