import { NextRequest, NextResponse } from 'next/server';
import { rejectUser } from '@/lib/services-drizzle/approvals';
import { sendApprovalNotificationEmail } from '@/lib/services-drizzle/email';
import { createUserAuditLog } from '@/lib/services-drizzle/audit';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || null;

    // Get user info before rejection for email
    const userToReject = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!userToReject) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await rejectUser(userId, reason);

    // Audit log: user rejected
    try {
      const admin = await requireAuth();
      await createUserAuditLog({
        adminId: admin.id,
        adminEmail: admin.email,
        organization: userToReject.organizationName || 'Unaffiliated',
        action: 'rejected',
        targetUserId: userId,
        targetUserEmail: userToReject.email,
        metadata: { reason: reason || null },
      });
    } catch {}

    // Send rejection notification email
    try {
      await sendApprovalNotificationEmail({
        userEmail: userToReject.email,
        userName: userToReject.name,
        approved: false,
        organizationName: userToReject.organizationName || 'Unknown Organization',
        rejectionReason: reason,
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'User rejected',
    });
  } catch (error) {
    console.error('Error rejecting user:', error);
    const message = error instanceof Error ? error.message : 'Failed to reject user';

    if (message.includes('Unauthorized') || message.includes('must be rejected by NAPA')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes('not found') || message.includes('not pending')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
