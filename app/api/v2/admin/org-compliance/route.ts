import { NextRequest, NextResponse } from 'next/server'
import { getOrgCompliance, setOrgComplianceFlag } from '@/lib/services-drizzle/org-compliance'

export async function GET(request: NextRequest) {
  try {
    const year = parseInt(request.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()))
    const rows = await getOrgCompliance(year)
    return NextResponse.json(rows)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch compliance'
    const status = msg.includes('Unauthorized') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationName, year, field, value } = body ?? {}
    if (!organizationName || typeof year !== 'number' || !field || typeof value !== 'boolean') {
      return NextResponse.json({ error: 'organizationName, year, field, and value are required' }, { status: 400 })
    }
    if (field !== 'renewal' && field !== 'oneOnOne') {
      return NextResponse.json({ error: 'field must be "renewal" or "oneOnOne"' }, { status: 400 })
    }
    await setOrgComplianceFlag(organizationName, year, field, value)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update compliance'
    const status = msg.includes('Unauthorized') ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
