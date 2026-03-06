const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sourceFetchQueue } = require('../queues/sourceFetchQueue');

const prisma = new PrismaClient();

function isSourceDue(source) {
  if (!source.lastFetchAt) return true;

  const schedule = source.schedule || '*/30 * * * *';
  const intervalMs = parseCronIntervalMs(schedule);
  const elapsed = Date.now() - new Date(source.lastFetchAt).getTime();
  return elapsed >= intervalMs;
}

function parseCronIntervalMs(schedule) {
  const minuteMatch = schedule.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (minuteMatch) {
    return parseInt(minuteMatch[1], 10) * 60 * 1000;
  }

  const hourMatch = schedule.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 60 * 60 * 1000;
  }

  return 30 * 60 * 1000;
}

async function checkAndEnqueueSources() {
  console.log('[ingestion-scheduler] Checking active sources...');

  let sources;
  try {
    sources = await prisma.ingestionSource.findMany({
      where: { isActive: true },
    });
  } catch (err) {
    console.error('[ingestion-scheduler] Failed to query sources:', err.message);
    return;
  }

  console.log(`[ingestion-scheduler] Found ${sources.length} active source(s)`);

  const due = sources.filter(isSourceDue);
  console.log(`[ingestion-scheduler] ${due.length} source(s) are due for fetching`);

  for (const source of due) {
    try {
      await sourceFetchQueue.add('fetch-source', {
        sourceId: source.id,
        sourceType: source.type,
        config: source.config,
      });
      console.log(`[ingestion-scheduler] Enqueued source ${source.id} (${source.name}, type: ${source.type})`);
    } catch (err) {
      console.error(`[ingestion-scheduler] Failed to enqueue source ${source.id}:`, err.message);
    }
  }
}

function startScheduler() {
  console.log('[ingestion-scheduler] Starting — runs every 5 minutes');
  cron.schedule('*/5 * * * *', checkAndEnqueueSources);
}

module.exports = { startScheduler };
