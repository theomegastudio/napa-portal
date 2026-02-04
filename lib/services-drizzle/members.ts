import { db } from '@/lib/db';
import { users, type User } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireApprovedAuth } from '@/lib/auth-helpers';
import { sendInvitationEmail } from '@/lib/services-drizzle/email';

export type Member = Pick<
  User,
  'id' | 'email' | 'organizationName' | 'isAdmin' | 'createdAt'
>;

/**
 * Get members of an organization
 */
export async function getOrgMembers(
  organizationName: string
): Promise<Member[]> {
  const user = await requireApprovedAuth();

  // Verify access - must be in the org or NAPA admin
  if (!user.isNapaAdmin && user.organizationName !== organizationName) {
    throw new Error('Unauthorized: Cannot view members of this organization');
  }

  const members = await db.query.users.findMany({
    where: eq(users.organizationName, organizationName),
    columns: {
      id: true,
      email: true,
      organizationName: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: desc(users.createdAt),
  });

  return members;
}

/**
 * Invite a user to an organization
 */
export async function inviteUser(
  email: string,
  organizationName: string,
  isAdmin: boolean
) {
  const currentUser = await requireApprovedAuth();

  // Verify permission - must be org admin or NAPA admin
  if (!currentUser.isNapaAdmin && !currentUser.isAdmin) {
    throw new Error('Unauthorized: Admin access required to invite members');
  }

  // Verify org access
  if (
    !currentUser.isNapaAdmin &&
    currentUser.organizationName !== organizationName
  ) {
    throw new Error('Unauthorized: Cannot invite to this organization');
  }

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existingUser) {
    if (existingUser.organizationName === organizationName) {
      throw new Error('User is already a member of this organization');
    }

    // Prevent silently reassigning users from other organizations
    if (existingUser.organizationName) {
      throw new Error(
        'This user already belongs to another organization. They must be removed from their current organization first.'
      );
    }

    // Only update if user has no org assigned (e.g. pre-created without org)
    await db
      .update(users)
      .set({
        organizationName,
        isAdmin,
        approvalStatus: 'approved',
        approvedBy: currentUser.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));

    // Send invitation email
    try {
      await sendInvitationEmail({
        email: email.toLowerCase(),
        organizationName,
        invitedByEmail: currentUser.email,
        isAdmin,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the invite if email fails
    }

    return { status: 'updated', userId: existingUser.id };
  }

  // Pre-create user with approved status (admin invited them)
  const [newUser] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      organizationName,
      isAdmin,
      approvalStatus: 'approved',
      approvedBy: currentUser.id,
      approvedAt: new Date(),
    })
    .returning();

  // Send invitation email
  try {
    await sendInvitationEmail({
      email: email.toLowerCase(),
      organizationName,
      invitedByEmail: currentUser.email,
      isAdmin,
    });
  } catch (emailError) {
    console.error('Failed to send invitation email:', emailError);
    // Don't fail the invite if email fails
  }

  return { status: 'invited', userId: newUser.id };
}

/**
 * Update a member's admin status
 */
export async function updateMemberRole(memberId: string, isAdmin: boolean) {
  const currentUser = await requireApprovedAuth();

  // Get the target member
  const member = await db.query.users.findFirst({
    where: eq(users.id, memberId),
  });

  if (!member) {
    throw new Error('Member not found');
  }

  // Verify permission
  if (!currentUser.isNapaAdmin) {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }
    if (currentUser.organizationName !== member.organizationName) {
      throw new Error('Unauthorized: Cannot modify members of other organizations');
    }
  }

  // Prevent self-demotion for the last admin
  if (memberId === currentUser.id && !isAdmin) {
    const adminCount = await db.query.users.findMany({
      where: and(
        eq(users.organizationName, member.organizationName!),
        eq(users.isAdmin, true)
      ),
    });

    if (adminCount.length <= 1) {
      throw new Error('Cannot remove the last admin from an organization');
    }
  }

  await db
    .update(users)
    .set({
      isAdmin,
      updatedAt: new Date(),
    })
    .where(eq(users.id, memberId));
}

/**
 * Remove a member from an organization
 */
export async function removeMember(memberId: string) {
  const currentUser = await requireApprovedAuth();

  // Get the target member
  const member = await db.query.users.findFirst({
    where: eq(users.id, memberId),
  });

  if (!member) {
    throw new Error('Member not found');
  }

  // Verify permission
  if (!currentUser.isNapaAdmin) {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }
    if (currentUser.organizationName !== member.organizationName) {
      throw new Error('Unauthorized: Cannot remove members from other organizations');
    }
  }

  // Prevent self-removal
  if (memberId === currentUser.id) {
    throw new Error('Cannot remove yourself from the organization');
  }

  // Delete the user
  await db.delete(users).where(eq(users.id, memberId));
}
