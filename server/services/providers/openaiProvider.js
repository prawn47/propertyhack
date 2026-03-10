const { OpenAI } = require('openai');

class OpenAIProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  listModels() {
    return [
      { id: 'gpt-4o', name: 'GPT-4o', capabilities: ['text'] },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', capabilities: ['text'] },
    ];
  }

  async generateText(model, systemPrompt, userPrompt, options = {}) {
    if (!this.client) throw new Error('[openai] API key not configured');

    const { jsonMode = false, maxTokens, temperature } = options;

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userPrompt });

    const params = { model, messages };
    if (maxTokens) params.max_tokens = maxTokens;
    if (temperature !== undefined) params.temperature = temperature;
    if (jsonMode) params.response_format = { type: 'json_object' };

    const response = await this.client.chat.completions.create(params);
    const text = response.choices[0]?.message?.content || '';
    const tokens = response.usage ? response.usage.total_tokens : null;

    return { text, tokens };
  }

  async generateImage() {
    throw new Error('[openai] Image generation via this provider is not supported');
  }
}

module.exports = OpenAIProvider;
