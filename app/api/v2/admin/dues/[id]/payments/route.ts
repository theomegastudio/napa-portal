import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { duesPayments } from '@/lib/db/schema'

interface SessionUser { id: string; role?: string; canViewOrgHealth?: boolean }

function allowed(user: SessionUser) {
  return user.role === 'napaBoard' || (user.role === 'napaDirector' && !!user.canViewOrgHealth)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as unknown as SessionUser
  if (!allowed(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await context.params
  const body = await request.json()
  const { amount, paidAt, notes } = body ?? {}
  if (typeof amount !== 'number' || amount <= 0 || typeof paidAt !== 'string') {
    return NextResponse.json({ error: 'amount > 0 and paidAt required' }, { status: 400 })
  }

  const [row] = await db.insert(duesPayments).values({
    duesRecordId: id,
    amountCents: Math.round(amount * 100),
    paidAt: new Date(paidAt),
    notes: notes ?? null,
    recordedBy: user.id,
  }).returning()
  return NextResponse.json(row)
}
