let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  Anthropic = null;
}

class ClaudeProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = apiKey && Anthropic ? new Anthropic.default({ apiKey }) : null;
  }

  isAvailable() {
    return !!this.apiKey && !!Anthropic;
  }

  listModels() {
    return [
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', capabilities: ['text'] },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', capabilities: ['text'] },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', capabilities: ['text'] },
    ];
  }

  async generateText(model, systemPrompt, userPrompt, options = {}) {
    if (!this.client) throw new Error('[claude] API key not configured or @anthropic-ai/sdk not installed');

    const { jsonMode = false, maxTokens = 4096, temperature } = options;

    const params = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userPrompt }],
    };

    if (systemPrompt) {
      params.system = systemPrompt;
    }

    if (temperature !== undefined) params.temperature = temperature;

    if (jsonMode) {
      params.messages[0].content = `${userPrompt}\n\nRespond with valid JSON only.`;
    }

    const response = await this.client.messages.create(params);
    const text = response.content[0]?.text || '';
    const tokens = response.usage ? response.usage.input_tokens + response.usage.output_tokens : null;

    return { text, tokens };
  }

  async generateImage() {
    throw new Error('[claude] Image generation is not supported by Claude');
  }
}

module.exports = ClaudeProvider;
