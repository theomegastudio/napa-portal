'use client'

// BetterAuth doesn't require a provider wrapper like next-auth
// The auth client handles session state automatically
// This component is kept for backwards compatibility but just renders children

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
