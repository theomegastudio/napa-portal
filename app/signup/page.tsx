'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'
import NapaAuthLogo from '@/components/NapaAuthLogo'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"

interface Organization {
  id: string
  organization_name: string
}

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email')

  const [email, setEmail] = useState(emailParam || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isPendingApproval, setIsPendingApproval] = useState(false)
  const [isNapaEmail, setIsNapaEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if email is from NAPA domain
  useEffect(() => {
    const napaDomains = ['@napahq.org', '@napa-online.org']
    const isNapa = napaDomains.some(domain => email.toLowerCase().endsWith(domain))
    setIsNapaEmail(isNapa)

    if (isNapa) {
      setOrganizationName('National APIDA Panhellenic Association')
    }
  }, [email])

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const response = await fetch('/api/v2/organizations')
        if (!response.ok) throw new Error('Failed to fetch organizations')
        const orgs = await response.json()
        // Filter out NAPA since it's auto-assigned for NAPA emails
        const filteredOrgs = orgs.filter(
          (org: Organization) => org.organization_name !== 'National APIDA Panhellenic Association'
        )
        setOrganizations(filteredOrgs)
      } catch (error) {
        console.error('Failed to load organizations:', error)
        toast.error('Failed to load organizations')
      } finally {
        setLoadingOrgs(false)
      }
    }
    fetchOrganizations()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError('Please enter your email')
      return
    }

    if (!password) {
      setError('Please enter a password')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!organizationName && !isNapaEmail) {
      setError('Please select your organization')
      return
    }

    if (!termsAccepted) {
      setError('Please accept the terms and conditions')
      return
    }

    setIsLoading(true)

    try {
      // Create account
      const response = await fetch('/api/v2/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
          organizationName: isNapaEmail ? undefined : organizationName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        return
      }

      setIsSuccess(true)

      // Check approval status and redirect accordingly
      if (data.approvalStatus === 'pending') {
        setIsPendingApproval(true)
        toast.success('Account created! Awaiting approval.')
        // Auto sign in then redirect to pending page
        setTimeout(async () => {
          const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
          })

          if (result?.ok) {
            router.push('/pending-approval')
            router.refresh()
          } else {
            router.push('/login')
          }
        }, 1500)
      } else {
        toast.success('Account created successfully!')
        // Auto sign in after successful registration
        setTimeout(async () => {
          const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
          })

          if (result?.ok) {
            router.push('/')
            router.refresh()
          } else {
            router.push('/login')
          }
        }, 1500)
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <a href="/">
              <NapaAuthLogo size="xl" />
            </a>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs text-center">
              <div className="flex flex-col items-center gap-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${isPendingApproval ? 'bg-primary/10' : 'bg-green-100'}`}>
                  <CheckCircle2 className={`h-8 w-8 ${isPendingApproval ? 'text-primary' : 'text-green-600'}`} />
                </div>
                <h1 className="text-2xl font-bold">Account Created!</h1>
                <p className="text-muted-foreground text-sm">
                  {isPendingApproval
                    ? 'Your account is pending approval from your organization administrator.'
                    : 'Your account has been created successfully. Signing you in...'}
                </p>
                <Loader2 className="h-6 w-6 animate-spin text-primary mt-4" />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-primary relative hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <NapaAuthLogo size="xl" />
            </div>
            <h2 className="text-3xl font-bold text-primary-foreground">{isPendingApproval ? 'Almost There!' : 'Welcome!'}</h2>
            <p className="text-lg text-primary-foreground/80 max-w-md mx-auto">
              A shared resource library for NAPA organizations to collaborate and share best practices.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/">
            <NapaAuthLogo size="xl" />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="text-2xl font-bold">Create your account</h1>
                  <p className="text-muted-foreground text-sm text-balance">
                    Join the NAPA Resource Hub community
                  </p>
                </div>

                {error && (
                  <FieldError className="text-center">{error}</FieldError>
                )}

                <Field>
                  <FieldLabel htmlFor="name">Full Name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="chair@napahq.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || !!emailParam}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password (min 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </Field>

                {isNapaEmail ? (
                  <Field>
                    <FieldLabel htmlFor="organization">Organization</FieldLabel>
                    <Input
                      id="organization"
                      value="National APIDA Panhellenic Association"
                      disabled
                      className="bg-muted"
                    />
                    <FieldDescription>
                      Automatically assigned based on your email domain
                    </FieldDescription>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel htmlFor="organization">Organization</FieldLabel>
                    <Select
                      value={organizationName}
                      onValueChange={setOrganizationName}
                      disabled={isLoading || loadingOrgs}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={loadingOrgs ? "Loading..." : "Select your organization"} />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5}>
                        {organizations.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No organizations available</div>
                        ) : (
                          organizations.map((org) => (
                            <SelectItem key={org.id} value={org.organization_name}>
                              {org.organization_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <Field orientation="horizontal">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm leading-tight cursor-pointer"
                  >
                    I agree to the{' '}
                    <a href="/terms" target="_blank" className="text-primary hover:text-primary/80 underline underline-offset-4">
                      Terms
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" className="text-primary hover:text-primary/80 underline underline-offset-4">
                      Privacy Policy
                    </a>
                  </label>
                </Field>

                <Field>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || loadingOrgs}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </Field>

                <FieldDescription className="text-center">
                  Already have an account?{' '}
                  <a href="/login" className="text-primary hover:text-primary/80 underline underline-offset-4">
                    Sign in
                  </a>
                </FieldDescription>
              </FieldGroup>
            </form>
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
          <h2 className="text-3xl font-bold text-black">
            NAPA Resource Hub
          </h2>
          <p className="text-lg text-black/80 max-w-md mx-auto">
            A shared resource library for NAPA organizations to collaborate and share best practices.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
