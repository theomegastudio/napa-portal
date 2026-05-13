import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organizations, duesRecords, duesPayments, meetingAttendance, meetings, orgYearlyCompliance } from '@/lib/db/schema'
import { and, eq, gte, lt, ne, sql } from 'drizzle-orm'

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

  // Active orgs excluding NAPA parent. Ordered alphabetically (case-insensitive)
  // so e.g. "alpha Kappa Delta Phi" sorts before "Alpha Phi Gamma".
  const orgs = await db.query.organizations.findMany({
    where: and(
      eq(organizations.isActive, true),
      ne(organizations.organizationName, NAPA_ORG_NAME),
    ),
    orderBy: sql`LOWER(${organizations.organizationName})`,
  })

  // Dues for this year, keyed by org name, with payment history.
  const dues = await db.query.duesRecords.findMany({
    where: eq(duesRecords.year, year),
    with: { payments: true },
  })
  const duesMap = new Map(dues.map((d) => [d.organizationName, d]))

  // Meetings this year, split by type.
  const yearMeetings = await db.query.meetings.findMany({
    where: and(gte(meetings.meetingDate, yearStart), lt(meetings.meetingDate, yearEnd)),
  })
  const monthlyMeetings = yearMeetings.filter((m) => m.meetingType === 'monthly')
  const annualMeetings = yearMeetings.filter((m) => m.meetingType === 'annual')

  // Attendance for this year's meetings. For monthly we only need a boolean
  // ("attended this meeting"); for NAPAAM (annual) we track an attendeeCount per org.
  const meetingIds = yearMeetings.map((m) => m.id)
  const allAttendance = meetingIds.length
    ? await db.query.meetingAttendance.findMany()
    : []
  const attendanceByMeeting = new Map<string, Set<string>>() // attended=true rows
  const annualCountsByMeeting = new Map<string, Map<string, number>>() // meetingId -> org -> count
  for (const a of allAttendance) {
    if (!meetingIds.includes(a.meetingId)) continue
    if (a.attended) {
      if (!attendanceByMeeting.has(a.meetingId)) attendanceByMeeting.set(a.meetingId, new Set())
      attendanceByMeeting.get(a.meetingId)!.add(a.organizationName)
    }
    if (a.attendeeCount > 0) {
      if (!annualCountsByMeeting.has(a.meetingId)) annualCountsByMeeting.set(a.meetingId, new Map())
      annualCountsByMeeting.get(a.meetingId)!.set(a.organizationName, a.attendeeCount)
    }
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
    const duesTargetCents = duesRecord?.amountCents ?? 0
    const paidCents = (duesRecord?.payments ?? []).reduce((s, p) => s + p.amountCents, 0)
    const duesPaid = duesTargetCents > 0 && paidCents >= duesTargetCents
    const duesPartial = paidCents > 0 && !duesPaid

    const monthlyAttended = monthlyMeetings.filter((m) =>
      attendanceByMeeting.get(m.id)?.has(org.organizationName)
    ).length

    // NAPAAM attendees: sum count across all annual meetings this year for this org.
    let napaamAttendees = 0
    for (const m of annualMeetings) {
      napaamAttendees += annualCountsByMeeting.get(m.id)?.get(org.organizationName) ?? 0
    }

    const c = complianceMap.get(org.organizationName)
    const renewalCompleted = !!c?.renewalCompletedAt
    const oneOnOneCompleted = !!c?.oneOnOneCompletedAt

    // Engagement score (0-100): 5 equal-weighted dimensions, 20pts each.
    const monthlyScore = monthlyMeetings.length > 0
      ? Math.round((monthlyAttended / monthlyMeetings.length) * 20)
      : 20 // no meetings yet = no penalty
    // NAPAAM: 2+ attendees = full 20, 1 attendee = 10, 0 attendees = 0.
    const napaamScore = napaamAttendees >= 2 ? 20 : napaamAttendees === 1 ? 10 : 0
    const renewalScore = renewalCompleted ? 20 : 0
    const duesScore = duesPaid ? 20 : duesPartial ? 10 : 0
    const oneOnOneScore = oneOnOneCompleted ? 20 : 0
    const engagementScore = monthlyScore + napaamScore + renewalScore + duesScore + oneOnOneScore

    return {
      organizationName: org.organizationName,
      slug: org.slug,
      memberCount,
      displayOrder: org.displayOrder,
      monthlyMeetings: monthlyMeetings.length,
      monthlyAttended,
      napaamAttendees,
      renewalCompleted,
      renewalCompletedAt: c?.renewalCompletedAt ?? null,
      oneOnOneCompleted,
      oneOnOneCompletedAt: c?.oneOnOneCompletedAt ?? null,
      duesPaid,
      duesPartial,
      duesRecordId: duesRecord?.id ?? null,
      duesTargetAmount: duesTargetCents > 0 ? duesTargetCents / 100 : null,
      duesPaidAmount: paidCents / 100,
      duesPayments: (duesRecord?.payments ?? []).map(p => ({
        id: p.id,
        amount: p.amountCents / 100,
        paidAt: p.paidAt,
      })),
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
