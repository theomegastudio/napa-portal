import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organizations, duesRecords, meetingAttendance, meetings, orgYearlyCompliance } from '@/lib/db/schema'
import { and, asc, eq, gte, lt, ne } from 'drizzle-orm'

const NAPA_ORG_NAME = 'National APIDA Panhellenic Association'
const MIN_ATTENDEES_PER_MEETING = 2

interface SessionUser {
  role?: string
  isAdmin?: boolean
  organizationName?: string
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as unknown as SessionUser & { canViewOrgHealth?: boolean }
  const allowed =
    user.role === 'napaBoard' ||
    (user.role === 'napaDirector' && !!user.canViewOrgHealth)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const year = parseInt(request.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()))
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1))

  // Active orgs excluding NAPA parent. Ordered by manual displayOrder then alpha tiebreak.
  const orgs = await db.query.organizations.findMany({
    where: and(
      eq(organizations.isActive, true),
      ne(organizations.organizationName, NAPA_ORG_NAME),
    ),
    orderBy: [asc(organizations.displayOrder), asc(organizations.organizationName)],
  })

  // Dues for this year, keyed by org name.
  const dues = await db.query.duesRecords.findMany({
    where: eq(duesRecords.year, year),
  })
  const duesMap = new Map(dues.map((d) => [d.organizationName, d]))

  // Meetings this year, split by type.
  const yearMeetings = await db.query.meetings.findMany({
    where: and(gte(meetings.meetingDate, yearStart), lt(meetings.meetingDate, yearEnd)),
  })
  const monthlyMeetings = yearMeetings.filter((m) => m.meetingType === 'monthly')
  const annualMeetings = yearMeetings.filter((m) => m.meetingType === 'annual')

  // Attendance for this year's meetings (attended=true only).
  const meetingIds = yearMeetings.map((m) => m.id)
  const attendance = meetingIds.length
    ? await db.query.meetingAttendance.findMany({
        where: eq(meetingAttendance.attended, true),
      })
    : []
  const attendanceByMeeting = new Map<string, Set<string>>()
  for (const a of attendance) {
    if (!meetingIds.includes(a.meetingId)) continue
    if (!attendanceByMeeting.has(a.meetingId)) {
      attendanceByMeeting.set(a.meetingId, new Set())
    }
    attendanceByMeeting.get(a.meetingId)!.add(a.organizationName)
  }

  // Per-org annual compliance for this year (renewal + 1x1).
  const compliance = await db.query.orgYearlyCompliance.findMany({
    where: eq(orgYearlyCompliance.year, year),
  })
  const complianceMap = new Map(compliance.map((c) => [c.organizationName, c]))

  // Low-attendance meetings (< MIN_ATTENDEES_PER_MEETING attendees, monthly only).
  const lowAttendanceMonthly = monthlyMeetings
    .map((m) => ({
      id: m.id,
      title: m.title,
      meetingDate: m.meetingDate,
      attendeeCount: attendanceByMeeting.get(m.id)?.size ?? 0,
    }))
    .filter((m) => m.attendeeCount < MIN_ATTENDEES_PER_MEETING)

  const result = orgs.map((org) => {
    const memberCount = org.memberCount ?? 0
    const duesRecord = duesMap.get(org.organizationName)
    const duesPaid = !!duesRecord?.paidAt

    const monthlyAttended = monthlyMeetings.filter((m) =>
      attendanceByMeeting.get(m.id)?.has(org.organizationName)
    ).length
    const annualAttended = annualMeetings.filter((m) =>
      attendanceByMeeting.get(m.id)?.has(org.organizationName)
    ).length

    const c = complianceMap.get(org.organizationName)
    const renewalCompleted = !!c?.renewalCompletedAt
    const oneOnOneCompleted = !!c?.oneOnOneCompletedAt

    // Engagement score (0-100): 5 equal-weighted dimensions, 20pts each.
    const monthlyScore = monthlyMeetings.length > 0
      ? Math.round((monthlyAttended / monthlyMeetings.length) * 20)
      : 20 // no meetings yet = no penalty
    const annualScore = annualMeetings.length > 0
      ? Math.round((annualAttended / annualMeetings.length) * 20)
      : 20
    const renewalScore = renewalCompleted ? 20 : 0
    const duesScore = duesPaid ? 20 : 0
    const oneOnOneScore = oneOnOneCompleted ? 20 : 0
    const engagementScore = monthlyScore + annualScore + renewalScore + duesScore + oneOnOneScore

    return {
      organizationName: org.organizationName,
      slug: org.slug,
      memberCount,
      displayOrder: org.displayOrder,
      monthlyMeetings: monthlyMeetings.length,
      monthlyAttended,
      annualMeetings: annualMeetings.length,
      annualAttended,
      renewalCompleted,
      renewalCompletedAt: c?.renewalCompletedAt ?? null,
      oneOnOneCompleted,
      oneOnOneCompletedAt: c?.oneOnOneCompletedAt ?? null,
      duesPaid,
      duesAmount: duesRecord?.amountCents ? duesRecord.amountCents / 100 : null,
      duesPaidAt: duesRecord?.paidAt ?? null,
      engagementScore,
    }
  })

  return NextResponse.json({
    year,
    organizations: result,
    monthlyMeetingCount: monthlyMeetings.length,
    annualMeetingCount: annualMeetings.length,
    lowAttendanceMonthly,
    minAttendeesPerMeeting: MIN_ATTENDEES_PER_MEETING,
  })
}
