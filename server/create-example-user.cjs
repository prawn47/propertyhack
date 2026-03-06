require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createExampleUser() {
  try {
    const exampleEmail = 'user@example.com';
    const examplePassword = 'Example123!';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: exampleEmail }
    });

    if (existingUser) {
      console.log('⚠️  User already exists:', exampleEmail);
      console.log('   Email:', exampleEmail);
      console.log('   Password: Example123!');
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(examplePassword, saltRounds);

    // Create user with trial subscription
    const user = await prisma.user.create({
      data: {
        email: exampleEmail,
        passwordHash,
        emailVerified: true,
        role: 'admin',
        displayName: 'Example User',
        subscriptionTier: 'free',
        subscriptionStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      },
    });

    console.log('✅ Example user created:', user.email);

    // Create default settings
    const defaultSettings = {
      toneOfVoice: 'Professional & Engaging',
      industry: 'Real Estate & Property Investment',
      position: 'Property Investment Advisor',
      audience: 'Property investors, first-home buyers, and real estate professionals',
      postGoal: 'To educate and inform about property market trends and investment opportunities',
      keywords: 'property investment, real estate, market trends, property analysis',
      contentExamples: JSON.stringify([
        "The Australian property market continues to show resilience despite economic headwinds. Here's what investors need to know about the current landscape.",
        "Interest rate movements are reshaping buyer behavior. Understanding these shifts is crucial for making informed property decisions in 2024.",
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
    console.log('\n🎉 Example account ready!');
    console.log('   Email:', exampleEmail);
    console.log('   Password:', examplePassword);
    console.log('   Role: admin');
    console.log('   Trial ends:', user.trialEndsAt.toLocaleDateString());
  } catch (error) {
    console.error('❌ Error creating example user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createExampleUser()
  .then(() => {
    console.log('\n✅ User creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ User creation failed:', error);
    process.exit(1);
  });
