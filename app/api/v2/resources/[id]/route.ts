import { NextRequest, NextResponse } from 'next/server';
import {
  getResourceById,
  updateResource,
  deleteResource,
} from '@/lib/services-drizzle/resources';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resource = await getResourceById(id);

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error('GET resource error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch resource' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, resourceType, externalLink, files, changeNotes } =
      body;

    if (!title || !resourceType) {
      return NextResponse.json(
        { error: 'Title and resource type are required' },
        { status: 400 }
      );
    }

    await updateResource({
      resourceId: id,
      title,
      description,
      resourceType,
      externalLink,
      files,
      changeNotes,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT resource error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Resource not found') {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update resource' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteResource(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE resource error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Resource not found') {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete resource' },
      { status: 500 }
    );
  }
}
