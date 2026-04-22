import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prismaPkg from '@prisma/client';
const { PrismaClient, UserRole } = prismaPkg;

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@psci.notts';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      fullName: 'Isabella Yeboah',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true
    },
    create: {
      fullName: 'Isabella Yeboah',
      email,
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  console.log(`Seeded admin user: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
