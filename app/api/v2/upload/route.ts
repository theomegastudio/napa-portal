import { NextRequest, NextResponse } from 'next/server';
import {
  validateFileServer,
  validateFileSizeServer,
} from '@/lib/utils/server-file-validation';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireApprovedAuth } from '@/lib/auth-helpers';

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'napa-resources';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export async function POST(request: NextRequest) {
  try {
    try {
      await requireApprovedAuth();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unauthorized';
      const status = msg === 'Account not approved' ? 403 : 401;
      return NextResponse.json({ error: msg }, { status });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customFilename = formData.get('customFilename') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    const sizeValidation = validateFileSizeServer(file.size);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer for magic byte validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file using magic bytes
    const validation = await validateFileServer(buffer, file.name);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, detectedType: validation.detectedType },
        { status: 400 }
      );
    }

    // Prepare filename
    const filename = customFilename || file.name;
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}-${sanitizedFilename}`;

    // Use the magic-byte-detected MIME type, not the client-supplied one.
    // A mismatched stored Content-Type can be abused to coerce browsers into
    // rendering uploaded bytes as a different document type when served.
    const safeContentType = validation.detectedType || 'application/octet-stream';
    const fileUrl = await uploadToR2(buffer, uniqueFilename, safeContentType);

    return NextResponse.json({
      success: true,
      url: fileUrl,
      name: filename,
      detectedType: validation.detectedType,
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Upload to Cloudflare R2
 */
async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const key = `uploads/${filename}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Return the public URL
  return `${R2_PUBLIC_URL}/${key}`;
}
