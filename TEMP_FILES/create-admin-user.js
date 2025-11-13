const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminUser() {
  const email = 'admin@propertyhack.com';
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
        displayName: 'Admin User',
      }
    });
    
    // Create default settings
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        toneOfVoice: 'Professional',
        industry: 'Property',
        position: 'Admin',
        audience: 'Property investors and buyers',
        postGoal: 'Inform',
        keywords: '["property", "real estate", "housing"]',
        contentExamples: '[]',
        timeZone: 'Australia/Sydney',
        preferredTime: '09:00',
        englishVariant: 'Australian',
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('\nLogin credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\nAccess the app at: http://localhost:3004');
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
