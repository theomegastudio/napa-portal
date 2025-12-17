import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By accessing and using the NAPA Resource Hub, you accept and agree to be bound by the terms
                and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
              <p className="text-gray-700">
                Permission is granted to temporarily access the resources on NAPA Resource Hub for personal,
                non-commercial use only. This is the grant of a license, not a transfer of title.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
              <p className="text-gray-700">
                Users are responsible for maintaining the confidentiality of their account and for all
                activities that occur under their account. You agree to provide accurate and complete
                information when creating your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Content and Resources</h2>
              <p className="text-gray-700">
                All resources shared on this platform remain the property of their respective organizations.
                Users must respect intellectual property rights and use resources only for their intended purpose.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Prohibited Uses</h2>
              <p className="text-gray-700">
                You may not use this platform to share inappropriate content, violate any laws, or infringe
                upon the rights of others. NAPA reserves the right to remove any content or terminate accounts
                that violate these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Modifications</h2>
              <p className="text-gray-700">
                NAPA may revise these terms of service at any time without notice. By using this platform,
                you agree to be bound by the current version of these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Contact Information</h2>
              <p className="text-gray-700">
                If you have any questions about these Terms, please contact us at info@napahq.org.
              </p>
            </section>

            <p className="text-sm text-gray-500 mt-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
