'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FolderOpen,
  Archive,
  Upload,
  Users,
  UserCheck,
  ScrollText,
  Shield,
  Globe,
  Building2,
  Activity,
  Settings,
} from 'lucide-react'
import NapaPortalLogo from '@/components/NapaPortalLogo'
import { cn } from '@/lib/utils'

interface SidebarUser {
  isAdmin?: boolean
  isNapaAdmin?: boolean
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  napaAdminOnly?: boolean
  comingSoon?: boolean
}

const mainNav: NavItem[] = [
  { label: 'Resources', href: '/', icon: Home },
  { label: 'Archive', href: '/archive', icon: Archive, comingSoon: true },
]

const adminNav: NavItem[] = [
  { label: 'Pending Approvals', href: '/admin/approvals', icon: UserCheck, adminOnly: true },
  { label: 'Manage Members', href: '/admin/members', icon: Users, adminOnly: true },
  { label: 'Organizations', href: '/admin/organizations', icon: Building2, napaAdminOnly: true, comingSoon: true },
  { label: 'Org Health', href: '/admin/org-health', icon: Activity, napaAdminOnly: true, comingSoon: true },
  { label: 'Manage Users', href: '/admin/users', icon: Shield, napaAdminOnly: true },
  { label: 'Domain Whitelist', href: '/admin/domain-whitelist', icon: Globe, adminOnly: true },
  { label: 'Audit Log', href: '/admin/audit', icon: ScrollText, napaAdminOnly: true },
]

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon

  if (item.comingSoon) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground/50 cursor-not-allowed select-none">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm flex-1">{item.label}</span>
        <span className="text-[10px] font-medium bg-muted text-muted-foreground/60 px-1.5 py-0.5 rounded">
          Soon
        </span>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname()
  const isAdmin = user.isAdmin ?? false
  const isNapaAdmin = user.isNapaAdmin ?? false

  const visibleAdminNav = adminNav.filter(item => {
    if (item.napaAdminOnly) return isNapaAdmin
    if (item.adminOnly) return isAdmin || isNapaAdmin
    return true
  })

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r bg-card h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b">
        <NapaPortalLogo size="sm" />
        <div>
          <p className="text-sm font-semibold leading-tight">NAPA Resource</p>
          <p className="text-xs text-muted-foreground leading-tight">Hub</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Main */}
        {mainNav.map(item => (
          <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
        ))}

        {/* Admin section */}
        {visibleAdminNav.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Administration
              </p>
            </div>
            {visibleAdminNav.map(item => (
              <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
            ))}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t">
        <NavLink
          item={{ label: 'Profile Settings', href: '/profile', icon: Settings }}
          isActive={isActive('/profile')}
        />
      </div>
    </aside>
  )
}
