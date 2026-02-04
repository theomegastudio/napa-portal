import { db } from '@/lib/db';
import { auditLogs, type AuditLog, type NewAuditLog } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { requireApprovedAuth } from '@/lib/auth-helpers';

export type { AuditLog };
export type AuditAction = 'created' | 'updated' | 'deleted' | 'downloaded' | 'viewed';

/**
 * Create an audit log entry
 * This should be called within transactions when performing actions
 */
export async function createAuditLog(params: {
  userId: string;
  userEmail: string;
  organization: string;
  action: AuditAction;
  resourceId?: string;
  resourceTitle?: string;
  resourceType?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      userEmail: params.userEmail,
      organization: params.organization,
      action: params.action,
      resourceId: params.resourceId,
      resourceTitle: params.resourceTitle,
      resourceType: params.resourceType,
      metadata: params.metadata || {},
    });
  } catch (error) {
    // Don't throw - audit logging shouldn't break the main operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(params?: {
  startDate?: string;
  endDate?: string;
  action?: string;
  organization?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const user = await requireApprovedAuth();

  // Build conditions
  const conditions = [];

  // Organization filter - non-NAPA admins can only see their org's logs
  if (!user.isNapaAdmin) {
    conditions.push(eq(auditLogs.organization, user.organizationName!));
  } else if (params?.organization) {
    conditions.push(eq(auditLogs.organization, params.organization));
  }

  if (params?.startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(params.startDate)));
  }

  if (params?.endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(params.endDate)));
  }

  if (params?.action) {
    conditions.push(eq(auditLogs.action, params.action as any));
  }

  if (params?.userId) {
    conditions.push(eq(auditLogs.userId, params.userId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(whereClause);

  // Get logs
  const logs = await db.query.auditLogs.findMany({
    where: whereClause,
    orderBy: desc(auditLogs.createdAt),
    limit: params?.limit || 50,
    offset: params?.offset || 0,
  });

  return {
    logs,
    total: countResult?.count || 0,
  };
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(params?: {
  startDate?: string;
  endDate?: string;
  organization?: string;
}) {
  const user = await requireApprovedAuth();

  // Build conditions
  const conditions = [];

  if (!user.isNapaAdmin) {
    conditions.push(eq(auditLogs.organization, user.organizationName!));
  } else if (params?.organization) {
    conditions.push(eq(auditLogs.organization, params.organization));
  }

  if (params?.startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(params.startDate)));
  }

  if (params?.endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(params.endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db.query.auditLogs.findMany({
    where: whereClause,
    columns: {
      action: true,
      organization: true,
    },
  });

  // Calculate stats
  const stats = {
    totalActions: logs.length,
    actionCounts: {} as Record<string, number>,
    orgCounts: {} as Record<string, number>,
  };

  logs.forEach((log) => {
    stats.actionCounts[log.action] = (stats.actionCounts[log.action] || 0) + 1;
    stats.orgCounts[log.organization] =
      (stats.orgCounts[log.organization] || 0) + 1;
  });

  return stats;
}

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsToCSV(params?: {
  startDate?: string;
  endDate?: string;
  action?: string;
  organization?: string;
}): Promise<string> {
  const { logs } = await getAuditLogs({ ...params, limit: 10000 });

  const headers = [
    'Timestamp',
    'User Email',
    'Organization',
    'Action',
    'Resource Title',
    'Resource Type',
    'Metadata',
  ];

  const rows = logs.map((log) => [
    new Date(log.createdAt).toLocaleString(),
    log.userEmail,
    log.organization,
    log.action,
    log.resourceTitle || 'N/A',
    log.resourceType || 'N/A',
    JSON.stringify(log.metadata),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}
