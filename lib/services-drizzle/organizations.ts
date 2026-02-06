import { db } from '@/lib/db';
import { organizations, users } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';

export type { Organization } from '@/lib/db/schema';

/**
 * Get all organizations (for signup dropdown)
 */
export async function getOrganizations() {
  // Use LOWER() for case-insensitive sorting (so "alpha" comes before "Alpha")
  const orgs = await db
    .select()
    .from(organizations)
    .orderBy(sql`LOWER(${organizations.organizationName})`);

  return orgs;
}

/**
 * Get organization by name
 */
export async function getOrganizationByName(name: string) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.organizationName, name),
  });

  return org;
}

/**
 * Update user's organization
 */
export async function updateUserOrganization(
  userId: string,
  organizationName: string
) {
  // Verify the organization exists
  const org = await getOrganizationByName(organizationName);
  if (!org) {
    throw new Error('Organization not found');
  }

  await db
    .update(users)
    .set({
      organizationName,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Get organization stats (for admin dashboard)
 */
export async function getOrganizationStats() {
  const user = await requireAuth();

  if (!user.isNapaAdmin) {
    throw new Error('Unauthorized: NAPA admin access required');
  }

  const orgs = await db.query.organizations.findMany({
    with: {
      users: true,
      resources: true,
    },
  });

  return orgs.map((org) => ({
    id: org.id,
    name: org.organizationName,
    memberCount: org.users.length,
    resourceCount: org.resources.filter((r) => !r.deletedAt).length,
    createdAt: org.createdAt,
  }));
}
