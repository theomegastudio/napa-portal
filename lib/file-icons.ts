/** Phosphor icon component name for a given file type. Use with FILE_ICON_MAP in components. */
export type FileIconName =
  | 'FilePdf'
  | 'FileDoc'
  | 'FileXls'
  | 'FilePpt'
  | 'FileZip'
  | 'FileImage'
  | 'FileVideo'
  | 'FileAudio'
  | 'FileCsv'
  | 'FileText'
  | 'File'

const MIME_MAP: Record<string, FileIconName> = {
  'application/pdf': 'FilePdf',
  'application/msword': 'FileDoc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'FileDoc',
  'application/vnd.ms-excel': 'FileXls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'FileXls',
  'application/vnd.ms-powerpoint': 'FilePpt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'FilePpt',
  'application/zip': 'FileZip',
  'application/x-zip-compressed': 'FileZip',
  'text/csv': 'FileCsv',
  'text/plain': 'FileText',
  'image/png': 'FileImage',
  'image/jpeg': 'FileImage',
  'image/gif': 'FileImage',
  'image/webp': 'FileImage',
  'image/svg+xml': 'FileImage',
  'video/mp4': 'FileVideo',
  'video/quicktime': 'FileVideo',
  'audio/mpeg': 'FileAudio',
  'audio/wav': 'FileAudio',
}

const EXT_MAP: Record<string, FileIconName> = {
  pdf: 'FilePdf',
  doc: 'FileDoc',
  docx: 'FileDoc',
  xls: 'FileXls',
  xlsx: 'FileXls',
  csv: 'FileCsv',
  ppt: 'FilePpt',
  pptx: 'FilePpt',
  zip: 'FileZip',
  txt: 'FileText',
  md: 'FileText',
  png: 'FileImage',
  jpg: 'FileImage',
  jpeg: 'FileImage',
  gif: 'FileImage',
  webp: 'FileImage',
  svg: 'FileImage',
  mp4: 'FileVideo',
  mov: 'FileVideo',
  mp3: 'FileAudio',
  wav: 'FileAudio',
}

/**
 * Resolves the Phosphor icon name for a file.
 * MIME type takes precedence over filename extension. Returns `'File'` when neither resolves.
 *
 * @example
 * const iconName = getFileIconName('application/pdf', 'report.pdf') // 'FilePdf'
 * const Icon = FILE_ICON_MAP[iconName]
 * return <Icon weight="duotone" className={`h-5 w-5 ${getFileIconColor(iconName)}`} />
 */
export function getFileIconName(mimeType?: string | null, filename?: string | null): FileIconName {
  if (mimeType && MIME_MAP[mimeType]) return MIME_MAP[mimeType]
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext && EXT_MAP[ext]) return EXT_MAP[ext]
  }
  return 'File'
}

/**
 * Returns a Tailwind text-color class for the given file icon name.
 * Intended for use with Phosphor icons rendered via FILE_ICON_MAP.
 */
export function getFileIconColor(iconName: FileIconName): string {
  switch (iconName) {
    case 'FilePdf': return 'text-red-500'
    case 'FileDoc': return 'text-blue-600'
    case 'FileXls': return 'text-green-600'
    case 'FileCsv': return 'text-green-500'
    case 'FilePpt': return 'text-orange-500'
    case 'FileZip': return 'text-yellow-600'
    case 'FileImage': return 'text-purple-500'
    case 'FileVideo': return 'text-pink-500'
    case 'FileAudio': return 'text-indigo-500'
    case 'FileText': return 'text-gray-500'
    default: return 'text-muted-foreground'
  }
}
