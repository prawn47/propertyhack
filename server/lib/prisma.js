/**
 * Shared Prisma Client for PropertyHack API
 *
 * Dual-mode:
 * - CF Workers: createRequestClient() builds a fresh client per request
 *   (Hyperdrive connections are request-scoped — caching the Pool causes hangs)
 * - Local dev: singleton client via require()
 */
const { PrismaClient } = require('@prisma/client');

let localPrisma;

function createRequestClient() {
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

function getLocalClient() {
  if (!localPrisma) {
    localPrisma = new PrismaClient();
  }
  return localPrisma;
}

const isCF = typeof globalThis.__cf_env !== 'undefined';
module.exports = isCF ? { createRequestClient } : getLocalClient();
module.exports.createRequestClient = createRequestClient;
