import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// POST /api/admin/degrees/publish
// Body: { degreeId: number } — copy superadmin's own subjects as templates for that degree
// Body: { degreeId: number, newName: string } — create a brand-new system degree from the admin's subjects
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const userId = parseInt(session.user.id);
  const body = await req.json();

  let { degreeId, newName, totalYears, semestersPerYear } = body;

  // If newName provided, create a new system degree first
  if (newName) {
    if (!totalYears || !semestersPerYear) {
      return NextResponse.json({ error: 'totalYears and semestersPerYear required for new degree' }, { status: 400 });
    }
    const deg = await (prisma as any).degree.create({
      data: {
        name: newName.trim(),
        totalYears: parseInt(totalYears),
        semestersPerYear: parseInt(semestersPerYear),
        isCustom: false,
        createdByUserId: null,
      },
    });
    degreeId = deg.id;
  }

  if (!degreeId) return NextResponse.json({ error: 'degreeId or newName required' }, { status: 400 });

  // Fetch the admin's own subjects (no results — templates don't need grades)
  const subjects = await prisma.subject.findMany({
    where: { userId },
    select: { subjectName: true, credits: true, year: true, semester: true },
    orderBy: [{ year: 'asc' }, { semester: 'asc' }, { subjectName: 'asc' }],
  });

  if (subjects.length === 0) {
    return NextResponse.json({ error: 'You have no subjects to publish' }, { status: 400 });
  }

  // Delete existing templates for this degree and replace with fresh ones
  await (prisma as any).degreeSubjectTemplate.deleteMany({ where: { degreeId } });
  await (prisma as any).degreeSubjectTemplate.createMany({
    data: subjects.map((s) => ({
      degreeId,
      subjectName: s.subjectName,
      credits: s.credits,
      year: s.year,
      semester: s.semester,
    })),
  });

  return NextResponse.json({ message: 'Published', degreeId, count: subjects.length }, { status: 201 });
}
