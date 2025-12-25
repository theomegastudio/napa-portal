// File security validation utilities

// Maximum file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed file extensions and their MIME types
export const ALLOWED_FILE_TYPES = {
  // PDF
  'pdf': ['application/pdf'],

  // Microsoft Word
  'doc': ['application/msword'],
  'docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],

  // Microsoft Excel
  'xls': ['application/vnd.ms-excel'],
  'xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],

  // Microsoft PowerPoint
  'ppt': ['application/vnd.ms-powerpoint'],
  'pptx': [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],

  // Images (common for logos, diagrams)
  'png': ['image/png'],
  'jpg': ['image/jpeg'],
  'jpeg': ['image/jpeg'],
  'gif': ['image/gif'],
}

// Dangerous executable extensions to block
export const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
  'app', 'deb', 'rpm', 'dmg', 'pkg', 'sh', 'bash', 'zsh',
  'ps1', 'psm1', 'msi', 'dll', 'so', 'dylib'
]

export interface FileValidationError {
  type: 'size' | 'extension' | 'mime' | 'executable' | 'name'
  message: string
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Remove path separators
    .replace(/[\/\\]/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove potentially dangerous characters
    .replace(/[<>:"|?*]/g, '')
    // Limit length
    .substring(0, 255)
    .trim()
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

/**
 * Validate file size
 */
export function validateFileSize(file: File): FileValidationError | null {
  if (file.size > MAX_FILE_SIZE) {
    return {
      type: 'size',
      message: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
    }
  }
  return null
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): FileValidationError | null {
  const ext = getFileExtension(filename)

  if (!ext) {
    return {
      type: 'extension',
      message: 'File must have a valid extension.'
    }
  }

  // Check if blocked
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return {
      type: 'executable',
      message: `Executable files (.${ext}) are not allowed for security reasons.`
    }
  }

  // Check if allowed
  if (!ALLOWED_FILE_TYPES[ext as keyof typeof ALLOWED_FILE_TYPES]) {
    return {
      type: 'extension',
      message: `File type .${ext} is not supported. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, GIF.`
    }
  }

  return null
}

/**
 * Validate MIME type matches extension
 */
export function validateMimeType(file: File): FileValidationError | null {
  const ext = getFileExtension(file.name)
  const allowedMimes = ALLOWED_FILE_TYPES[ext as keyof typeof ALLOWED_FILE_TYPES]

  if (!allowedMimes) {
    return {
      type: 'mime',
      message: 'Invalid file type.'
    }
  }

  // Check if file MIME type matches expected MIME types for extension
  if (!allowedMimes.includes(file.type)) {
    return {
      type: 'mime',
      message: `File appears to be misnamed or corrupted. Expected ${allowedMimes[0]}, got ${file.type}.`
    }
  }

  return null
}

/**
 * Comprehensive file validation
 */
export function validateFile(file: File): FileValidationError | null {
  // Validate filename
  const sanitized = sanitizeFilename(file.name)
  if (!sanitized) {
    return {
      type: 'name',
      message: 'Invalid filename.'
    }
  }

  // Validate size
  const sizeError = validateFileSize(file)
  if (sizeError) return sizeError

  // Validate extension
  const extError = validateFileExtension(file.name)
  if (extError) return extError

  // Validate MIME type
  const mimeError = validateMimeType(file)
  if (mimeError) return mimeError

  return null
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
