import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { db } from './db';
import * as schema from './db/schema';
import bcrypt from 'bcryptjs';

/** Number of days before an OTP re-verification is required. */
const OTP_VALIDITY_DAYS = 60;

/**
 * Returns true if the email belongs to a NAPA staff domain (@napahq.org or
 * @napa-online.org). Used at signup only to default the user's organizationName
 * to the parent NAPA org - it does NOT grant admin privileges. Role and
 * approval status are granted manually by a NAPA Board member.
 */
export const isNapaEmail = (email: string): boolean => {
  const napaDomains = ['@napahq.org', '@napa-online.org'];
  return napaDomains.some((domain) => email.toLowerCase().endsWith(domain));
};

/**
 * Returns true if the user must complete an OTP email verification before accessing the dashboard.
 * Verification expires after OTP_VALIDITY_DAYS (60) days. A null `lastVerified` always requires re-verification.
 *
 * Checked in both `proxy.ts` (edge redirect) and `app/(dashboard)/layout.tsx` (server component).
 */
export function isOTPVerificationRequired(lastVerified: Date | null): boolean {
  if (!lastVerified) return true;
  const daysSinceVerification = Math.floor(
    (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceVerification >= OTP_VALIDITY_DAYS;
}

/** Hashes a plaintext password with bcrypt (cost factor 12). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Compares a plaintext password against a bcrypt hash. */
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

  // Rate limiting. Without this, the 6-digit OTP could be brute-forced
  // inside the 10-minute window. BetterAuth applies the defaults to all
  // endpoints and the `customRules` map to specific paths.
  rateLimit: {
    enabled: true,
    window: 60, // seconds
    max: 60, // default: 60 requests per minute per IP
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/email-otp/send-verification-otp': { window: 60, max: 3 },
      '/email-otp/verify-otp': { window: 60, max: 10 },
      '/forget-password': { window: 60, max: 3 },
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
    // Admin checks live in lib/permissions.ts: isAdmin is a per-user boolean
    // for org-level admin; role === 'napaBoard' | 'napaDirector' for NAPA staff.
  ],
});

// Export type for the auth instance
export type Auth = typeof auth;
