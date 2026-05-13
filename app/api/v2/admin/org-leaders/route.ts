import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgLeaders } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface SessionUser { id: string; role?: string; isAdmin?: boolean; organizationName?: string }

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgName = request.nextUrl.searchParams.get('organization')
  if (!orgName) return NextResponse.json({ error: 'organization required' }, { status: 400 })
  const rows = await db.query.orgLeaders.findMany({
    where: eq(orgLeaders.organizationName, orgName),
    orderBy: orgLeaders.createdAt,
  })
  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as unknown as SessionUser

  const body = await request.json()
  const { organizationName, name, role, email, phone, notes, year } = body ?? {}
  if (!organizationName || !name) return NextResponse.json({ error: 'organizationName and name required' }, { status: 400 })

  // NAPA Board can edit any org's leaders. Otherwise, only an org admin of the
  // target org can edit that org's leaders.
  const isNapaBoard = user.role === 'napaBoard'
  const isOwnOrgAdmin = !!user.isAdmin && user.organizationName === organizationName
  if (!isNapaBoard && !isOwnOrgAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [row] = await db.insert(orgLeaders).values({
    organizationName,
    name,
    role: role || null,
    email: email || null,
    phone: phone || null,
    notes: notes || null,
    year: typeof year === 'number' ? year : null,
  }).returning()
  return NextResponse.json(row)
}
