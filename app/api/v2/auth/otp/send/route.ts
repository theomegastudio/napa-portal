import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createOTP, getUserEmailForOTP } from '@/lib/services-drizzle/otp';
import { sendOTPEmail } from '@/lib/services-drizzle/email';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's email and name
    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create OTP
    const result = await createOTP(userId);

    if (!result.success || !result.code) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate verification code' },
        { status: 429 }
      );
    }

    // Send OTP email
    await sendOTPEmail({
      email: user.email,
      name: user.name,
      otpCode: result.code,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
