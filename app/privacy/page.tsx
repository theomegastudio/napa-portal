import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <p className="text-gray-700">
                We collect information you provide directly to us when you create an account, including your
                email address and organization affiliation. We also collect information about your use of
                the platform, such as resources you access and upload.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
              <p className="text-gray-700">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Send you technical notices and support messages</li>
                <li>Facilitate resource sharing among organizations</li>
                <li>Monitor and analyze trends and usage</li>
                <li>Detect and prevent fraudulent or unauthorized activity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
              <p className="text-gray-700">
                We do not sell or share your personal information with third parties except as necessary to
                provide our services or as required by law. Your organization affiliation may be visible to
                other users of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
              <p className="text-gray-700">
                We implement appropriate technical and organizational measures to protect your personal
                information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
              <p className="text-gray-700">
                We retain your personal information for as long as necessary to provide our services and
                fulfill the purposes outlined in this privacy policy, unless a longer retention period is
                required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
              <p className="text-gray-700">
                You have the right to access, update, or delete your personal information at any time. You
                may also request a copy of your data or object to certain processing activities.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Cookies and Tracking</h2>
              <p className="text-gray-700">
                We use cookies and similar tracking technologies to track activity on our platform and hold
                certain information to improve user experience and analyze usage patterns.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this privacy policy from time to time. We will notify you of any changes by
                posting the new policy on this page and updating the "last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy, please contact us at info@napahq.org.
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
