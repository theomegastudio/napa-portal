import { NextResponse } from 'next/server';
import { getPendingApprovals } from '@/lib/services-drizzle/approvals';

export async function GET() {
  try {
    const pendingUsers = await getPendingApprovals();
    return NextResponse.json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch pending approvals';

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
