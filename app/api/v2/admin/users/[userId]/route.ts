import { NextRequest, NextResponse } from 'next/server';
import { updateUser, deleteUser, banUser, unbanUser } from '@/lib/services-drizzle/users';
import { createUserAuditLog } from '@/lib/services-drizzle/audit';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { email, organizationName, isAdmin, role, canViewOrgHealth, action, banReason } = body;

    // Fetch target user for audit logging
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // Handle ban/unban actions
    if (action === 'ban') {
      await banUser(userId, banReason);

      // Audit log: user banned
      try {
        const admin = await requireAuth();
        await createUserAuditLog({
          adminId: admin.id,
          adminEmail: admin.email,
          organization: targetUser?.organizationName || 'Unaffiliated',
          action: 'banned',
          targetUserId: userId,
          targetUserEmail: targetUser?.email || 'unknown',
          metadata: { banReason: banReason || null },
        });
      } catch {}

      return NextResponse.json({ success: true });
    }

    if (action === 'unban') {
      await unbanUser(userId);

      // Audit log: user unbanned
      try {
        const admin = await requireAuth();
        await createUserAuditLog({
          adminId: admin.id,
          adminEmail: admin.email,
          organization: targetUser?.organizationName || 'Unaffiliated',
          action: 'unbanned',
          targetUserId: userId,
          targetUserEmail: targetUser?.email || 'unknown',
          metadata: {},
        });
      } catch {}

      return NextResponse.json({ success: true });
    }

    // Regular user update
    await updateUser(userId, {
      email,
      organizationName,
      isAdmin,
      role,
      canViewOrgHealth,
    });

    // Audit log: user updated
    try {
      const admin = await requireAuth();
      await createUserAuditLog({
        adminId: admin.id,
        adminEmail: admin.email,
        organization: targetUser?.organizationName || organizationName || 'Unaffiliated',
        action: 'updated',
        targetUserId: userId,
        targetUserEmail: targetUser?.email || email || 'unknown',
        metadata: { changes: { email, organizationName, isAdmin, role, canViewOrgHealth } },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH user error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && (error.message.includes('Cannot ban yourself') || error.message.includes('Cannot delete yourself'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Fetch target user BEFORE deletion for audit log
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    await deleteUser(userId);

    // Audit log: user deleted
    try {
      const admin = await requireAuth();
      await createUserAuditLog({
        adminId: admin.id,
        adminEmail: admin.email,
        organization: targetUser?.organizationName || 'Unaffiliated',
        action: 'deleted',
        targetUserId: userId,
        targetUserEmail: targetUser?.email || 'unknown',
        metadata: {},
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE user error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Cannot delete yourself')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
