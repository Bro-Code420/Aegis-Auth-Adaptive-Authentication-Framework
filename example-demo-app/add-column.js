const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding passwordHash column to User table...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;`);
    console.log('Successfully added column.');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('Column already exists.');
    } else {
      console.error('Error adding column:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
