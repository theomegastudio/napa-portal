import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { platformDuesTargets } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface SessionUser { id: string; role?: string }

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const year = parseInt(request.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()))
  const row = await db.query.platformDuesTargets.findFirst({ where: eq(platformDuesTargets.year, year) })
  return NextResponse.json({ year, amount: row ? row.amountCents / 100 : null })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as unknown as SessionUser
  if (user.role !== 'napaBoard') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { year, amount } = body ?? {}
  if (typeof year !== 'number' || typeof amount !== 'number' || amount < 0) {
    return NextResponse.json({ error: 'year and amount required' }, { status: 400 })
  }

  const existing = await db.query.platformDuesTargets.findFirst({ where: eq(platformDuesTargets.year, year) })
  if (existing) {
    await db.update(platformDuesTargets)
      .set({ amountCents: Math.round(amount * 100), updatedAt: new Date() })
      .where(eq(platformDuesTargets.id, existing.id))
  } else {
    await db.insert(platformDuesTargets).values({
      year, amountCents: Math.round(amount * 100), createdBy: user.id,
    })
  }
  return NextResponse.json({ year, amount })
}
