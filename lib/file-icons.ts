// Maps MIME types and file extensions to Phosphor icon names for display
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

export function getFileIconName(mimeType?: string | null, filename?: string | null): FileIconName {
  if (mimeType && MIME_MAP[mimeType]) return MIME_MAP[mimeType]
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext && EXT_MAP[ext]) return EXT_MAP[ext]
  }
  return 'File'
}

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
