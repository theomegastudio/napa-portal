'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getOrganizations } from '@/lib/services/organizations'
import { signUpWithMagicLink } from '@/lib/services/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import NapaAuthLogo from '@/components/NapaAuthLogo'
import type { Organization } from '@/lib/types'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email')

  const [email, setEmail] = useState(emailParam || '')
  const [organizationName, setOrganizationName] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [emailSent, setEmailSent] = useState(false)
  const [isNapaEmail, setIsNapaEmail] = useState(false)

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
        const orgs = await getOrganizations()
        // Filter out NAPA since it's auto-assigned for NAPA emails
        const filteredOrgs = orgs.filter(
          org => org.organization_name !== 'National APIDA Panhellenic Association'
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

    if (!email) {
      toast.error('Please enter your email')
      return
    }

    if (!organizationName) {
      toast.error('Please select your organization')
      return
    }

    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions')
      return
    }

    setIsLoading(true)

    try {
      await signUpWithMagicLink(email, organizationName)
      setEmailSent(true)
      toast.success('Check your email for the magic link!')
    } catch (error) {
      toast.error('Failed to send magic link')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-semibold">Check your email</CardTitle>
            <CardDescription>
              We sent a magic link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Click the link in the email to complete your registration. You can close this page.
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
          <CardTitle className="text-2xl font-semibold">Create your account</CardTitle>
          <CardDescription className="text-base">
            Welcome to NAPA Resource Hub
          </CardDescription>
          <CardDescription className="text-sm">
            Fill in your information to get started
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
                disabled={isLoading || !!emailParam}
                required
                className="h-11"
              />
            </div>

            {isNapaEmail ? (
              <div className="space-y-2">
                <Label htmlFor="organization" className="text-sm font-normal">
                  Organization
                </Label>
                <Input
                  id="organization"
                  value="National APIDA Panhellenic Association"
                  disabled
                  className="h-11 bg-gray-100"
                />
                <p className="text-xs text-gray-500">
                  Automatically assigned based on your email domain
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="organization" className="text-sm font-normal">
                  Organization
                </Label>
                <Select
                  value={organizationName}
                  onValueChange={setOrganizationName}
                  disabled={isLoading || loadingOrgs}
                  required
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder={loadingOrgs ? "Loading organizations..." : "Select your organization"} />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5}>
                    {organizations.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No organizations available</div>
                    ) : (
                      organizations.map((org) => (
                        <SelectItem key={org.id} value={org.organization_name}>
                          {org.organization_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!loadingOrgs && organizations.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {organizations.length} organization(s) available
                  </p>
                )}
              </div>
            )}

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                disabled={isLoading}
              />
              <Label
                htmlFor="terms"
                className="text-sm font-normal leading-tight cursor-pointer"
              >
                I agree to the{' '}
                <a href="/terms" target="_blank" className="text-yellow-600 hover:text-yellow-700 font-medium underline">
                  Terms and Conditions
                </a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" className="text-yellow-600 hover:text-yellow-700 font-medium underline">
                  Privacy Policy
                </a>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
              disabled={isLoading || loadingOrgs}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-yellow-600 hover:text-yellow-700 font-medium">
                Sign in
              </a>
            </p>
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
