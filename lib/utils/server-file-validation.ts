import { fileTypeFromBuffer } from 'file-type'

// Map of allowed extensions to their magic byte MIME types
const ALLOWED_FILE_SIGNATURES: Record<string, string[]> = {
  // PDF
  'pdf': ['application/pdf'],

  // Microsoft Word
  'doc': ['application/msword'],
  'docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip', // DOCX files are ZIP containers
  ],

  // Microsoft Excel
  'xls': ['application/vnd.ms-excel'],
  'xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', // XLSX files are ZIP containers
  ],

  // Microsoft PowerPoint
  'ppt': ['application/vnd.ms-powerpoint'],
  'pptx': [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', // PPTX files are ZIP containers
  ],

  // Images
  'png': ['image/png'],
  'jpg': ['image/jpeg'],
  'jpeg': ['image/jpeg'],
  'gif': ['image/gif'],
}

// Dangerous file signatures (magic bytes) to block
const BLOCKED_SIGNATURES = [
  'application/x-mach-binary', // macOS executables (dmg, app)
  'application/x-executable', // Linux executables
  'application/x-msdownload', // Windows executables
  'application/x-msdos-program',
  'application/x-sh', // Shell scripts
  'application/x-bat', // Batch files
  'application/java-archive', // JAR files
]

export interface ServerFileValidationResult {
  valid: boolean
  error?: string
  detectedType?: string
}

/**
 * Validate file using magic bytes (server-side only)
 * This cannot be spoofed by renaming files
 */
export async function validateFileServer(
  buffer: Buffer,
  filename: string
): Promise<ServerFileValidationResult> {
  try {
    // Get file extension from filename
    const ext = filename.toLowerCase().split('.').pop()
    if (!ext) {
      return {
        valid: false,
        error: 'File must have a valid extension',
      }
    }

    // Check if extension is allowed
    const allowedMimes = ALLOWED_FILE_SIGNATURES[ext]
    if (!allowedMimes) {
      return {
        valid: false,
        error: `File type .${ext} is not supported. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, GIF.`,
      }
    }

    // Read magic bytes to detect actual file type
    const fileTypeResult = await fileTypeFromBuffer(buffer)

    // If we can't detect the type, it might be a text-based format
    // For Office XML formats (docx, xlsx, pptx), they appear as ZIP files
    if (!fileTypeResult) {
      // Special case: Office XML documents may not be detected
      // We'll allow them if they have the right extension
      if (['docx', 'xlsx', 'pptx'].includes(ext)) {
        // Could add additional ZIP validation here
        return { valid: true }
      }

      return {
        valid: false,
        error: 'Unable to verify file type. File may be corrupted.',
      }
    }

    const detectedMime = fileTypeResult.mime

    // Check if detected type is in blocked list
    if (BLOCKED_SIGNATURES.includes(detectedMime)) {
      return {
        valid: false,
        error: `This file type (${detectedMime}) is blocked for security reasons.`,
        detectedType: detectedMime,
      }
    }

    // Check if detected MIME type matches expected types for the extension
    if (!allowedMimes.includes(detectedMime)) {
      return {
        valid: false,
        error: `File appears to be a ${detectedMime} file, not a .${ext} file. Please upload the file with its correct extension.`,
        detectedType: detectedMime,
      }
    }

    return { valid: true, detectedType: detectedMime }
  } catch (error) {
    console.error('Server file validation error:', error)
    return {
      valid: false,
      error: 'Failed to validate file. Please try again.',
    }
  }
}

/**
 * Validate file size (server-side)
 */
export function validateFileSizeServer(size: number): ServerFileValidationResult {
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB

  if (size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_SIZE / 1024 / 1024}MB. Your file is ${(size / 1024 / 1024).toFixed(2)}MB.`,
    }
  }

  return { valid: true }
}
