import NextAuth from 'next-auth';
import Nodemailer from 'next-auth/providers/nodemailer';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users, accounts, sessions, verificationTokens } from './db/schema';
import { eq } from 'drizzle-orm';
import { authConfig } from './auth.config';

import type { ApprovalStatus } from './db/schema';

// OTP verification validity in days
const OTP_VALIDITY_DAYS = 60;

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      organizationName: string | null;
      isAdmin: boolean;
      isNapaAdmin: boolean;
      approvalStatus: ApprovalStatus;
      emailVerificationRequired: boolean;
    };
  }

  interface User {
    organizationName?: string | null;
    isAdmin?: boolean;
    password?: string | null;
    approvalStatus?: ApprovalStatus;
  }
}

// Check if we should use console logging for magic links (development)
const useConsoleEmail = process.env.EMAIL_CONSOLE === 'true' || !process.env.EMAIL_SERVER_HOST;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    // Credentials provider for email/password login
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Find user by email
        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });

        if (!user || !user.password) {
          return null;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          organizationName: user.organizationName,
          isAdmin: user.isAdmin,
        };
      },
    }),
    // Magic link provider
    Nodemailer({
      server: useConsoleEmail
        ? { host: 'localhost', port: 25, auth: { user: '', pass: '' } }
        : {
            host: process.env.EMAIL_SERVER_HOST,
            port: Number(process.env.EMAIL_SERVER_PORT || 587),
            auth: {
              user: process.env.EMAIL_SERVER_USER,
              pass: process.env.EMAIL_SERVER_PASSWORD,
            },
          },
      from: process.env.EMAIL_FROM || 'noreply@napahq.org',
      // Custom sendVerificationRequest for console logging in development
      ...(useConsoleEmail && {
        sendVerificationRequest: async ({ identifier: email, url }) => {
          console.log('\n' + '='.repeat(60));
          console.log('MAGIC LINK LOGIN');
          console.log('='.repeat(60));
          console.log(`Email: ${email}`);
          console.log(`URL: ${url}`);
          console.log('='.repeat(60) + '\n');
        },
      }),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user data to token on initial sign in
      if (user) {
        token.id = user.id;
        token.organizationName = user.organizationName;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token, user }) {
      // Helper to check if OTP verification is required
      const isVerificationRequired = (lastVerified: Date | null): boolean => {
        if (!lastVerified) return true;
        const daysSinceVerification = Math.floor(
          (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceVerification >= OTP_VALIDITY_DAYS;
      };

      // For database sessions (magic link)
      if (user) {
        session.user.id = user.id;

        // Fetch additional user data from our extended users table
        const userData = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });

        if (userData) {
          session.user.name = userData.name;
          session.user.organizationName = userData.organizationName;
          session.user.isAdmin = userData.isAdmin;
          session.user.isNapaAdmin =
            userData.isAdmin &&
            userData.organizationName === 'National APIDA Panhellenic Association';
          session.user.approvalStatus = userData.approvalStatus;
          session.user.emailVerificationRequired = isVerificationRequired(userData.lastOtpVerifiedAt);
        } else {
          session.user.organizationName = null;
          session.user.isAdmin = false;
          session.user.isNapaAdmin = false;
          session.user.approvalStatus = 'pending';
          session.user.emailVerificationRequired = true;
        }
      }
      // For JWT sessions (credentials)
      else if (token) {
        session.user.id = token.id as string;

        // Fetch fresh data from database
        const userData = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
        });

        if (userData) {
          session.user.name = userData.name;
          session.user.organizationName = userData.organizationName;
          session.user.isAdmin = userData.isAdmin;
          session.user.isNapaAdmin =
            userData.isAdmin &&
            userData.organizationName === 'National APIDA Panhellenic Association';
          session.user.approvalStatus = userData.approvalStatus;
          session.user.emailVerificationRequired = isVerificationRequired(userData.lastOtpVerifiedAt);
        } else {
          session.user.approvalStatus = 'pending';
          session.user.emailVerificationRequired = true;
        }
      }
      return session;
    },
    async signIn({ user }) {
      // Allow all sign-ins - organization assignment handled in createUser event
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-assign NAPA org and admin status for NAPA email domains
      if (user.email) {
        const napaDomains = ['@napahq.org', '@napa-online.org'];
        const isNapaEmail = napaDomains.some((domain) =>
          user.email!.toLowerCase().endsWith(domain)
        );

        if (isNapaEmail) {
          await db
            .update(users)
            .set({
              organizationName: 'National APIDA Panhellenic Association',
              isAdmin: true,
              approvalStatus: 'approved', // NAPA users are auto-approved
            })
            .where(eq(users.id, user.id!));
        }
      }
    },
  },
});

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper function to verify passwords
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
