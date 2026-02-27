import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if email already registered
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Check if username already taken
    const existingUsername = await (prisma as any).user.findUnique({
      where: { username: validatedData.username }
    });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const user = await (prisma as any).user.create({
      data: {
        name: validatedData.name,
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        isVerified: true
      }
    });

    return NextResponse.json(
      { message: 'Account created! You can now log in.' },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.includes('username') ? 'Username' : 'Email';
      return NextResponse.json({ error: `${field} already exists` }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
