require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    const adminEmail = 'dan@propertyhack.com';
    const adminPassword = 'GO_Property';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      console.log('⚠️  User already exists:', adminEmail);
      console.log('   Email:', adminEmail);
      console.log('   Password: GO_Property');
      console.log('   Super Admin:', existingUser.superAdmin);
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Create super admin user
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        emailVerified: true,
        superAdmin: true,
        role: 'super_admin',
        displayName: 'Dan',
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        trialEndsAt: null,
        subscriptionEndsAt: null,
      },
    });

    console.log('✅ Super admin user created:', user.email);

    // Create default settings
    const defaultSettings = {
      toneOfVoice: 'Professional & Engaging',
      industry: 'Real Estate & Property Investment',
      position: 'Property Investment Expert',
      audience: 'Property investors, first-home buyers, and real estate professionals',
      postGoal: 'To educate and inform about property market trends and investment opportunities',
      keywords: 'property investment, real estate, market trends, property analysis',
      contentExamples: JSON.stringify([
        "The Australian property market continues to show resilience despite economic headwinds. Here's what investors need to know about the current landscape.",
        "Interest rate movements are reshaping buyer behavior. Understanding these shifts is crucial for making informed property decisions.",
      ]),
      timeZone: 'Australia/Sydney',
      preferredTime: '08:00',
      profilePictureUrl: null,
      englishVariant: 'Australian',
    };

    await prisma.userSettings.create({
      data: {
        userId: user.id,
        ...defaultSettings,
      }
    });

    console.log('✅ User settings created');
    console.log('\n🎉 Super admin account ready!');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    console.log('   Role: super_admin');
    console.log('   Super Admin: true');
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin()
  .then(() => {
    console.log('\n✅ Super admin creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Super admin creation failed:', error);
    process.exit(1);
  });
