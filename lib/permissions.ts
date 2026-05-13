/** Minimal user shape required for permission checks. Cast from BetterAuth session.user. */
export interface SessionUser {
  id: string
  role?: string
  isAdmin?: boolean
  organizationName?: string | null
  canViewOrgHealth?: boolean
}

/** Both NAPA Board and NAPA Directors. Read+write across all orgs. */
export function isNapaUser(user: SessionUser): boolean {
  return user.role === 'napaBoard' || user.role === 'napaDirector'
}

/** NAPA Board only — can approve users and grant/revoke board/director roles. */
export function isNapaBoard(user: SessionUser): boolean {
  return user.role === 'napaBoard'
}

/** NAPA Directors only. */
export function isNapaDirector(user: SessionUser): boolean {
  return user.role === 'napaDirector'
}

/**
 * Whether the user can see a resource.
 * NAPA users see everything; everyone else only sees resources from their own organization.
 */
export function canViewResource(user: SessionUser, resourceOrg: string): boolean {
  if (isNapaUser(user)) return true
  return user.organizationName === resourceOrg
}

/**
 * Whether the user can edit a resource's metadata.
 * NAPA user: yes. Same-org admin: yes. Uploader: yes. Everyone else: no.
 */
export function canEditResource(user: SessionUser, resourceOrg: string, uploadedById?: string): boolean {
  if (isNapaUser(user)) return true
  if (user.organizationName !== resourceOrg) return false
  if (user.isAdmin) return true
  return user.id === uploadedById
}

/**
 * Whether the user can permanently delete a resource.
 * Only an admin from the owning org. NAPA staff intentionally not allowed to
 * delete other orgs' resources.
 */
export function canDeleteResource(user: SessionUser, resourceOrg: string): boolean {
  return user.organizationName === resourceOrg && !!user.isAdmin
}

/**
 * Whether the user can download a resource's files.
 * When allowDownload=false, only admins bypass. Otherwise any viewer can.
 */
export function canDownloadResource(user: SessionUser, resourceOrg: string, allowDownload: boolean): boolean {
  if (!allowDownload) {
    return isNapaUser(user) || (user.organizationName === resourceOrg && !!user.isAdmin)
  }
  return canViewResource(user, resourceOrg)
}

/** Same permission level as delete. */
export function canArchiveResource(user: SessionUser, resourceOrg: string): boolean {
  return canDeleteResource(user, resourceOrg)
}

/** Whether the user can see Org Health metrics. Board always; Director only if flagged. */
export function canViewOrgHealth(user: SessionUser): boolean {
  if (isNapaBoard(user)) return true
  if (isNapaDirector(user)) return !!user.canViewOrgHealth
  return false
}

/** Whether the user can approve pending user accounts. NAPA Board only or org admins for own org. */
export function canApproveUsers(user: SessionUser): boolean {
  return isNapaBoard(user) || !!user.isAdmin
}

/** Whether the user can grant/revoke Board/Director roles. NAPA Board only. */
export function canManageRoles(user: SessionUser): boolean {
  return isNapaBoard(user)
}

/** Whether the user can CRUD organizations. NAPA Board only. */
export function canManageOrganizations(user: SessionUser): boolean {
  return isNapaBoard(user)
}
