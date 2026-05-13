import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetings, meetingAttendance } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

interface SessionUser {
  id: string
  role?: string
}

async function requireNapa() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const user = session.user as unknown as SessionUser
  if (user.role !== 'napaBoard' && user.role !== 'napaDirector') {
    throw new Error('Forbidden')
  }
  return user
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireNapa()
    const { id } = await context.params
    const body = await request.json()
    const { title, meetingType, meetingDate, notes, attendance } = body ?? {}

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (typeof title === 'string') updates.title = title.trim()
    if (typeof meetingType === 'string') updates.meetingType = meetingType
    if (typeof meetingDate === 'string') updates.meetingDate = new Date(meetingDate)
    if (notes !== undefined) updates.notes = notes ?? null

    if (Object.keys(updates).length > 1) {
      await db.update(meetings).set(updates).where(eq(meetings.id, id))
    }

    // attendance: array of { organizationName, attended } — upsert each
    if (Array.isArray(attendance)) {
      for (const a of attendance) {
        if (typeof a?.organizationName !== 'string' || typeof a?.attended !== 'boolean') continue
        const existing = await db.query.meetingAttendance.findFirst({
          where: and(
            eq(meetingAttendance.meetingId, id),
            eq(meetingAttendance.organizationName, a.organizationName),
          ),
        })
        if (existing) {
          await db.update(meetingAttendance)
            .set({ attended: a.attended, recordedBy: user.id })
            .where(eq(meetingAttendance.id, existing.id))
        } else {
          await db.insert(meetingAttendance).values({
            meetingId: id,
            organizationName: a.organizationName,
            attended: a.attended,
            recordedBy: user.id,
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update meeting'
    const status = msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireNapa()
    const { id } = await context.params
    await db.delete(meetings).where(eq(meetings.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete meeting'
    const status = msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
