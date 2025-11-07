import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function reinstateAdmin() {
  try {
    const email = 'calebdrayton47@gmail.com';
    const password = 'secure_password_123'; // Change this to desired password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Update existing user to be super admin
      await prisma.user.update({
        where: { email },
        data: {
          superAdmin: true,
          emailVerified: true,
        }
      });
      console.log(`✅ Updated ${email} to super admin`);
    } else {
      // Create new user as super admin
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          superAdmin: true,
          emailVerified: true,
        }
      });
      console.log(`✅ Created ${email} as super admin`);
      console.log(`   Password: ${password}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

reinstateAdmin();
