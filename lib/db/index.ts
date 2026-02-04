import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle({ client: pool, schema });

// Export schema for convenience
export * from './schema';

// Type export for the database instance
export type Database = typeof db;
