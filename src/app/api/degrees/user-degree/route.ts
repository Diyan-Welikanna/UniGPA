import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// DELETE /api/degrees/user-degree?id=<degreeId>
// Removes all user subjects + results for this degree, unlinks it, and deletes the degree row if custom
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = parseInt(session.user.id);

    const { searchParams } = new URL(request.url);
    const degreeId = parseInt(searchParams.get('id') ?? '');
    if (!degreeId) return NextResponse.json({ error: 'Missing degree id' }, { status: 400 });

    // Get user's subjects for this degree
    const { data: subjects } = await db
      .from('subjects')
      .select('id')
      .eq('user_id', userId)
      .eq('degree_id', degreeId);

    if (subjects && subjects.length > 0) {
      const subjectIds = subjects.map((s: any) => s.id);
      // Delete all results for these subjects
      await db.from('results').delete().in('subject_id', subjectIds);
      // Delete all subjects
      await db.from('subjects').delete().in('id', subjectIds);
    }

    // If user's current degree_id points to this degree, clear it
    const { data: user } = await db.from('users').select('degree_id').eq('id', userId).single();
    if (user?.degree_id === degreeId) {
      await db.from('users').update({ degree_id: null }).eq('id', userId);
    }

    // If it's a custom degree owned by this user, delete the degree itself
    const { data: degree } = await db.from('degrees').select('is_custom, created_by_user_id').eq('id', degreeId).single();
    if (degree?.is_custom && degree.created_by_user_id === userId) {
      await db.from('degrees').delete().eq('id', degreeId);
    }

    return NextResponse.json({ message: 'Degree removed' });
  } catch (error) {
    console.error('DELETE user-degree error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
