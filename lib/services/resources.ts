import { createClient } from '@/lib/supabase/client'
import type { Resource } from '@/lib/types'
import { createAuditLog } from './audit'
import { createVersion } from './versions'

export async function getResources(params?: {
  searchText?: string
  resourceType?: string
}): Promise<Resource[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('resources')
    .select(`
      *,
      files:resource_files(*)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (params?.searchText) {
    query = query.or(`title.ilike.%${params.searchText}%,description.ilike.%${params.searchText}%`)
  }

  if (params?.resourceType) {
    query = query.eq('resource_type', params.resourceType)
  }

  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

export async function createResource(params: {
  title: string
  description?: string
  resourceType: string
  externalLink?: string
  files?: { url: string; name?: string }[]
  organization: string
  uploadedBy: string
  userId: string
}) {
  const supabase = createClient()

  // Create resource
  const { data: resource, error: resourceError } = await supabase
    .from('resources')
    .insert({
      title: params.title,
      description: params.description,
      resource_type: params.resourceType,
      external_link: params.externalLink,
      organization: params.organization,
      uploaded_by: params.uploadedBy
    })
    .select()
    .single()

  if (resourceError) throw resourceError

  // Create resource files if any
  if (params.files && params.files.length > 0) {
    const fileRecords = params.files.map(file => ({
      resource_id: resource.id,
      file_url: file.url,
      file_name: file.name
    }))

    const { error: filesError } = await supabase
      .from('resource_files')
      .insert(fileRecords)

    if (filesError) throw filesError
  }

  // Create audit log
  await createAuditLog({
    userId: params.userId,
    userEmail: params.uploadedBy,
    organization: params.organization,
    action: 'created',
    resourceId: resource.id,
    resourceTitle: params.title,
    resourceType: params.resourceType,
    metadata: {
      hasFiles: (params.files?.length || 0) > 0,
      fileCount: params.files?.length || 0,
      hasExternalLink: !!params.externalLink
    }
  })

  return resource
}

export async function updateResource(params: {
  resourceId: string
  title: string
  description?: string
  resourceType: string
  externalLink?: string
  files?: { url: string; name?: string }[]
  userId: string
  userEmail: string
  organization: string
  changeNotes?: string
}) {
  const supabase = createClient()

  // Update resource
  const { error: resourceError } = await supabase
    .from('resources')
    .update({
      title: params.title,
      description: params.description,
      resource_type: params.resourceType,
      external_link: params.externalLink
    })
    .eq('id', params.resourceId)

  if (resourceError) throw resourceError

  // Add new files if any
  if (params.files && params.files.length > 0) {
    const fileRecords = params.files.map(file => ({
      resource_id: params.resourceId,
      file_url: file.url,
      file_name: file.name
    }))

    const { error: filesError } = await supabase
      .from('resource_files')
      .insert(fileRecords)

    if (filesError) throw filesError
  }

  // Create version record
  await createVersion({
    resourceId: params.resourceId,
    title: params.title,
    description: params.description,
    resourceType: params.resourceType,
    externalLink: params.externalLink,
    updatedBy: params.userEmail,
    updatedByUserId: params.userId,
    changeNotes: params.changeNotes,
    metadata: {
      filesAdded: params.files?.length || 0
    }
  })

  // Create audit log
  await createAuditLog({
    userId: params.userId,
    userEmail: params.userEmail,
    organization: params.organization,
    action: 'updated',
    resourceId: params.resourceId,
    resourceTitle: params.title,
    resourceType: params.resourceType,
    metadata: {
      newFilesAdded: params.files?.length || 0,
      hasChangeNotes: !!params.changeNotes
    }
  })
}

export async function deleteResourceFile(fileId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('resource_files')
    .delete()
    .eq('id', fileId)

  if (error) throw error
}

export async function deleteResource(
  resourceId: string,
  params: {
    userId: string
    userEmail: string
    organization: string
    resourceTitle: string
    resourceType: string
  }
) {
  const supabase = createClient()

  // Soft delete (no .select() to avoid resource_files policy issues)
  const { error } = await supabase
    .from('resources')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', resourceId)

  if (error) {
    console.error('Delete error:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to delete resource: ${error.message || error.hint || JSON.stringify(error)}`)
  }

  // Create audit log
  await createAuditLog({
    userId: params.userId,
    userEmail: params.userEmail,
    organization: params.organization,
    action: 'deleted',
    resourceId: resourceId,
    resourceTitle: params.resourceTitle,
    resourceType: params.resourceType
  })
}