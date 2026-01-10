import { NextRequest, NextResponse } from 'next/server';
import { markNotificationAsRead } from '@/lib/services-drizzle/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await markNotificationAsRead(id);

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    const message = error instanceof Error ? error.message : 'Failed to mark as read';

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
