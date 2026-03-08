const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupOldConversations() {
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

function startHenryCleanup() {
  // Run daily at 3am
  cron.schedule('0 3 * * *', cleanupOldConversations);
  console.log('[henry-cleanup] Scheduled daily cleanup at 3am');
}

module.exports = { startHenryCleanup };
