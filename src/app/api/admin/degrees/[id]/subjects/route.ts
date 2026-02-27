import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

function guard(session: any) {
  if (!session?.user?.id || session.user.role !== 'SUPERADMIN') return false;
  return true;
}

// GET /api/admin/degrees/[id]/subjects — list templates for a degree
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!guard(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const degreeId = parseInt((await params).id);
  const templates = await (prisma as any).degreeSubjectTemplate.findMany({
    where: { degreeId },
    orderBy: [{ year: 'asc' }, { semester: 'asc' }, { subjectName: 'asc' }],
  });
  return NextResponse.json(templates);
}

// POST /api/admin/degrees/[id]/subjects — add a template subject
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!guard(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const degreeId = parseInt((await params).id);
  const body = await req.json();
  const { subjectName, credits, year, semester } = body;

  if (!subjectName?.trim() || !credits || !year || !semester) {
    return NextResponse.json({ error: 'subjectName, credits, year and semester are required' }, { status: 400 });
  }

  const template = await (prisma as any).degreeSubjectTemplate.create({
    data: {
      degreeId,
      subjectName: subjectName.trim(),
      credits: parseFloat(credits),
      year: parseInt(year),
      semester: parseInt(semester),
    },
  });
  return NextResponse.json(template, { status: 201 });
}

// PATCH /api/admin/degrees/[id]/subjects — update a template subject
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!guard(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const degreeId = parseInt((await params).id);
  const body = await req.json();
  const { templateId, subjectName, credits, year, semester } = body;

  if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });

  const existing = await (prisma as any).degreeSubjectTemplate.findFirst({
    where: { id: templateId, degreeId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await (prisma as any).degreeSubjectTemplate.update({
    where: { id: templateId },
    data: {
      ...(subjectName !== undefined && { subjectName: subjectName.trim() }),
      ...(credits !== undefined && { credits: parseFloat(credits) }),
      ...(year !== undefined && { year: parseInt(year) }),
      ...(semester !== undefined && { semester: parseInt(semester) }),
    },
  });
  return NextResponse.json(updated);
}

// DELETE /api/admin/degrees/[id]/subjects?templateId=N — remove a template subject
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!guard(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const degreeId = parseInt((await params).id);
  const { searchParams } = new URL(req.url);
  const templateId = parseInt(searchParams.get('templateId') ?? '');

  if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });

  const existing = await (prisma as any).degreeSubjectTemplate.findFirst({
    where: { id: templateId, degreeId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await (prisma as any).degreeSubjectTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ message: 'Deleted' });
}
