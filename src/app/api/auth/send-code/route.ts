import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EmailService } from '@/lib/email';
import { z } from 'zod';

const sendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = sendCodeSchema.parse(body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      );
    }

    // Generate verification code
    const code = EmailService.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save code to database
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        expiresAt,
      },
    });

    // Send email via Web3Forms
    const emailSent = await EmailService.sendVerificationCode(
      user.email,
      code,
      user.name
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Verification code sent to your email',
      email: user.email,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Send code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
