/**
 * Shared Prisma Client for PropertyHack API
 *
 * Supports dual-mode operation:
 * - CF Workers: Uses driver adapter with Hyperdrive (pg + @prisma/adapter-pg)
 * - Local dev: Standard Prisma client
 *
 * The client is lazy-initialised to ensure CF environment bindings
 * are available before creating the connection.
 */
const { PrismaClient } = require('@prisma/client');

let prisma;

function createPrismaClient() {
  const isCF = typeof globalThis.__cf_env !== 'undefined';

  if (isCF) {
    // CF Workers — use driver adapter with Hyperdrive
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('[prisma] DATABASE_URL not set — Hyperdrive binding may be missing');
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    console.log('[prisma] Using driver adapter (CF Workers + Hyperdrive)');
    return new PrismaClient({ adapter });
  }

  // Local dev — standard Prisma
  return new PrismaClient();
}

// Use a Proxy to lazy-initialise the Prisma client on first use
// This ensures globalThis.__cf_env and process.env.DATABASE_URL are set
module.exports = new Proxy({}, {
  get(target, prop) {
    if (!prisma) {
      prisma = createPrismaClient();
    }
    return prisma[prop];
  },
});
