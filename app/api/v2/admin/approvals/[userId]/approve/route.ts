import { NextRequest, NextResponse } from 'next/server';
import { approveUser } from '@/lib/services-drizzle/approvals';
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
    const makeOrgAdmin = body.makeOrgAdmin === true;

    // Get user info before approval for email
    const userToApprove = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!userToApprove) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await approveUser(userId, makeOrgAdmin);

    // Audit log: user approved
    try {
      const admin = await requireAuth();
      await createUserAuditLog({
        adminId: admin.id,
        adminEmail: admin.email,
        organization: userToApprove.organizationName || 'Unaffiliated',
        action: 'approved',
        targetUserId: userId,
        targetUserEmail: userToApprove.email,
        metadata: { makeOrgAdmin },
      });
    } catch {}

    // Send approval notification email
    try {
      await sendApprovalNotificationEmail({
        userEmail: userToApprove.email,
        userName: userToApprove.name,
        approved: true,
        organizationName: userToApprove.organizationName || 'Unknown Organization',
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'User approved successfully',
    });
  } catch (error) {
    console.error('Error approving user:', error);
    const message = error instanceof Error ? error.message : 'Failed to approve user';

    if (message.includes('Unauthorized') || message.includes('must be approved by NAPA')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes('not found') || message.includes('not pending')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
