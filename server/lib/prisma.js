/**
 * Shared Prisma Client for PropertyHack API
 *
 * Dual-mode:
 * - CF Workers: getClient() builds a fresh client with driver adapter per call
 *   (Hyperdrive connections are request-scoped — caching causes hangs)
 * - Local dev: getClient() returns a singleton
 */
const { PrismaClient } = require('@prisma/client');

let localPrisma;

function getClient() {
  const isCF = typeof globalThis.__cf_env !== 'undefined';

  if (isCF) {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('[prisma] DATABASE_URL not set — Hyperdrive binding may be missing');
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  if (!localPrisma) {
    localPrisma = new PrismaClient();
  }
  return localPrisma;
}

module.exports = { getClient };
