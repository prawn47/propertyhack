const http = require('http');

const OLLAMA_BASE = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_TIMEOUT = 120_000;

function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 11434,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: OLLAMA_TIMEOUT,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`[ollama] Invalid JSON response: ${body.substring(0, 100)}`)); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('[ollama] Request timed out')); });
    req.write(data);
    req.end();
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`[ollama] Invalid JSON: ${body.substring(0, 100)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('[ollama] Connection timed out')); });
  });
}

class OllamaProvider {
  constructor() {
    this.enabled = process.env.OLLAMA_ENABLED === 'true';
    this._models = null;
  }

  isAvailable() {
    return this.enabled;
  }

  async listModels() {
    if (!this.enabled) return [];
    try {
      const data = await httpGet(`${OLLAMA_BASE}/api/tags`);
      this._models = (data.models || []).map((m) => ({
        id: m.name,
        name: m.name,
        capabilities: ['text'],
      }));
      return this._models;
    } catch {
      return [];
    }
  }

  async generateText(model, systemPrompt, userPrompt, options = {}) {
    if (!this.enabled) throw new Error('[ollama] OLLAMA_ENABLED is not set to true');

    const { jsonMode = false, temperature } = options;

    const body = {
      model,
      prompt: userPrompt,
      stream: false,
    };

    if (systemPrompt) body.system = systemPrompt;
    if (jsonMode) body.format = 'json';
    if (temperature !== undefined) body.options = { temperature };

    const response = await httpPost(`${OLLAMA_BASE}/api/generate`, body);

    if (!response.response) {
      throw new Error(`[ollama] No response text. Full response: ${JSON.stringify(response).substring(0, 200)}`);
    }

    return { text: response.response, tokens: response.eval_count || null };
  }

  async generateImage() {
    throw new Error('[ollama] Image generation is not supported by Ollama');
  }
}

module.exports = OllamaProvider;
