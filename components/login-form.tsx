'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const OAUTH_ENABLED = process.env.NEXT_PUBLIC_OAUTH_ENABLED === 'true'

interface LoginFormProps extends React.ComponentProps<"form"> {
  callbackUrl?: string
}

export function LoginForm({
  className,
  callbackUrl = "/",
  ...props
}: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("Please enter your email and password")
      return
    }

    setIsLoading(true)

    try {
      const result = await signIn.email({
        email,
        password,
      })

      if (result.error) {
        setError(result.error.message || "Invalid email or password")
      } else {
        toast.success("Signed in successfully!")
        // Use window.location for a full page load to ensure the session cookie
        // is properly established before the destination page checks auth state.
        // router.push can navigate before the cookie is set, causing a redirect loop.
        window.location.href = callbackUrl
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleCredentialsLogin}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Sign in to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your credentials to access NAPA Resource Hub
          </p>
        </div>

        {error && (
          <FieldError className="text-center">{error}</FieldError>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="chair@napahq.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">
                {showPassword ? "Hide password" : "Show password"}
              </span>
            </Button>
          </div>
        </Field>

        <Field>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </Field>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!OAUTH_ENABLED}
            className="relative flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent enabled:hover:bg-accent"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
            {!OAUTH_ENABLED && (
              <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1 py-0 h-4">Soon</Badge>
            )}
          </button>

          <button
            type="button"
            disabled={!OAUTH_ENABLED}
            className="relative flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent enabled:hover:bg-accent"
          >
            <svg viewBox="0 0 23 23" className="h-4 w-4" aria-hidden="true">
              <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
              <path fill="#f35325" d="M1 1h10v10H1z"/>
              <path fill="#81bc06" d="M12 1h10v10H12z"/>
              <path fill="#05a6f0" d="M1 12h10v10H1z"/>
              <path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
            Microsoft
            {!OAUTH_ENABLED && (
              <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1 py-0 h-4">Soon</Badge>
            )}
          </button>
        </div>

        <FieldDescription className="text-center">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="underline underline-offset-4 text-primary hover:text-primary/80">
            Sign up
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
