import { NextRequest, NextResponse } from 'next/server';
import { getWhitelistedDomains, addDomainToWhitelist } from '@/lib/services-drizzle/domain-whitelist';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationName = searchParams.get('organization') || session.user.organizationName;

    if (!organizationName) {
      return NextResponse.json({ error: 'Organization name required' }, { status: 400 });
    }

    const domains = await getWhitelistedDomains(organizationName);
    return NextResponse.json(domains);
  } catch (error) {
    console.error('Error fetching whitelisted domains:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch domains';

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { domain, organizationName } = body;

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const orgName = organizationName || session.user.organizationName;

    if (!orgName) {
      return NextResponse.json({ error: 'Organization name required' }, { status: 400 });
    }

    const newDomain = await addDomainToWhitelist(orgName, domain);
    return NextResponse.json(newDomain);
  } catch (error) {
    console.error('Error adding domain to whitelist:', error);
    const message = error instanceof Error ? error.message : 'Failed to add domain';

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes('already whitelisted')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
