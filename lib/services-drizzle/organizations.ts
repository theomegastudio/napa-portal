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

/**
 * Shape returned by `listOrganizationsWithCounts`. `memberCount` is the manual
 * headcount stored on the row (NOT derived from platform users). `resourceCount`
 * is derived (non-archived, non-deleted resources owned by the org).
 */
export interface OrganizationWithCounts {
  id: string;
  organizationName: string;
  slug: string | null;
  logoUrl: string | null;
  isActive: boolean;
  inactivatedAt: Date | null;
  createdAt: Date;
  /** Manually tracked headcount stored on the org row. NOT derived from users. */
  memberCount: number;
  /** Manual sort order. UI sorts alphabetically; kept for future. */
  displayOrder: number;
  /** Active resources owned by the org, derived. */
  resourceCount: number;
}

/**
 * NAPA-Board-only list of every org with manual member counts and derived
 * active-resource counts. Sorted alphabetically (case-insensitive).
 *
 * @throws Error('Unauthorized: NAPA admin access required') if the caller is not NAPA staff.
 */
export async function listOrganizationsWithCounts(): Promise<OrganizationWithCounts[]> {
  const user = await requireAuth();
  requireNapaAdmin(user);

  const orgs = await db
    .select()
    .from(organizations)
    .orderBy(sql`LOWER(${organizations.organizationName})`);

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
    inactivatedAt: o.inactivatedAt,
    createdAt: o.createdAt,
    memberCount: o.memberCount ?? 0,
    displayOrder: o.displayOrder ?? 0,
    resourceCount: resourceMap.get(o.organizationName) ?? 0,
  }));
}

/**
 * Create a new member organization. NAPA Board only.
 *
 * @throws Error('An organization with that name already exists') on duplicate names.
 */
export async function createOrganization(input: {
  organizationName: string;
  slug?: string;
  logoUrl?: string;
  memberCount?: number;
  displayOrder?: number;
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
      memberCount: input.memberCount ?? 0,
      displayOrder: input.displayOrder ?? 0,
    })
    .returning();
  return row;
}

/**
 * Update an organization. NAPA Board only.
 *
 * Side effects:
 * - Renaming propagates to `users.organizationName` and `resources.organization`
 *   in a single transaction so foreign-key targets stay consistent.
 * - Flipping `isActive` to `false` stamps `inactivatedAt = now()`. Flipping back
 *   to `true` clears it. The UI reads `inactivatedAt` to show the archive date.
 *
 * @throws Error('Organization not found') if id doesn't match a row.
 */
export async function updateOrganizationById(
  id: string,
  patch: {
    organizationName?: string;
    slug?: string | null;
    logoUrl?: string | null;
    isActive?: boolean;
    memberCount?: number;
    displayOrder?: number;
  }
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
  if (patch.isActive !== undefined) {
    updates.isActive = patch.isActive;
    // Maintain inactivatedAt: set when flipping to inactive, clear when reactivating.
    if (patch.isActive && target.inactivatedAt) {
      updates.inactivatedAt = null;
    } else if (!patch.isActive && !target.inactivatedAt) {
      updates.inactivatedAt = new Date();
    }
  }
  if (patch.memberCount !== undefined) {
    if (patch.memberCount < 0 || !Number.isFinite(patch.memberCount)) {
      throw new Error('Member count must be a non-negative number');
    }
    updates.memberCount = Math.floor(patch.memberCount);
  }
  if (patch.displayOrder !== undefined) {
    if (!Number.isFinite(patch.displayOrder)) {
      throw new Error('Display order must be a number');
    }
    updates.displayOrder = Math.floor(patch.displayOrder);
  }

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

/**
 * Permanently delete an organization. NAPA Board only. Blocked if the org
 * still has any users or active resources - the UI hints at this in the
 * delete confirmation, and the server enforces it.
 *
 * @throws Error if the org has members or resources still attached.
 */
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
