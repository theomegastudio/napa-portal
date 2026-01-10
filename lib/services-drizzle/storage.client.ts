import { validateFile, sanitizeFilename } from '@/lib/utils/file-validation';

/**
 * Upload a file to the configured storage provider (client-safe version)
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

  const response = await fetch('/api/upload', {
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
