import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organizations, duesRecords, meetingAttendance, meetings, orgYearlyCompliance, platformDuesTargets } from '@/lib/db/schema'
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

  // Platform-wide annual dues target - applies to any org without its own record.
  const platformTarget = await db.query.platformDuesTargets.findFirst({
    where: eq(platformDuesTargets.year, year),
  })
  const platformTargetCents = platformTarget?.amountCents ?? 0

  // Meetings this year, split by type.
  const yearMeetings = await db.query.meetings.findMany({
    where: and(gte(meetings.meetingDate, yearStart), lt(meetings.meetingDate, yearEnd)),
  })
  const monthlyMeetings = yearMeetings.filter((m) => m.meetingType === 'monthly')
  const annualMeetings = yearMeetings.filter((m) => m.meetingType === 'annual')

  // Attendance for this year's meetings. We track attendeeCount per (meeting, org)
  // and use it to derive scores: 2+ = full credit, 1 = half credit, 0 = none.
  const meetingIds = yearMeetings.map((m) => m.id)
  const allAttendance = meetingIds.length
    ? await db.query.meetingAttendance.findMany()
    : []
  const countsByMeeting = new Map<string, Map<string, number>>() // meetingId -> org -> count
  for (const a of allAttendance) {
    if (!meetingIds.includes(a.meetingId)) continue
    if (!countsByMeeting.has(a.meetingId)) countsByMeeting.set(a.meetingId, new Map())
    countsByMeeting.get(a.meetingId)!.set(a.organizationName, a.attendeeCount ?? 0)
  }

  // Per-org annual compliance for this year (renewal + 1x1).
  const compliance = await db.query.orgYearlyCompliance.findMany({
    where: eq(orgYearlyCompliance.year, year),
  })
  const complianceMap = new Map(compliance.map((c) => [c.organizationName, c]))

  // Low-attendance meetings: any monthly meeting where total attendee count
  // across all orgs is below MIN_ATTENDEES_PER_MEETING.
  const lowAttendanceMonthly = monthlyMeetings
    .map((m) => {
      const counts = countsByMeeting.get(m.id)
      const total = counts ? Array.from(counts.values()).reduce((s, n) => s + n, 0) : 0
      return { id: m.id, title: m.title, meetingDate: m.meetingDate, attendeeCount: total }
    })
    .filter((m) => m.attendeeCount < MIN_ATTENDEES_PER_MEETING)

  const result = orgs.map((org) => {
    const memberCount = org.memberCount ?? 0
    const duesRecord = duesMap.get(org.organizationName)
    const duesTargetCents = duesRecord?.amountCents ?? platformTargetCents
    const paidCents = (duesRecord?.payments ?? []).reduce((s, p) => s + p.amountCents, 0)
    const duesPaid = duesTargetCents > 0 && paidCents >= duesTargetCents
    const duesPartial = paidCents > 0 && !duesPaid

    // Monthly: per-meeting credit by attendee_count. 2+ = 1.0, 1 = 0.5, 0 = 0.
    // For scoring we ONLY consider meetings whose date is in the past - future
    // meetings count in the X/12 display but don't drag the score down yet.
    const now = new Date()
    let monthlyCreditSum = 0
    let monthlyPastCount = 0
    let monthlyAttended = 0
    for (const m of monthlyMeetings) {
      const c = countsByMeeting.get(m.id)?.get(org.organizationName) ?? 0
      if (c >= 2) monthlyAttended++
      else if (c === 1) monthlyAttended++
      if (m.meetingDate < now) {
        monthlyPastCount++
        if (c >= 2) monthlyCreditSum += 1
        else if (c === 1) monthlyCreditSum += 0.5
      }
    }

    // NAPAAM attendees: sum count across annual meetings whose date is in the past.
    let napaamAttendees = 0
    let napaamHasOccurred = false
    for (const m of annualMeetings) {
      if (m.meetingDate < now) {
        napaamHasOccurred = true
        napaamAttendees += countsByMeeting.get(m.id)?.get(org.organizationName) ?? 0
      }
    }

    const c = complianceMap.get(org.organizationName)
    const renewalCompleted = !!c?.renewalCompletedAt
    const oneOnOneCompleted = !!c?.oneOnOneCompletedAt

    // Engagement score (0-100): 5 dimensions, each 0-20.
    // Baseline is 16 per dimension when the data hasn't been collected/missed
    // yet - so an org with zero activity recorded starts the year at 80, not 0.
    // Active completions bring each dimension up to 20; explicit misses pull
    // it down to 0.
    const monthlyScore = monthlyPastCount > 0
      ? Math.round((monthlyCreditSum / monthlyPastCount) * 20)
      : 16
    const napaamScore = napaamHasOccurred
      ? (napaamAttendees >= 2 ? 20 : napaamAttendees === 1 ? 10 : 0)
      : 16
    const renewalScore = renewalCompleted ? 20 : 16
    const duesScore = duesPaid ? 20 : duesPartial ? 10 : 16
    const oneOnOneScore = oneOnOneCompleted ? 20 : 16
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
    duesTarget: platformTargetCents > 0 ? platformTargetCents / 100 : null,
  })
}
