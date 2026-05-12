'use client'

import { usePathname } from 'next/navigation'
import CommandSearch from '@/components/CommandSearch'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Resources',
  '/archive': 'Archive',
  '/profile': 'Profile Settings',
  '/admin/approvals': 'Pending Approvals',
  '/admin/members': 'Manage Members',
  '/admin/users': 'Manage Users',
  '/admin/organizations': 'Organizations',
  '/admin/org-health': 'Org Health',
  '/admin/audit': 'Audit Log',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/resources/')) return 'Resource Details'
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path + '/')) return title
  }
  return 'NAPA Resource Hub'
}

export default function TopNav() {
  const pathname = usePathname()

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold">{getPageTitle(pathname)}</h1>
      <CommandSearch />
    </header>
  )
}
