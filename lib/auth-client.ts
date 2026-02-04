import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
  plugins: [emailOTPClient()],
});

// Export commonly used methods
export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
  emailOtp,
} = authClient;

// Type for the session user with custom fields
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: string;
  organizationName?: string | null;
  isAdmin?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  lastOtpVerifiedAt?: Date | null;
  emailVerified?: boolean;
  banned?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper to check if user is NAPA admin (based on role field, not org membership)
export function isNapaAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === 'napaAdmin';
}

// Helper to check if user is any admin
export function isAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'napaAdmin' || user.isAdmin === true;
}

// Helper to check if OTP verification is required (60-day validity)
export function isOTPVerificationRequired(user: SessionUser | null): boolean {
  if (!user) return true;
  if (!user.lastOtpVerifiedAt) return true;

  const lastVerified = new Date(user.lastOtpVerifiedAt);
  const daysSinceVerification = Math.floor(
    (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceVerification >= 60;
}
