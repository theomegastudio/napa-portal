import { NextRequest, NextResponse } from 'next/server';
import { getOrgMembers, inviteUser } from '@/lib/services-drizzle/members';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationName = searchParams.get('organization');

    if (!organizationName) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const members = await getOrgMembers(organizationName);
    return NextResponse.json(members);
  } catch (error) {
    console.error('GET members error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch members' },
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

    const result = await inviteUser(email, organizationName, isAdmin || false);
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST invite member error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('already a member')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}
