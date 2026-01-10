import { db } from '@/lib/db';
import {
  organizationDomainWhitelist,
  type OrganizationDomainWhitelist,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * Get whitelisted domains for an organization
 */
export async function getWhitelistedDomains(
  organizationName: string
): Promise<OrganizationDomainWhitelist[]> {
  const currentUser = await requireAuth();

  // Verify access - must be org admin or NAPA admin
  if (!currentUser.isNapaAdmin) {
    if (!currentUser.isAdmin || currentUser.organizationName !== organizationName) {
      throw new Error('Unauthorized: Admin access required');
    }
  }

  const domains = await db.query.organizationDomainWhitelist.findMany({
    where: eq(organizationDomainWhitelist.organizationName, organizationName),
  });

  return domains;
}

/**
 * Add a domain to the whitelist
 */
export async function addDomainToWhitelist(
  organizationName: string,
  domain: string
): Promise<OrganizationDomainWhitelist> {
  const currentUser = await requireAuth();

  // Verify permission
  if (!currentUser.isNapaAdmin) {
    if (!currentUser.isAdmin || currentUser.organizationName !== organizationName) {
      throw new Error('Unauthorized: Admin access required');
    }
  }

  // Normalize domain (lowercase, remove @ if present)
  const normalizedDomain = domain.toLowerCase().replace(/^@/, '');

  // Check for duplicate
  const existing = await db.query.organizationDomainWhitelist.findFirst({
    where: and(
      eq(organizationDomainWhitelist.organizationName, organizationName),
      eq(organizationDomainWhitelist.domain, normalizedDomain)
    ),
  });

  if (existing) {
    throw new Error('Domain is already whitelisted');
  }

  const [newEntry] = await db
    .insert(organizationDomainWhitelist)
    .values({
      organizationName,
      domain: normalizedDomain,
      createdBy: currentUser.id,
    })
    .returning();

  return newEntry;
}

/**
 * Remove a domain from the whitelist
 */
export async function removeDomainFromWhitelist(id: string): Promise<void> {
  const currentUser = await requireAuth();

  // Get the domain entry
  const entry = await db.query.organizationDomainWhitelist.findFirst({
    where: eq(organizationDomainWhitelist.id, id),
  });

  if (!entry) {
    throw new Error('Domain not found');
  }

  // Verify permission
  if (!currentUser.isNapaAdmin) {
    if (!currentUser.isAdmin || currentUser.organizationName !== entry.organizationName) {
      throw new Error('Unauthorized: Admin access required');
    }
  }

  await db
    .delete(organizationDomainWhitelist)
    .where(eq(organizationDomainWhitelist.id, id));
}

/**
 * Check if an email's domain is whitelisted for an organization
 */
export async function isEmailDomainWhitelisted(
  email: string,
  organizationName: string
): Promise<boolean> {
  const emailDomain = email.toLowerCase().split('@')[1];

  if (!emailDomain) {
    return false;
  }

  const whitelistedDomain = await db.query.organizationDomainWhitelist.findFirst({
    where: and(
      eq(organizationDomainWhitelist.organizationName, organizationName),
      eq(organizationDomainWhitelist.domain, emailDomain)
    ),
  });

  return !!whitelistedDomain;
}
