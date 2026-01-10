/**
 * RLS Context utilities for PostgreSQL Row-Level Security
 *
 * NOTE: This file is currently disabled because Neon's HTTP driver
 * doesn't support connection pooling with transaction context.
 *
 * If you need RLS support in the future, switch to Neon's WebSocket
 * driver (@neondatabase/serverless with ws) which supports transactions.
 *
 * For now, authorization is handled at the application layer.
 */

export interface RLSContext {
  organization: string | null;
  userId: string | null;
  isOrgAdmin: boolean;
  isNapaAdmin: boolean;
}

// Placeholder exports to prevent import errors if referenced elsewhere
export async function setRLSContext(): Promise<void> {
  console.warn('RLS context is not available with Neon HTTP driver');
}

export async function withRLSContext<T>(
  callback: () => Promise<T>
): Promise<T> {
  console.warn('RLS context is not available with Neon HTTP driver');
  return callback();
}

export async function withExplicitRLSContext<T>(
  _context: RLSContext,
  callback: () => Promise<T>
): Promise<T> {
  console.warn('RLS context is not available with Neon HTTP driver');
  return callback();
}

export async function withSystemContext<T>(
  callback: () => Promise<T>
): Promise<T> {
  return callback();
}
