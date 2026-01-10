import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { notifyApprovers, isFirstUserInOrg, getNapaAdmins, getOrgAdminsForOrg } from '@/lib/services-drizzle/approvals';
import { sendApprovalRequestEmail } from '@/lib/services-drizzle/email';

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
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
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

    // Create user
    const userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      name: name || null,
      password: hashedPassword,
      organizationName: finalOrgName,
      isAdmin,
      approvalStatus,
      emailVerified: new Date(), // Mark as verified since they set a password
    });

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
