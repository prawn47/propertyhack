/**
 * Henry Cleanup — deletes old AI assistant conversations (>90 days)
 * Dual-mode: CF Cron Trigger (via runHenryCleanup) or node-cron (local dev)
 * Ref: Beads workspace-8i6
 */
const { getClient } = require('../lib/prisma');

async function cleanupOldConversations() {
  const prisma = getClient();
  console.log('[henry-cleanup] Running old conversation cleanup...');

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  try {
    const result = await prisma.conversation.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });
    console.log(`[henry-cleanup] Deleted ${result.count} conversation(s) older than 90 days`);
  } catch (err) {
    console.error('[henry-cleanup] Failed to clean up conversations:', err.message);
  }
}

/**
 * Run cleanup once — called by CF Cron Trigger or node-cron.
 */
async function runHenryCleanup() {
  await cleanupOldConversations();
}

function startHenryCleanup() {
  const { isCFWorkers } = require('../queues/connection');
  if (isCFWorkers) {
    console.log('[henry-cleanup] CF Workers mode — cron triggers configured in wrangler.toml');
    return;
  }
  const cron = require('node-cron');
  cron.schedule('0 3 * * *', cleanupOldConversations, { timezone: 'Australia/Sydney' });
  console.log('[henry-cleanup] Scheduled daily cleanup at 3am');
}

module.exports = { startHenryCleanup, runHenryCleanup };
