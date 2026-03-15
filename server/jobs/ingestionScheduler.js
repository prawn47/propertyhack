/**
 * Ingestion Scheduler — checks and enqueues due news sources
 * Dual-mode: CF Cron Trigger (via runScheduler) or node-cron (local dev)
 * Ref: Beads workspace-8i6
 */
const { getClient } = require('../lib/prisma');
const { sourceFetchQueue } = require('../queues/sourceFetchQueue');

const DEFAULT_SCHEDULES = {
  RSS:         '*/30 * * * *',  // 30 min
  NEWSAPI_ORG: '0 */3 * * *',   // 3 hours
  NEWSAPI_AI:  '0 */4 * * *',   // 4 hours
  SCRAPER:     '0 */5 * * *',   // 5 hours
  PERPLEXITY:  '0 */8 * * *',   // 8 hours
  NEWSLETTER:  null,             // on-demand only
  SOCIAL:      null,             // on-demand only
  MANUAL:      null,             // on-demand only
};

const MARKET_TIMEZONES = {
  AU: 'Australia/Sydney',
  US: 'America/New_York',
  UK: 'Europe/London',
  CA: 'America/Toronto',
};

function getLocalHour(market) {
  const tz = MARKET_TIMEZONES[market] || MARKET_TIMEZONES.AU;
  return new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false });
}

function isOffPeak(market) {
  const hour = parseInt(getLocalHour(market), 10);
  return hour >= 22 || hour < 5; // 10pm–5am local time
}

function isSourceDue(source) {
  const defaultSchedule = DEFAULT_SCHEDULES[source.type];
  if (defaultSchedule === null) return false;

  if (!source.lastFetchAt) return true;

  const schedule = source.schedule || defaultSchedule || '*/30 * * * *';
  let intervalMs = parseCronIntervalMs(schedule);

  // During off-peak hours in the source's market, fetch 3x less often
  if (isOffPeak(source.market)) {
    intervalMs *= 3;
  }

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
  const prisma = getClient();
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

/**
 * Run the scheduler once — called by CF Cron Trigger or node-cron.
 * Exported for use in worker-entry.js scheduled handler.
 */
async function runScheduler() {
  await checkAndEnqueueSources();
}

function startScheduler() {
  const { isCFWorkers } = require('../queues/connection');
  if (isCFWorkers) {
    // CF Workers — cron triggers handled by worker-entry.js scheduled handler
    console.log('[ingestion-scheduler] CF Workers mode — cron triggers configured in wrangler.toml');
    return;
  }
  const cron = require('node-cron');
  console.log('[ingestion-scheduler] Starting — runs every 5 minutes');
  cron.schedule('*/5 * * * *', checkAndEnqueueSources);
}

module.exports = { startScheduler, runScheduler };
