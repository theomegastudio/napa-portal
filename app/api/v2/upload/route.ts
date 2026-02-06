import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  validateFileServer,
  validateFileSizeServer,
} from '@/lib/utils/server-file-validation';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'napa-resources';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export async function POST(request: NextRequest) {
  try {
    // Check authentication using BetterAuth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Upload to R2
    const fileUrl = await uploadToR2(buffer, uniqueFilename, file.type);

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
