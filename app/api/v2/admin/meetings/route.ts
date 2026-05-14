import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetings, meetingAttendance, organizations } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { isNapaUser, type SessionUser } from '@/lib/permissions'

type MeetingsSessionUser = SessionUser & { id: string }

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as unknown as MeetingsSessionUser
  if (!isNapaUser(user) && !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await db.query.meetings.findMany({
    with: { attendance: true },
    orderBy: desc(meetings.meetingDate),
  })

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as unknown as MeetingsSessionUser
  if (!isNapaUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { title, meetingType, meetingDate, notes, attendingOrgs } = body

  if (!title || !meetingDate) {
    return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
  }

  const [meeting] = await db.insert(meetings).values({
    title,
    meetingType: meetingType ?? 'general',
    meetingDate: new Date(meetingDate),
    notes,
    createdBy: user.id,
  }).returning()

  if (attendingOrgs?.length) {
    await db.insert(meetingAttendance).values(
      attendingOrgs.map((orgName: string) => ({
        meetingId: meeting.id,
        organizationName: orgName,
        attended: true,
        recordedBy: user.id,
      }))
    )
  }

  return NextResponse.json(meeting)
}
