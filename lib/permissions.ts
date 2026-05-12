/** Minimal user shape required for permission checks. Cast from BetterAuth session.user. */
export interface SessionUser {
  id: string
  role?: string
  isAdmin?: boolean
  organizationName?: string
}

/**
 * Whether the user can see a resource.
 * napaAdmin sees everything; all other users only see resources from their own organization.
 */
export function canViewResource(user: SessionUser, resourceOrg: string): boolean {
  if (user.role === 'napaAdmin') return true
  return user.organizationName === resourceOrg
}

/**
 * Whether the user can edit a resource's metadata.
 * napaAdmin: yes. Same-org admin: yes. Uploader of the resource: yes. Everyone else: no.
 */
export function canEditResource(user: SessionUser, resourceOrg: string, uploadedById?: string): boolean {
  if (user.role === 'napaAdmin') return true
  if (user.organizationName !== resourceOrg) return false
  if (user.isAdmin) return true
  return user.id === uploadedById
}

/**
 * Whether the user can permanently delete a resource.
 * Requires napaAdmin or org-level admin role within the resource's organization.
 */
export function canDeleteResource(user: SessionUser, resourceOrg: string): boolean {
  if (user.role === 'napaAdmin') return true
  if (user.organizationName !== resourceOrg) return false
  return !!user.isAdmin
}

/**
 * Whether the user can download a resource's files.
 * When `allowDownload` is false on the resource, only admins can bypass the restriction.
 * When `allowDownload` is true, any user who can view the resource can download it.
 */
export function canDownloadResource(user: SessionUser, resourceOrg: string, allowDownload: boolean): boolean {
  if (!allowDownload) {
    return user.role === 'napaAdmin' || (user.organizationName === resourceOrg && !!user.isAdmin)
  }
  return canViewResource(user, resourceOrg)
}

/**
 * Whether the user can archive or unarchive a resource.
 * Same permission level as delete — org admin or napaAdmin.
 */
export function canArchiveResource(user: SessionUser, resourceOrg: string): boolean {
  return canDeleteResource(user, resourceOrg)
}
