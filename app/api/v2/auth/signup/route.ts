import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, organizations, accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';
import { notifyApprovers, isFirstUserInOrg, getNapaAdmins, getOrgAdminsForOrg } from '@/lib/services-drizzle/approvals';
import { sendApprovalRequestEmail } from '@/lib/services-drizzle/email';
import { createAuditLog } from '@/lib/services-drizzle/audit';

// Generate a random ID compatible with BetterAuth
function generateId(): string {
  return crypto.randomUUID();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, organizationName } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      // Check if this is a pre-invited user (created by admin invite, no account/password yet)
      const existingAccount = await db.query.accounts.findFirst({
        where: eq(accounts.userId, existingUser.id),
      });

      if (!existingAccount && existingUser.approvalStatus === 'approved') {
        // This is a pre-invited user - complete their account setup
        const hashedPassword = await hashPassword(password);

        // Update user record with name
        await db
          .update(users)
          .set({
            name: name || null,
            emailVerified: false,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));

        // Create account record for BetterAuth (credential provider)
        const accountId = generateId();
        await db.insert(accounts).values({
          id: accountId,
          userId: existingUser.id,
          accountId: existingUser.id,
          providerId: 'credential',
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Audit log: invited user completed signup
        try {
          await createAuditLog({
            userId: existingUser.id,
            userEmail: email.toLowerCase(),
            organization: existingUser.organizationName || 'Unaffiliated',
            action: 'signup',
            resourceId: existingUser.id,
            resourceTitle: email.toLowerCase(),
            resourceType: 'user',
            metadata: { name: name || null, approvalStatus: 'approved', invitedUserCompletion: true },
          });
        } catch {}

        return NextResponse.json({
          success: true,
          message: 'Account created successfully',
          userId: existingUser.id,
          approvalStatus: 'approved',
        });
      }

      // Return generic message to prevent user enumeration
      return NextResponse.json(
        { error: 'Unable to create account. Please try again or contact support.' },
        { status: 400 }
      );
    }

    // Check if organization exists (if provided)
    if (organizationName) {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.organizationName, organizationName),
      });

      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Check for NAPA email domains for auto-admin
    const napaDomains = ['@napahq.org', '@napa-online.org'];
    const isNapaEmail = napaDomains.some((domain) =>
      email.toLowerCase().endsWith(domain)
    );

    // Determine organization and admin status
    const finalOrgName = isNapaEmail
      ? 'National APIDA Panhellenic Association'
      : organizationName || null;
    const isAdmin = isNapaEmail;

    // Determine approval status
    // Only NAPA emails are auto-approved, all others require approval
    const approvalStatus: 'pending' | 'approved' = isNapaEmail ? 'approved' : 'pending';

    // Role defaults to 'user' - napaBoard/napaDirector roles are granted manually by an existing NAPA Board member
    const role = 'user';

    // Create user (BetterAuth compatible)
    const userId = generateId();
    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      name: name || null,
      emailVerified: false, // Will be verified via OTP
      organizationName: finalOrgName,
      isAdmin,
      approvalStatus,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create account record for BetterAuth (credential provider)
    const accountId = generateId();
    await db.insert(accounts).values({
      id: accountId,
      userId,
      accountId: userId,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Audit log: new user signup
    try {
      await createAuditLog({
        userId: userId,
        userEmail: email.toLowerCase(),
        organization: finalOrgName || 'Unaffiliated',
        action: 'signup',
        resourceId: userId,
        resourceTitle: email.toLowerCase(),
        resourceType: 'user',
        metadata: { name: name || null, approvalStatus, autoApproved: isNapaEmail },
      });
    } catch {}

    // If pending, notify appropriate approvers
    if (approvalStatus === 'pending' && finalOrgName) {
      try {
        // Create in-app notifications
        await notifyApprovers(userId, finalOrgName);

        // Send email notifications
        const isFirst = await isFirstUserInOrg(finalOrgName);
        let approvers;

        if (isFirst) {
          approvers = await getNapaAdmins();
        } else {
          approvers = await getOrgAdminsForOrg(finalOrgName);
          if (approvers.length === 0) {
            approvers = await getNapaAdmins();
          }
        }

        // Send email to each approver
        for (const approver of approvers) {
          await sendApprovalRequestEmail({
            adminEmail: approver.email,
            adminName: approver.name,
            pendingUserEmail: email.toLowerCase(),
            pendingUserName: name || null,
            organizationName: finalOrgName,
            isFirstUser: isFirst,
          });
        }
      } catch (notifyError) {
        // Log but don't fail signup if notification fails
        console.error('Failed to send approval notifications:', notifyError);
      }
    }

    return NextResponse.json({
      success: true,
      message: approvalStatus === 'approved'
        ? 'Account created successfully'
        : 'Account created. Pending approval from your organization administrator.',
      userId,
      approvalStatus,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
