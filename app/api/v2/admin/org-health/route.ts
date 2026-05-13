import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organizations, users, duesRecords, meetingAttendance, meetings, orgHealthMetrics } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'

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

  // Get all active organizations
  const orgs = await db.query.organizations.findMany({
    where: eq(organizations.isActive, true),
    orderBy: organizations.organizationName,
  })

  // Get member counts per org
  const memberCounts = await db
    .select({
      organizationName: users.organizationName,
      count: count(),
    })
    .from(users)
    .where(eq(users.approvalStatus, 'approved'))
    .groupBy(users.organizationName)

  const memberCountMap = Object.fromEntries(
    memberCounts.map(r => [r.organizationName, r.count])
  )

  // Get dues for the year
  const dues = await db.query.duesRecords.findMany({
    where: eq(duesRecords.year, year),
  })
  const duesMap = Object.fromEntries(
    dues.map(d => [d.organizationName, d])
  )

  // Get total meetings for the year
  const allMeetings = await db.query.meetings.findMany({
    orderBy: desc(meetings.meetingDate),
  })
  const totalMeetings = allMeetings.length

  // Get attendance per org
  const attendance = await db.query.meetingAttendance.findMany({
    where: eq(meetingAttendance.attended, true),
  })
  const attendanceMap: Record<string, number> = {}
  for (const a of attendance) {
    attendanceMap[a.organizationName] = (attendanceMap[a.organizationName] ?? 0) + 1
  }

  const result = orgs.map(org => {
    const memberCount = memberCountMap[org.organizationName] ?? 0
    const duesRecord = duesMap[org.organizationName]
    const meetingsAttended = attendanceMap[org.organizationName] ?? 0
    const attendanceRate = totalMeetings > 0 ? Math.round((meetingsAttended / totalMeetings) * 100) : 0
    const duesPaid = !!duesRecord?.paidAt

    // Simple engagement score: 50% attendance + 30% dues + 20% members
    const attendanceScore = Math.min(attendanceRate, 100) * 0.5
    const duesScore = duesPaid ? 30 : 0
    const memberScore = Math.min(memberCount * 4, 20)
    const engagementScore = Math.round(attendanceScore + duesScore + memberScore)

    return {
      organizationName: org.organizationName,
      slug: org.slug,
      memberCount,
      meetingsAttended,
      totalMeetings,
      attendanceRate,
      duesPaid,
      duesAmount: duesRecord?.amountCents ? duesRecord.amountCents / 100 : null,
      duesPaidAt: duesRecord?.paidAt ?? null,
      engagementScore,
    }
  })

  return NextResponse.json({ year, organizations: result, totalMeetings })
}
