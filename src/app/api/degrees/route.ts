import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET — list all degrees (system + user's own custom)
// ?withSubjects=1  → returns array of degreeIds that the user has subjects under
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id) : null;

    const { searchParams } = new URL(request.url);

    // Return the set of degreeIds this user has committed subjects under
    if (searchParams.get('withSubjects') === '1') {
      if (!userId) return NextResponse.json([]);
      const subjects = await prisma.subject.findMany({
        where: { userId },
        select: { user: { select: { degreeId: true } } },
        distinct: ['userId'],
      });
      // Get all unique degreeIds from users who have subjects — simpler: just query users
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { degreeId: true },
      });
      // A degree is "committed" if user.degreeId is set AND they have subjects
      const hasSubjects = subjects.length > 0;
      const ids: number[] = user?.degreeId && hasSubjects ? [user.degreeId] : [];

      // Also check all past degree records where user has subjects
      // by looking at subjects — they're all under the current degreeId
      // For multi-degree: query subjects grouped would require a subjects.degreeId column
      // (not in schema yet) — so for now return current degreeId if has subjects
      return NextResponse.json(ids);
    }

    const degrees = await (prisma as any).degree.findMany({
      where: {
        OR: [
          { isCustom: false },
          ...(userId ? [{ isCustom: true, createdByUserId: userId }] : []),
        ],
      },
      include: {
        _count: { select: { subjectTemplates: true } },
      },
      orderBy: [{ isCustom: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(degrees);
  } catch (error) {
    console.error('GET degrees error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/degrees?id=N — superadmin only, removes a system degree
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') ?? '');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const degree = await (prisma as any).degree.findUnique({ where: { id } });
    if (!degree) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (degree.isCustom) return NextResponse.json({ error: 'Cannot delete custom user degrees from here' }, { status: 400 });

    await (prisma as any).degree.delete({ where: { id } });
    return NextResponse.json({ message: 'Degree deleted' });
  } catch (error) {
    console.error('DELETE degree error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(session.user.id);
    const body = await request.json();

    // ── Admin: create a system (non-custom) degree ──
    if (body.action === 'admin-create') {
      if (session.user.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { name, totalYears, semestersPerYear } = body;
      if (!name || !totalYears || !semestersPerYear) {
        return NextResponse.json({ error: 'name, totalYears and semestersPerYear are required' }, { status: 400 });
      }
      const degree = await (prisma as any).degree.create({
        data: {
          name: name.trim(),
          totalYears: parseInt(totalYears),
          semestersPerYear: parseInt(semestersPerYear),
          isCustom: false,
          createdByUserId: null,
        },
      });
      return NextResponse.json({ message: 'System degree created', degree }, { status: 201 });
    }

    // ── Create custom degree ──
    if (body.action === 'create') {
      const { name, totalYears, semestersPerYear } = body;
      if (!name || !totalYears || !semestersPerYear) {
        return NextResponse.json({ error: 'name, totalYears and semestersPerYear are required' }, { status: 400 });
      }
      const degree = await (prisma as any).degree.create({
        data: {
          name: name.trim(),
          totalYears: parseInt(totalYears),
          semestersPerYear: parseInt(semestersPerYear),
          isCustom: true,
          createdByUserId: userId,
        },
      });
      return NextResponse.json({ message: 'Custom degree created', degree }, { status: 201 });
    }

    // ── Select a degree ──
    const { degreeId } = body;
    if (!degreeId || typeof degreeId !== 'number') {
      return NextResponse.json({ error: 'degreeId is required' }, { status: 400 });
    }
    const degree = await (prisma as any).degree.findUnique({
      where: { id: degreeId },
      include: { subjectTemplates: true },
    });
    if (!degree) {
      return NextResponse.json({ error: 'Degree not found' }, { status: 404 });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { degreeId },
    });

    // Auto-copy subject templates as the user's real subjects (no grades)
    let copiedCount = 0;
    if (degree.subjectTemplates?.length > 0) {
      // Only copy if user has no subjects yet
      const existing = await prisma.subject.count({ where: { userId } });
      if (existing === 0) {
        await prisma.subject.createMany({
          data: degree.subjectTemplates.map((t: any) => ({
            userId,
            subjectName: t.subjectName,
            credits: t.credits,
            year: t.year,
            semester: t.semester,
          })),
        });
        copiedCount = degree.subjectTemplates.length;
      }
    }

    return NextResponse.json({ message: 'Degree selected', degree, copiedSubjects: copiedCount });
  } catch (error) {
    console.error('POST degree error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
