import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { resources } from '@/lib/db/schema'
import { and, isNull, or, ilike, eq, desc } from 'drizzle-orm'

interface SessionUser {
  role?: string
  organizationName?: string
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const user = session.user as unknown as SessionUser
  const escaped = q.replace(/[%_\\]/g, '\\$&')

  const results = await db.query.resources.findMany({
    where: and(
      isNull(resources.deletedAt),
      eq(resources.status, 'active'),
      or(
        ilike(resources.title, `%${escaped}%`),
        ilike(resources.description, `%${escaped}%`),
        ilike(resources.topicArea, `%${escaped}%`)
      )
    ),
    with: { files: true },
    orderBy: desc(resources.updatedAt),
    limit: 10,
  })

  return NextResponse.json(
    results.map(r => ({
      id: r.id,
      title: r.title,
      resourceType: r.resourceType,
      organization: r.organization,
      mimeType: r.mimeType,
      originalFilename: r.originalFilename,
      hasFile: r.files.length > 0,
      externalLink: r.externalLink,
    }))
  )
}
