import { validateFile, sanitizeFilename } from '@/lib/utils/file-validation';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// R2 client for server-side operations
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
 * Delete a file from R2 storage
 * This is called from the server-side only
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  // Extract the key from the URL
  // URL format: https://pub-xxx.r2.dev/uploads/filename.pdf
  try {
    const url = new URL(fileUrl);
    const key = url.pathname.replace(/^\//, ''); // Remove leading slash

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );
  } catch (error) {
    // File might not exist or URL might be invalid, log and continue
    console.warn(`Failed to delete file from R2: ${fileUrl}`, error);
  }
}

/**
 * Get the public URL for a file key
 */
export function getFileUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}
