const cron = require('node-cron');
const { newsletterGenerateQueue } = require('../queues/newsletterGenerateQueue');

// Cron times are in UTC
// AU: 6am AEST = 8pm UTC previous day → 20:00 UTC
// NZ: 6am NZST = 6pm UTC previous day → 18:00 UTC
// UK: 7am GMT  = 7am UTC               → 07:00 UTC
// US: 6am EST  = 11am UTC              → 11:00 UTC
// CA: 6am EST  = 11am UTC              → 11:00 UTC
const NEWSLETTER_SCHEDULES = [
  // Daily (Mon–Fri)
  { jurisdiction: 'AU', cadence: 'DAILY', cron: '0 20 * * 1-5' },
  { jurisdiction: 'NZ', cadence: 'DAILY', cron: '0 18 * * 1-5' },
  { jurisdiction: 'UK', cadence: 'DAILY', cron: '0 7 * * 1-5' },
  { jurisdiction: 'US', cadence: 'DAILY', cron: '0 11 * * 1-5' },
  { jurisdiction: 'CA', cadence: 'DAILY', cron: '0 11 * * 1-5' },
  // Saturday Editorial
  { jurisdiction: 'AU', cadence: 'EDITORIAL', cron: '0 20 * * 6' },
  { jurisdiction: 'NZ', cadence: 'EDITORIAL', cron: '0 18 * * 6' },
  { jurisdiction: 'UK', cadence: 'EDITORIAL', cron: '0 7 * * 6' },
  { jurisdiction: 'US', cadence: 'EDITORIAL', cron: '0 11 * * 6' },
  { jurisdiction: 'CA', cadence: 'EDITORIAL', cron: '0 11 * * 6' },
  // Sunday Roundup
  { jurisdiction: 'AU', cadence: 'WEEKLY_ROUNDUP', cron: '0 20 * * 0' },
  { jurisdiction: 'NZ', cadence: 'WEEKLY_ROUNDUP', cron: '0 18 * * 0' },
  { jurisdiction: 'UK', cadence: 'WEEKLY_ROUNDUP', cron: '0 7 * * 0' },
  { jurisdiction: 'US', cadence: 'WEEKLY_ROUNDUP', cron: '0 11 * * 0' },
  { jurisdiction: 'CA', cadence: 'WEEKLY_ROUNDUP', cron: '0 11 * * 0' },
];

function startNewsletterScheduler() {
  for (const { jurisdiction, cadence, cron: schedule } of NEWSLETTER_SCHEDULES) {
    cron.schedule(schedule, async () => {
      console.log(`[newsletter-scheduler] Enqueuing newsletter generation for ${jurisdiction} (${cadence})`);
      try {
        await newsletterGenerateQueue.add('generate-newsletter', { jurisdiction, cadence });
      } catch (err) {
        console.error(`[newsletter-scheduler] Failed to enqueue for ${jurisdiction} (${cadence}):`, err.message);
      }
    });
    console.log(`[newsletter-scheduler] Scheduled ${jurisdiction} ${cadence} at ${schedule} UTC`);
  }
}

module.exports = { startNewsletterScheduler };
