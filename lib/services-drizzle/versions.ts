import { db } from '@/lib/db';
import { resourceVersions, resources, type ResourceVersion } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireApprovedAuth } from '@/lib/auth-helpers';

export type { ResourceVersion };

/**
 * Get all versions of a resource
 */
export async function getResourceVersions(
  resourceId: string
): Promise<ResourceVersion[]> {
  const user = await requireApprovedAuth();

  // Get the resource to check access
  const resource = await db.query.resources.findFirst({
    where: eq(resources.id, resourceId),
  });

  if (!resource) {
    throw new Error('Resource not found');
  }

  // Check organization access
  if (!user.isNapaAdmin && resource.organization !== user.organizationName) {
    throw new Error('Unauthorized: Cannot access this resource');
  }

  const versions = await db.query.resourceVersions.findMany({
    where: eq(resourceVersions.resourceId, resourceId),
    orderBy: desc(resourceVersions.versionNumber),
  });

  return versions;
}

/**
 * Get the latest version of a resource
 */
export async function getLatestVersion(
  resourceId: string
): Promise<ResourceVersion | null> {
  const user = await requireApprovedAuth();

  // Get the resource to check access
  const resource = await db.query.resources.findFirst({
    where: eq(resources.id, resourceId),
  });

  if (!resource) {
    return null;
  }

  // Check organization access
  if (!user.isNapaAdmin && resource.organization !== user.organizationName) {
    throw new Error('Unauthorized: Cannot access this resource');
  }

  const version = await db.query.resourceVersions.findFirst({
    where: eq(resourceVersions.resourceId, resourceId),
    orderBy: desc(resourceVersions.versionNumber),
  });

  return version || null;
}

/**
 * Get a specific version of a resource
 */
export async function getResourceVersion(
  resourceId: string,
  versionNumber: number
): Promise<ResourceVersion | null> {
  const user = await requireApprovedAuth();

  // Get the resource to check access
  const resource = await db.query.resources.findFirst({
    where: eq(resources.id, resourceId),
  });

  if (!resource) {
    return null;
  }

  // Check organization access
  if (!user.isNapaAdmin && resource.organization !== user.organizationName) {
    throw new Error('Unauthorized: Cannot access this resource');
  }

  const version = await db.query.resourceVersions.findFirst({
    where: eq(resourceVersions.resourceId, resourceId),
    orderBy: desc(resourceVersions.versionNumber),
  });

  return version || null;
}

/**
 * Create a new version record (internal use - called from updateResource)
 */
export async function createVersion(
  tx: typeof db,
  params: {
    resourceId: string;
    title: string;
    description?: string;
    resourceType: string;
    externalLink?: string;
    updatedBy: string;
    updatedByUserId: string;
    changeNotes?: string;
    metadata?: Record<string, any>;
  }
): Promise<ResourceVersion> {
  // Get next version number
  const [versionResult] = await tx
    .select({ maxVersion: sql<number>`COALESCE(MAX(version_number), 0)` })
    .from(resourceVersions)
    .where(eq(resourceVersions.resourceId, params.resourceId));

  const nextVersion = (versionResult?.maxVersion || 0) + 1;

  const [version] = await tx
    .insert(resourceVersions)
    .values({
      resourceId: params.resourceId,
      versionNumber: nextVersion,
      title: params.title,
      description: params.description,
      resourceType: params.resourceType,
      externalLink: params.externalLink,
      updatedBy: params.updatedBy,
      updatedByUserId: params.updatedByUserId,
      changeNotes: params.changeNotes,
      metadata: params.metadata || {},
    })
    .returning();

  return version;
}
