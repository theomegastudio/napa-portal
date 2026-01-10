'use client'

import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import UserAvatar from "@/components/UserAvatar"
import NapaPortalLogo from "@/components/NapaPortalLogo"
import { adminPages, getAccessiblePages } from "@/lib/admin-config"
import {
  Shield,
  LogOut,
  ArrowLeft,
  ChevronDown,
  Home,
  Settings,
} from "lucide-react"

interface AppHeaderUser {
  name?: string | null
  email?: string | null
  image?: string | null
  organizationName?: string | null
  isAdmin?: boolean
  isNapaAdmin?: boolean
}

interface AppHeaderProps {
  user: AppHeaderUser
  title?: string
  description?: string
  showBackButton?: boolean
  variant?: 'main' | 'admin'
}

export default function AppHeader({
  user,
  title,
  description,
  showBackButton = false,
  variant = 'main',
}: AppHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const isAdmin = user.isAdmin ?? false
  const isNapaAdmin = user.isNapaAdmin ?? false

  // Get accessible admin pages for this user
  const accessiblePages = getAccessiblePages(isAdmin, isNapaAdmin)
  const orgAdminPages = accessiblePages.filter(p => p.requiredRole === 'admin')
  const napaAdminPages = accessiblePages.filter(p => p.requiredRole === 'napaAdmin')

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <NapaPortalLogo size={variant === 'admin' ? 'sm' : 'md'} />
              <div>
                <h1 className={variant === 'admin' ? "text-xl font-bold" : "text-2xl font-bold"}>
                  {title || 'NAPA Resource Hub'}
                </h1>
                {description ? (
                  <p className="text-sm text-muted-foreground">{description}</p>
                ) : variant === 'main' && user.organizationName ? (
                  <p className="text-sm text-muted-foreground">
                    {user.organizationName}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin dropdown - only show if user has admin privileges */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Admin
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Administration</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {orgAdminPages.map((page) => {
                    const Icon = page.icon
                    return (
                      <DropdownMenuItem
                        key={page.id}
                        onClick={() => router.push(page.href)}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {page.title}
                      </DropdownMenuItem>
                    )
                  })}
                  {napaAdminPages.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        NAPA Admin
                      </DropdownMenuLabel>
                      {napaAdminPages.map((page) => {
                        const Icon = page.icon
                        return (
                          <DropdownMenuItem
                            key={page.id}
                            onClick={() => router.push(page.href)}
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {page.title}
                          </DropdownMenuItem>
                        )
                      })}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <UserAvatar
                    name={user.name}
                    email={user.email ?? undefined}
                    image={user.image}
                    size="md"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={user.name}
                      email={user.email ?? undefined}
                      image={user.image}
                      size="lg"
                    />
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium">{user.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {variant === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/')}>
                    <Home className="mr-2 h-4 w-4" />
                    Back to Resources
                  </DropdownMenuItem>
                )}
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
        </div>
      </div>
    </header>
  )
}
