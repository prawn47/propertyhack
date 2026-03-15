/**
 * Cloudflare Workers Entry Point for PropertyHack API
 * ====================================================
 *
 * Bridges Express to CF Workers via nodejs_compat.
 * Uses a proper IncomingMessage for request (so Express body parsers work)
 * and an enhanced response object with all Express methods.
 */

// Shim __dirname for CF Workers — many modules depend on it
if (typeof globalThis.__dirname === 'undefined') {
  globalThis.__dirname = '.';
  globalThis.__filename = './worker-entry.js';
}

/**
 * Make CF environment bindings available globally so existing code
 * can access them via process.env.* and globalThis.__cf_env.*
 */
function exposeEnvGlobally(env) {
  globalThis.__cf_env = env;

  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      process.env[key] = value;
    }
  }

  if (env.HYPERDRIVE) {
    process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
  }
}

// ─── Express App Import ─────────────────────────────────────────────
let app;
async function getApp(env) {
  if (!app) {
    exposeEnvGlobally(env);
    const indexModule = await import('./index.js');
    app = indexModule.app;
  }
  return app;
}

// ─── Queue Handler Registry ────────────────────────────────────────
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
const cronHandlers = {
  '*/5 * * * *': async () => {
    const { runScheduler } = require('./jobs/ingestionScheduler');
    await runScheduler();
  },
  '0 */6 * * *': async () => {
    const { runNewsletterScheduler } = require('./jobs/newsletterScheduler');
    await runNewsletterScheduler();
    const { runSocialHealthCheck } = require('./jobs/socialHealthCheck');
    await runSocialHealthCheck();
  },
  '0 3 * * *': async () => {
    const { runHenryCleanup } = require('./jobs/henryCleanup');
    await runHenryCleanup();
  },
};

