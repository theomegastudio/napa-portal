import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resources, resourceFiles } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createAuditLog } from '@/lib/services-drizzle/audit'
import { requireApprovedAuth } from '@/lib/auth-helpers'
import { canDownloadResource } from '@/lib/permissions'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'napa-resources'

function extractKeyFromUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl)
    return url.pathname.replace(/^\//, '')
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user
  try {
    user = await requireApprovedAuth()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    const status = msg === 'Account not approved' ? 403 : 401
    return NextResponse.json({ error: msg }, { status })
  }

  const { id } = await params
  const fileId = request.nextUrl.searchParams.get('fileId')

  const resource = await db.query.resources.findFirst({
    where: and(eq(resources.id, id), isNull(resources.deletedAt)),
    with: { files: true },
  })

  if (!resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  }

  // Enforce per-resource access: own org, NAPA staff, or the resource is
  // shared (allowDownload=true). External links bypass file scope but still
  // require the same visibility check.
  if (!canDownloadResource(user, resource.organization, resource.allowDownload ?? false)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let fileUrl: string | null = null
  if (fileId) {
    const file = resource.files.find(f => f.id === fileId)
    fileUrl = file?.fileUrl ?? null
  } else if (resource.files.length > 0) {
    fileUrl = resource.files[0].fileUrl
  } else if (resource.externalLink) {
    return NextResponse.redirect(resource.externalLink)
  }

  if (!fileUrl) {
    return NextResponse.json({ error: 'No file attached to this resource' }, { status: 404 })
  }

  const key = extractKeyFromUrl(fileUrl)
  if (!key) {
    return NextResponse.json({ error: 'Unable to resolve file location' }, { status: 500 })
  }

  try {
    const signedUrl = await getSignedUrl(
      r2Client,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
      { expiresIn: 300 } // 5 minutes
    )
    void createAuditLog({
      userId: user.id,
      userEmail: user.email,
      organization: resource.organization,
      action: 'downloaded',
      resourceId: resource.id,
      resourceTitle: resource.title,
      resourceType: resource.resourceType,
      metadata: fileId ? { fileId } : undefined,
    })
    return NextResponse.redirect(signedUrl)
  } catch (e) {
    console.error('Signed URL generation failed:', e)
    return NextResponse.json({ error: 'Unable to generate download link' }, { status: 500 })
  }
}
