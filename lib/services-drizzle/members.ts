import { db } from '@/lib/db';
import { users, type User } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireApprovedAuth } from '@/lib/auth-helpers';
import { sendInvitationEmail } from '@/lib/services-drizzle/email';
import { NAPA_ORG_NAME } from '@/lib/constants';

export type Member = Pick<
  User,
  'id' | 'email' | 'organizationName' | 'isAdmin' | 'role' | 'approvalStatus' | 'banned' | 'createdAt'
>;

/**
 * List all users in an organization, for the Org Users admin page.
 *
 * Access: caller must be a member of `organizationName` or a NAPA admin
 * (Board/Director); otherwise throws `Unauthorized`. Ordered newest-first.
 *
 * Returns the fields the Org Users table renders — including `role`,
 * `approvalStatus`, and `banned` for the role and status badges. Note the UI
 * imports the `Member` shape from `@/lib/types`, which mirrors this Pick.
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
      role: true,
      approvalStatus: true,
      banned: true,
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
  isAdmin: boolean,
  role?: 'user' | 'admin' | 'napaBoard' | 'napaDirector',
) {
  const currentUser = await requireApprovedAuth();

  // Verify permission - must be org admin or NAPA admin
  if (!currentUser.isNapaAdmin && !currentUser.isAdmin) {
    throw new Error('Unauthorized: Admin access required to invite members');
  }

  // Only napaBoard can grant napaBoard / napaDirector roles
  let assignedRole: string = 'user';
  if (role && (role === 'napaBoard' || role === 'napaDirector')) {
    if (organizationName !== NAPA_ORG_NAME) {
      throw new Error('NAPA roles can only be granted to users in the NAPA organization');
    }
    if (currentUser.role !== 'napaBoard') {
      throw new Error('Only NAPA Board can grant NAPA Board / NAPA Director roles');
    }
    assignedRole = role;
  } else if (role === 'admin') {
    assignedRole = 'user';
    isAdmin = true;
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
        role: assignedRole,
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
      role: assignedRole,
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
export async function updateMemberRole(
  memberId: string,
  isAdmin: boolean,
  role?: 'user' | 'admin' | 'napaBoard' | 'napaDirector',
) {
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

  // Role changes (napaBoard / napaDirector) are restricted to NAPA Board and
  // only valid within the NAPA organization.
  const updates: Record<string, unknown> = { isAdmin, updatedAt: new Date() };
  if (role && (role === 'napaBoard' || role === 'napaDirector')) {
    if (member.organizationName !== NAPA_ORG_NAME) {
      throw new Error('NAPA roles can only be granted within the NAPA organization');
    }
    if (currentUser.role !== 'napaBoard') {
      throw new Error('Only NAPA Board can grant NAPA Board / NAPA Director roles');
    }
    updates.role = role;
  } else if (role === 'user' || role === 'admin') {
    updates.role = role;
  }

  await db.update(users).set(updates).where(eq(users.id, memberId));
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
