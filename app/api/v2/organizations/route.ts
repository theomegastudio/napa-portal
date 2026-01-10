import { NextResponse } from 'next/server';
import { getOrganizations } from '@/lib/services-drizzle/organizations';

export async function GET() {
  try {
    const organizations = await getOrganizations();

    // Transform to match the expected format (organization_name)
    const transformed = organizations.map((org) => ({
      id: org.id,
      organization_name: org.organizationName,
      created_at: org.createdAt,
      updated_at: org.updatedAt,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('GET organizations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}
