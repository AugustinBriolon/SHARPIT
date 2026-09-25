import { PrismaClient } from '@prisma/client';
import { seedDemoAthlete } from '../src/lib/demo/seed-demo-data';

const prisma = new PrismaClient();

seedDemoAthlete(prisma)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
