import { db } from '@/lib/db';
import {
  resources,
  resourceFiles,
  auditLogs,
  resourceVersions,
  type Resource,
  type NewResource,
} from '@/lib/db/schema';
import { eq, and, isNull, ilike, or, desc, sql } from 'drizzle-orm';
import { requireApprovedAuth } from '@/lib/auth-helpers';
import { canEditResource, canDeleteResource, canViewResource } from '@/lib/permissions';
import { deleteFile } from './storage';

export type { Resource, ResourceFile } from '@/lib/db/schema';

// Resource with files type
export type ResourceWithFiles = Resource & {
  files: typeof resourceFiles.$inferSelect[];
};

/**
 * Get all resources with optional filtering
 */
export async function getResources(params?: {
  searchText?: string;
  resourceType?: string;
  status?: 'active' | 'archived';
}): Promise<ResourceWithFiles[]> {
  const user = await requireApprovedAuth();

  // Build where conditions
  const conditions = [isNull(resources.deletedAt)];

  // Org scoping: NAPA staff see every org's resources; everyone else only
  // sees their own org's. This matches canViewResource(). Applied to both
  // active and archived lists.
  if (!user.isNapaAdmin && user.organizationName) {
    conditions.push(eq(resources.organization, user.organizationName));
  }

  // Status filter
  if (params?.status === 'archived') {
    conditions.push(eq(resources.status, 'archived' as any));
  } else if (params?.status === 'active') {
    conditions.push(eq(resources.status, 'active' as any));
  }

  // Search filter (escape ILIKE wildcards to prevent injection)
  if (params?.searchText) {
    const escaped = params.searchText.replace(/[%_\\]/g, '\\$&');
    conditions.push(
      or(
        ilike(resources.title, `%${escaped}%`),
        ilike(resources.description, `%${escaped}%`)
      )!
    );
  }

  // Type filter
  if (params?.resourceType) {
    conditions.push(eq(resources.resourceType, params.resourceType as any));
  }

  const result = await db.query.resources.findMany({
    where: and(...conditions),
    with: {
      files: true,
    },
    orderBy: desc(resources.createdAt),
  });

  return result;
}

/**
 * Get a single resource by ID
 */
export async function getResourceById(
  resourceId: string
): Promise<ResourceWithFiles | null> {
  const user = await requireApprovedAuth();

  const resource = await db.query.resources.findFirst({
    where: and(eq(resources.id, resourceId), isNull(resources.deletedAt)),
    with: {
      files: true,
    },
  });

  if (!resource) return null;

  // Hide cross-org resources from non-NAPA users. Returning null (not
  // throwing) mimics "not found" so an attacker can't enumerate the
  // existence of other orgs' resource IDs.
  if (!canViewResource(user, resource.organization)) {
    return null;
  }

  return resource;
}

/**
 * Create a new resource
 */
export async function createResource(params: {
  title: string;
  description?: string;
  resourceType: string;
  externalLink?: string;
  files?: { url: string; name?: string }[];
  allowDownload?: boolean;
}) {
  const user = await requireApprovedAuth();

  if (!user.organizationName) {
    throw new Error('User must belong to an organization');
  }

  // Check permission - must be admin to create resources
  if (!user.isNapaAdmin && !user.isAdmin) {
    throw new Error('Unauthorized: Admin access required to create resources');
  }

  return await db.transaction(async (tx) => {
    // Create resource
    const [resource] = await tx
      .insert(resources)
      .values({
        title: params.title,
        description: params.description,
        resourceType: params.resourceType as any,
        externalLink: params.externalLink,
        organization: user.organizationName!,
        uploadedBy: user.email,
        ...(params.allowDownload !== undefined ? { allowDownload: params.allowDownload } : {}),
      })
      .returning();

    // Create files if any
    if (params.files?.length) {
      await tx.insert(resourceFiles).values(
        params.files.map((file) => ({
          resourceId: resource.id,
          fileUrl: file.url,
          fileName: file.name,
        }))
      );
    }

    // Create audit log
    await tx.insert(auditLogs).values({
      userId: user.id,
      userEmail: user.email,
      organization: user.organizationName!,
      action: 'created',
      resourceId: resource.id,
      resourceTitle: params.title,
      resourceType: params.resourceType,
      metadata: {
        hasFiles: (params.files?.length || 0) > 0,
        fileCount: params.files?.length || 0,
        hasExternalLink: !!params.externalLink,
      },
    });

    return resource;
  });
}

