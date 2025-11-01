const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeSuperAdmin() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('Usage: node make-super-admin.js <user-email>');
    process.exit(1);
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.error(`User with email '${email}' not found.`);
      process.exit(1);
    }
    
    if (user.superAdmin) {
      console.log(`User '${email}' is already a super admin.`);
      process.exit(0);
    }
    
    await prisma.user.update({
      where: { email },
      data: { superAdmin: true }
    });
    
    console.log(`✓ Successfully promoted '${email}' to super admin!`);
  } catch (error) {
    console.error('Error promoting user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeSuperAdmin();
