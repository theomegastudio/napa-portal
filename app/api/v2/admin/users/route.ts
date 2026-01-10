import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getOrganizations } from '@/lib/services-drizzle/users';

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
