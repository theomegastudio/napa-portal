import { createClient } from '@/lib/supabase/client'

export interface ResourceVersion {
  id: string
  resource_id: string
  version_number: number
  title: string
  description: string | null
  resource_type: string
  external_link: string | null
  updated_by: string
  updated_by_user_id: string
  created_at: string
  change_notes: string | null
  metadata: Record<string, any>
}

export interface CreateVersionParams {
  resourceId: string
  title: string
  description?: string
  resourceType: string
  externalLink?: string
  updatedBy: string
  updatedByUserId: string
  changeNotes?: string
  metadata?: Record<string, any>
}

export async function createVersion(params: CreateVersionParams): Promise<ResourceVersion> {
  const supabase = createClient()

  // Get next version number
  const { data: versionNumber, error: versionError } = await supabase
    .rpc('get_next_version_number', { p_resource_id: params.resourceId })

  if (versionError) throw versionError

  // Create version record
  const { data, error } = await supabase
    .from('resource_versions')
    .insert({
      resource_id: params.resourceId,
      version_number: versionNumber,
      title: params.title,
      description: params.description || null,
      resource_type: params.resourceType,
      external_link: params.externalLink || null,
      updated_by: params.updatedBy,
      updated_by_user_id: params.updatedByUserId,
      change_notes: params.changeNotes || null,
      metadata: params.metadata || {}
    })
    .select()
    .single()

  if (error) throw error

  return data
}

export async function getResourceVersions(resourceId: string): Promise<ResourceVersion[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_versions')
    .select('*')
    .eq('resource_id', resourceId)
    .order('version_number', { ascending: false })

  if (error) throw error

  return data || []
}

export async function getLatestVersion(resourceId: string): Promise<ResourceVersion | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('resource_versions')
    .select('*')
    .eq('resource_id', resourceId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"

  return data
}
