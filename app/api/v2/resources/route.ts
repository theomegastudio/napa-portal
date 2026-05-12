import { NextRequest, NextResponse } from 'next/server';
import {
  getResources,
  createResource,
} from '@/lib/services-drizzle/resources';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchText = searchParams.get('searchText') || undefined;
    const resourceType = searchParams.get('resourceType') || undefined;
    const statusParam = searchParams.get('status') || undefined;
    const status = statusParam === 'archived' || statusParam === 'active' ? statusParam : undefined;

    const resources = await getResources({
      searchText,
      resourceType: resourceType === 'all' ? undefined : resourceType,
      status,
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error('GET resources error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, resourceType, externalLink, files } = body;

    if (!title || !resourceType) {
      return NextResponse.json(
        { error: 'Title and resource type are required' },
        { status: 400 }
      );
    }

    const resource = await createResource({
      title,
      description,
      resourceType,
      externalLink,
      files,
    });

    return NextResponse.json(resource);
  } catch (error) {
    console.error('POST resource error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}
