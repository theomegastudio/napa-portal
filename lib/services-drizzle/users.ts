import { db } from '@/lib/db';
import { users, organizations } from '@/lib/db/schema';
import { eq, sql, and, ne } from 'drizzle-orm';
import { auth } from '@/lib/auth';

async function requireNapaAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  if (!session.user.isNapaAdmin) throw new Error('Unauthorized: NAPA Admin required');
  return session.user;
}

export async function getAllUsers() {
  await requireNapaAdmin();

  const result = await db
    .select()
    .from(users)
    .orderBy(users.email);

  return result.map(user => ({
    id: user.id,
    email: user.email,
    organizationName: user.organizationName,
    isAdmin: user.isAdmin,
    isNapaAdmin: user.isAdmin && user.organizationName === 'National APIDA Panhellenic Association',
    approvalStatus: user.approvalStatus,
    createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
  }));
}

export async function updateUser(
  userId: string,
  data: {
    email?: string;
    organizationName?: string;
    isAdmin?: boolean;
  }
) {
  await requireNapaAdmin();

  const updateData: Partial<typeof users.$inferInsert> = {};

  if (data.email !== undefined) updateData.email = data.email;
  if (data.organizationName !== undefined) updateData.organizationName = data.organizationName;
  if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  return { success: true };
}

export async function deleteUser(userId: string) {
  const admin = await requireNapaAdmin();

  // Prevent deleting yourself
  if (userId === admin.id) {
    throw new Error('Cannot delete yourself');
  }

  await db.delete(users).where(eq(users.id, userId));
  return { success: true };
}

export async function getOrganizations() {
  await requireNapaAdmin();

  const result = await db
    .select()
    .from(organizations)
    .orderBy(organizations.organizationName);

  return result.map(org => ({
    id: org.id,
    organizationName: org.organizationName,
    createdAt: org.createdAt?.toISOString() || new Date().toISOString(),
  }));
}
