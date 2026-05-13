import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { resources, users } from '@/lib/db/schema'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'

interface SessionUser {
  id: string
  role?: string
  isAdmin?: boolean
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as unknown as SessionUser
  const isNapa = user.role === 'napaBoard' || user.role === 'napaDirector'
  const isOrgAdmin = !!user.isAdmin

  // Pending approvals count (visible to org admins + NAPA staff)
  let approvalsCount = 0
  if (isNapa || isOrgAdmin) {
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.approvalStatus, 'pending'))
    approvalsCount = c
  }

  // New resources since last view
  const me = await db.query.users.findFirst({ where: eq(users.id, user.id) })
  let newResourcesCount = 0
  if (me?.lastResourcesViewedAt) {
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(resources)
      .where(and(isNull(resources.deletedAt), gt(resources.createdAt, me.lastResourcesViewedAt)))
    newResourcesCount = c
  }

  return NextResponse.json({
    newResourcesCount,
    approvalsCount,
    lastResourcesViewedAt: me?.lastResourcesViewedAt ?? null,
  })
}
