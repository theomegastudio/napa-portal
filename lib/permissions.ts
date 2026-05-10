// Resource-level permission checks

export interface SessionUser {
  id: string
  role?: string
  isAdmin?: boolean
  organizationName?: string
}

export function canViewResource(user: SessionUser, resourceOrg: string): boolean {
  // napaAdmin can see everything; org members see their org; admins see their org
  if (user.role === 'napaAdmin') return true
  return user.organizationName === resourceOrg
}

export function canEditResource(user: SessionUser, resourceOrg: string, uploadedById?: string): boolean {
  if (user.role === 'napaAdmin') return true
  if (user.organizationName !== resourceOrg) return false
  // Org admins can edit any resource in their org
  if (user.isAdmin) return true
  // Regular users can only edit their own uploads
  return user.id === uploadedById
}

export function canDeleteResource(user: SessionUser, resourceOrg: string): boolean {
  if (user.role === 'napaAdmin') return true
  if (user.organizationName !== resourceOrg) return false
  return !!user.isAdmin
}

export function canDownloadResource(user: SessionUser, resourceOrg: string, allowDownload: boolean): boolean {
  if (!allowDownload) {
    // Only admins can bypass the download restriction
    return user.role === 'napaAdmin' || (user.organizationName === resourceOrg && !!user.isAdmin)
  }
  return canViewResource(user, resourceOrg)
}

export function canArchiveResource(user: SessionUser, resourceOrg: string): boolean {
  return canDeleteResource(user, resourceOrg)
}
