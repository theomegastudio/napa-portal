'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const SEGMENT_LABELS: Record<string, string> = {
  '': 'Home',
  archive: 'Archive',
  profile: 'Profile Settings',
  admin: 'Admin',
  approvals: 'Pending Approvals',
  members: 'Org Users',
  users: 'Manage Users',
  organizations: 'Organizations',
  'org-health': 'Org Health',
  audit: 'Audit Log',
  resources: 'Resources',
}

interface Crumb {
  label: string
  href: string
  isLast: boolean
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = [{ label: 'Home', href: '/', isLast: segments.length === 0 }]
  let accumulated = ''
  segments.forEach((seg, idx) => {
    accumulated += `/${seg}`
    const label = SEGMENT_LABELS[seg] ?? prettify(seg)
    crumbs.push({ label, href: accumulated, isLast: idx === segments.length - 1 })
  })
  return crumbs
}

function prettify(seg: string): string {
  // Resource detail UUIDs become "Details"; other unknown segments get title-cased
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(seg)) return 'Details'
  return seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function TopNav() {
  const pathname = usePathname()
  const crumbs = buildCrumbs(pathname)

  return (
    <header className="h-14 border-b bg-background flex items-center px-6 shrink-0 rounded-t-lg">
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, idx) => (
            <span key={crumb.href} className="contents">
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {idx < crumbs.length - 1 && <BreadcrumbSeparator />}
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
