import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgLeaders } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface SessionUser { role?: string }

async function requireBoard() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const user = session.user as unknown as SessionUser
  if (user.role !== 'napaBoard') throw new Error('Forbidden')
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireBoard()
    const { id } = await context.params
    const body = await request.json()
    const { name, role, email, phone, notes } = body ?? {}
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (typeof name === 'string') updates.name = name
    if (role !== undefined) updates.role = role || null
    if (email !== undefined) updates.email = email || null
    if (phone !== undefined) updates.phone = phone || null
    if (notes !== undefined) updates.notes = notes || null
    await db.update(orgLeaders).set(updates).where(eq(orgLeaders.id, id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireBoard()
    const { id } = await context.params
    await db.delete(orgLeaders).where(eq(orgLeaders.id, id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 400 })
  }
}
