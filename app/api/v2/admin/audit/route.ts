import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, getAuditLogStats, exportAuditLogsToCSV } from '@/lib/services-drizzle/audit';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const organization = searchParams.get('organization');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const stats = searchParams.get('stats') === 'true';
    const exportCsv = searchParams.get('export') === 'csv';

    if (stats) {
      const result = await getAuditLogStats({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        organization: organization || undefined,
      });
      return NextResponse.json(result);
    }

    if (exportCsv) {
      const csvContent = await exportAuditLogsToCSV({
        action: action || undefined,
        organization: organization || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=audit-logs-${new Date().toISOString()}.csv`,
        },
      });
    }

    const result = await getAuditLogs({
      action: action || undefined,
      organization: organization || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET audit logs error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
