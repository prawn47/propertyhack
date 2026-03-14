/**
 * Cloudflare Workers Entry Point for PropertyHack API
 * ====================================================
 *
 * This file bridges the existing Express application to run on Cloudflare Workers
 * using the `nodejs_compat` compatibility flag and `node:http` bridge.
 *
 * How it works:
 * - CF Workers receive fetch() requests via the Web Standards API
 * - We use `handleAsNodeRequest` to convert them to Node.js http.IncomingMessage
 * - Express processes the request as normal
 * - Queue consumers handle background job processing
 * - Cron triggers handle scheduled tasks
 *
 * Environment bindings (set in wrangler.toml):
 * - HYPERDRIVE: Connection pooling to DO Managed Postgres
 * - *_QUEUE: CF Queue producer bindings for each job queue
 * - IMAGES_BUCKET: R2 bucket for article/newsletter images
 * - RATE_LIMIT: KV namespace for rate limiting
 * - All secrets (GEMINI_API_KEY, etc.) set via `wrangler secret put`
 *
 * Ref: Beads workspace-8i6
 */

// NOTE: handleAsNodeRequest is not yet available in the current CF Workers runtime.
// Once it ships (expected mid-2026), uncomment the import below and remove the
// manual bridge in the fetch handler. For now, we use the manual Request → Node bridge.
// import { handleAsNodeRequest } from 'cloudflare:node';

/**
 * Make CF environment bindings available globally so existing code can access them
 * without being rewritten to pass `env` through every function call.
 *
 * Usage in existing code: `globalThis.__cf_env.IMAGES_BUCKET.put(...)`
 */
function exposeEnvGlobally(env) {
  globalThis.__cf_env = env;

  // Map secrets from CF env to process.env so existing code using process.env.* works
  const envKeys = [
    'DATABASE_URL', 'REDIS_URL',
    'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
    'JWT_ACCESS_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN',
    'GEMINI_API_KEY', 'OPENAI_API_KEY',
    'NEWSAPI_API_KEY', 'NEWSAPI_AI_KEY', 'PERPLEXITY_API_KEY',
    'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_WEBHOOK_SIGNING_SECRET',
    'SOCIAL_TOKEN_ENCRYPTION_KEY',
    'CORS_ORIGIN', 'PORT', 'NODE_ENV',
    'HENRY_MAX_ARTICLES', 'HENRY_SIMILARITY_THRESHOLD',
    'HENRY_MAX_HISTORY_MESSAGES', 'HENRY_RATE_LIMIT_ANON', 'HENRY_RATE_LIMIT_AUTH',
    'SITE_URL',
  ];

  for (const key of envKeys) {
    if (env[key] !== undefined) {
      process.env[key] = env[key];
    }
  }

  // Use Hyperdrive connection string for Prisma if available
  if (env.HYPERDRIVE) {
    process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
  }
}

// ─── Express App Import ─────────────────────────────────────────────
// The existing Express app is now exported from server/index.js (see changes there).
// We lazy-import it to ensure env vars are set first.
let appPromise = null;
function getApp(env) {
  if (!appPromise) {
    exposeEnvGlobally(env);
    // server/index.js now exports `app` — see the modification in that file
    appPromise = Promise.resolve(require('./index.js').app);
  }
  return appPromise;
}

// ─── Queue Handler Registry ────────────────────────────────────────
// Maps CF Queue names to the worker modules that process their jobs.
// Each worker file now exports a `processJob(data)` function.
const queueHandlers = {
  'source-fetch': async (data) => {
    const { processJob } = require('./workers/sourceFetchWorker');
    await processJob(data);
  },
  'article-process': async (data) => {
    const { processJob } = require('./workers/articleProcessWorker');
    await processJob(data);
  },
  'article-summarise': async (data) => {
    const { processJob } = require('./workers/articleSummariseWorker');
    await processJob(data);
  },
  'article-image': async (data) => {
    const { processJob } = require('./workers/articleImageWorker');
    await processJob(data);
  },
  'article-embed': async (data) => {
    const { processJob } = require('./workers/articleEmbedWorker');
    await processJob(data);
  },
  'social-generate': async (data) => {
    const { processJob } = require('./workers/socialGenerateWorker');
    await processJob(data);
  },
  'social-publish': async (data) => {
    const { processJob } = require('./workers/socialPublishWorker');
    await processJob(data);
  },
  'newsletter-generate': async (data) => {
    const { processJob } = require('./workers/newsletterGenerateWorker');
    await processJob(data);
  },
  'article-audit': async (data) => {
    const { processJob } = require('./workers/articleAuditWorker');
    await processJob(data);
  },
  'alt-text-backfill': async (data) => {
    const { processJob } = require('./workers/altTextBackfillWorker');
    await processJob(data);
  },
};

