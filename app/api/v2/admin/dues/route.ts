import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { duesRecords } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

interface SessionUser { id: string; role?: string; canViewOrgHealth?: boolean }

function allowed(user: SessionUser) {
  return user.role === 'napaBoard' || (user.role === 'napaDirector' && !!user.canViewOrgHealth)
}

/** Upsert a dues record for (org, year) with a target amount. */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as unknown as SessionUser
  if (!allowed(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { organizationName, year, amount, notes } = body ?? {}
  if (typeof organizationName !== 'string' || typeof year !== 'number' || typeof amount !== 'number') {
    return NextResponse.json({ error: 'organizationName, year, amount required' }, { status: 400 })
  }
  if (amount < 0) return NextResponse.json({ error: 'amount must be >= 0' }, { status: 400 })

  const amountCents = Math.round(amount * 100)
  const existing = await db.query.duesRecords.findFirst({
    where: and(eq(duesRecords.organizationName, organizationName), eq(duesRecords.year, year)),
  })

  if (existing) {
    const [row] = await db.update(duesRecords)
      .set({ amountCents, notes: notes ?? null, updatedAt: new Date() })
      .where(eq(duesRecords.id, existing.id))
      .returning()
    return NextResponse.json(row)
  }

  const [row] = await db.insert(duesRecords).values({
    organizationName,
    year,
    amountCents,
    notes: notes ?? null,
    createdBy: user.id,
  }).returning()
  return NextResponse.json(row)
}
