import { auth, isOTPVerificationRequired } from './auth';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import type { ApprovalStatus } from './db/schema';

// Extended user type for server-side use
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  organizationName: string | null;
  isAdmin: boolean;
  /** True if user is NAPA Board OR NAPA Director (read+write across orgs). */
  isNapaAdmin: boolean;
  /** NAPA Board only — can approve users, grant/revoke roles, manage orgs. */
  isNapaBoard: boolean;
  /** NAPA Director only — read+write across orgs but no approvals/role grants. */
  isNapaDirector: boolean;
  /** Whether this director is allowed to see Org Health (Board always can). */
  canViewOrgHealth: boolean;
  approvalStatus: ApprovalStatus;
  emailVerificationRequired: boolean;
  role: string;
}

/**
 * Get the current authenticated user session (may be unauthenticated or stale).
 * Returns null if not logged in. Use this in Server Components and Server Actions
 * where you need to check conditional auth (e.g., render login link vs. user menu).
 * For protected routes, use `requireAuth()` or `requireApprovedAuth()`.
 */
export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch {
    return null;
  }
}

/**
 * Get the current user or throw if not authenticated.
 * Does NOT enforce approval status or OTP freshness.
 * For protected data routes, use `requireApprovedAuth()` instead (enforces both approval + OTP).
 * Use `requireAuth()` only in setup/initialization code where you need the user object
 * but approval isn't required yet.
 */
export async function requireAuth(): Promise<AuthUser> {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Fetch full user data from database
  const userData = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!userData) {
    throw new Error('User not found');
  }

  const isNapaBoard = userData.role === 'napaBoard';
  const isNapaDirector = userData.role === 'napaDirector';

  return {
    id: userData.id,
    email: userData.email,
    name: userData.name,
    organizationName: userData.organizationName,
    isAdmin: userData.isAdmin,
    isNapaAdmin: isNapaBoard || isNapaDirector,
    isNapaBoard,
    isNapaDirector,
    canViewOrgHealth: isNapaBoard || (isNapaDirector && userData.canViewOrgHealth),
    approvalStatus: userData.approvalStatus,
    emailVerificationRequired: isOTPVerificationRequired(userData.lastOtpVerifiedAt),
    role: userData.role,
  };
}

/**
 * Get the current user and ensure they are approved AND that their OTP
 * re-verification (every 60 days) is still fresh. Use this for all protected
 * data routes; never use the weaker `requireAuth()` on an API endpoint.
 *
 * Enforces two conditions:
 * 1. `user.approvalStatus === 'approved'` (Board must have manually approved)
 * 2. `user.emailVerificationRequired === false` (OTP is fresh; session < 60 days old)
 *
 * The OTP-freshness check is part of a three-layer enforcement (ADR-008):
 * - proxy.ts redirects at the edge if stale
 * - app/(dashboard)/layout.tsx gates the dashboard if stale
 * - This function throws on API routes if stale (cannot be bypassed)
 *
 * Throws distinct error messages so callers can map to HTTP status:
 * - "Unauthorized" → 401 (no session)
 * - "Account not approved" → 403 (pending or rejected)
 * - "OTP verification required" → 403 (session stale, user must re-verify)
 */
export async function requireApprovedAuth(): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.approvalStatus !== 'approved') {
    throw new Error('Account not approved');
  }

  if (user.emailVerificationRequired) {
    throw new Error('OTP verification required');
  }

  return user;
}

/**
 * Get the current user's full profile from the database
 */
export async function getCurrentUserProfile() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    with: {
      organization: true,
    },
  });

  return user;
}

/**
 * Check if the current user is a NAPA admin
 */
export async function isNapaAdmin(): Promise<boolean> {
  try {
    const user = await requireAuth();
    return user.isNapaAdmin;
  } catch {
    return false;
  }
}

/**
 * Check if the current user is an org admin
 */
export async function isOrgAdmin(): Promise<boolean> {
  try {
    const user = await requireAuth();
    return user.isAdmin;
  } catch {
    return false;
  }
}

/**
 * Check if user has completed their profile (has organization)
 */
export async function hasCompletedProfile(): Promise<boolean> {
  try {
    const user = await requireAuth();
    return !!user.organizationName;
  } catch {
    return false;
  }
}

/**
 * Update user's organization
 */
export async function updateUserOrganization(
  userId: string,
  organizationName: string
) {
  await db
    .update(users)
    .set({
      organizationName,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Check if a user exists by email
 */
export async function checkUserExists(email: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
  return !!user;
}

/**
 * Update user's last OTP verified timestamp
 */
export async function updateLastOtpVerified(userId: string) {
  await db
    .update(users)
    .set({
      lastOtpVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
