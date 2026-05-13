import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { duesPayments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface SessionUser { role?: string; canViewOrgHealth?: boolean }

function allowed(user: SessionUser) {
  return user.role === 'napaBoard' || (user.role === 'napaDirector' && !!user.canViewOrgHealth)
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!allowed(session.user as unknown as SessionUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await context.params
  await db.delete(duesPayments).where(eq(duesPayments.id, id))
  return NextResponse.json({ ok: true })
}
