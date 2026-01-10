import { NextRequest, NextResponse } from 'next/server';
import { removeDomainFromWhitelist } from '@/lib/services-drizzle/domain-whitelist';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await removeDomainFromWhitelist(id);

    return NextResponse.json({
      success: true,
      message: 'Domain removed from whitelist',
    });
  } catch (error) {
    console.error('Error removing domain from whitelist:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove domain';

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
