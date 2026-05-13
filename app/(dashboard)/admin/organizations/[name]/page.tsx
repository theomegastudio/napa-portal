import { redirect } from 'next/navigation'
import { orgSlug } from '@/lib/slug'

/**
 * Legacy path. We moved the org detail page to /org/[slug] (a non-admin route)
 * so org members can see their own org without admin permissions. This redirect
 * preserves any old bookmarked URLs.
 */
export default async function LegacyAdminOrgRedirect({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const decoded = decodeURIComponent(name)
  // If the param looks already-slugified, pass it through; otherwise slugify the name.
  const slug = /^[a-z0-9-]+$/.test(decoded) ? decoded : orgSlug(decoded)
  redirect(`/org/${slug}`)
}
