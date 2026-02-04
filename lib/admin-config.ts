import {
  UserCheck,
  Users,
  ScrollText,
  Settings,
  LucideIcon,
} from 'lucide-react'

export type AdminRole = 'admin' | 'napaAdmin'

export interface AdminPage {
  id: string
  title: string
  description: string
  href: string
  icon: LucideIcon
  requiredRole: AdminRole
}

// All admin pages configuration
export const adminPages: AdminPage[] = [
  {
    id: 'approvals',
    title: 'Pending Approvals',
    description: 'Review and approve new user registration requests',
    href: '/admin/approvals',
    icon: UserCheck,
    requiredRole: 'admin',
  },
  {
    id: 'members',
    title: 'Manage Members',
    description: 'View and manage organization members',
    href: '/admin/members',
    icon: Users,
    requiredRole: 'admin',
  },
  {
    id: 'audit',
    title: 'Audit Logs',
    description: 'View system-wide activity logs',
    href: '/admin/audit',
    icon: ScrollText,
    requiredRole: 'napaAdmin',
  },
  {
    id: 'users',
    title: 'Manage Users',
    description: 'Manage all users across organizations',
    href: '/admin/users',
    icon: Settings,
    requiredRole: 'napaAdmin',
  },
]

// Helper to check if user has required role
export function hasRequiredRole(
  requiredRole: AdminRole,
  isAdmin: boolean,
  isNapaAdmin: boolean
): boolean {
  if (requiredRole === 'napaAdmin') {
    return isNapaAdmin
  }
  // NAPA admins have access to all admin pages
  return isAdmin || isNapaAdmin
}

// Get pages accessible by user
export function getAccessiblePages(isAdmin: boolean, isNapaAdmin: boolean): AdminPage[] {
  return adminPages.filter((page) =>
    hasRequiredRole(page.requiredRole, isAdmin, isNapaAdmin)
  )
}

// Get page by ID
export function getPageById(id: string): AdminPage | undefined {
  return adminPages.find((page) => page.id === id)
}

// Get page by href
export function getPageByHref(href: string): AdminPage | undefined {
  return adminPages.find((page) => page.href === href)
}
