const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const adapter = new PrismaMariaDb({ host: 'localhost', port: 3306, user: 'root', password: '', database: 'gpa_calculator' });
const prisma = new PrismaClient({ adapter });

const degrees = [
  { name: 'Computer Science', totalYears: 3 },
  { name: 'Information Technology', totalYears: 3 },
  { name: 'Software Engineering', totalYears: 4 },
  { name: 'Business Administration', totalYears: 3 },
  { name: 'Engineering', totalYears: 4 },
  { name: 'Medicine', totalYears: 5 },
  { name: 'Law', totalYears: 4 },
  { name: 'Education', totalYears: 3 },
  { name: 'Other', totalYears: 3 },
];

async function main() {
  for (const d of degrees) {
    const existing = await prisma.degree.findFirst({ where: { name: d.name } });
    if (!existing) {
      await prisma.degree.create({ data: d });
      console.log('Created:', d.name);
    } else {
      console.log('Already exists:', d.name);
    }
  }
  const all = await prisma.degree.findMany();
  console.log('\nAll degrees:', all.map(d => `${d.id}. ${d.name} (${d.totalYears}y)`));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
