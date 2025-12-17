'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithMagicLink, checkUserExists } from '@/lib/services/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Mail } from 'lucide-react'
import NapaAuthLogo from '@/components/NapaAuthLogo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Please enter your email')
      return
    }

    setIsLoading(true)

    try {
      // Check if user exists
      const userExists = await checkUserExists(email)

      if (!userExists) {
        // Redirect to sign-up page with email pre-filled
        router.push(`/signup?email=${encodeURIComponent(email)}`)
        return
      }

      // User exists, send magic link
      await signInWithMagicLink(email)
      setEmailSent(true)
      toast.success('Check your email for the magic link!')
    } catch (error) {
      toast.error('Failed to process request')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a magic link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Click the link in the email to sign in. You can close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="text-center space-y-2 pb-2">
            <div className="flex justify-center mb-4">
              <NapaAuthLogo size="lg" />
            </div>
            <CardTitle className="text-2xl font-semibold">Sign in</CardTitle>
            <CardDescription className="text-base">
              Welcome to NAPA Resource Hub
            </CardDescription>
            <CardDescription className="text-sm">
              Sign in with your email to access shared resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-normal">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="text-center text-sm text-gray-600">
          <a href="/terms" className="hover:text-yellow-600 underline">
            Terms of Service
          </a>
          {' • '}
          <a href="/privacy" className="hover:text-yellow-600 underline">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  )
}