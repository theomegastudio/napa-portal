import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resources, users } from '@/lib/db/schema'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { requireApprovedAuth } from '@/lib/auth-helpers'

export async function GET() {
  let user
  try {
    user = await requireApprovedAuth()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    const status = msg === 'Unauthorized' ? 401 : 403
    return NextResponse.json({ error: msg }, { status })
  }

  const isNapa = user.isNapaAdmin
  const isOrgAdmin = user.isAdmin

  // Pending approvals count - org admins see only their own org; NAPA staff see all.
  // Without the org filter, an org-A admin would leak the global count of
  // pending users across every org.
  let approvalsCount = 0
  if (isNapa) {
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.approvalStatus, 'pending'))
    approvalsCount = c
  } else if (isOrgAdmin && user.organizationName) {
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(users)
      .where(and(
        eq(users.approvalStatus, 'pending'),
        eq(users.organizationName, user.organizationName),
      ))
    approvalsCount = c
  }

  // New resources since last view. Scoped to the user's own org for
  // non-NAPA users so the badge doesn't reveal activity in other orgs.
  const me = await db.query.users.findFirst({ where: eq(users.id, user.id) })
  let newResourcesCount = 0
  if (me?.lastResourcesViewedAt) {
    const newResourceConditions = [
      isNull(resources.deletedAt),
      gt(resources.createdAt, me.lastResourcesViewedAt),
    ]
    if (!isNapa && user.organizationName) {
      newResourceConditions.push(eq(resources.organization, user.organizationName))
    }
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(resources)
      .where(and(...newResourceConditions))
    newResourcesCount = c
  }

  return NextResponse.json({
    newResourcesCount,
    approvalsCount,
    lastResourcesViewedAt: me?.lastResourcesViewedAt ?? null,
  })
}
