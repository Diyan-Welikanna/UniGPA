import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const userId = parseInt(session.user.id);
  const body = await req.json();
  let { degreeId, newName, totalYears, semestersPerYear } = body;

  if (newName) {
    if (!totalYears || !semestersPerYear) {
      return NextResponse.json({ error: 'totalYears and semestersPerYear required for new degree' }, { status: 400 });
    }
    const { data: deg, error } = await db.from('degrees').insert({
      name: newName.trim(), total_years: parseInt(totalYears), semesters_per_year: parseInt(semestersPerYear), is_custom: false, created_by_user_id: null,
    }).select().single();
    if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    degreeId = deg.id;
  }

  if (!degreeId) return NextResponse.json({ error: 'degreeId or newName required' }, { status: 400 });

  const { data: subjects } = await db
    .from('subjects')
    .select('subject_name, credits, year, semester')
    .eq('user_id', userId)
    .order('year').order('semester').order('subject_name');

  if (!subjects || subjects.length === 0) {
    return NextResponse.json({ error: 'You have no subjects to publish' }, { status: 400 });
  }

  await db.from('degree_subject_templates').delete().eq('degree_id', degreeId);
  const { error } = await db.from('degree_subject_templates').insert(
    subjects.map((s: any) => ({ degree_id: degreeId, subject_name: s.subject_name, credits: s.credits, year: s.year, semester: s.semester }))
  );

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ message: 'Published', degreeId, count: subjects.length }, { status: 201 });
}
