import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

function guard(session: any) {
  return !!(session?.user?.id && session.user.role === 'SUPERADMIN');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!guard(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const degreeId = parseInt((await params).id);
  const { data: templates, error } = await db
    .from('degree_subject_templates')
    .select('*')
    .eq('degree_id', degreeId)
    .order('year').order('semester').order('subject_name');

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json(templates ?? []);
}

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

  const { data: template, error } = await db
    .from('degree_subject_templates')
    .insert({ degree_id: degreeId, subject_name: subjectName.trim(), credits: parseFloat(credits), year: parseInt(year), semester: parseInt(semester) })
    .select().single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json(template, { status: 201 });
}

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

  const { data: existing } = await db.from('degree_subject_templates').select('id').eq('id', templateId).eq('degree_id', degreeId).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updateData: any = {};
  if (subjectName !== undefined) updateData.subject_name = subjectName.trim();
  if (credits !== undefined) updateData.credits = parseFloat(credits);
  if (year !== undefined) updateData.year = parseInt(year);
  if (semester !== undefined) updateData.semester = parseInt(semester);

  const { data: updated, error } = await db.from('degree_subject_templates').update(updateData).eq('id', templateId).select().single();
  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json(updated);
}

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

  const { data: existing } = await db.from('degree_subject_templates').select('id').eq('id', templateId).eq('degree_id', degreeId).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await db.from('degree_subject_templates').delete().eq('id', templateId);
  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ message: 'Deleted' });
}
