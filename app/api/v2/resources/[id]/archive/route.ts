import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { resources } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

interface SessionUser {
  id: string
  role?: string
  isAdmin?: boolean
  organizationName?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as unknown as SessionUser
  const { id } = await params

  const resource = await db.query.resources.findFirst({
    where: and(eq(resources.id, id), isNull(resources.deletedAt)),
  })

  if (!resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  }

  // Only an admin from the resource's owning org can archive. NAPA staff and
  // other-org admins are not permitted to archive another org's resources.
  const canArchive = user.organizationName === resource.organization && !!user.isAdmin

  if (!canArchive) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isArchived = resource.status === 'archived'

  await db
    .update(resources)
    .set({
      status: isArchived ? 'active' : 'archived',
      archivedAt: isArchived ? null : new Date(),
      archivedById: isArchived ? null : user.id,
      updatedAt: new Date(),
    })
    .where(eq(resources.id, id))

  return NextResponse.json({ success: true, archived: !isArchived })
}