// ─── Cron Handler Registry ─────────────────────────────────────────
// Maps cron schedules (from wrangler.toml) to job functions.
const cronHandlers = {
  // Ingestion scheduler — check sources every 5 minutes
  '*/5 * * * *': async () => {
    const { runScheduler } = require('./jobs/ingestionScheduler');
    await runScheduler();
  },
  // Newsletter scheduler — check every 6 hours (actual timing is per-jurisdiction)
  '0 */6 * * *': async () => {
    const { runNewsletterScheduler } = require('./jobs/newsletterScheduler');
    await runNewsletterScheduler();
  },
  // Henry cleanup — daily old conversation cleanup
  '0 3 * * *': async () => {
    const { runHenryCleanup } = require('./jobs/henryCleanup');
    await runHenryCleanup();
  },
  // Social health check — every 6 hours
  '0 */6 * * *': async () => {
    const { runSocialHealthCheck } = require('./jobs/socialHealthCheck');
    await runSocialHealthCheck();
  },
};

// ─── Worker Export ──────────────────────────────────────────────────
module.exports = {
  /**
   * HTTP request handler — bridges Web Standards Request to Express
   */
  async fetch(request, env, ctx) {
    exposeEnvGlobally(env);
    const app = await getApp(env);

    // Convert Web Standards Request → Node.js-compatible request for Express
    // This uses the approach recommended for Express on CF Workers with nodejs_compat
    const url = new URL(request.url);
    const headers = Object.fromEntries(request.headers.entries());

    return new Promise(async (resolve) => {
      // Build a minimal Node.js-style request/response pair
      const body = request.body ? await request.text() : '';

      const req = {
        method: request.method,
        url: url.pathname + url.search,
        headers,
        connection: { encrypted: url.protocol === 'https:' },
        socket: { remoteAddress: headers['cf-connecting-ip'] || '127.0.0.1' },
        // Express needs these
        get: (name) => headers[name.toLowerCase()],
        ip: headers['cf-connecting-ip'] || '127.0.0.1',
      };

      // If there's a body, make it readable
      if (body) {
        const { Readable } = require('stream');
        const readable = Readable.from([Buffer.from(body)]);
        Object.assign(req, readable);
        req.headers['content-length'] = Buffer.byteLength(body).toString();
      }

      const responseHeaders = {};
      let statusCode = 200;
      const chunks = [];

      const res = {
        statusCode: 200,
        setHeader(name, value) { responseHeaders[name.toLowerCase()] = value; },
        getHeader(name) { return responseHeaders[name.toLowerCase()]; },
        removeHeader(name) { delete responseHeaders[name.toLowerCase()]; },
        writeHead(code, hdrs) {
          statusCode = code;
          if (hdrs) Object.entries(hdrs).forEach(([k, v]) => { responseHeaders[k.toLowerCase()] = v; });
        },
        write(chunk) { chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk); },
        end(data) {
          if (data) chunks.push(typeof data === 'string' ? Buffer.from(data) : data);
          const body = chunks.length > 0 ? Buffer.concat(chunks) : null;
          resolve(new Response(body, {
            status: statusCode || 200,
            headers: responseHeaders,
          }));
        },
        // Express helpers
        set(name, value) { responseHeaders[name.toLowerCase()] = value; },
        get(name) { return responseHeaders[name.toLowerCase()]; },
        status(code) { statusCode = code; return res; },
        json(obj) {
          responseHeaders['content-type'] = 'application/json';
          const body = JSON.stringify(obj);
          resolve(new Response(body, { status: statusCode, headers: responseHeaders }));
        },
        send(body) {
          if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) {
            return res.json(body);
          }
          resolve(new Response(body, { status: statusCode, headers: responseHeaders }));
        },
      };

      try {
        app(req, res);
      } catch (err) {
        console.error('[worker] Express error:', err);
        resolve(new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }));
      }
    });
  },

  /**
   * Queue consumer — processes messages from CF Queues
   * Each message contains { queue, jobName, data, opts }
   */
  async queue(batch, env) {
    exposeEnvGlobally(env);

    for (const message of batch.messages) {
      const { data } = message.body;
      try {
        const handler = queueHandlers[batch.queue];
        if (handler) {
          await handler(data);
          message.ack();
        } else {
          console.error(`[worker] No handler for queue: ${batch.queue}`);
          message.retry();
        }
      } catch (err) {
        console.error(`[worker] Queue error (${batch.queue}):`, err);
        message.retry();
      }
    }
  },

  /**
   * Cron trigger handler — routes scheduled events to job functions
   */
  async scheduled(event, env, ctx) {
    exposeEnvGlobally(env);

    const handler = cronHandlers[event.cron];
    if (handler) {
      ctx.waitUntil(handler());
    } else {
      console.warn(`[worker] No handler for cron: ${event.cron}`);
    }
  },
};
