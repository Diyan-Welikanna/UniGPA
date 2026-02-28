import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifyCodeSchema.parse(body);

    const { data: verificationCode } = await db
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!verificationCode) return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    if (!verificationCode.user_id) return NextResponse.json({ error: 'Verification code not linked to a user' }, { status: 400 });

    await db.from('verification_codes').update({ used: true }).eq('id', verificationCode.id);
    await db.from('users').update({ is_verified: true }).eq('id', verificationCode.user_id);

    return NextResponse.json({ message: 'Email verified successfully', verified: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    console.error('Verify code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
