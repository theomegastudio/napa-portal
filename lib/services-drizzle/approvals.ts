import { db } from '@/lib/db';
import { users, approvalNotifications, type User, type ApprovalStatus } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';

export type PendingUser = Pick<
  User,
  'id' | 'email' | 'name' | 'organizationName' | 'createdAt'
> & {
  isFirstUserInOrg: boolean;
};

/**
 * Check if this would be the first user from an organization
 */
export async function isFirstUserInOrg(organizationName: string): Promise<boolean> {
  const existingApprovedUsers = await db.query.users.findMany({
    where: and(
      eq(users.organizationName, organizationName),
      eq(users.approvalStatus, 'approved')
    ),
  });
  return existingApprovedUsers.length === 0;
}

/**
 * Get org admins for an organization
 */
export async function getOrgAdminsForOrg(organizationName: string): Promise<User[]> {
  const admins = await db.query.users.findMany({
    where: and(
      eq(users.organizationName, organizationName),
      eq(users.isAdmin, true),
      eq(users.approvalStatus, 'approved')
    ),
  });
  return admins;
}

/**
 * Get NAPA Board users (the approvers). Directors are read-only and don't approve.
 */
export async function getNapaAdmins(): Promise<User[]> {
  const napaAdmins = await db.query.users.findMany({
    where: and(
      eq(users.role, 'napaBoard'),
      eq(users.approvalStatus, 'approved')
    ),
  });
  return napaAdmins;
}

/**
 * Determine who should approve this user
 */
export async function determineApprover(
  organizationName: string
): Promise<'napa' | 'org_admin'> {
  const isFirst = await isFirstUserInOrg(organizationName);
  if (isFirst) {
    return 'napa';
  }

  const orgAdmins = await getOrgAdminsForOrg(organizationName);
  if (orgAdmins.length === 0) {
    return 'napa';
  }

  return 'org_admin';
}

/**
 * Get pending approvals for the current admin
 */
export async function getPendingApprovals(): Promise<PendingUser[]> {
  const currentUser = await requireAuth();

  if (!currentUser.isAdmin && !currentUser.isNapaAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  let pendingUsers: User[];

  if (currentUser.isNapaAdmin) {
    // NAPA admins see all pending users
    pendingUsers = await db.query.users.findMany({
      where: eq(users.approvalStatus, 'pending'),
      orderBy: desc(users.createdAt),
    });
  } else {
    // Org admins see pending users from their org
    pendingUsers = await db.query.users.findMany({
      where: and(
        eq(users.approvalStatus, 'pending'),
        eq(users.organizationName, currentUser.organizationName!)
      ),
      orderBy: desc(users.createdAt),
    });
  }

  // Enrich with isFirstUserInOrg info
  const enrichedUsers: PendingUser[] = await Promise.all(
    pendingUsers.map(async (user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      organizationName: user.organizationName,
      createdAt: user.createdAt,
      isFirstUserInOrg: user.organizationName
        ? await isFirstUserInOrg(user.organizationName)
        : false,
    }))
  );

  return enrichedUsers;
}

/**
 * Approve a user
 */
export async function approveUser(
  userId: string,
  makeOrgAdmin: boolean = false
): Promise<void> {
  const currentUser = await requireAuth();

  if (!currentUser.isAdmin && !currentUser.isNapaAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!targetUser) {
    throw new Error('User not found');
  }

  if (targetUser.approvalStatus !== 'pending') {
    throw new Error('User is not pending approval');
  }

  // Verify permission to approve this user
  if (!currentUser.isNapaAdmin) {
    // Org admin can only approve users from their org
    if (currentUser.organizationName !== targetUser.organizationName) {
      throw new Error('Unauthorized: Cannot approve users from other organizations');
    }

    // Check if this is the first user (requires NAPA approval)
    const isFirst = await isFirstUserInOrg(targetUser.organizationName!);
    if (isFirst) {
      throw new Error('First user from an organization must be approved by NAPA');
    }
  }

  // Update user status
  await db
    .update(users)
    .set({
      approvalStatus: 'approved',
      approvedBy: currentUser.id,
      approvedAt: new Date(),
      isAdmin: makeOrgAdmin,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Create notification for the approved user
  await db.insert(approvalNotifications).values({
    userId: targetUser.id,
    recipientId: targetUser.id,
    type: 'approved',
  });
}

/**
 * Reject a user
 */
export async function rejectUser(
  userId: string,
  reason?: string
): Promise<void> {
  const currentUser = await requireAuth();

  if (!currentUser.isAdmin && !currentUser.isNapaAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!targetUser) {
    throw new Error('User not found');
  }

  if (targetUser.approvalStatus !== 'pending') {
    throw new Error('User is not pending approval');
  }

  // Verify permission to reject this user
  if (!currentUser.isNapaAdmin) {
    if (currentUser.organizationName !== targetUser.organizationName) {
      throw new Error('Unauthorized: Cannot reject users from other organizations');
    }

    const isFirst = await isFirstUserInOrg(targetUser.organizationName!);
    if (isFirst) {
      throw new Error('First user from an organization must be rejected by NAPA');
    }
  }

  // Update user status
  await db
    .update(users)
    .set({
      approvalStatus: 'rejected',
      rejectionReason: reason || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Create notification for the rejected user
  await db.insert(approvalNotifications).values({
    userId: targetUser.id,
    recipientId: targetUser.id,
    type: 'rejected',
  });
}

/**
 * Get approval status for a user
 */
export async function getApprovalStatus(userId: string): Promise<{
  status: ApprovalStatus;
  rejectionReason: string | null;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      approvalStatus: true,
      rejectionReason: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    status: user.approvalStatus,
    rejectionReason: user.rejectionReason,
  };
}

/**
 * Create notifications for approvers when a new user signs up
 */
export async function notifyApprovers(
  pendingUserId: string,
  organizationName: string
): Promise<void> {
  const approverType = await determineApprover(organizationName);

  let approvers: User[];
  if (approverType === 'napa') {
    approvers = await getNapaAdmins();
  } else {
    approvers = await getOrgAdminsForOrg(organizationName);
    // If no org admins, fall back to NAPA
    if (approvers.length === 0) {
      approvers = await getNapaAdmins();
    }
  }

  // Create notifications for all approvers
  for (const approver of approvers) {
    await db.insert(approvalNotifications).values({
      userId: pendingUserId,
      recipientId: approver.id,
      type: 'pending_approval',
    });
  }
}
