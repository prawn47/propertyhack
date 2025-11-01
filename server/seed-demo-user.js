require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedDemoUser() {
  try {
    const demoEmail = 'demo@quord.ai';
    const demoPassword = 'demo123';

    // Check if demo user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: demoEmail }
    });

    if (existingUser) {
      console.log('✅ Demo user already exists:', demoEmail);
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(demoPassword, saltRounds);

    // Create demo user
    const user = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash,
        emailVerified: true, // Auto-verify demo user
      },
    });

    console.log('✅ Demo user created:', user.email);

    // Create default settings for demo user
    const defaultSettings = {
      toneOfVoice: 'Professional & Authoritative',
      industry: 'Technology (SaaS)',
      position: 'Senior Product Manager',
      audience: 'Tech executives, product leaders, and investors',
      postGoal: 'To establish thought leadership and drive engagement',
      keywords: 'AI, Product Management, SaaS, Go-to-Market',
      contentExamples: JSON.stringify([
        "The GTM flywheel is spinning faster than ever. What worked 5 years ago is now obsolete. The key? Product-led growth isn't just a buzzword, it's a fundamental shift in how we build and sell. Are you adapting?",
        "Cross-functional alignment is the secret sauce to shipping great products. It's less about fancy tools and more about shared context and radical empathy. Here's my 3-step framework for bridging the gap between Eng, Product, and Design.",
      ]),
      timeZone: 'America/New_York',
      preferredTime: '09:00',
      profilePictureUrl: null,
      englishVariant: 'American',
    };

    await prisma.userSettings.create({
      data: {
        userId: user.id,
        ...defaultSettings,
      }
    });

    console.log('✅ Demo user settings created');
    console.log('\n🎉 Demo account ready!');
    console.log('   Email: demo@quord.ai');
    console.log('   Password: demo123');
  } catch (error) {
    console.error('❌ Error seeding demo user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoUser()
  .then(() => {
    console.log('\n✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });
