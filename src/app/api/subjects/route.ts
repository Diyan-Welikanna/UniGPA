import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const subjectSchema = z.object({
  subject_name: z.string().min(1, 'Subject name is required'),
  credits: z.number().min(0.5).max(10),
  year: z.number().int().min(1).max(10),
  semester: z.number().int().min(1).max(2)
});

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

    const subjects = await prisma.subject.findMany({
      where: {
        userId: parseInt(session.user.id),
        ...(year && { year: parseInt(year) }),
        ...(semester && { semester: parseInt(semester) })
      },
      include: {
        result: true
      },
      orderBy: [
        { year: 'asc' },
        { semester: 'asc' },
        { subjectName: 'asc' }
      ]
    });

    return NextResponse.json(subjects.map((subject: any) => ({
      id: subject.id,
      user_id: subject.userId,
      subject_name: subject.subjectName,
      credits: parseFloat(subject.credits.toString()),
      year: subject.year,
      semester: subject.semester,
      created_at: subject.createdAt,
      updated_at: subject.updatedAt,
      result: subject.result ? {
        id: subject.result.id,
        subject_id: subject.result.subjectId,
        grade_point: parseFloat(subject.result.gradePoint.toString()),
        status: subject.result.status,
        created_at: subject.result.createdAt,
        updated_at: subject.result.updatedAt
      } : undefined
    })));
  } catch (error) {
    console.error('GET subjects error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new subject
// Body may include _pendingDegree: PendingDegree to commit before saving subject
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
        // Create the degree record now (custom copy or brand-new custom)
        const deg = await (prisma as any).degree.create({
          data: {
            name: pd.pendingCreate.name,
            totalYears: pd.pendingCreate.totalYears,
            semestersPerYear: pd.pendingCreate.semestersPerYear,
            isCustom: true,
            createdByUserId: userId,
          },
        });
        degreeId = deg.id;
      } else {
        degreeId = pd.id;
      }

      await (prisma as any).user.update({ where: { id: userId }, data: { degreeId } });
    }
    // ──────────────────────────────────────────────────────────────────────

    const validatedData = subjectSchema.parse({
      subject_name: body.subject_name,
      credits: body.credits,
      year: body.year,
      semester: body.semester,
    });

    const subject = await prisma.subject.create({
      data: {
        userId,
        subjectName: validatedData.subject_name,
        credits: validatedData.credits,
        year: validatedData.year,
        semester: validatedData.semester,
      },
    });

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
