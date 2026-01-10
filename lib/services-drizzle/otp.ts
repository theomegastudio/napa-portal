import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_VALIDITY_DAYS = 60;
const MAX_OTP_REQUESTS_PER_HOUR = 5;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTPCode(): string {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Check if OTP verification is required for a user
 * Returns true if never verified or last verification was more than 60 days ago
 */
export async function isOTPVerificationRequired(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ lastOtpVerifiedAt: users.lastOtpVerifiedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return true;
  }

  if (!user.lastOtpVerifiedAt) {
    return true;
  }

  const daysSinceVerification = Math.floor(
    (Date.now() - user.lastOtpVerifiedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceVerification >= OTP_VALIDITY_DAYS;
}

/**
 * Check if user can request a new OTP (rate limiting)
 * Returns { allowed: boolean, retryAfterSeconds?: number }
 */
export async function canRequestOTP(userId: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const [user] = await db
    .select({
      otpLastRequestedAt: users.otpLastRequestedAt,
      otpAttempts: users.otpAttempts
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { allowed: false };
  }

  // Check if account is locked due to too many failed attempts
  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: 3600 }; // 1 hour lockout
  }

  // Check rate limiting - minimum 60 seconds between requests
  if (user.otpLastRequestedAt) {
    const secondsSinceLastRequest = Math.floor(
      (Date.now() - user.otpLastRequestedAt.getTime()) / 1000
    );

    if (secondsSinceLastRequest < 60) {
      return { allowed: false, retryAfterSeconds: 60 - secondsSinceLastRequest };
    }
  }

  return { allowed: true };
}

/**
 * Create and store a new OTP for a user
 * Returns the plain OTP code to send via email
 */
export async function createOTP(userId: string): Promise<{ success: boolean; code?: string; error?: string }> {
  // Check rate limiting first
  const rateCheck = await canRequestOTP(userId);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.retryAfterSeconds
        ? `Please wait ${rateCheck.retryAfterSeconds} seconds before requesting a new code`
        : 'Too many attempts. Please try again later.'
    };
  }

  // Generate OTP
  const code = generateOTPCode();

  // Hash the OTP before storing
  const hashedCode = await bcrypt.hash(code, 10);

  // Calculate expiry time
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Update user with new OTP
  await db
    .update(users)
    .set({
      otpCode: hashedCode,
      otpExpiresAt: expiresAt,
      otpLastRequestedAt: new Date(),
      // Don't reset attempts here - only reset on successful verification
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { success: true, code };
}

/**
 * Verify an OTP code for a user
 */
export async function verifyOTP(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
  const [user] = await db
    .select({
      otpCode: users.otpCode,
      otpExpiresAt: users.otpExpiresAt,
      otpAttempts: users.otpAttempts,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Check if account is locked
  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    return { success: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  // Check if OTP exists
  if (!user.otpCode || !user.otpExpiresAt) {
    return { success: false, error: 'No verification code found. Please request a new code.' };
  }

  // Check if OTP has expired
  if (new Date() > user.otpExpiresAt) {
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  // Verify the code
  const isValid = await bcrypt.compare(code, user.otpCode);

  if (!isValid) {
    // Increment failed attempts
    await db
      .update(users)
      .set({
        otpAttempts: user.otpAttempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    const remainingAttempts = MAX_OTP_ATTEMPTS - (user.otpAttempts + 1);
    if (remainingAttempts > 0) {
      return { success: false, error: `Invalid code. ${remainingAttempts} attempts remaining.` };
    } else {
      return { success: false, error: 'Too many failed attempts. Please request a new code.' };
    }
  }

  // OTP is valid - update user
  await db
    .update(users)
    .set({
      lastOtpVerifiedAt: new Date(),
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      otpLastRequestedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { success: true };
}

/**
 * Reset OTP attempts for a user (used when requesting a new code after lockout)
 */
export async function resetOTPAttempts(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      otpAttempts: 0,
      otpCode: null,
      otpExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Get user's email for OTP delivery
 */
export async function getUserEmailForOTP(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.email || null;
}
