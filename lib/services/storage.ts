import { createClient } from '@/lib/supabase/client'
import { validateFile, sanitizeFilename } from '@/lib/utils/file-validation'

export async function uploadFile(file: File, customFileName?: string): Promise<{ url: string; name: string }> {
  // Client-side validation for immediate feedback
  const validationError = validateFile(file)
  if (validationError) {
    throw new Error(validationError.message)
  }

  // Sanitize filename
  const sanitizedName = customFileName ? sanitizeFilename(customFileName) : sanitizeFilename(file.name)

  // Upload via API route for server-side validation
  const formData = new FormData()
  formData.append('file', file)
  if (customFileName) {
    formData.append('customFilename', sanitizedName)
  }

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to upload file')
  }

  const data = await response.json()

  return {
    url: data.url,
    name: sanitizedName
  }
}

export async function deleteFile(fileUrl: string) {
  const supabase = createClient()
  
  // Extract file path from URL
  const urlParts = fileUrl.split('/resource-files/')
  if (urlParts.length < 2) return
  
  const filePath = urlParts[1]

  const { error } = await supabase.storage
    .from('resource-files')
    .remove([filePath])

  if (error) throw error
}