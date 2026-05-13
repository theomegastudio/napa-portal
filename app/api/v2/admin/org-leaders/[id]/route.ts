import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgLeaders } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface SessionUser { role?: string; isAdmin?: boolean; organizationName?: string }

/** Allow NAPA Board for any org, or org admin for their own org. */
async function requireEditAccess(leaderId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const user = session.user as unknown as SessionUser
  const leader = await db.query.orgLeaders.findFirst({ where: eq(orgLeaders.id, leaderId) })
  if (!leader) throw new Error('NotFound')
  const isNapaBoard = user.role === 'napaBoard'
  const isOwnOrgAdmin = !!user.isAdmin && user.organizationName === leader.organizationName
  if (!isNapaBoard && !isOwnOrgAdmin) throw new Error('Forbidden')
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await requireEditAccess(id)
    const body = await request.json()
    const { name, role, email, phone, notes, year } = body ?? {}
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (typeof name === 'string') updates.name = name
    if (role !== undefined) updates.role = role || null
    if (email !== undefined) updates.email = email || null
    if (phone !== undefined) updates.phone = phone || null
    if (notes !== undefined) updates.notes = notes || null
    if (year !== undefined) updates.year = typeof year === 'number' ? year : null
    await db.update(orgLeaders).set(updates).where(eq(orgLeaders.id, id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    const status = msg === 'Unauthorized' ? 401 : msg === 'NotFound' ? 404 : msg === 'Forbidden' ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await requireEditAccess(id)
    await db.delete(orgLeaders).where(eq(orgLeaders.id, id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    const status = msg === 'Unauthorized' ? 401 : msg === 'NotFound' ? 404 : msg === 'Forbidden' ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
