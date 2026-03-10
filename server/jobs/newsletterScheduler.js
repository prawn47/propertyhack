const cron = require('node-cron');
const { newsletterGenerateQueue } = require('../queues/newsletterGenerateQueue');

// Cron times are in UTC
// AU: 6am AEST = 8pm UTC previous day → 20:00 UTC
// NZ: 6am NZST = 6pm UTC previous day → 18:00 UTC
// UK: 7am GMT  = 7am UTC               → 07:00 UTC
// US: 6am EST  = 11am UTC              → 11:00 UTC
// CA: 6am EST  = 11am UTC              → 11:00 UTC
const NEWSLETTER_SCHEDULES = [
  { jurisdiction: 'AU', cron: '0 20 * * *' },
  { jurisdiction: 'NZ', cron: '0 18 * * *' },
  { jurisdiction: 'UK', cron: '0 7 * * *'  },
  { jurisdiction: 'US', cron: '0 11 * * *' },
  { jurisdiction: 'CA', cron: '0 11 * * *' },
];

function startNewsletterScheduler() {
  for (const { jurisdiction, cron: schedule } of NEWSLETTER_SCHEDULES) {
    cron.schedule(schedule, async () => {
      console.log(`[newsletter-scheduler] Enqueuing newsletter generation for ${jurisdiction}`);
      try {
        await newsletterGenerateQueue.add('generate-newsletter', { jurisdiction });
      } catch (err) {
        console.error(`[newsletter-scheduler] Failed to enqueue for ${jurisdiction}:`, err.message);
      }
    });
    console.log(`[newsletter-scheduler] Scheduled ${jurisdiction} at ${schedule} UTC`);
  }
}

module.exports = { startNewsletterScheduler };
