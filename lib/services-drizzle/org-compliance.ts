import { db } from '@/lib/db';
import { orgYearlyCompliance, organizations } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';

const NAPA_ORG_NAME = 'National APIDA Panhellenic Association';

function requireNapaWrite(user: { role: string; canViewOrgHealth: boolean }) {
  // Board can always write. Directors only when they have OrgHealth access.
  if (user.role === 'napaBoard') return;
  if (user.role === 'napaDirector' && user.canViewOrgHealth) return;
  throw new Error('Unauthorized: only NAPA staff with Org Health access can edit compliance');
}

/**
 * One row per (organization, year). Mirrors the orgYearlyCompliance table but
 * is dense — every active org gets a row in the response even when no flags
 * have been set yet, so the UI can render an unchecked state without nullables.
 */
export interface OrgComplianceRow {
  organizationName: string;
  year: number;
  renewalCompletedAt: Date | null;
  oneOnOneCompletedAt: Date | null;
  notes: string | null;
}

/**
 * List compliance flags for every active non-NAPA org in the given year. Missing
 * underlying rows are filled in with nulls so the caller doesn't have to merge.
 *
 * @throws Error('Unauthorized: NAPA staff required') if the caller is not Board or Director.
 */
export async function getOrgCompliance(year: number): Promise<OrgComplianceRow[]> {
  const user = await requireAuth();
  if (!user.isNapaAdmin) throw new Error('Unauthorized: NAPA staff required');

  const orgs = await db.query.organizations.findMany({
    where: eq(organizations.isActive, true),
  });

  const rows = await db.query.orgYearlyCompliance.findMany({
    where: eq(orgYearlyCompliance.year, year),
  });
  const byOrg = new Map(rows.map((r) => [r.organizationName, r]));

  return orgs
    .filter((o) => o.organizationName !== NAPA_ORG_NAME)
    .map((o) => {
      const r = byOrg.get(o.organizationName);
      return {
        organizationName: o.organizationName,
        year,
        renewalCompletedAt: r?.renewalCompletedAt ?? null,
        oneOnOneCompletedAt: r?.oneOnOneCompletedAt ?? null,
        notes: r?.notes ?? null,
      };
    });
}

/**
 * Toggle one of the per-org-per-year compliance flags.
 *
 * @param organizationName  Target org (cannot be the NAPA parent body).
 * @param year              4-digit year the flag applies to.
 * @param field             Which flag - `'renewal'` for membership renewal + certification,
 *                          `'oneOnOne'` for the annual 1x1 with NAPA.
 * @param value             `true` writes the current timestamp; `false` clears it.
 *
 * Auto-creates the underlying row if it doesn't exist. Board can always write;
 * Directors require `canViewOrgHealth = true`.
 *
 * @throws Error if the caller lacks write access or the target is the NAPA parent body.
 */
export async function setOrgComplianceFlag(
  organizationName: string,
  year: number,
  field: 'renewal' | 'oneOnOne',
  value: boolean,
) {
  const user = await requireAuth();
  requireNapaWrite(user);

  if (organizationName === NAPA_ORG_NAME) {
    throw new Error('Compliance is not tracked for the NAPA parent body');
  }

  const column = field === 'renewal' ? 'renewalCompletedAt' : 'oneOnOneCompletedAt';
  const dbColumn = field === 'renewal'
    ? orgYearlyCompliance.renewalCompletedAt
    : orgYearlyCompliance.oneOnOneCompletedAt;

  const existing = await db.query.orgYearlyCompliance.findFirst({
    where: and(
      eq(orgYearlyCompliance.organizationName, organizationName),
      eq(orgYearlyCompliance.year, year),
    ),
  });

  if (existing) {
    await db
      .update(orgYearlyCompliance)
      .set({
        [column]: value ? new Date() : null,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(orgYearlyCompliance.id, existing.id));
  } else {
    await db.insert(orgYearlyCompliance).values({
      organizationName,
      year,
      [column]: value ? new Date() : null,
      updatedBy: user.id,
    });
  }

  // Discard unused reference (keeps the dbColumn imported above for clarity)
  void dbColumn;
}
