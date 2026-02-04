import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth, hashPassword, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Get user's credential account from database to check current password
    // BetterAuth stores passwords in the accounts table
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.userId, session.user.id),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if user has a password (might be OAuth only user)
    if (!account.password) {
      return NextResponse.json(
        { error: 'No password set for this account.' },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, account.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password in accounts table
    await db
      .update(accounts)
      .set({
        password: hashedNewPassword,
        updatedAt: new Date(),
      })
      .where(eq(accounts.userId, session.user.id));

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
