import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetings, meetingAttendance } from '@/lib/db/schema'
import { and, asc, eq, gte, lt } from 'drizzle-orm'

interface SessionUser { id: string; role?: string; canViewOrgHealth?: boolean }

function allowedWrite(user: SessionUser) {
  return user.role === 'napaBoard' || (user.role === 'napaDirector' && !!user.canViewOrgHealth)
}

/**
 * Set the NAPAAM attendee count for a given org in a given year. Writes to the
 * meetingAttendance row of the first 'annual' meeting in the year. If none
 * exists yet, creates a placeholder meeting so the count can be stored.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as unknown as SessionUser
  if (!allowedWrite(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { organizationName, year, count } = body ?? {}
  if (typeof organizationName !== 'string' || typeof year !== 'number' || typeof count !== 'number') {
    return NextResponse.json({ error: 'organizationName, year, and count required' }, { status: 400 })
  }
  if (count < 0) return NextResponse.json({ error: 'count must be >= 0' }, { status: 400 })

  const yearStart = new Date(Date.UTC(year, 0, 1))
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1))

  let napaam = await db.query.meetings.findFirst({
    where: and(
      eq(meetings.meetingType, 'annual'),
      gte(meetings.meetingDate, yearStart),
      lt(meetings.meetingDate, yearEnd),
    ),
    orderBy: asc(meetings.meetingDate),
  })

  if (!napaam) {
    const [created] = await db.insert(meetings).values({
      title: `NAPAAM ${year}`,
      meetingType: 'annual',
      meetingDate: new Date(Date.UTC(year, 0, 1)),
      createdBy: user.id,
    }).returning()
    napaam = created
  }

  const existing = await db.query.meetingAttendance.findFirst({
    where: and(
      eq(meetingAttendance.meetingId, napaam.id),
      eq(meetingAttendance.organizationName, organizationName),
    ),
  })

  if (existing) {
    await db.update(meetingAttendance)
      .set({ attendeeCount: count, attended: count > 0, recordedBy: user.id })
      .where(eq(meetingAttendance.id, existing.id))
  } else {
    await db.insert(meetingAttendance).values({
      meetingId: napaam.id,
      organizationName,
      attended: count > 0,
      attendeeCount: count,
      recordedBy: user.id,
    })
  }

  return NextResponse.json({ ok: true })
}
