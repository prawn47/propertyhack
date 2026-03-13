/**
 * AI Provider Abstraction Service
 *
 * Routes AI tasks to the configured provider + model.
 * Falls back to Gemini if no AiModelConfig record exists for the task.
 *
 * Usage:
 *   const ai = require('./aiProviderService');
 *   const { text } = await ai.generateText('article-summarisation', userPrompt, { systemPrompt, jsonMode: true });
 *   const { imageData, mimeType } = await ai.generateImage('image-generation', prompt);
 */

const GeminiProvider = require('./providers/geminiProvider');
const ClaudeProvider = require('./providers/claudeProvider');
const OpenAIProvider = require('./providers/openaiProvider');
const OllamaProvider = require('./providers/ollamaProvider');

// Default task configs — used when AiModelConfig DB record doesn't exist
const DEFAULT_TASK_CONFIGS = {
  'article-summarisation': { provider: 'gemini', model: 'gemini-2.5-flash', fallbackProvider: 'gemini', fallbackModel: 'gemini-2.0-flash' },
  'image-alt-text':        { provider: 'gemini', model: 'gemini-2.5-flash', fallbackProvider: 'gemini', fallbackModel: 'gemini-2.0-flash' },
  'image-generation':      { provider: 'gemini', model: 'gemini-2.0-flash-exp-image-generation', fallbackProvider: 'gemini', fallbackModel: 'gemini-2.5-flash-image' },
  'newsletter-generation': { provider: 'gemini', model: 'gemini-2.5-flash', fallbackProvider: 'gemini', fallbackModel: 'gemini-2.0-flash' },
  'newsletter-editorial': { provider: 'gemini', model: 'gemini-2.5-flash', fallbackProvider: 'gemini', fallbackModel: 'gemini-2.0-flash' },
  'newsletter-image':      { provider: 'gemini', model: 'gemini-2.0-flash-exp-image-generation', fallbackProvider: 'gemini', fallbackModel: 'gemini-2.5-flash-image' },
  'newsletter-roundup':   { provider: 'gemini', model: 'gemini-2.5-flash', fallbackProvider: 'gemini', fallbackModel: 'gemini-2.0-flash' },
  'relevance-scoring':     { provider: 'gemini', model: 'gemini-2.0-flash', fallbackProvider: 'gemini', fallbackModel: 'gemini-2.5-flash' },
};

// Lazy-initialised provider instances (one per provider name)
let providers = null;

function getProviders() {
  if (providers) return providers;
  providers = {
    gemini: new GeminiProvider(process.env.GEMINI_API_KEY),
    claude: new ClaudeProvider(process.env.ANTHROPIC_API_KEY),
    openai: new OpenAIProvider(process.env.OPENAI_API_KEY),
    ollama: new OllamaProvider(),
  };
  return providers;
}

// Cached DB lookups (TTL: 60s) — keyed by task name
const configCache = new Map();
const CONFIG_CACHE_TTL = 60_000;

async function getTaskConfig(task) {
  const cached = configCache.get(task);
  if (cached && Date.now() - cached.ts < CONFIG_CACHE_TTL) return cached.config;

  let config = null;
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const record = await prisma.aiModelConfig.findUnique({ where: { task } });
    if (record && record.isActive) {
      config = {
        provider: record.provider,
        model: record.model,
        fallbackProvider: record.fallbackProvider || null,
        fallbackModel: record.fallbackModel || null,
      };
    }
    await prisma.$disconnect();
  } catch {
    // AiModelConfig table may not exist yet — fall through to defaults
  }

  if (!config) {
    config = DEFAULT_TASK_CONFIGS[task] || { provider: 'gemini', model: 'gemini-2.5-flash', fallbackProvider: null, fallbackModel: null };
  }

  configCache.set(task, { config, ts: Date.now() });
  return config;
}

/**
 * Returns the resolved provider instance + config for a task.
 * @param {string} task
 * @returns {Promise<{ provider: object, model: string, fallbackProvider: object|null, fallbackModel: string|null }>}
 */
async function getProvider(task) {
  const config = await getTaskConfig(task);
  const p = getProviders();
  return {
    provider: p[config.provider] || p.gemini,
    model: config.model,
    fallbackProvider: config.fallbackProvider ? p[config.fallbackProvider] : null,
    fallbackModel: config.fallbackModel || null,
  };
}

/**
 * Generate text using the configured provider for the task.
 * Automatically tries the fallback provider if the primary fails.
 *
 * @param {string} task - Task key (e.g. 'article-summarisation')
 * @param {string} userPrompt - The user/content prompt
 * @param {object} [options]
 * @param {string}  [options.systemPrompt] - System-level instruction
 * @param {boolean} [options.jsonMode]     - Request JSON output
 * @param {number}  [options.maxTokens]    - Max tokens to generate
 * @param {number}  [options.temperature]  - Sampling temperature
 * @returns {Promise<{ text: string, provider: string, model: string, tokens: number|null }>}
 */
