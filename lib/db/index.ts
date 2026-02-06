import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

// Use WebSocket-based Pool for transaction support
// Connection is reused across requests in the same serverless instance
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const db = drizzle({ client: pool, schema });

// Export schema for convenience
export * from './schema';

// Type export for the database instance
export type Database = typeof db;
