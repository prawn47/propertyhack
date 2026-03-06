require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testPassword() {
  try {
    const email = 'dan@propertyhack.com';
    const password = 'GO_Property';

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('Testing password verification...');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Password hash from DB:', user.passwordHash.substring(0, 20) + '...');
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('\n✅ Password matches:', isValid);

    if (!isValid) {
      console.log('\n⚠️  Password does NOT match!');
      console.log('This should not happen - hash was just created with this password.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPassword();
