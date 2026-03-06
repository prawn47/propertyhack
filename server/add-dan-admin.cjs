const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createDanAdmin() {
  const email = 'dan@microrocket.com';
  const password = 'admin123';
  
  try {
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existing) {
      console.log('✅ User already exists!');
      console.log('\nLogin credentials:');
      console.log('Email:', email);
      console.log('Password:', password);
      return;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerified: true,
        superAdmin: true,
        role: 'super_admin',
        displayName: 'Dan',
        subscriptionTier: 'pro',
        subscriptionStatus: 'active'
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('\nLogin credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', user.id);
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDanAdmin();
