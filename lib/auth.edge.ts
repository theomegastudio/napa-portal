import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Edge-compatible auth export for middleware
// This doesn't include Nodemailer or database adapters
export const { auth } = NextAuth(authConfig);
