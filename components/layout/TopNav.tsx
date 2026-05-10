'use client'

import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import UserAvatar from '@/components/UserAvatar'
import NotificationBell from '@/components/NotificationBell'
import CommandSearch from '@/components/CommandSearch'
import { Settings, LogOut } from 'lucide-react'

interface TopNavUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

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
  '/admin/domain-whitelist': 'Domain Whitelist',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path + '/')) return title
  }
  return 'NAPA Resource Hub'
}

export default function TopNav({ user }: { user: TopNavUser }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })
  }

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold">{getPageTitle(pathname)}</h1>

      <div className="flex items-center gap-3">
        <CommandSearch />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <UserAvatar name={user.name} email={user.email ?? undefined} image={user.image} size="sm" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <UserAvatar name={user.name} email={user.email ?? undefined} image={user.image} size="md" />
                <div className="flex flex-col space-y-0.5 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <Settings className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
