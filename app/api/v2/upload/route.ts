import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  validateFileServer,
  validateFileSizeServer,
} from '@/lib/utils/server-file-validation';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

type StorageProvider = 'local' | 'r2' | 's3' | 'minio';
const STORAGE_PROVIDER =
  (process.env.STORAGE_PROVIDER as StorageProvider) || 'local';

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

    let fileUrl: string;

    switch (STORAGE_PROVIDER) {
      case 'local':
        fileUrl = await uploadToLocal(buffer, uniqueFilename, file.type);
        break;
      case 'r2':
      case 's3':
      case 'minio':
        // S3 upload requires @aws-sdk/client-s3 - fall back to local for now
        // TODO: Implement S3 upload when ready for production
        console.warn('S3 storage not yet implemented, falling back to local');
        fileUrl = await uploadToLocal(buffer, uniqueFilename, file.type);
        break;
      default:
        fileUrl = await uploadToLocal(buffer, uniqueFilename, file.type);
    }

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
 * Upload to local filesystem (for development/testing)
 */
async function uploadToLocal(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const uploadsDir = join(process.cwd(), 'public', 'uploads');

  // Ensure uploads directory exists
  await mkdir(uploadsDir, { recursive: true });

  const filePath = join(uploadsDir, filename);
  await writeFile(filePath, buffer);

  // Return the public URL
  return `/uploads/${filename}`;
}

// S3 upload will be implemented when @aws-sdk/client-s3 is installed
// npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