async function generateText(task, userPrompt, options = {}) {
  const { systemPrompt, jsonMode = false, maxTokens, temperature } = options;
  const { provider, model, fallbackProvider, fallbackModel } = await getProvider(task);

  const providerName = Object.keys(getProviders()).find((k) => getProviders()[k] === provider) || 'gemini';

  try {
    if (!provider.isAvailable()) {
      throw new Error(`Provider "${providerName}" is not available (check API key / env var)`);
    }
    const result = await provider.generateText(model, systemPrompt || null, userPrompt, { jsonMode, maxTokens, temperature });
    return { ...result, provider: providerName, model };
  } catch (primaryErr) {
    console.warn(`[aiProvider] ${providerName}/${model} failed for task "${task}": ${primaryErr.message.substring(0, 120)}`);

    if (fallbackProvider && fallbackModel) {
      const fallbackName = Object.keys(getProviders()).find((k) => getProviders()[k] === fallbackProvider) || 'gemini';
      console.log(`[aiProvider] Trying fallback: ${fallbackName}/${fallbackModel}`);
      try {
        if (!fallbackProvider.isAvailable()) {
          throw new Error(`Fallback provider "${fallbackName}" is not available`);
        }
        const result = await fallbackProvider.generateText(fallbackModel, systemPrompt || null, userPrompt, { jsonMode, maxTokens, temperature });
        return { ...result, provider: fallbackName, model: fallbackModel };
      } catch (fallbackErr) {
        throw new Error(`[aiProvider] Both primary (${providerName}/${model}) and fallback (${fallbackName}/${fallbackModel}) failed for task "${task}". Primary: ${primaryErr.message}. Fallback: ${fallbackErr.message}`);
      }
    }

    throw new Error(`[aiProvider] ${providerName}/${model} failed for task "${task}": ${primaryErr.message}`);
  }
}

/**
 * Generate an image using the configured provider for the task.
 * Image generation is Gemini-only; if the task config points elsewhere it falls back to Gemini.
 *
 * @param {string} task - Task key (e.g. 'image-generation')
 * @param {string} prompt - Image generation prompt
 * @param {object} [options]
 * @returns {Promise<{ imageData: Buffer, mimeType: string }>}
 */
async function generateImage(task, prompt, options = {}) {
  const { provider, model, fallbackProvider, fallbackModel } = await getProvider(task);
  const p = getProviders();
  const providerName = Object.keys(p).find((k) => p[k] === provider) || 'gemini';

  try {
    if (!provider.isAvailable()) throw new Error(`Provider "${providerName}" is not available`);
    return await provider.generateImage(model, prompt, options);
  } catch (primaryErr) {
    console.warn(`[aiProvider] ${providerName}/${model} image failed for task "${task}": ${primaryErr.message.substring(0, 120)}`);

    if (fallbackProvider && fallbackModel) {
      const fallbackName = Object.keys(p).find((k) => p[k] === fallbackProvider) || 'gemini';
      console.log(`[aiProvider] Trying image fallback: ${fallbackName}/${fallbackModel}`);
      try {
        if (!fallbackProvider.isAvailable()) throw new Error(`Fallback provider "${fallbackName}" is not available`);
        return await fallbackProvider.generateImage(fallbackModel, prompt, options);
      } catch (fallbackErr) {
        throw new Error(`[aiProvider] Both primary (${providerName}/${model}) and fallback (${fallbackName}/${fallbackModel}) image generation failed for task "${task}". Primary: ${primaryErr.message}. Fallback: ${fallbackErr.message}`);
      }
    }

    throw new Error(`[aiProvider] ${providerName}/${model} image generation failed for task "${task}": ${primaryErr.message}`);
  }
}

/**
 * List all providers with their availability and supported models.
 * @returns {object}
 */
function listProviders() {
  const p = getProviders();
  return Object.entries(p).map(([name, instance]) => ({
    name,
    available: instance.isAvailable(),
    models: instance.listModels ? instance.listModels() : [],
  }));
}

/**
 * Invalidate the config cache for a task (call after admin updates model config).
 * @param {string} [task] - Specific task to invalidate; omit to clear all
 */
function invalidateConfigCache(task) {
  if (task) {
    configCache.delete(task);
  } else {
    configCache.clear();
  }
}

module.exports = {
  getProvider,
  generateText,
  generateImage,
  listProviders,
  invalidateConfigCache,
};
