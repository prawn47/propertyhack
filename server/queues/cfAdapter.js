/**
 * Cloudflare Queues Adapter — Drop-in replacement for BullMQ Queue
 * =================================================================
 *
 * This module provides a `CFQueue` class that mimics BullMQ's `Queue.add()`
 * and `Queue.addBulk()` methods but sends messages to Cloudflare Queues instead.
 *
 * Usage (automatic — see connection.js):
 *   When running on CF Workers (globalThis.__cf_env is set), queue files
 *   automatically use this adapter. When running locally, they use BullMQ.
 *
 * Queue name → CF binding mapping:
 *   'source-fetch'        → SOURCE_FETCH_QUEUE
 *   'article-process'     → ARTICLE_PROCESS_QUEUE
 *   'article-summarise'   → ARTICLE_SUMMARISE_QUEUE
 *   'article-image'       → ARTICLE_IMAGE_QUEUE
 *   'article-embed'       → ARTICLE_EMBED_QUEUE
 *   'social-generate'     → SOCIAL_GENERATE_QUEUE
 *   'social-publish'      → SOCIAL_PUBLISH_QUEUE
 *   'newsletter-generate' → NEWSLETTER_GENERATE_QUEUE
 *   'article-audit'       → ARTICLE_AUDIT_QUEUE
 *   'alt-text-backfill'   → ALT_TEXT_BACKFILL_QUEUE
 *
 * Ref: Beads workspace-8i6
 */

// Maps BullMQ queue names to their CF Queue binding names in wrangler.toml
const QUEUE_BINDINGS = {
  'source-fetch': 'SOURCE_FETCH_QUEUE',
  'article-process': 'ARTICLE_PROCESS_QUEUE',
  'article-summarise': 'ARTICLE_SUMMARISE_QUEUE',
  'article-image': 'ARTICLE_IMAGE_QUEUE',
  'article-embed': 'ARTICLE_EMBED_QUEUE',
  'social-generate': 'SOCIAL_GENERATE_QUEUE',
  'social-publish': 'SOCIAL_PUBLISH_QUEUE',
  'newsletter-generate': 'NEWSLETTER_GENERATE_QUEUE',
  'article-audit': 'ARTICLE_AUDIT_QUEUE',
  'alt-text-backfill': 'ALT_TEXT_BACKFILL_QUEUE',
};

class CFQueue {
  constructor(name, _opts) {
    this.name = name;
    this.bindingName = QUEUE_BINDINGS[name];
    if (!this.bindingName) {
      console.warn(`[cfAdapter] No CF Queue binding mapped for queue: ${name}`);
    }
  }

  /**
   * Add a single job to the queue.
   * Compatible with BullMQ's Queue.add(jobName, data, opts) signature.
   *
   * @param {string} jobName - Job identifier (for logging)
   * @param {object} data - Job payload
   * @param {object} [opts] - Job options (delay, priority — partially supported)
   * @returns {Promise<{id: string, name: string}>}
   */
  async add(jobName, data, opts = {}) {
    const env = globalThis.__cf_env;
    if (!env || !env[this.bindingName]) {
      throw new Error(
        `CF Queue binding "${this.bindingName}" not available. ` +
        `Make sure the queue is configured in wrangler.toml and the Worker is deployed.`
      );
    }

    const messageBody = {
      jobName,
      data,
      opts,
      timestamp: Date.now(),
    };

    // CF Queues .send() options
    const sendOpts = {};
    if (opts.delay) {
      // CF Queues support delaySeconds (max 12 hours = 43200 seconds)
      sendOpts.delaySeconds = Math.min(Math.floor(opts.delay / 1000), 43200);
    }

    await env[this.bindingName].send(messageBody, sendOpts);

    const id = `cf-${this.name}-${Date.now()}`;
    console.log(`[cfAdapter] Sent to ${this.name}: ${jobName} (id: ${id})`);
    return { id, name: jobName };
  }

  /**
   * Add multiple jobs to the queue in a single batch.
   * Compatible with BullMQ's Queue.addBulk(jobs) signature.
   *
   * @param {Array<{name: string, data: object, opts?: object}>} jobs
   * @returns {Promise<Array<{id: string, name: string}>>}
   */
  async addBulk(jobs) {
    const env = globalThis.__cf_env;
    if (!env || !env[this.bindingName]) {
      throw new Error(`CF Queue binding "${this.bindingName}" not available.`);
    }

    const batch = jobs.map((j) => ({
      body: {
        jobName: j.name,
        data: j.data,
        opts: j.opts || {},
        timestamp: Date.now(),
      },
    }));

    await env[this.bindingName].sendBatch(batch);

    console.log(`[cfAdapter] Batch sent to ${this.name}: ${jobs.length} jobs`);
    return batch.map((_, i) => ({
      id: `cf-${this.name}-${Date.now()}-${i}`,
      name: jobs[i].name,
    }));
  }

  /**
   * Stub for BullMQ's getJobCounts() — CF Queues don't expose this directly.
   * Returns empty counts to avoid breaking the /system/queue-status endpoint.
   *
   * TODO: If queue observability is needed, use CF Queue analytics API
   * or track counts in KV.
   */
  async getJobCounts() {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }

  /**
   * No-op close — CF Queues don't need cleanup.
   */
  async close() {
    // Nothing to do — CF Queues are managed
  }
}

module.exports = { CFQueue };
