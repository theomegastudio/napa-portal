import { NextRequest, NextResponse } from 'next/server';
import { updateMemberRole, removeMember } from '@/lib/services-drizzle/members';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const body = await request.json();
    const { isAdmin, role } = body;

    if (typeof isAdmin !== 'boolean') {
      return NextResponse.json(
        { error: 'isAdmin must be a boolean' },
        { status: 400 }
      );
    }

    await updateMemberRole(memberId, isAdmin, role);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH member error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes('last admin')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    await removeMember(memberId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE member error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes('yourself')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
