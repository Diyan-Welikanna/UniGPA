import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const subject = await prisma.subject.findFirst({
      where: {
        id: parseInt(id),
        userId: parseInt(session.user.id)
      }
    });

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json(subject);
  } catch (error) {
    console.error('GET subject error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const validatedData = subjectUpdateSchema.parse(body);

    const updateData: any = {};
    if (validatedData.subject_name) updateData.subjectName = validatedData.subject_name;
    if (validatedData.credits) updateData.credits = validatedData.credits;
    if (validatedData.year) updateData.year = validatedData.year;
    if (validatedData.semester) updateData.semester = validatedData.semester;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    await prisma.subject.updateMany({
      where: {
        id: parseInt(id),
        userId: parseInt(session.user.id)
      },
      data: updateData
    });

    return NextResponse.json({ message: 'Subject updated successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('PUT subject error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.subject.deleteMany({
      where: {
        id: parseInt(id),
        userId: parseInt(session.user.id)
      }
    });

    return NextResponse.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('DELETE subject error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
