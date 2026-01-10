import { NextRequest, NextResponse } from 'next/server';
import { getNotificationsForUser, getUnreadNotificationCount, markAllNotificationsAsRead } from '@/lib/services-drizzle/notifications';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const countOnly = searchParams.get('countOnly') === 'true';

    if (countOnly) {
      const count = await getUnreadNotificationCount();
      return NextResponse.json({ count });
    }

    const notifications = await getNotificationsForUser(unreadOnly);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action === 'markAllRead') {
      await markAllNotificationsAsRead();
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing notification action:', error);
    const message = error instanceof Error ? error.message : 'Failed to process action';

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
