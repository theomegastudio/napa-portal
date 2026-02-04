import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { db } from './db';
import * as schema from './db/schema';
import bcrypt from 'bcryptjs';

// OTP verification validity in days
const OTP_VALIDITY_DAYS = 60;

// Helper to check if email is NAPA domain
export const isNapaEmail = (email: string): boolean => {
  const napaDomains = ['@napahq.org', '@napa-online.org'];
  return napaDomains.some((domain) => email.toLowerCase().endsWith(domain));
};

// Helper function to check OTP verification requirement
export function isOTPVerificationRequired(lastVerified: Date | null): boolean {
  if (!lastVerified) return true;
  const daysSinceVerification = Math.floor(
    (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceVerification >= OTP_VALIDITY_DAYS;
}

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper function to verify passwords
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.AUTH_URL ||
    'http://localhost:3000',
  secret: (() => {
    const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error('BETTER_AUTH_SECRET environment variable is required');
    }
    return secret;
  })(),

  // Trusted origins for CSRF protection - required for BetterAuth v1.x
  // Without this, BetterAuth rejects session/sign-in requests from the production domain
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    process.env.AUTH_URL || '',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ].filter(Boolean),

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Custom password hashing to maintain compatibility with existing bcrypt passwords
    password: {
      hash: async (password: string) => {
        return bcrypt.hash(password, 12);
      },
      verify: async (data: { hash: string; password: string }) => {
        return bcrypt.compare(data.password, data.hash);
      },
    },
    // Require email verification
    requireEmailVerification: false, // We use OTP verification instead
  },

  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minute cache
    },
  },

  // Cookie security
  advanced: {
    cookiePrefix: 'better-auth',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  user: {
    additionalFields: {
      organizationName: {
        type: 'string',
        required: false,
        input: false, // Prevent users from changing via API
      },
      isAdmin: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false, // Prevent privilege escalation
      },
      approvalStatus: {
        type: 'string',
        required: false,
        defaultValue: 'pending',
        input: false, // Prevent self-approval
      },
      approvedBy: {
        type: 'string',
        required: false,
        input: false,
      },
      approvedAt: {
        type: 'date',
        required: false,
        input: false,
      },
      rejectionReason: {
        type: 'string',
        required: false,
        input: false,
      },
      lastOtpVerifiedAt: {
        type: 'date',
        required: false,
        input: false, // Prevent OTP verification bypass
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false, // Prevent role escalation
      },
    },
  },

  plugins: [
    // Email OTP plugin for first login and password reset
    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      sendVerificationOnSignUp: false, // We handle this manually
      disableSignUp: true, // Users must sign up through our custom flow
      async sendVerificationOTP({ email, otp, type }) {
        const { sendOTPEmail, sendPasswordResetOTPEmail } = await import(
          './services-drizzle/email'
        );

        // Get user name for personalized email
        const user = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, email.toLowerCase()),
        });

        if (type === 'email-verification' || type === 'sign-in') {
          await sendOTPEmail({
            email,
            name: user?.name || undefined,
            otpCode: otp,
          });
        } else if (type === 'forget-password') {
          await sendPasswordResetOTPEmail({
            email,
            name: user?.name || undefined,
            otpCode: otp,
          });
        }
      },
    }),
    // Note: We handle admin checks via our custom isAdmin field and role field
    // isNapaAdmin is determined by role === 'napaAdmin', not org membership
  ],
});

// Export type for the auth instance
export type Auth = typeof auth;
