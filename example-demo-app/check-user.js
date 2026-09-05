const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, username: true, passwordHash: true }
    });
    console.log('All users in DB:', JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error finding user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