// ─── Worker Export ──────────────────────────────────────────────────
export default {
  /**
   * HTTP request handler — bridges CF Workers fetch() to Express
   *
   * Uses a real IncomingMessage for the request so Express body parsing
   * works correctly, and an enhanced response object with all Express methods.
   */
  async fetch(request, env, ctx) {
    try {
      exposeEnvGlobally(env);
      const expressApp = await getApp(env);

      const url = new URL(request.url);

      // Extract headers
      const headers = {};
      if (request.headers && typeof request.headers.entries === 'function') {
        for (const [key, value] of request.headers.entries()) {
          headers[key.toLowerCase()] = value;
        }
      }

      // Read body as Buffer for proper stream handling
      const rawBody = request.body ? await request.text() : '';

      // Pre-parse JSON body so Express doesn't need express.json()
      let parsedBody = rawBody;
      const contentType = headers['content-type'] || '';
      if (contentType.includes('application/json') && rawBody) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch (e) {
          parsedBody = rawBody;
        }
      }

      return new Promise((resolve) => {
        let resolved = false;

        function finishResponse(statusCode, responseHeaders, data) {
          if (resolved) return;
          resolved = true;
          resolve(new Response(data, {
            status: statusCode,
            headers: responseHeaders,
          }));
        }

        // ─── Request Object ───────────────────────────────────
        // Plain object with all properties Express expects
        const clientIp = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || '127.0.0.1';

        const req = {
          method: request.method,
          url: url.pathname + url.search,
          originalUrl: url.pathname + url.search,
          baseUrl: '',
          path: url.pathname,
          headers,
          body: parsedBody,
          rawBody,
          query: Object.fromEntries(url.searchParams.entries()),
          params: {},
          ip: clientIp,
          ips: [clientIp],
          protocol: 'https',
          secure: true,
          hostname: url.hostname,
          subdomains: [],
          // Express uses these for various middleware
          connection: { remoteAddress: clientIp, encrypted: true },
          socket: { remoteAddress: clientIp, encrypted: true },
          // Methods Express expects
          get: (name) => headers[name.toLowerCase()],
          header: (name) => headers[name.toLowerCase()],
          is: (type) => {
            const ct = headers['content-type'] || '';
            if (type === 'json' || type === 'application/json') return ct.includes('json') ? 'json' : false;
            return ct.includes(type) ? type : false;
          },
          accepts: () => '*/*',
          // EventEmitter stubs — some middleware tries to listen on req
          on: function() { return this; },
          once: function() { return this; },
          emit: function() { return false; },
          removeListener: function() { return this; },
          addListener: function() { return this; },
          // Stream stubs — for middleware that tries to pipe/read
          readable: false,
          pipe: function() { return this; },
          unpipe: function() { return this; },
          resume: function() { return this; },
          pause: function() { return this; },
        };

        // ─── Response Object ──────────────────────────────────
        // Complete Express-compatible response with all methods
        let statusCode = 200;
        const responseHeaders = {};
        const chunks = [];

        const res = {
          statusCode: 200,
          headersSent: false,
          locals: {},

          // ── Core Node.js http.ServerResponse methods ──
          setHeader(name, value) {
            if (!this.headersSent) responseHeaders[name.toLowerCase()] = String(value);
            return this;
          },
          getHeader(name) {
            return responseHeaders[name.toLowerCase()];
          },
          getHeaders() {
            return { ...responseHeaders };
          },
          hasHeader(name) {
            return name.toLowerCase() in responseHeaders;
          },
          removeHeader(name) {
            if (!this.headersSent) delete responseHeaders[name.toLowerCase()];
            return this;
          },
          writeHead(code, reason, hdrs) {
            if (this.headersSent) return this;
            statusCode = code;
            this.statusCode = code;
            const h = typeof reason === 'object' ? reason : hdrs;
            if (h) {
              for (const [k, v] of Object.entries(h)) {
                responseHeaders[k.toLowerCase()] = String(v);
              }
            }
            this.headersSent = true;
            return this;
          },
          write(chunk, encoding, cb) {
            if (typeof encoding === 'function') { cb = encoding; encoding = undefined; }
            if (chunk != null) {
              chunks.push(typeof chunk === 'string' ? chunk : String(chunk));
            }
            if (typeof cb === 'function') cb();
            return true;
          },
          end(data, encoding, cb) {
            if (typeof data === 'function') { cb = data; data = null; }
            if (typeof encoding === 'function') { cb = encoding; encoding = null; }
            if (data != null) {
              chunks.push(typeof data === 'string' ? data : String(data));
            }
            this.headersSent = true;
            const body = chunks.length > 0 ? chunks.join('') : null;
            finishResponse(statusCode, responseHeaders, body);
            if (typeof cb === 'function') cb();
          },

          // ── Express response methods ──
          status(code) {
            statusCode = code;
            this.statusCode = code;
            return this;
          },
          sendStatus(code) {
            statusCode = code;
            this.statusCode = code;
            responseHeaders['content-type'] = 'text/plain';
            finishResponse(code, responseHeaders, String(code));
          },
          json(obj) {
            responseHeaders['content-type'] = 'application/json';
            this.headersSent = true;
            finishResponse(statusCode, responseHeaders, JSON.stringify(obj));
          },
          send(body) {
            this.headersSent = true;
            if (body === null || body === undefined) {
              finishResponse(statusCode, responseHeaders, null);
              return;
            }
            if (typeof body === 'object' && !Buffer.isBuffer(body)) {
              if (!responseHeaders['content-type']) {
                responseHeaders['content-type'] = 'application/json';
              }
              finishResponse(statusCode, responseHeaders, JSON.stringify(body));
              return;
            }
            if (typeof body === 'string' && !responseHeaders['content-type']) {
              responseHeaders['content-type'] = 'text/html';
            }
            finishResponse(statusCode, responseHeaders, String(body));
          },
          redirect(statusOrUrl, url) {
            const code = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
            const location = typeof statusOrUrl === 'string' ? statusOrUrl : url;
            statusCode = code;
            responseHeaders['location'] = location;
            responseHeaders['content-type'] = 'text/html';
            this.headersSent = true;
            finishResponse(code, responseHeaders, `<p>Redirecting to <a href="${location}">${location}</a></p>`);
          },

          // ── Header helpers (Express uses res.set extensively) ──
          set(nameOrObj, value) {
            if (typeof nameOrObj === 'object' && nameOrObj !== null) {
              for (const [k, v] of Object.entries(nameOrObj)) {
                responseHeaders[k.toLowerCase()] = String(v);
              }
            } else if (typeof nameOrObj === 'string') {
              responseHeaders[nameOrObj.toLowerCase()] = String(value);
            }
            return this;
          },
          header(nameOrObj, value) {
            return this.set(nameOrObj, value);
          },
          get(name) {
            return responseHeaders[name.toLowerCase()];
          },
          append(name, value) {
            const key = name.toLowerCase();
            const existing = responseHeaders[key];
            if (existing) {
              responseHeaders[key] = Array.isArray(existing)
                ? [...existing, String(value)].join(', ')
                : `${existing}, ${String(value)}`;
            } else {
              responseHeaders[key] = String(value);
            }
            return this;
          },
          type(t) {
            responseHeaders['content-type'] = t.includes('/') ? t : `text/${t}`;
            return this;
          },
          vary(field) {
            const existing = responseHeaders['vary'];
            if (existing) {
              responseHeaders['vary'] = `${existing}, ${field}`;
            } else {
              responseHeaders['vary'] = field;
            }
            return this;
          },
          location(url) {
            responseHeaders['location'] = url;
            return this;
          },
          links(links) {
            const parts = Object.entries(links).map(([rel, href]) => `<${href}>; rel="${rel}"`);
            responseHeaders['link'] = parts.join(', ');
            return this;
          },

          // ── Cookie methods (stateless on CF Workers) ──
          cookie(name, value, options) {
            const parts = [`${name}=${encodeURIComponent(value)}`];
            if (options) {
              if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
              if (options.path) parts.push(`Path=${options.path}`);
              if (options.domain) parts.push(`Domain=${options.domain}`);
              if (options.httpOnly) parts.push('HttpOnly');
              if (options.secure) parts.push('Secure');
              if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
            }
            this.append('set-cookie', parts.join('; '));
            return this;
          },
          clearCookie(name, options) {
            return this.cookie(name, '', { ...options, maxAge: 0 });
          },

          // ── EventEmitter stubs (Express error handlers check these) ──
          on() { return this; },
          once() { return this; },
          emit() { return false; },
          removeListener() { return this; },
          addListener() { return this; },
        };

        // Cross-link req and res (Express internals expect this)
        req.res = res;
        res.req = req;

        try {
          expressApp(req, res);
        } catch (err) {
          console.error('[worker] Express error:', err);
          if (!resolved) {
            resolved = true;
            resolve(new Response(JSON.stringify({ error: 'Internal server error' }), {
              status: 500,
              headers: { 'content-type': 'application/json' },
            }));
          }
        }
      });
    } catch (error) {
      console.error('[worker] Fetch error:', error);
      return new Response(JSON.stringify({ error: 'Worker initialisation failed', details: error.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  },

  /**
   * Queue consumer — processes messages from CF Queues
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
   * Cron trigger handler
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
