import type { NextAuthConfig } from 'next-auth';

// Edge-compatible auth configuration (no database adapters or Node.js providers)
// This is used by middleware for JWT verification
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    verifyRequest: '/login?verify=true',
    error: '/login?error=true',
    newUser: '/signup',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [], // Providers are added in the full auth.ts config
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes that don't require authentication
      const publicRoutes = ['/login', '/signup', '/terms', '/privacy', '/pending-approval', '/account-rejected', '/verify-email', '/api/auth', '/api/v2/auth/signup', '/api/v2/auth/otp', '/api/v2/organizations'];
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

      // Allow public routes
      if (isPublicRoute) {
        return true;
      }

      // Allow static files and images
      if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
      ) {
        return true;
      }

      // Require authentication for all other routes
      if (isLoggedIn) {
        return true;
      }

      // Redirect to login
      return false;
    },
  },
};
