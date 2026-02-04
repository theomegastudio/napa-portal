import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateLastOtpVerified } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify that the user's emailVerified is true in the database
    // BetterAuth sets this when OTP is successfully verified via emailOtp.verifyEmail()
    const userData = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { emailVerified: true },
    });

    if (!userData?.emailVerified) {
      return NextResponse.json(
        { error: 'Email not verified. Please verify your email first.' },
        { status: 403 }
      );
    }

    // Update lastOtpVerifiedAt for 60-day validity tracking
    await updateLastOtpVerified(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Error updating OTP verification:', error);
    return NextResponse.json(
      { error: 'Failed to update verification status' },
      { status: 500 }
    );
  }
}
