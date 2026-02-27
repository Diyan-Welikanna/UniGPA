import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifyCodeSchema.parse(body);

    // Find the most recent unused verification code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    if (!verificationCode.userId) {
      return NextResponse.json(
        { error: 'Verification code not linked to a user' },
        { status: 400 }
      );
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true },
    });

    // Mark user as verified
    await prisma.user.update({
      where: { id: verificationCode.userId },
      data: { isVerified: true },
    });

    return NextResponse.json({
      message: 'Email verified successfully',
      verified: true,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
