import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }

    if (data.user) {
      // Check if user profile exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      // If profile doesn't exist, create it with organization from metadata
      if (!existingProfile) {
        const organizationName = data.user.user_metadata?.organization_name

        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email || '',
            organization_name: organizationName || null,
            is_admin: false,
          })

        if (insertError) {
          console.error('Error creating user profile:', insertError)
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  console.error('No code provided or user data missing')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}