/**
 * Update an existing resource
 */
export async function updateResource(params: {
  resourceId: string;
  title: string;
  description?: string;
  resourceType: string;
  externalLink?: string;
  files?: { url: string; name?: string }[];
  changeNotes?: string;
}) {
  const user = await requireApprovedAuth();

  // Verify access to resource
  const existing = await getResourceById(params.resourceId);
  if (!existing) {
    throw new Error('Resource not found');
  }

  // Must be NAPA staff, an admin in the resource's owning org, or the
  // original uploader. A global isAdmin flag is NOT enough - an admin in
  // org A may not edit org B's resources.
  if (!canEditResource(user, existing.organization)) {
    throw new Error('Unauthorized: Cannot edit resources from another organization');
  }

  return await db.transaction(async (tx) => {
    // Update resource
    await tx
      .update(resources)
      .set({
        title: params.title,
        description: params.description,
        resourceType: params.resourceType as any,
        externalLink: params.externalLink,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, params.resourceId));

    // Add new files if any
    if (params.files?.length) {
      await tx.insert(resourceFiles).values(
        params.files.map((file) => ({
          resourceId: params.resourceId,
          fileUrl: file.url,
          fileName: file.name,
        }))
      );
    }

    // Get next version number
    const [versionResult] = await tx
      .select({ maxVersion: sql<number>`COALESCE(MAX(version_number), 0)` })
      .from(resourceVersions)
      .where(eq(resourceVersions.resourceId, params.resourceId));

    const nextVersion = (versionResult?.maxVersion || 0) + 1;

    // Create version record
    await tx.insert(resourceVersions).values({
      resourceId: params.resourceId,
      versionNumber: nextVersion,
      title: params.title,
      description: params.description,
      resourceType: params.resourceType,
      externalLink: params.externalLink,
      updatedBy: user.email,
      updatedByUserId: user.id,
      changeNotes: params.changeNotes,
      metadata: {
        filesAdded: params.files?.length || 0,
      },
    });

    // Create audit log
    await tx.insert(auditLogs).values({
      userId: user.id,
      userEmail: user.email,
      organization: user.organizationName!,
      action: 'updated',
      resourceId: params.resourceId,
      resourceTitle: params.title,
      resourceType: params.resourceType,
      metadata: {
        newFilesAdded: params.files?.length || 0,
        hasChangeNotes: !!params.changeNotes,
        versionNumber: nextVersion,
      },
    });
  });
}

/**
 * Delete a resource file
 */
export async function deleteResourceFile(fileId: string) {
  const user = await requireApprovedAuth();

  // Get the file and its resource
  const file = await db.query.resourceFiles.findFirst({
    where: eq(resourceFiles.id, fileId),
    with: {
      resource: true,
    },
  });

  if (!file) {
    throw new Error('File not found');
  }

  // Check permission - must be admin and belong to same org (or NAPA admin)
  if (!user.isNapaAdmin) {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Admin access required to delete files');
    }
    if (file.resource.organization !== user.organizationName) {
      throw new Error('Unauthorized: Cannot delete files from another organization');
    }
  }

  // Delete from R2 storage
  if (file.fileUrl) {
    await deleteFile(file.fileUrl);
  }

  // Delete from database
  await db.delete(resourceFiles).where(eq(resourceFiles.id, fileId));
}

/**
 * Soft delete a resource
 */
export async function deleteResource(resourceId: string) {
  const user = await requireApprovedAuth();

  // Verify access
  const existing = await getResourceById(resourceId);
  if (!existing) {
    throw new Error('Resource not found');
  }

  // Only an admin from the resource's owning org may delete it. NAPA staff
  // are intentionally NOT allowed to delete another org's resources (matches
  // lib/permissions.ts canDeleteResource).
  if (!canDeleteResource(user, existing.organization)) {
    throw new Error('Unauthorized: Cannot delete resources from another organization');
  }

  return await db.transaction(async (tx) => {
    // Soft delete
    await tx
      .update(resources)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(resources.id, resourceId));

    // Create audit log
    await tx.insert(auditLogs).values({
      userId: user.id,
      userEmail: user.email,
      organization: user.organizationName!,
      action: 'deleted',
      resourceId: resourceId,
      resourceTitle: existing.title,
      resourceType: existing.resourceType,
    });
  });
}
