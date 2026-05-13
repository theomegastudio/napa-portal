'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import {
  Home, Archive, Users, UserCheck,
  ScrollText, Shield, Building2, Activity,
  CalendarDays, Settings, LogOut, ChevronsUpDown, Bell,
} from 'lucide-react'
import NapaPortalLogo from '@/components/NapaPortalLogo'
import CommandSearch from '@/components/CommandSearch'
import UserAvatar from '@/components/UserAvatar'
import ThemeToggle from '@/components/ThemeToggle'
import NotificationBell from '@/components/NotificationBell'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface SidebarUser {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  isAdmin?: boolean
  isNapaAdmin?: boolean
  isNapaBoard?: boolean
  isNapaDirector?: boolean
  canViewOrgHealth?: boolean
  organizationName?: string | null
}

const NAPA_FULL_ORG_NAME = 'National APIDA Panhellenic Association'

function abbreviateOrg(name?: string | null): string {
  if (!name) return 'NAPA Portal'
  if (name === NAPA_FULL_ORG_NAME) return 'NAPA'
  return name
}

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  napaAdminOnly?: boolean
  napaBoardOnly?: boolean
  orgHealthGated?: boolean
  comingSoon?: boolean
}

const mainNav: NavItem[] = [
  { title: 'Resources', href: '/', icon: Home },
  { title: 'Archive', href: '/archive', icon: Archive },
]

const adminNav: NavItem[] = [
  { title: 'Approvals', href: '/admin/approvals', icon: UserCheck, adminOnly: true },
  { title: 'Org Users', href: '/admin/org-users', icon: Users, adminOnly: true },
  { title: 'Users', href: '/admin/users', icon: Shield, napaAdminOnly: true },
  { title: 'Organizations', href: '/admin/organizations', icon: Building2, napaBoardOnly: true },
  { title: 'Org Health', href: '/admin/org-health', icon: Activity, orgHealthGated: true },
  { title: 'Meetings', href: '/admin/meetings', icon: CalendarDays, orgHealthGated: true },
  { title: 'Audit Log', href: '/admin/audit', icon: ScrollText, adminOnly: true },
]

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

  if (item.comingSoon) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          className="cursor-not-allowed opacity-50"
          tooltip={`${item.title} — Coming soon`}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
          <Badge variant="secondary" className="ml-auto text-[10px] px-1 py-0 h-4">Soon</Badge>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive} tooltip={item.title}>
        <item.icon className="h-4 w-4" />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavUser({ user }: { user: SidebarUser }) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            />
          }>
            <UserAvatar
              name={user.name}
              email={user.email ?? undefined}
              image={user.image}
              size="sm"
              className="h-8 w-8 rounded-lg"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name || 'User'}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <UserAvatar
                name={user.name}
                email={user.email ?? undefined}
                image={user.image}
                size="sm"
                className="h-8 w-8 rounded-lg"
              />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{user.name || 'User'}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <Settings className="h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AppSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname()

  const visibleAdminNav = adminNav.filter(item => {
    if (item.napaBoardOnly) return user.isNapaBoard
    if (item.orgHealthGated) return user.isNapaBoard || (user.isNapaDirector && user.canViewOrgHealth)
    if (item.napaAdminOnly) return user.isNapaAdmin
    if (item.adminOnly) return user.isAdmin || user.isNapaAdmin
    return true
  })

  const showAdminSection = visibleAdminNav.length > 0

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />} tooltip="NAPA Portal">
              <div className="flex aspect-square size-8 items-center justify-center rounded-sm overflow-hidden shrink-0">
                <NapaPortalLogo size="sm" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">NAPA Portal</span>
                <span className="truncate text-xs text-muted-foreground">{abbreviateOrg(user.organizationName)}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-2 group-data-[collapsible=icon]:hidden">
            <CommandSearch />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map(item => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdminSection && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminNav.map(item => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-1 px-2 py-1 group-data-[collapsible=icon]:hidden">
          <ThemeToggle />
          <NotificationBell isAdmin={user.isAdmin || user.isNapaAdmin} />
        </div>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
