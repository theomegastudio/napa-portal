import { createClient } from '@/lib/supabase/client'

export type AuditAction = 'created' | 'updated' | 'deleted' | 'downloaded' | 'viewed'

export interface AuditLog {
  id: string
  created_at: string
  user_id: string
  user_email: string
  organization: string
  action: AuditAction
  resource_id: string | null
  resource_title: string | null
  resource_type: string | null
  metadata: Record<string, any>
}

export interface CreateAuditLogParams {
  userId: string
  userEmail: string
  organization: string
  action: AuditAction
  resourceId?: string
  resourceTitle?: string
  resourceType?: string
  metadata?: Record<string, any>
}

export async function createAuditLog(params: CreateAuditLogParams) {
  const supabase = createClient()

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: params.userId,
      user_email: params.userEmail,
      organization: params.organization,
      action: params.action,
      resource_id: params.resourceId || null,
      resource_title: params.resourceTitle || null,
      resource_type: params.resourceType || null,
      metadata: params.metadata || {}
    })

  if (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging shouldn't break the main operation
  }
}

export async function getAuditLogs(params?: {
  startDate?: string
  endDate?: string
  action?: string
  organization?: string
  userId?: string
  limit?: number
  offset?: number
}): Promise<{ logs: AuditLog[], total: number }> {
  const supabase = createClient()

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (params?.startDate) {
    query = query.gte('created_at', params.startDate)
  }

  if (params?.endDate) {
    query = query.lte('created_at', params.endDate)
  }

  if (params?.action) {
    query = query.eq('action', params.action)
  }

  if (params?.organization) {
    query = query.eq('organization', params.organization)
  }

  if (params?.userId) {
    query = query.eq('user_id', params.userId)
  }

  if (params?.limit) {
    query = query.limit(params.limit)
  }

  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1)
  }

  const { data, error, count } = await query

  if (error) throw error

  return {
    logs: data || [],
    total: count || 0
  }
}

export async function getAuditLogStats(params?: {
  startDate?: string
  endDate?: string
  organization?: string
}) {
  const supabase = createClient()

  let query = supabase
    .from('audit_logs')
    .select('action, organization')

  if (params?.startDate) {
    query = query.gte('created_at', params.startDate)
  }

  if (params?.endDate) {
    query = query.lte('created_at', params.endDate)
  }

  if (params?.organization) {
    query = query.eq('organization', params.organization)
  }

  const { data, error } = await query

  if (error) throw error

  // Calculate stats
  const stats = {
    totalActions: data?.length || 0,
    actionCounts: {} as Record<string, number>,
    orgCounts: {} as Record<string, number>
  }

  data?.forEach(log => {
    stats.actionCounts[log.action] = (stats.actionCounts[log.action] || 0) + 1
    stats.orgCounts[log.organization] = (stats.orgCounts[log.organization] || 0) + 1
  })

  return stats
}

export async function exportAuditLogsToCSV(params?: {
  startDate?: string
  endDate?: string
  action?: string
  organization?: string
}): Promise<string> {
  const { logs } = await getAuditLogs({ ...params, limit: 10000 })

  const headers = ['Timestamp', 'User Email', 'Organization', 'Action', 'Resource Title', 'Resource Type', 'Metadata']
  const rows = logs.map(log => [
    new Date(log.created_at).toLocaleString(),
    log.user_email,
    log.organization,
    log.action,
    log.resource_title || 'N/A',
    log.resource_type || 'N/A',
    JSON.stringify(log.metadata)
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}
