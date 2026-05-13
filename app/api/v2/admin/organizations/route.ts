import { NextRequest, NextResponse } from 'next/server';
import { listOrganizationsWithCounts, createOrganization } from '@/lib/services-drizzle/organizations';

export async function GET() {
  try {
    const orgs = await listOrganizationsWithCounts();
    return NextResponse.json(orgs);
  } catch (error) {
    console.error('GET organizations error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch organizations';
    const status = msg.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationName, slug, logoUrl, memberCount, displayOrder } = body ?? {};
    if (!organizationName) {
      return NextResponse.json({ error: 'organizationName is required' }, { status: 400 });
    }
    const org = await createOrganization({ organizationName, slug, logoUrl, memberCount, displayOrder });
    return NextResponse.json(org);
  } catch (error) {
    console.error('POST organization error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create organization';
    const status = msg.includes('Unauthorized') ? 403 : msg.includes('already exists') ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
