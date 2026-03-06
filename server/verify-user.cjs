require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'dan@propertyhack.com' }
    });

    if (user) {
      console.log('✅ User found in database');
      console.log('   Email:', user.email);
      console.log('   Super Admin:', user.superAdmin);
      console.log('   Role:', user.role);
      console.log('   Email Verified:', user.emailVerified);
      console.log('   Password hash exists:', !!user.passwordHash);
      console.log('   Password hash length:', user.passwordHash?.length);
      console.log('   Created:', user.createdAt);
    } else {
      console.log('❌ User NOT found in database');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUser();
