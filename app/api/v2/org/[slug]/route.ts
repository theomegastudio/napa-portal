import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  organizations, duesRecords, meetingAttendance, meetings, orgYearlyCompliance,
  orgLeaders, platformDuesTargets,
} from '@/lib/db/schema'
import { and, asc, eq, gte, lt, or, sql } from 'drizzle-orm'
import { orgSlug } from '@/lib/slug'

interface SessionUser {
  id: string
  role?: string
  isAdmin?: boolean
  organizationName?: string
  canViewOrgHealth?: boolean
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as unknown as SessionUser

  const { slug } = await context.params
  const year = parseInt(request.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()))

  // Find the org by slug or exact name
  const allOrgs = await db.query.organizations.findMany()
  const org = allOrgs.find(o => orgSlug(o.organizationName) === slug || o.organizationName === slug)
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  // Permission: NAPA staff can view any org. Otherwise, user must be in this org.
  const isNapa = user.role === 'napaBoard' || user.role === 'napaDirector'
  const isOwnOrg = user.organizationName === org.organizationName
  if (!isNapa && !isOwnOrg) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const yearStart = new Date(Date.UTC(year, 0, 1))
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1))

  // Year-scoped data
  const [duesRow] = await Promise.all([
    db.query.duesRecords.findFirst({
      where: and(eq(duesRecords.organizationName, org.organizationName), eq(duesRecords.year, year)),
      with: { payments: true },
    }),
  ])
  const platformTarget = await db.query.platformDuesTargets.findFirst({
    where: eq(platformDuesTargets.year, year),
  })
  const platformTargetCents = platformTarget?.amountCents ?? 0
  const duesTargetCents = duesRow?.amountCents ?? platformTargetCents
  const paidCents = (duesRow?.payments ?? []).reduce((s, p) => s + p.amountCents, 0)
  const duesPaid = duesTargetCents > 0 && paidCents >= duesTargetCents
  const duesPartial = paidCents > 0 && !duesPaid

  const yearMeetings = await db.query.meetings.findMany({
    where: and(gte(meetings.meetingDate, yearStart), lt(meetings.meetingDate, yearEnd)),
    orderBy: asc(meetings.meetingDate),
  })
  const monthlyMeetings = yearMeetings.filter(m => m.meetingType === 'monthly')
  const annualMeetings = yearMeetings.filter(m => m.meetingType === 'annual')

  const attendance = yearMeetings.length
    ? await db.query.meetingAttendance.findMany()
    : []
  const ownAttendance = attendance.filter(a =>
    yearMeetings.some(m => m.id === a.meetingId) && a.organizationName === org.organizationName
  )
  const attendedByMeeting = new Map(ownAttendance.map(a => [a.meetingId, a.attendeeCount ?? 0]))

  // Score (matches /api/v2/admin/org-health math; baseline 16 per dimension).
  const now = new Date()
  let monthlyCreditSum = 0
  let monthlyPastCount = 0
  let monthlyAttended = 0
  for (const m of monthlyMeetings) {
    const c = attendedByMeeting.get(m.id) ?? 0
    if (c >= 1) monthlyAttended++
    if (m.meetingDate < now) {
      monthlyPastCount++
      if (c >= 2) monthlyCreditSum += 1
      else if (c === 1) monthlyCreditSum += 0.5
    }
  }
  let napaamAttendees = 0
  let napaamHasOccurred = false
  for (const m of annualMeetings) {
    if (m.meetingDate < now) {
      napaamHasOccurred = true
      napaamAttendees += attendedByMeeting.get(m.id) ?? 0
    }
  }

  const compliance = await db.query.orgYearlyCompliance.findFirst({
    where: and(
      eq(orgYearlyCompliance.organizationName, org.organizationName),
      eq(orgYearlyCompliance.year, year),
    ),
  })
  const renewalCompleted = !!compliance?.renewalCompletedAt
  const oneOnOneCompleted = !!compliance?.oneOnOneCompletedAt

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

  // Leaders for the selected year. Include year=null (ongoing) plus year=year rows.
  const leaders = await db.query.orgLeaders.findMany({
    where: and(
      eq(orgLeaders.organizationName, org.organizationName),
      or(sql`${orgLeaders.year} IS NULL`, eq(orgLeaders.year, year)),
    ),
    orderBy: [asc(orgLeaders.year), asc(orgLeaders.createdAt)],
  })

  return NextResponse.json({
    organization: {
      organizationName: org.organizationName,
      slug: orgSlug(org.organizationName),
      isActive: org.isActive,
      inactivatedAt: org.inactivatedAt,
      memberCount: org.memberCount,
    },
    year,
    permissions: {
      canEditLeaders: user.role === 'napaBoard' || (isOwnOrg && !!user.isAdmin),
      isNapa,
      isOwnOrg,
    },
    metrics: {
      monthlyMeetings: monthlyMeetings.length,
      monthlyAttended,
      napaamAttendees,
      renewalCompleted,
      oneOnOneCompleted,
      duesPaid,
      duesPartial,
      duesTargetAmount: duesTargetCents > 0 ? duesTargetCents / 100 : null,
      duesPaidAmount: paidCents / 100,
      engagementScore,
    },
    meetings: yearMeetings.map(m => ({
      id: m.id,
      title: m.title,
      meetingType: m.meetingType,
      meetingDate: m.meetingDate,
      attendeeCount: attendedByMeeting.get(m.id) ?? 0,
    })),
    leaders,
  })
}
