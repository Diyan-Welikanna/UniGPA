import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { GPACalculator } from '@/lib/gpaCalculator';
import { SubjectWithResult } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'cumulative';
    const year = searchParams.get('year');
    const semester = searchParams.get('semester');
    const years = searchParams.get('years')?.split(',').map(Number);
    const includeIncomplete = searchParams.get('includeIncomplete') === 'true';

    // Get user's current degree_id so we only calculate GPA for the active degree
    const { data: user } = await db.from('users').select('degree_id').eq('id', parseInt(session.user.id)).single();
    const degreeId = user?.degree_id;
    if (!degreeId) return NextResponse.json({ error: 'No degree selected' }, { status: 400 });

    const { data: subjectsData, error } = await db
      .from('subjects')
      .select('*, result:results(*)')
      .eq('user_id', parseInt(session.user.id))
      .eq('degree_id', degreeId)
      .order('year').order('semester').order('subject_name');

    if (error) throw error;

    const subjects: SubjectWithResult[] = (subjectsData ?? []).map((s: any) => ({
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
    }));

    let result;
    switch (type) {
      case 'semester':
        if (!year || !semester) return NextResponse.json({ error: 'Year and semester are required' }, { status: 400 });
        result = GPACalculator.calculateSemesterGPA(subjects, parseInt(year), parseInt(semester), includeIncomplete);
        break;
      case 'year':
        if (!year) return NextResponse.json({ error: 'Year is required' }, { status: 400 });
        result = GPACalculator.calculateYearGPA(subjects, parseInt(year), includeIncomplete);
        break;
      case 'multi-year':
        if (!years || years.length === 0) return NextResponse.json({ error: 'Years are required' }, { status: 400 });
        result = GPACalculator.calculateMultiYearGPA(subjects, years, includeIncomplete);
        break;
      case 'breakdown':
        result = {
          breakdown: GPACalculator.getGPABreakdown(subjects, includeIncomplete),
          cumulative: GPACalculator.calculateCumulativeGPA(subjects, includeIncomplete),
          availableYears: GPACalculator.getAvailableYears(subjects),
        };
        break;
      case 'cumulative':
      default:
        result = GPACalculator.calculateCumulativeGPA(subjects, includeIncomplete);
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GPA calculation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
