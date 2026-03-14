/**
 * Shared Prisma Client for PropertyHack API
 * 
 * Supports dual-mode operation:
 * - CF Workers: Uses driver adapter with Hyperdrive
 * - Local dev: Standard Prisma client
 */
const { PrismaClient } = require('@prisma/client');

let prisma;

// Initialize Prisma client based on environment
if (typeof globalThis.__cf_env !== 'undefined') {
  // CF Workers — use driver adapter with Hyperdrive
  const { Pool } = require('pg');
  const { PrismaPg } = require('@prisma/adapter-pg');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    // Hyperdrive handles connection pooling
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Local dev — standard Prisma
  prisma = new PrismaClient();
}

module.exports = prisma;