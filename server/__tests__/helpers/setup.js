// Test database setup/teardown helpers
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function setupTestDb() {
  // Clean tables in dependency order
  await prisma.$executeRaw`TRUNCATE TABLE articles, ingestion_sources, ingestion_logs, social_posts CASCADE`
}

export async function teardownTestDb() {
  await prisma.$disconnect()
}

export function createTestUser() {
  return {
    email: 'admin@propertyhack.com',
    password: 'testpassword123',
    superAdmin: true,
  }
}

export { prisma }
