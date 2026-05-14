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

const MEETING_TYPES = ['monthly', 'annual', 'general', 'board', 'committee', 'special'] as const
const MAX_TITLE = 200
const MAX_NOTES = 5000

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
    if (typeof title === 'string') {
      const trimmed = title.trim()
      if (trimmed.length === 0 || trimmed.length > MAX_TITLE) {
        throw new Error(`title must be 1-${MAX_TITLE} characters`)
      }
      updates.title = trimmed
    }
    if (typeof meetingType === 'string') {
      if (!(MEETING_TYPES as readonly string[]).includes(meetingType)) {
        throw new Error(`meetingType must be one of: ${MEETING_TYPES.join(', ')}`)
      }
      updates.meetingType = meetingType
    }
    if (typeof meetingDate === 'string') {
      const d = new Date(meetingDate)
      if (isNaN(d.getTime())) throw new Error('meetingDate is invalid')
      updates.meetingDate = d
    }
    if (notes !== undefined) {
      if (notes !== null && (typeof notes !== 'string' || notes.length > MAX_NOTES)) {
        throw new Error(`notes must be a string under ${MAX_NOTES} characters`)
      }
      updates.notes = notes ?? null
    }

    if (Object.keys(updates).length > 1) {
      await db.update(meetings).set(updates).where(eq(meetings.id, id))
    }

    // attendance: array of { organizationName, attended, attendeeCount? } - upsert each.
    // attendeeCount overrides attended when present (count > 0 implies attended).
    if (Array.isArray(attendance)) {
      for (const a of attendance) {
        if (typeof a?.organizationName !== 'string') continue
        const hasCount = typeof a.attendeeCount === 'number' && a.attendeeCount >= 0
        const attended = hasCount ? a.attendeeCount > 0 : a?.attended === true
        const count = hasCount ? Math.floor(a.attendeeCount as number) : (attended ? 1 : 0)
        const existing = await db.query.meetingAttendance.findFirst({
          where: and(
            eq(meetingAttendance.meetingId, id),
            eq(meetingAttendance.organizationName, a.organizationName),
          ),
        })
        if (existing) {
          await db.update(meetingAttendance)
            .set({ attended, attendeeCount: count, recordedBy: user.id })
            .where(eq(meetingAttendance.id, existing.id))
        } else {
          await db.insert(meetingAttendance).values({
            meetingId: id,
            organizationName: a.organizationName,
            attended,
            attendeeCount: count,
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
