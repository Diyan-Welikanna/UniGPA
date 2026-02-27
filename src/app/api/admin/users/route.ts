import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await (prisma as any).user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
      degreeId: true,
      degree: { select: { name: true } },
      _count: { select: { subjects: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(users);
}

// PATCH /api/admin/users — update a user's role
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { userId, role } = body;

  if (!userId || !['USER', 'SUPERADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Prevent demoting yourself
  if (String(userId) === session.user.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const updated = await (prisma as any).user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/users — delete a user
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = parseInt(searchParams.get('id') ?? '');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  if (userId === parseInt(session.user.id)) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ message: 'User deleted' });
}
