require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmail() {
  try {
    // Try both normalized and non-normalized
    const emails = [
      'dan@propertyhack.com',
      'Dan@propertyhack.com',
      'DAN@propertyhack.com'
    ];

    console.log('Checking all variations...\n');

    for (const email of emails) {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      console.log(`Email: "${email}" - Found: ${!!user}`);
    }

    // List all users
    console.log('\n--- All users in database ---');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        superAdmin: true,
        role: true,
        emailVerified: true,
      }
    });
    console.log(JSON.stringify(allUsers, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmail();
