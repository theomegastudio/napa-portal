import { NextRequest, NextResponse } from 'next/server';
import { updateOrganizationById, deleteOrganizationById } from '@/lib/services-drizzle/organizations';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { organizationName, slug, logoUrl, isActive } = body ?? {};
    const row = await updateOrganizationById(id, { organizationName, slug, logoUrl, isActive });
    return NextResponse.json(row);
  } catch (error) {
    console.error('PATCH organization error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to update organization';
    const status = msg.includes('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await deleteOrganizationById(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE organization error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to delete organization';
    const status = msg.includes('Unauthorized') ? 403 : msg.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
