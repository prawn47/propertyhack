/**
 * Simple test worker for PropertyHack API
 */

export default {
  async fetch(request, env, ctx) {
    try {
      // Set up environment
      globalThis.__cf_env = env;
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          process.env[key] = value;
        }
      }
      
      if (env.HYPERDRIVE) {
        process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
      }
      
      const url = new URL(request.url);
      
      // Simple test endpoints
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          message: 'PropertyHack API is running',
          environment: 'cloudflare-workers',
          timestamp: new Date().toISOString()
        }), {
          headers: { 'content-type': 'application/json' }
        });
      }
      
      if (url.pathname === '/test-env') {
        return new Response(JSON.stringify({
          database_url_set: !!process.env.DATABASE_URL,
          node_env: process.env.NODE_ENV,
          gemini_key_set: !!process.env.GEMINI_API_KEY,
          hyperdrive_available: !!env.HYPERDRIVE
        }), {
          headers: { 'content-type': 'application/json' }
        });
      }
      
      // Try to load the Express app for other routes
      const { app } = require('./index.js');
      
      // Very simple Express bridge
      return new Promise((resolve, reject) => {
        const chunks = [];
        let statusCode = 200;
        const headers = {};
        
        const req = {
          method: request.method,
          url: url.pathname + url.search,
          headers: Object.fromEntries(request.headers.entries()),
          get: (name) => request.headers.get(name),
        };
        
        const res = {
          statusCode: 200,
          setHeader: (name, value) => { headers[name] = value; },
          writeHead: (code, hdrs) => {
            statusCode = code;
            if (hdrs) Object.assign(headers, hdrs);
          },
          write: (chunk) => chunks.push(chunk),
          end: (data) => {
            if (data) chunks.push(data);
            const body = chunks.join('');
            resolve(new Response(body, { status: statusCode, headers }));
          },
          json: (obj) => {
            headers['content-type'] = 'application/json';
            const body = JSON.stringify(obj);
            resolve(new Response(body, { status: statusCode, headers }));
          }
        };
        
        app(req, res);
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Worker error',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  },
  
  async queue(batch, env) {
    console.log(`Processing ${batch.messages.length} messages from queue: ${batch.queue}`);
    // Just acknowledge all messages for now
    for (const message of batch.messages) {
      message.ack();
    }
  },
  
  async scheduled(event, env, ctx) {
    console.log(`Cron triggered: ${event.cron}`);
  }
};