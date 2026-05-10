import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/pending-approval',
  '/account-rejected',
  '/verify-email',
  '/terms',
  '/privacy',
  '/unauthorized',
  '/api/auth',
  '/api/v2/auth',
  '/api/v2/organizations',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    !!pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next()
  }

  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ||
    request.cookies.get('__Secure-better-auth.session_token')?.value

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
