'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Effective Date: February 1, 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-gray-700">
                This Privacy Policy explains what information we collect when you use the NAPA Resource Hub,
                how we use it, and your rights. By using the platform, you agree to these practices.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. What Information We Collect</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">Information you give us:</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Your email address, name, and organization affiliation</li>
                <li>Your password (we store it encrypted&mdash;we never see your actual password)</li>
                <li>Resources and files you upload, including titles and descriptions</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">Information we collect automatically:</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Your IP address and browser type (for security)</li>
                <li>Activity logs: what you upload, download, edit, or delete</li>
                <li>Email verification records (we ask you to verify every 60 days for security)</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">What we DON&apos;T collect:</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>We don&apos;t use analytics trackers or advertising</li>
                <li>We don&apos;t collect payment information</li>
                <li>We don&apos;t collect demographic data beyond your organization</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-2">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Create and manage your account</li>
                <li>Let admins approve new members</li>
                <li>Send you important emails (verification codes, approvals, password resets&mdash;no marketing)</li>
                <li>Keep the platform secure and catch suspicious activity</li>
                <li>Let admins manage their organizations</li>
                <li>Improve the platform based on how people use it</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Who Sees Your Information</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">Within the platform:</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Your organization&apos;s admins and NAPA admins can see your name, email, and organization</li>
                <li>Other users can see your name and organization on resources you upload</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">Outside the platform:</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Cloud hosting providers (they host our database and file storage&mdash;they&apos;re contractually required to protect your data)</li>
                <li>Law enforcement (only if legally required)</li>
              </ul>

              <p className="text-gray-700 mt-3 font-medium">
                We never sell your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. How We Protect Your Data</h2>
              <p className="text-gray-700 mb-2">
                Your data is stored in the United States. We protect it with:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Encrypted passwords (using bcrypt)</li>
                <li>HTTPS/TLS encryption for all connections</li>
                <li>Secure session cookies that expire after 30 days</li>
                <li>Regular email verification (every 60 days)</li>
                <li>Audit logs to track who does what</li>
                <li>Role-based access controls</li>
              </ul>
              <p className="text-gray-700 mt-3">
                No security is perfect, but we take reasonable precautions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
              <p className="text-gray-700 mb-2">We only use essential cookies to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Keep you logged in</li>
                <li>Speed up page loads during your session</li>
              </ul>
              <p className="text-gray-700 mt-3">
                We don&apos;t use advertising or tracking cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. How Long We Keep Your Data</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">While your account is active:</h3>
              <p className="text-gray-700">
                We keep your account info and uploaded resources.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">If you delete your account:</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Your name and email are removed</li>
                <li>Resources you uploaded stay available (attributed to your organization, not you)</li>
                <li>Audit logs are anonymized (we keep the record of what happened, but remove your identifying info)</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">If you&apos;re banned:</h3>
              <p className="text-gray-700">
                We keep full audit logs with your information for security purposes.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">Resources you upload:</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Kept until you delete them, or an admin deletes them</li>
                <li>If you delete your account, your uploaded resources remain available to NAPA organizations</li>
              </ul>
              <p className="text-gray-700 mt-3">
                You can delete specific resources anytime before deleting your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
              <p className="text-gray-700 mb-2">You can:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Update your name</strong> through Profile Settings</li>
                <li><strong>Request a copy of your data</strong> by emailing info@napahq.org</li>
                <li><strong>Delete your account</strong> by contacting your organization admin or a NAPA admin</li>
                <li><strong>Stop using the platform</strong> anytime</li>
              </ul>
              <p className="text-gray-700 mt-3">
                To update your email or organization, contact your admin or NAPA.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this policy occasionally. We&apos;ll update the date at the top and let you know
                about significant changes. Continuing to use the platform means you accept the updates.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Questions?</h2>
              <p className="text-gray-700">
                Contact us at{' '}
                <a href="mailto:info@napahq.org" className="text-primary hover:text-primary/80">info@napahq.org</a>{' '}
                with any questions about your privacy or data.
              </p>
              <div className="mt-4 text-gray-700">
                <p className="font-medium">National APIDA Panhellenic Association</p>
                <p>
                  Email:{' '}
                  <a href="mailto:info@napahq.org" className="text-primary hover:text-primary/80">info@napahq.org</a>
                </p>
              </div>
            </section>

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-500">
                See also our{' '}
                <Link href="/terms" className="text-primary hover:text-primary/80 underline underline-offset-4">
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
