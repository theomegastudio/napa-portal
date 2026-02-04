import { validateFile, sanitizeFilename } from '@/lib/utils/file-validation';

// Storage provider type - we'll support multiple backends
export type StorageProvider = 'local' | 'r2' | 's3' | 'minio';

const STORAGE_PROVIDER = (process.env.STORAGE_PROVIDER as StorageProvider) || 'local';

/**
 * Upload a file to the configured storage provider
 */
export async function uploadFile(
  file: File,
  customFileName?: string
): Promise<{ url: string; name: string }> {
  // Client-side validation for immediate feedback
  const validationError = validateFile(file);
  if (validationError) {
    throw new Error(validationError.message);
  }

  // Sanitize filename
  const sanitizedName = customFileName
    ? sanitizeFilename(customFileName)
    : sanitizeFilename(file.name);

  // Upload via API route for server-side validation
  const formData = new FormData();
  formData.append('file', file);
  if (customFileName) {
    formData.append('customFilename', sanitizedName);
  }

  const response = await fetch('/api/v2/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload file');
  }

  const data = await response.json();

  return {
    url: data.url,
    name: sanitizedName,
  };
}

/**
 * Delete a file from storage
 * This is called from the server-side only
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  // Extract the file key from the URL
  const url = new URL(fileUrl);
  const key = url.pathname.replace(/^\//, '');

  switch (STORAGE_PROVIDER) {
    case 'local':
      await deleteLocalFile(key);
      break;
    case 'r2':
    case 's3':
    case 'minio':
      await deleteS3File(key);
      break;
    default:
      throw new Error(`Unknown storage provider: ${STORAGE_PROVIDER}`);
  }
}

/**
 * Delete a file from local storage
 */
async function deleteLocalFile(key: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const filePath = path.join(process.cwd(), 'public', 'uploads', key);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    // File might not exist, that's okay
    console.warn(`Failed to delete local file: ${filePath}`, error);
  }
}

/**
 * Delete a file from S3-compatible storage (R2, S3, MinIO)
 */
async function deleteS3File(key: string): Promise<void> {
  // This will be implemented when we set up R2/S3
  // For now, just log
  console.log(`Would delete S3 file: ${key}`);

  // Example implementation:
  // const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  // const client = new S3Client({
  //   region: process.env.S3_REGION || 'auto',
  //   endpoint: process.env.S3_ENDPOINT,
  //   credentials: {
  //     accessKeyId: process.env.S3_ACCESS_KEY_ID!,
  //     secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  //   },
  // });
  // await client.send(new DeleteObjectCommand({
  //   Bucket: process.env.S3_BUCKET_NAME,
  //   Key: key,
  // }));
}

/**
 * Get the public URL for a file
 */
export function getFileUrl(key: string): string {
  switch (STORAGE_PROVIDER) {
    case 'local':
      return `/uploads/${key}`;
    case 'r2':
    case 's3':
    case 'minio':
      return `${process.env.S3_PUBLIC_URL}/${key}`;
    default:
      return `/uploads/${key}`;
  }
}
