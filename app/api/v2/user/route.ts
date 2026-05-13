import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check NAPA role (Board or Director)
    const isNapaBoard = session.user.role === 'napaBoard';
    const isNapaDirector = session.user.role === 'napaDirector';

    return NextResponse.json({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      organizationName: session.user.organizationName,
      isAdmin: session.user.isAdmin,
      isNapaAdmin: isNapaBoard || isNapaDirector,
      isNapaBoard,
      isNapaDirector,
    });
  } catch (error) {
    console.error('GET user error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, organizationName } = body;

    // Build update object with only provided fields
    const updateData: { name?: string; organizationName?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }

    if (organizationName !== undefined) {
      if (!organizationName) {
        return NextResponse.json(
          { error: 'Organization name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.organizationName = organizationName;
    }

    // Update user
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
