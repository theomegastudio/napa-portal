import { auth } from './auth';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get the current authenticated user session
 * Use this in Server Components and Server Actions
 */
export async function getSession() {
  return await auth();
}

/**
 * Get the current user or throw if not authenticated
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

/**
 * Get the current user's full profile from the database
 */
export async function getCurrentUserProfile() {
  const session = await auth();
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
  const session = await auth();
  return session?.user?.isNapaAdmin ?? false;
}

/**
 * Check if the current user is an org admin
 */
export async function isOrgAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.isAdmin ?? false;
}

/**
 * Check if user has completed their profile (has organization)
 */
export async function hasCompletedProfile(): Promise<boolean> {
  const session = await auth();
  return !!session?.user?.organizationName;
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
