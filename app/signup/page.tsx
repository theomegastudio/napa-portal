'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'
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
  const orgParam = searchParams.get('org')
  const isInvited = searchParams.get('invited') === 'true'

  const [email, setEmail] = useState(emailParam || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState(orgParam || '')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isPendingApproval, setIsPendingApproval] = useState(false)
  const [isNapaEmail, setIsNapaEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsDialogOpen, setTermsDialogOpen] = useState(false)
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false)

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
      // Create account using our custom signup endpoint
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
          const result = await signIn.email({
            email,
            password,
            callbackURL: '/pending-approval',
          })

          if (!result.error) {
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
          const result = await signIn.email({
            email,
            password,
            callbackURL: '/',
          })

          if (!result.error) {
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
            <h2 className="text-3xl font-bold text-black">{isPendingApproval ? 'Almost There!' : 'Welcome!'}</h2>
            <p className="text-lg text-black/80 max-w-md mx-auto">
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
                  <h1 className="text-2xl font-bold">
                    {isInvited ? 'Complete your account' : 'Create your account'}
                  </h1>
                  <p className="text-muted-foreground text-sm text-balance">
                    {isInvited
                      ? `You've been invited to join ${orgParam || 'an organization'}`
                      : 'Join the NAPA Resource Hub community'}
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password (min 8 characters)"
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
                  <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">
                        {showConfirmPassword ? "Hide password" : "Show password"}
                      </span>
                    </Button>
                  </div>
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
                ) : isInvited && orgParam ? (
                  <Field>
                    <FieldLabel htmlFor="organization">Organization</FieldLabel>
                    <Input
                      id="organization"
                      value={orgParam}
                      disabled
                      className="bg-muted"
                    />
                    <FieldDescription>
                      Pre-assigned by your organization admin
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
                    <button
                      type="button"
                      onClick={() => setTermsDialogOpen(true)}
                      className="text-primary hover:text-primary/80 underline underline-offset-4"
                    >
                      Terms
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={() => setPrivacyDialogOpen(true)}
                      className="text-primary hover:text-primary/80 underline underline-offset-4"
                    >
                      Privacy Policy
                    </button>
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

      {/* Terms of Service Dialog */}
      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Terms of Service</DialogTitle>
            <p className="text-sm text-muted-foreground">Effective Date: February 1, 2026</p>
          </DialogHeader>
          <div className="prose prose-sm max-w-none space-y-5 text-gray-700">
            <section>
              <h3 className="text-base font-semibold text-foreground">1. What This Platform Is</h3>
              <p>The NAPA Resource Hub is a private resource-sharing platform for member organizations of the National APIDA Panhellenic Association (&quot;NAPA&quot;). By creating an account, you agree to these terms.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">2. Who Can Use This</h3>
              <p>This platform is for authorized representatives of NAPA member organizations. To use it, you must:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Be at least 18 years old</li>
                <li>Register with a valid email address</li>
                <li>Provide your real name and organization affiliation</li>
                <li>Be approved by your organization&apos;s administrator or a NAPA administrator</li>
              </ul>
              <p>You&apos;re responsible for keeping your login credentials secure. If you think someone else accessed your account, email us immediately at info@napahq.org.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">3. Use It Responsibly</h3>
              <p className="font-medium">You can:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Browse, search, and download shared resources</li>
                <li>Upload resources to share with other NAPA organizations</li>
                <li>Manage your organization&apos;s members (if you&apos;re an admin)</li>
              </ul>
              <p className="font-medium mt-3">You can&apos;t:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the platform for anything illegal</li>
                <li>Upload content that violates copyright, privacy rights, or is otherwise harmful</li>
                <li>Share your login with others</li>
                <li>Try to hack or break the platform</li>
                <li>Share downloaded resources publicly outside NAPA without permission</li>
                <li>Upload malware or viruses</li>
                <li>Lie about who you are or which organization you represent</li>
              </ul>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">4. What You Upload</h3>
              <p><strong>Ownership:</strong> You (or your organization) own the resources you upload. By uploading, you&apos;re giving NAPA permission to host and share those resources with other authorized users.</p>
              <p><strong>Perpetual Access:</strong> Resources you upload will remain available to NAPA member organizations even if you delete your account&mdash;they&apos;ll just be attributed to your organization instead of you personally.</p>
              <p><strong>Shared Resources:</strong> When you download resources from other organizations, use them responsibly. They&apos;re for reference&mdash;review them independently before adopting anything for your organization.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">5. Administrators</h3>
              <p>There are two types of admins:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Organization Admins:</strong> Manage members within their organization, approve new members, send invites</li>
                <li><strong>NAPA Admins:</strong> Manage all users across all organizations, approve new organizations, view audit logs, ban users</li>
              </ul>
              <p>Admin privileges can be granted or revoked by NAPA at any time.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">6. Account Suspension or Termination</h3>
              <p>We can suspend or terminate your account if you violate these terms, do something harmful to other users or the platform, or misuse admin privileges. If you&apos;re banned, you&apos;ll lose access immediately.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">7. No Warranties</h3>
              <p>The platform is provided &quot;as is.&quot; We don&apos;t guarantee it&apos;ll always work perfectly or be available 24/7. Resources shared by other organizations haven&apos;t been verified by NAPA&mdash;use your own judgment.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">8. Changes to These Terms</h3>
              <p>We may update these terms occasionally. Continuing to use the platform means you accept the changes.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">9. Legal Stuff</h3>
              <p>These terms are governed by Iowa law (where NAPA is incorporated). Any disputes will be handled in Iowa courts. Contact us at info@napahq.org with any questions.</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Privacy Policy</DialogTitle>
            <p className="text-sm text-muted-foreground">Effective Date: February 1, 2026</p>
          </DialogHeader>
          <div className="prose prose-sm max-w-none space-y-5 text-gray-700">
            <section>
              <h3 className="text-base font-semibold text-foreground">1. Introduction</h3>
              <p>This Privacy Policy explains what information we collect when you use the NAPA Resource Hub, how we use it, and your rights. By using the platform, you agree to these practices.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">2. What Information We Collect</h3>
              <p className="font-medium">Information you give us:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your email address, name, and organization affiliation</li>
                <li>Your password (we store it encrypted&mdash;we never see your actual password)</li>
                <li>Resources and files you upload, including titles and descriptions</li>
              </ul>
              <p className="font-medium mt-3">Information we collect automatically:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your IP address and browser type (for security)</li>
                <li>Activity logs: what you upload, download, edit, or delete</li>
                <li>Email verification records (we ask you to verify every 60 days for security)</li>
              </ul>
              <p className="font-medium mt-3">What we DON&apos;T collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>We don&apos;t use analytics trackers or advertising</li>
                <li>We don&apos;t collect payment information</li>
                <li>We don&apos;t collect demographic data beyond your organization</li>
              </ul>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">3. How We Use Your Information</h3>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Create and manage your account</li>
                <li>Let admins approve new members</li>
                <li>Send you important emails (verification codes, approvals, password resets&mdash;no marketing)</li>
                <li>Keep the platform secure and catch suspicious activity</li>
                <li>Let admins manage their organizations</li>
                <li>Improve the platform based on how people use it</li>
              </ul>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">4. Who Sees Your Information</h3>
              <p className="font-medium">Within the platform:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your organization&apos;s admins and NAPA admins can see your name, email, and organization</li>
                <li>Other users can see your name and organization on resources you upload</li>
              </ul>
              <p className="font-medium mt-3">Outside the platform:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Cloud hosting providers (they host our database and file storage&mdash;they&apos;re contractually required to protect your data)</li>
                <li>Law enforcement (only if legally required)</li>
              </ul>
              <p className="font-medium mt-3">We never sell your information.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">5. How We Protect Your Data</h3>
              <p>Your data is stored in the United States. We protect it with:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Encrypted passwords (using bcrypt)</li>
                <li>HTTPS/TLS encryption for all connections</li>
                <li>Secure session cookies that expire after 30 days</li>
                <li>Regular email verification (every 60 days)</li>
                <li>Audit logs to track who does what</li>
                <li>Role-based access controls</li>
              </ul>
              <p>No security is perfect, but we take reasonable precautions.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">6. Cookies</h3>
              <p>We only use essential cookies to keep you logged in and speed up page loads during your session. We don&apos;t use advertising or tracking cookies.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">7. How Long We Keep Your Data</h3>
              <p>While your account is active, we keep your account info and uploaded resources. If you delete your account, your name and email are removed, but resources stay available (attributed to your organization) and audit logs are anonymized. If you&apos;re banned, we keep full audit logs for security purposes.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">8. Your Rights</h3>
              <p>You can:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Update your name</strong> through Profile Settings</li>
                <li><strong>Request a copy of your data</strong> by emailing info@napahq.org</li>
                <li><strong>Delete your account</strong> by contacting your organization admin or a NAPA admin</li>
                <li><strong>Stop using the platform</strong> anytime</li>
              </ul>
              <p>To update your email or organization, contact your admin or NAPA.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">9. Changes to This Policy</h3>
              <p>We may update this policy occasionally. Continuing to use the platform means you accept the updates.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-foreground">10. Questions?</h3>
              <p>Contact us at info@napahq.org with any questions about your privacy or data.</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
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
