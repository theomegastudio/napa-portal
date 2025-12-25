import { createClient } from '@/lib/supabase/client'
import { validateFile, sanitizeFilename, getFileExtension } from '@/lib/utils/file-validation'

export async function uploadFile(file: File): Promise<{ url: string; name: string }> {
  const supabase = createClient()

  // Validate file (security check)
  const validationError = validateFile(file)
  if (validationError) {
    throw new Error(validationError.message)
  }

  // Sanitize original filename
  const sanitizedName = sanitizeFilename(file.name)

  // Generate unique filename with sanitized extension
  const fileExt = getFileExtension(file.name)
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('resource-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) throw uploadError

  // Get public URL
  const { data } = supabase.storage
    .from('resource-files')
    .getPublicUrl(filePath)

  return {
    url: data.publicUrl,
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