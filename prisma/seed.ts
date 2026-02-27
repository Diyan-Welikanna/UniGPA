import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  // ── Superadmin ──────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin1234', 10);
  const superAdmin = await (prisma as any).user.upsert({
    where: { email: 'superadmin@gpa.local' },
    update: { role: 'SUPERADMIN', username: 'superadmin' },
    create: {
      name: 'Super Admin',
      username: 'superadmin',
      email: 'superadmin@gpa.local',
      password: adminPassword,
      isVerified: true,
      role: 'SUPERADMIN',
    },
  });
  console.log('Superadmin upserted:', superAdmin.email);

  // ── Test user ────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);

  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      name: 'Test User',
      username: 'test_user',
      email: 'test@example.com',
      password: hashedPassword,
    },
  });

  console.log('Test user created:', testUser);

  // Add sample subjects for Year 1, Semester 1
  const subject1 = await prisma.subject.create({
    data: {
      userId: testUser.id,
      subjectName: 'Mathematics I',
      credits: 3.0,
      year: 1,
      semester: 1,
    },
  });

  const subject2 = await prisma.subject.create({
    data: {
      userId: testUser.id,
      subjectName: 'Physics I',
      credits: 4.0,
      year: 1,
      semester: 1,
    },
  });

  const subject3 = await prisma.subject.create({
    data: {
      userId: testUser.id,
      subjectName: 'Chemistry I',
      credits: 3.0,
      year: 1,
      semester: 1,
    },
  });

  // Add results
  await prisma.result.create({
    data: {
      subjectId: subject1.id,
      gradePoint: 3.7,
      status: 'Completed',
    },
  });

  await prisma.result.create({
    data: {
      subjectId: subject2.id,
      gradePoint: 3.3,
      status: 'Completed',
    },
  });

  await prisma.result.create({
    data: {
      subjectId: subject3.id,
      gradePoint: 4.0,
      status: 'Completed',
    },
  });

  console.log('Sample data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
