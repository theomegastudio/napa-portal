// Server-side file validation using magic bytes

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'application/zip',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] as const

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

type MagicEntry = { bytes: number[]; offset?: number; mime: string }

const MAGIC_BYTES: MagicEntry[] = [
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
  { bytes: [0x50, 0x4B, 0x03, 0x04], mime: 'application/zip' }, // ZIP (also OOXML)
  { bytes: [0xD0, 0xCF, 0x11, 0xE0], mime: 'application/msword' }, // OLE2 (old Office)
  { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },
  { bytes: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' },
  { bytes: [0x47, 0x49, 0x46], mime: 'image/gif' },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' }, // also checked for WEBP marker
]

function detectMimeFromBytes(buffer: Uint8Array): string | null {
  for (const entry of MAGIC_BYTES) {
    const offset = entry.offset ?? 0
    const match = entry.bytes.every((b, i) => buffer[offset + i] === b)
    if (match) {
      // For ZIP, narrow to OOXML by checking for known content types
      if (entry.mime === 'application/zip') return 'application/zip'
      return entry.mime
    }
  }
  return null
}

export function validateFileSize(bytes: number): { valid: boolean; error?: string } {
  if (bytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File size exceeds 50MB limit (${(bytes / 1024 / 1024).toFixed(1)}MB)` }
  }
  return { valid: true }
}

export function validateMimeType(mimeType: string): { valid: boolean; error?: string } {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { valid: false, error: `File type "${mimeType}" is not allowed` }
  }
  return { valid: true }
}

export async function validateFileBuffer(
  buffer: ArrayBuffer,
  declaredMime: string,
  filename: string
): Promise<{ valid: boolean; detectedMime?: string; error?: string }> {
  const bytes = new Uint8Array(buffer.slice(0, 16))
  const detectedMime = detectMimeFromBytes(bytes)

  // For text files (CSV, TXT), magic bytes aren't reliable — trust declared type
  const textTypes = ['text/csv', 'text/plain']
  if (textTypes.includes(declaredMime)) {
    const mimeCheck = validateMimeType(declaredMime)
    return { valid: mimeCheck.valid, detectedMime: declaredMime, error: mimeCheck.error }
  }

  // For OOXML formats, declared MIME should be more specific than detected 'application/zip'
  const ooxmlTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]
  if (detectedMime === 'application/zip' && ooxmlTypes.includes(declaredMime)) {
    return { valid: true, detectedMime: declaredMime }
  }

  if (!detectedMime) {
    // Can't validate by magic bytes — fall back to declared MIME check
    const mimeCheck = validateMimeType(declaredMime)
    return { valid: mimeCheck.valid, detectedMime: declaredMime, error: mimeCheck.error }
  }

  const mimeCheck = validateMimeType(detectedMime)
  return { valid: mimeCheck.valid, detectedMime, error: mimeCheck.error }
}
