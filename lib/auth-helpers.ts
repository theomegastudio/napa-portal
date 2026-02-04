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
  isNapaAdmin: boolean;
  approvalStatus: ApprovalStatus;
  emailVerificationRequired: boolean;
  role: string;
}

/**
 * Get the current authenticated user session
 * Use this in Server Components and Server Actions
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
 * Does NOT enforce approval status - use requireApprovedAuth() for protected routes.
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

  return {
    id: userData.id,
    email: userData.email,
    name: userData.name,
    organizationName: userData.organizationName,
    isAdmin: userData.isAdmin,
    isNapaAdmin: userData.role === 'napaAdmin',
    approvalStatus: userData.approvalStatus,
    emailVerificationRequired: isOTPVerificationRequired(userData.lastOtpVerifiedAt),
    role: userData.role,
  };
}

/**
 * Get the current user and ensure they are approved.
 * Use this for all resource/data API routes to prevent pending/rejected users from accessing data.
 */
export async function requireApprovedAuth(): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.approvalStatus !== 'approved') {
    throw new Error('Account not approved');
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
