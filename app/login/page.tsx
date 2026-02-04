import { Suspense } from "react"
import { LoginForm } from "@/components/login-form"
import NapaAuthLogo from "@/components/NapaAuthLogo"
import { Loader2 } from "lucide-react"

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>
}

// Sanitize callbackUrl to prevent open redirect attacks
function sanitizeCallbackUrl(url: string | undefined): string {
  if (!url) return "/";
  // Only allow relative paths (starting with /)
  // Reject absolute URLs, protocol-relative URLs, and other schemes
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return "/";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl)

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/">
            <NapaAuthLogo size="xl" />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Suspense fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <LoginForm callbackUrl={callbackUrl} />
            </Suspense>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          <a href="/terms" className="hover:text-primary underline underline-offset-4">
            Terms of Service
          </a>
          {' · '}
          <a href="/privacy" className="hover:text-primary underline underline-offset-4">
            Privacy Policy
          </a>
        </div>
      </div>
      <div className="bg-primary relative hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <NapaAuthLogo size="xl" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground">
            NAPA Resource Hub
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-md mx-auto">
            A shared resource library for NAPA organizations to collaborate and share best practices.
          </p>
        </div>
      </div>
    </div>
  )
}
