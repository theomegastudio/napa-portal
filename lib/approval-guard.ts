import { auth } from './auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Server-side guard to ensure user is approved before accessing protected content.
 * Use this in page components to redirect pending/rejected users.
 */
export async function requireApprovedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.approvalStatus === 'pending') {
    redirect('/pending-approval');
  }

  if (session.user.approvalStatus === 'rejected') {
    redirect('/account-rejected');
  }

  return session.user;
}

/**
 * Check if user is approved (for conditional rendering)
 */
export async function isUserApproved(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.approvalStatus === 'approved';
}

/**
 * Get approval status for current user
 */
export async function getApprovalStatus() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  return {
    status: session.user.approvalStatus,
    organizationName: session.user.organizationName,
    email: session.user.email,
  };
}
