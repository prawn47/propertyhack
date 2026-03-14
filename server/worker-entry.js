/**
 * Cloudflare Workers Entry Point for PropertyHack API
 * Simple Express bridge using nodejs_compat compatibility
 */

// Shim __dirname for CF Workers — many modules depend on it
// This must run before any require() calls
if (typeof globalThis.__dirname === 'undefined') {
  globalThis.__dirname = '.';
  globalThis.__filename = './worker-entry.js';
}

// Make environment variables available globally
function exposeEnvGlobally(env) {
  globalThis.__cf_env = env;
  
  // Map CF environment to process.env
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      process.env[key] = value;
    }
  }
  
  // Use Hyperdrive connection string if available
  if (env.HYPERDRIVE) {
    process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
  }
}

// Import Express app lazily
let app;
async function getApp(env) {
  if (!app) {
    exposeEnvGlobally(env);
    const { app: expressApp } = await import('./index.js');
    app = expressApp;
  }
  return app;
}

export default {
  /**
   * HTTP request handler
   */
  async fetch(request, env, ctx) {
    try {
      exposeEnvGlobally(env);
      
      // Simple approach: convert to Node.js style request
      const url = new URL(request.url);
      const method = request.method;
      const headers = Object.fromEntries(request.headers.entries());
      const body = request.body ? await request.text() : '';
      
      // Create a simple response promise
      return new Promise(async (resolve, reject) => {
        try {
          const { app } = require('./index.js');
          
          // Create minimal Node.js-style request object
          const req = {
            method,
            url: url.pathname + url.search,
            headers,
            body,
            get: (name) => headers[name.toLowerCase()],
            ip: headers['cf-connecting-ip'] || '127.0.0.1',
          };
          
          // Create response object
          let statusCode = 200;
          const responseHeaders = {};
          const chunks = [];
          
          const res = {
            statusCode: 200,
            setHeader: (name, value) => { responseHeaders[name.toLowerCase()] = value; },
            writeHead: (code, hdrs) => {
              statusCode = code;
              if (hdrs) Object.entries(hdrs).forEach(([k, v]) => { responseHeaders[k.toLowerCase()] = v; });
            },
            write: (chunk) => chunks.push(chunk),
            end: (data) => {
              if (data) chunks.push(data);
              const responseBody = chunks.join('');
              resolve(new Response(responseBody, {
                status: statusCode,
                headers: responseHeaders,
              }));
            },
            json: (obj) => {
              responseHeaders['content-type'] = 'application/json';
              const body = JSON.stringify(obj);
              resolve(new Response(body, { status: statusCode, headers: responseHeaders }));
            }
          };
          
          // Call Express app
          app(req, res);
          
        } catch (error) {
          console.error('Worker error:', error);
          resolve(new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'content-type': 'application/json' }
          }));
        }
      });
      
    } catch (error) {
      console.error('Fetch error:', error);
      return new Response(JSON.stringify({ error: 'Worker initialization failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  },
  
  /**
   * Queue consumer
   */
  async queue(batch, env) {
    exposeEnvGlobally(env);
    console.log(`Processing ${batch.messages.length} messages from queue: ${batch.queue}`);
    
    // For now, just acknowledge all messages
    // TODO: Implement actual queue processing
    for (const message of batch.messages) {
      try {
        console.log(`Processing message:`, message.body);
        message.ack();
      } catch (error) {
        console.error(`Queue processing error:`, error);
        message.retry();
      }
    }
  },
  
  /**
   * Cron handler
   */
  async scheduled(event, env, ctx) {
    exposeEnvGlobally(env);
    console.log(`Cron triggered: ${event.cron}`);
    
    // Simple cron handling for now
    // TODO: Implement actual cron job processing
    switch (event.cron) {
      case '*/5 * * * *':
        console.log('Running ingestion scheduler');
        break;
      case '0 */6 * * *':
        console.log('Running newsletter/social scheduler');
        break;
      case '0 3 * * *':
        console.log('Running Henry cleanup');
        break;
      default:
        console.log(`No handler for cron: ${event.cron}`);
    }
  },
};