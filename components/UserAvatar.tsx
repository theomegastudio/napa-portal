'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Fun gradient backgrounds based on initials
const gradients = [
  "bg-gradient-to-br from-pink-500 to-rose-500",
  "bg-gradient-to-br from-violet-500 to-purple-500",
  "bg-gradient-to-br from-blue-500 to-cyan-500",
  "bg-gradient-to-br from-emerald-500 to-teal-500",
  "bg-gradient-to-br from-orange-500 to-amber-500",
  "bg-gradient-to-br from-red-500 to-pink-500",
  "bg-gradient-to-br from-indigo-500 to-blue-500",
  "bg-gradient-to-br from-fuchsia-500 to-pink-500",
]

// Generate a consistent index based on a string
function getGradientIndex(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % gradients.length
}

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email?.charAt(0).toUpperCase() || 'U'
}

interface UserAvatarProps {
  name?: string | null
  email?: string
  image?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
}

export default function UserAvatar({
  name,
  email,
  image,
  size = 'md',
  className
}: UserAvatarProps) {
  const initials = getInitials(name, email)
  const gradientIndex = getGradientIndex(name || email || 'user')
  const gradient = gradients[gradientIndex]

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {image && <AvatarImage src={image} alt={name || email || 'User'} />}
      <AvatarFallback
        className={cn(
          gradient,
          "text-white font-medium border-0"
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
