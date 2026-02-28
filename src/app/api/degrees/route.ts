import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id) : null;
    const { searchParams } = new URL(request.url);

    if (searchParams.get('withSubjects') === '1') {
      if (!userId) return NextResponse.json([]);
      const { data: user } = await db.from('users').select('degree_id').eq('id', userId).single();
      const { count } = await db.from('subjects').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      const ids: number[] = user?.degree_id && (count ?? 0) > 0 ? [user.degree_id] : [];
      return NextResponse.json(ids);
    }

    const { data: degrees, error } = await db
      .from('degrees')
      .select('*, _count:degree_subject_templates(count)')
      .or(`is_custom.eq.false${userId ? `,and(is_custom.eq.true,created_by_user_id.eq.${userId})` : ''}`)
      .order('is_custom', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json((degrees ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      totalYears: d.total_years,
      semestersPerYear: d.semesters_per_year,
      isCustom: d.is_custom,
      createdByUserId: d.created_by_user_id,
      _count: { subjectTemplates: d._count?.[0]?.count ?? 0 },
    })));
  } catch (error) {
    console.error('GET degrees error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') ?? '');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: degree } = await db.from('degrees').select('is_custom').eq('id', id).single();
    if (!degree) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (degree.is_custom) return NextResponse.json({ error: 'Cannot delete custom user degrees from here' }, { status: 400 });

    const { error } = await db.from('degrees').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: 'Degree deleted' });
  } catch (error) {
    console.error('DELETE degree error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = parseInt(session.user.id);
    const body = await request.json();

    // Admin: create system degree
    if (body.action === 'admin-create') {
      if (session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { name, totalYears, semestersPerYear } = body;
      if (!name || !totalYears || !semestersPerYear) return NextResponse.json({ error: 'name, totalYears and semestersPerYear are required' }, { status: 400 });
      const { data: degree, error } = await db.from('degrees').insert({
        name: name.trim(), total_years: parseInt(totalYears), semesters_per_year: parseInt(semestersPerYear), is_custom: false, created_by_user_id: null,
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ message: 'System degree created', degree }, { status: 201 });
    }

    // Create custom degree
    if (body.action === 'create') {
      const { name, totalYears, semestersPerYear } = body;
      if (!name || !totalYears || !semestersPerYear) return NextResponse.json({ error: 'name, totalYears and semestersPerYear are required' }, { status: 400 });
      const { data: degree, error } = await db.from('degrees').insert({
        name: name.trim(), total_years: parseInt(totalYears), semesters_per_year: parseInt(semestersPerYear), is_custom: true, created_by_user_id: userId,
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ message: 'Custom degree created', degree }, { status: 201 });
    }

    // Select a degree
    const { degreeId } = body;
    if (!degreeId || typeof degreeId !== 'number') return NextResponse.json({ error: 'degreeId is required' }, { status: 400 });

    const { data: rawDegree } = await db.from('degrees').select('*, subjectTemplates:degree_subject_templates(*)').eq('id', degreeId).single();
    if (!rawDegree) return NextResponse.json({ error: 'Degree not found' }, { status: 404 });

    const degree = {
      id: rawDegree.id, name: rawDegree.name,
      totalYears: rawDegree.total_years, semestersPerYear: rawDegree.semesters_per_year,
      isCustom: rawDegree.is_custom,
      subjectTemplates: rawDegree.subjectTemplates ?? [],
    };

    await db.from('users').update({ degree_id: degreeId }).eq('id', userId);

    let copiedCount = 0;
    if (degree.subjectTemplates?.length > 0) {
      const { count: existing } = await db.from('subjects').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      if ((existing ?? 0) === 0) {
        const { error: insertError } = await db.from('subjects').insert(
          degree.subjectTemplates.map((t: any) => ({
            user_id: userId,
            subject_name: t.subject_name,
            credits: t.credits,
            year: t.year,
            semester: t.semester,
          }))
        );
        if (!insertError) copiedCount = degree.subjectTemplates.length;
      }
    }

    return NextResponse.json({ message: 'Degree selected', degree, copiedSubjects: copiedCount });
  } catch (error) {
    console.error('POST degree error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
