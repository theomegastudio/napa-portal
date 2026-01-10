import { NextRequest, NextResponse } from 'next/server';
import { updateUser, deleteUser } from '@/lib/services-drizzle/users';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { email, organizationName, isAdmin } = body;

    await updateUser(userId, {
      email,
      organizationName,
      isAdmin,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH user error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    await deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE user error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Cannot delete yourself')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
