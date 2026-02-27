import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { z } from 'zod';

const resultSchema = z.object({
  subject_id: z.number().int().positive(),
  grade_point: z.number().min(0).max(4.0),
  status: z.enum(['Completed', 'Incomplete']).default('Completed')
});

// GET result by subject_id
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subject_id');
    if (!subjectId) return NextResponse.json({ error: 'subject_id is required' }, { status: 400 });

    // Verify subject belongs to user
    const { data: subject } = await db.from('subjects').select('id').eq('id', parseInt(subjectId)).eq('user_id', parseInt(session.user.id)).single();
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

    const { data: result, error } = await db.from('results').select('*').eq('subject_id', parseInt(subjectId)).single();
    if (error || !result) return NextResponse.json({ error: 'Result not found' }, { status: 404 });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET result error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create or update result
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const validatedData = resultSchema.parse(body);

    // Verify subject belongs to user
    const { data: subject } = await db.from('subjects').select('id').eq('id', validatedData.subject_id).eq('user_id', parseInt(session.user.id)).single();
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

    // Upsert result
    const { data: result, error } = await db.from('results').upsert(
      { subject_id: validatedData.subject_id, grade_point: validatedData.grade_point, status: validatedData.status },
      { onConflict: 'subject_id' }
    ).select().single();

    if (error) throw error;

    return NextResponse.json({ message: 'Result saved successfully', resultId: result.id }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    console.error('POST result error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE result
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subject_id');
    if (!subjectId) return NextResponse.json({ error: 'subject_id is required' }, { status: 400 });

    // Verify subject belongs to user
    const { data: subject } = await db.from('subjects').select('id').eq('id', parseInt(subjectId)).eq('user_id', parseInt(session.user.id)).single();
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

    const { error } = await db.from('results').delete().eq('subject_id', parseInt(subjectId));
    if (error) throw error;

    return NextResponse.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('DELETE result error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
