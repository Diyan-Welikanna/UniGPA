import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: users, error } = await db
    .from('users')
    .select('id, name, email, role, is_verified, created_at, degree_id, degree:degrees(name)')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  // Add subject counts
  const usersWithCount = await Promise.all((users ?? []).map(async (u: any) => {
    const { count } = await db.from('subjects').select('id', { count: 'exact', head: true }).eq('user_id', u.id);
    return { ...u, _count: { subjects: count ?? 0 } };
  }));

  return NextResponse.json(usersWithCount);
}

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
  if (String(userId) === session.user.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const { data: updated, error } = await db
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select('id, name, email, role')
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = parseInt(searchParams.get('id') ?? '');

  if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  if (userId === parseInt(session.user.id)) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

  const { error } = await db.from('users').delete().eq('id', userId);
  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ message: 'User deleted' });
}
