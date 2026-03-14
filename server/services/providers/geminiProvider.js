const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  listModels() {
    return [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', capabilities: ['text'] },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', capabilities: ['text'] },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', capabilities: ['text'] },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', capabilities: ['text'] },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', capabilities: ['text'] },
      { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image Gen', capabilities: ['image'] },
      { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', capabilities: ['image'] },
    ];
  }

  async generateText(model, systemPrompt, userPrompt, options = {}) {
    if (!this.client) throw new Error('[gemini] API key not configured');

    const { jsonMode = false, maxTokens, temperature } = options;

    const generationConfig = {};
    if (jsonMode) generationConfig.responseMimeType = 'application/json';
    if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
    if (temperature !== undefined) generationConfig.temperature = temperature;

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;

    const geminiModel = this.client.getGenerativeModel({ model, generationConfig });
    const result = await geminiModel.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    const tokens = response.usageMetadata?.totalTokenCount || null;

    return { text, tokens };
  }

  async generateImage(model, prompt, options = {}) {
    if (!this.client) throw new Error('[gemini] API key not configured');

    const geminiModel = this.client.getGenerativeModel({
      model,
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    });

    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData) {
        return {
          imageData: Buffer.from(part.inlineData.data, 'base64'),
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }

    throw new Error('[gemini] No image data returned from model');
  }
}

module.exports = GeminiProvider;
