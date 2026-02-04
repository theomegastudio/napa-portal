'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/auth-client'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Notification {
  id: string
  userId: string
  type: string
  read: boolean
  createdAt: string
  userName: string | null
  userEmail: string
  userOrganization: string | null
}

interface NotificationBellProps {
  isAdmin?: boolean
}

export default function NotificationBell({ isAdmin }: NotificationBellProps) {
  const { data: session, isPending: isLoading } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Use passed prop or check session (for backwards compatibility)
  const userIsAdmin = isAdmin ?? false

  const fetchNotifications = useCallback(async () => {
    if (!userIsAdmin) return
    setLoading(true)
    try {
      const response = await fetch('/api/v2/notifications?unreadOnly=false')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.slice(0, 5)) // Show only last 5
        setUnreadCount(data.filter((n: Notification) => !n.read).length)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [userIsAdmin])

  const fetchUnreadCount = useCallback(async () => {
    if (!userIsAdmin) return
    try {
      const response = await fetch('/api/v2/notifications?countOnly=true')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count)
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error)
    }
  }, [userIsAdmin])

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/v2/notifications/${notificationId}/read`, {
        method: 'POST',
      })
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/v2/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  // Fetch on mount and poll every 30 seconds - only when admin
  useEffect(() => {
    if (isLoading || !userIsAdmin) return

    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [isLoading, userIsAdmin, fetchUnreadCount])

  // Don't render for non-admins
  if (isLoading || !userIsAdmin) {
    return null
  }

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'pending_approval':
        return `${notification.userEmail} is waiting for approval`
      case 'approved':
        return `Your account has been approved`
      case 'rejected':
        return `Your account request was not approved`
      default:
        return 'New notification'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && fetchNotifications()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1 px-2"
              onClick={(e) => {
                e.preventDefault()
                markAllAsRead()
              }}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer ${
                  !notification.read ? 'bg-muted/50' : ''
                }`}
                onClick={() => {
                  if (!notification.read) {
                    markAsRead(notification.id)
                  }
                  if (notification.type === 'pending_approval') {
                    window.location.href = '/admin/approvals'
                  }
                }}
              >
                <div className="flex items-start gap-2 w-full">
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getNotificationText(notification)}
                    </p>
                    {notification.userOrganization && notification.type === 'pending_approval' && (
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.userOrganization}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center">
              <Link href="/admin/approvals" className="w-full text-center text-sm">
                View all pending approvals
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
