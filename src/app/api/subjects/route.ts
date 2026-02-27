import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all subjects for logged-in user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const semester = searchParams.get('semester');

    let query = db
      .from('subjects')
      .select('*, result:results(*)')
      .eq('user_id', parseInt(session.user.id))
      .order('year', { ascending: true })
      .order('semester', { ascending: true })
      .order('subject_name', { ascending: true });

    if (year) query = query.eq('year', parseInt(year));
    if (semester) query = query.eq('semester', parseInt(semester));

    const { data: subjects, error } = await query;
    if (error) throw error;

    return NextResponse.json((subjects ?? []).map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      subject_name: s.subject_name,
      credits: parseFloat(s.credits),
      year: s.year,
      semester: s.semester,
      created_at: s.created_at,
      updated_at: s.updated_at,
      result: s.result ? {
        id: s.result.id,
        subject_id: s.result.subject_id,
        grade_point: parseFloat(s.result.grade_point),
        status: s.result.status,
        created_at: s.result.created_at,
        updated_at: s.result.updated_at,
      } : undefined,
    })));
  } catch (error) {
    console.error('GET subjects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new subject
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await request.json();

    // ── Commit pending degree if provided ──────────────────────────────────
    if (body._pendingDegree && !session.user.degreeId) {
      const pd = body._pendingDegree;
      let degreeId: number;

      if (pd.pendingCreate) {
        const { data: deg, error } = await db.from('degrees').insert({
          name: pd.pendingCreate.name,
          total_years: pd.pendingCreate.totalYears,
          semesters_per_year: pd.pendingCreate.semestersPerYear,
          is_custom: true,
          created_by_user_id: userId,
        }).select().single();
        if (error) throw error;
        degreeId = deg.id;
      } else {
        degreeId = pd.id;
      }

      await db.from('users').update({ degree_id: degreeId }).eq('id', userId);
    }

    const validatedData = z.object({
      subject_name: z.string().min(1),
      credits: z.number().min(0.5).max(10),
      year: z.number().int().min(1).max(10),
      semester: z.number().int().min(1).max(2),
    }).parse({
      subject_name: body.subject_name,
      credits: body.credits,
      year: body.year,
      semester: body.semester,
    });

    const { data: subject, error } = await db.from('subjects').insert({
      user_id: userId,
      subject_name: validatedData.subject_name,
      credits: validatedData.credits,
      year: validatedData.year,
      semester: validatedData.semester,
    }).select().single();

    if (error) throw error;

    return NextResponse.json(
      { message: 'Subject created successfully', subjectId: subject.id },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('POST subject error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
