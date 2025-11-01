require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testDemoLogin() {
  try {
    const demoEmail = 'demo@quord.ai';
    const demoPassword = 'demo123';

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: demoEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
      }
    });

    if (!user) {
      console.log('❌ Demo user not found in database');
      return;
    }

    console.log('✅ Demo user found:', user.email);
    console.log('   Email verified:', user.emailVerified);

    // Test password
    const isValidPassword = await bcrypt.compare(demoPassword, user.passwordHash);
    
    if (isValidPassword) {
      console.log('✅ Password is correct!');
      console.log('\n🎉 Demo login credentials are valid:');
      console.log('   Email: demo@quord.ai');
      console.log('   Password: demo123');
    } else {
      console.log('❌ Password is incorrect - needs to be reset');
      
      // Reset password
      console.log('\n🔧 Resetting password to "demo123"...');
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(demoPassword, saltRounds);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash }
      });
      
      console.log('✅ Password reset successfully!');
      console.log('\n🎉 Demo login credentials are now:');
      console.log('   Email: demo@quord.ai');
      console.log('   Password: demo123');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testDemoLogin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
