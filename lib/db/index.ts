import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// For serverless environments (Vercel), use the HTTP-based neon() driver
// which is faster for cold starts than WebSocket-based Pool
const sql = neon(process.env.DATABASE_URL!);

// Use neon-http driver for better cold start performance
export const db = drizzle(sql, { schema });

// Export schema for convenience
export * from './schema';

// Type export for the database instance
export type Database = typeof db;
