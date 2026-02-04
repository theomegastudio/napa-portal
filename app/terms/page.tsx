'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TermsPage() {
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
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Effective Date: February 1, 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. What This Platform Is</h2>
              <p className="text-gray-700">
                The NAPA Resource Hub is a private resource-sharing platform for member organizations of the
                National APIDA Panhellenic Association (&quot;NAPA&quot;). By creating an account, you agree
                to these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Who Can Use This</h2>
              <p className="text-gray-700 mb-3">
                This platform is for authorized representatives of NAPA member organizations. To use it, you must:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Be at least 18 years old</li>
                <li>Register with a valid email address</li>
                <li>Provide your real name and organization affiliation</li>
                <li>Be approved by your organization&apos;s administrator or a NAPA administrator</li>
              </ul>
              <p className="text-gray-700 mt-3">
                You&apos;re responsible for keeping your login credentials secure. If you think someone else
                accessed your account, email us immediately at{' '}
                <a href="mailto:info@napahq.org" className="text-primary hover:text-primary/80">info@napahq.org</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Use It Responsibly</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">You can:</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Browse, search, and download shared resources</li>
                <li>Upload resources to share with other NAPA organizations</li>
                <li>Manage your organization&apos;s members (if you&apos;re an admin)</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">You can&apos;t:</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
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
              <h2 className="text-xl font-semibold mb-3">4. What You Upload</h2>
              <p className="text-gray-700 mb-3">
                <strong>Ownership:</strong> You (or your organization) own the resources you upload. By uploading,
                you&apos;re giving NAPA permission to host and share those resources with other authorized users.
              </p>
              <p className="text-gray-700 mb-3">
                <strong>Perpetual Access:</strong> Resources you upload will remain available to NAPA member
                organizations even if you delete your account&mdash;they&apos;ll just be attributed to your
                organization instead of you personally. You can delete any specific resources you uploaded at
                any time before deleting your account.
              </p>
              <p className="text-gray-700">
                <strong>Shared Resources:</strong> When you download resources from other organizations, use
                them responsibly. They&apos;re for reference&mdash;review them independently before adopting
                anything for your organization.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Administrators</h2>
              <p className="text-gray-700 mb-3">There are two types of admins:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Organization Admins:</strong> Manage members within their organization, approve new
                  members, send invites
                </li>
                <li>
                  <strong>NAPA Admins:</strong> Manage all users across all organizations, approve new
                  organizations, view audit logs, ban users
                </li>
              </ul>
              <p className="text-gray-700 mt-3">
                Admin privileges can be granted or revoked by NAPA at any time. Use them responsibly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Account Suspension or Termination</h2>
              <p className="text-gray-700 mb-3">
                We can suspend or terminate your account if you:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Violate these terms</li>
                <li>Do something harmful to other users or the platform</li>
                <li>Misuse admin privileges</li>
              </ul>
              <p className="text-gray-700 mt-3">
                If you&apos;re banned, you&apos;ll lose access immediately. Contact{' '}
                <a href="mailto:info@napahq.org" className="text-primary hover:text-primary/80">info@napahq.org</a>{' '}
                if you want to discuss it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. No Warranties</h2>
              <p className="text-gray-700">
                The platform is provided &quot;as is.&quot; We don&apos;t guarantee it&apos;ll always work
                perfectly or be available 24/7. Resources shared by other organizations haven&apos;t been
                verified by NAPA&mdash;use your own judgment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Changes to These Terms</h2>
              <p className="text-gray-700">
                We may update these terms occasionally. If we make significant changes, we&apos;ll post them
                here and update the date above. Continuing to use the platform means you accept the changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Legal Stuff</h2>
              <p className="text-gray-700">
                These terms are governed by Iowa law (where NAPA is incorporated). Any disputes will be handled
                in Iowa courts.
              </p>
              <p className="text-gray-700 mt-3">
                If you have questions or concerns, contact us at{' '}
                <a href="mailto:info@napahq.org" className="text-primary hover:text-primary/80">info@napahq.org</a>.
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
                <Link href="/privacy" className="text-primary hover:text-primary/80 underline underline-offset-4">
                  Privacy Policy
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
