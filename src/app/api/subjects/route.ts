import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET all subjects for logged-in user, filtered by their current degree
// Merges actual user subjects with degree template subjects (templates shown as read-only placeholders)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const semester = searchParams.get('semester');

    // Get the user's current degree_id
    const { data: user } = await db.from('users').select('degree_id').eq('id', userId).single();
    const degreeId = user?.degree_id;

    if (!degreeId) return NextResponse.json([]);

    // Fetch user's actual subjects for this degree
    let query = db
      .from('subjects')
      .select('*, result:results(*)')
      .eq('user_id', userId)
      .eq('degree_id', degreeId)
      .order('year', { ascending: true })
      .order('semester', { ascending: true })
      .order('subject_name', { ascending: true });

    if (year) query = query.eq('year', parseInt(year));
    if (semester) query = query.eq('semester', parseInt(semester));

    const { data: subjects, error } = await query;
    if (error) throw error;

    const realSubjects = (subjects ?? []).map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      subject_name: s.subject_name,
      credits: parseFloat(s.credits),
      year: s.year,
      semester: s.semester,
      isTemplate: false,
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
    }));

    // Fetch degree templates
    let tQuery = db
      .from('degree_subject_templates')
      .select('*')
      .eq('degree_id', degreeId)
      .order('year', { ascending: true })
      .order('semester', { ascending: true })
      .order('subject_name', { ascending: true });

    if (year) tQuery = tQuery.eq('year', parseInt(year));
    if (semester) tQuery = tQuery.eq('semester', parseInt(semester));

    const { data: templates } = await tQuery;

    // Build a set of real subject keys to avoid duplicating templates already materialized
    const realKeys = new Set(realSubjects.map((s: any) =>
      `${s.subject_name.toLowerCase()}|${s.year}|${s.semester}`
    ));

    const templateSubjects = (templates ?? [])
      .filter((t: any) => !realKeys.has(`${t.subject_name.toLowerCase()}|${t.year}|${t.semester}`))
      .map((t: any) => ({
        id: null,
        templateId: t.id,
        user_id: userId,
        subject_name: t.subject_name,
        credits: parseFloat(t.credits),
        year: t.year,
        semester: t.semester,
        isTemplate: true,
        result: undefined,
      }));

    // Merge: real subjects first, then remaining templates, sorted by year/semester/name
    const merged = [...realSubjects, ...templateSubjects].sort((a, b) =>
      a.year - b.year || a.semester - b.semester || a.subject_name.localeCompare(b.subject_name)
    );

    return NextResponse.json(merged);
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

    // Get the user's current degree_id from DB (always committed before subjects are added now)
    const { data: user } = await db.from('users').select('degree_id').eq('id', userId).single();
    const resolvedDegreeId = user?.degree_id;

    if (!resolvedDegreeId) {
      return NextResponse.json({ error: 'No degree selected' }, { status: 400 });
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
      degree_id: resolvedDegreeId,
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
