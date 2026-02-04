import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getOrganizations, inviteUserToOrg } from '@/lib/services-drizzle/users';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeOrgs = searchParams.get('includeOrgs') === 'true';

    const usersData = await getAllUsers();

    if (includeOrgs) {
      const orgsData = await getOrganizations();
      return NextResponse.json({ users: usersData, organizations: orgsData });
    }

    return NextResponse.json(usersData);
  } catch (error) {
    console.error('GET users error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, organizationName, isAdmin } = body;

    if (!email || !organizationName) {
      return NextResponse.json(
        { error: 'Email and organization name are required' },
        { status: 400 }
      );
    }

    const result = await inviteUserToOrg(email, organizationName, isAdmin || false);
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST invite user error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && (error.message.includes('already a member') || error.message.includes('already belongs'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to invite user' },
      { status: 500 }
    );
  }
}
