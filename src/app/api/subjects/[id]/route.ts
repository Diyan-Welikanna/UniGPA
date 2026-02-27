import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { z } from 'zod';

const subjectUpdateSchema = z.object({
  subject_name: z.string().min(1).optional(),
  credits: z.number().min(0.5).max(10).optional(),
  year: z.number().int().min(1).max(10).optional(),
  semester: z.number().int().min(1).max(2).optional()
});

// GET single subject
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { data: subject, error } = await db.from('subjects')
      .select('*')
      .eq('id', parseInt(id))
      .eq('user_id', parseInt(session.user.id))
      .single();

    if (error || !subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    return NextResponse.json(subject);
  } catch (error) {
    console.error('GET subject error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const validatedData = subjectUpdateSchema.parse(body);

    const updateData: any = {};
    if (validatedData.subject_name) updateData.subject_name = validatedData.subject_name;
    if (validatedData.credits) updateData.credits = validatedData.credits;
    if (validatedData.year) updateData.year = validatedData.year;
    if (validatedData.semester) updateData.semester = validatedData.semester;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { error } = await db.from('subjects')
      .update(updateData)
      .eq('id', parseInt(id))
      .eq('user_id', parseInt(session.user.id));

    if (error) throw error;
    return NextResponse.json({ message: 'Subject updated successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    console.error('PUT subject error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { error } = await db.from('subjects')
      .delete()
      .eq('id', parseInt(id))
      .eq('user_id', parseInt(session.user.id));

    if (error) throw error;
    return NextResponse.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('DELETE subject error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
