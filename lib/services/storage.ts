import { createClient } from '@/lib/supabase/client'

export async function uploadFile(file: File): Promise<{ url: string; name: string }> {
  const supabase = createClient()
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('resource-files')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  // Get public URL
  const { data } = supabase.storage
    .from('resource-files')
    .getPublicUrl(filePath)

  return {
    url: data.publicUrl,
    name: file.name
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