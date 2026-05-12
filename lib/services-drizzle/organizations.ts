import { db } from '@/lib/db';
import { organizations, users, resources } from '@/lib/db/schema';
import { eq, asc, sql, isNull, and, count } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';

function requireNapaAdmin(user: { isNapaAdmin: boolean }) {
  if (!user.isNapaAdmin) throw new Error('Unauthorized: NAPA admin access required');
}

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

export interface OrganizationWithCounts {
  id: string;
  organizationName: string;
  slug: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  memberCount: number;
  resourceCount: number;
}

export async function listOrganizationsWithCounts(): Promise<OrganizationWithCounts[]> {
  const user = await requireAuth();
  requireNapaAdmin(user);

  const orgs = await db
    .select()
    .from(organizations)
    .orderBy(sql`LOWER(${organizations.organizationName})`);

  const memberRows = await db
    .select({ org: users.organizationName, c: count() })
    .from(users)
    .groupBy(users.organizationName);
  const memberMap = new Map(memberRows.map((r) => [r.org ?? '', r.c]));

  const resourceRows = await db
    .select({ org: resources.organization, c: count() })
    .from(resources)
    .where(isNull(resources.deletedAt))
    .groupBy(resources.organization);
  const resourceMap = new Map(resourceRows.map((r) => [r.org ?? '', r.c]));

  return orgs.map((o) => ({
    id: o.id,
    organizationName: o.organizationName,
    slug: o.slug,
    logoUrl: o.logoUrl,
    isActive: o.isActive,
    createdAt: o.createdAt,
    memberCount: memberMap.get(o.organizationName) ?? 0,
    resourceCount: resourceMap.get(o.organizationName) ?? 0,
  }));
}

export async function createOrganization(input: {
  organizationName: string;
  slug?: string;
  logoUrl?: string;
}) {
  const user = await requireAuth();
  requireNapaAdmin(user);

  const trimmed = input.organizationName.trim();
  if (!trimmed) throw new Error('Organization name is required');

  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.organizationName, trimmed),
  });
  if (existing) throw new Error('An organization with that name already exists');

  const [row] = await db
    .insert(organizations)
    .values({
      organizationName: trimmed,
      slug: input.slug?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
    })
    .returning();
  return row;
}

export async function updateOrganizationById(
  id: string,
  patch: { organizationName?: string; slug?: string | null; logoUrl?: string | null; isActive?: boolean }
) {
  const user = await requireAuth();
  requireNapaAdmin(user);

  const target = await db.query.organizations.findFirst({ where: eq(organizations.id, id) });
  if (!target) throw new Error('Organization not found');

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof patch.organizationName === 'string') {
    const trimmed = patch.organizationName.trim();
    if (!trimmed) throw new Error('Organization name cannot be empty');
    updates.organizationName = trimmed;
  }
  if (patch.slug !== undefined) updates.slug = patch.slug ?? null;
  if (patch.logoUrl !== undefined) updates.logoUrl = patch.logoUrl ?? null;
  if (patch.isActive !== undefined) updates.isActive = patch.isActive;

  // If renaming, propagate to users.organizationName and resources.organization
  if (updates.organizationName && updates.organizationName !== target.organizationName) {
    const newName = updates.organizationName as string;
    await db.transaction(async (tx) => {
      await tx.update(users).set({ organizationName: newName }).where(eq(users.organizationName, target.organizationName));
      await tx.update(resources).set({ organization: newName }).where(eq(resources.organization, target.organizationName));
      await tx.update(organizations).set(updates).where(eq(organizations.id, id));
    });
    const [row] = await db.select().from(organizations).where(eq(organizations.id, id));
    return row;
  }

  const [row] = await db.update(organizations).set(updates).where(eq(organizations.id, id)).returning();
  return row;
}

export async function deleteOrganizationById(id: string) {
  const user = await requireAuth();
  requireNapaAdmin(user);

  const target = await db.query.organizations.findFirst({ where: eq(organizations.id, id) });
  if (!target) throw new Error('Organization not found');

  const [{ c: memberCount }] = await db
    .select({ c: count() })
    .from(users)
    .where(eq(users.organizationName, target.organizationName));
  if (memberCount > 0) throw new Error('Cannot delete an organization that still has members');

  const [{ c: resourceCount }] = await db
    .select({ c: count() })
    .from(resources)
    .where(and(eq(resources.organization, target.organizationName), isNull(resources.deletedAt)));
  if (resourceCount > 0) throw new Error('Cannot delete an organization that still has resources');

  await db.delete(organizations).where(eq(organizations.id, id));
}
