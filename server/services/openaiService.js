const OpenAI = require('openai');

// Initialize OpenAI client if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Enhanced post generation using OpenAI GPT-4
const generateEnhancedPost = async (topic, userSettings) => {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const systemPrompt = `You are an expert LinkedIn content creator. Your persona is defined by:
- Tone of Voice: ${userSettings.toneOfVoice}
- Industry: ${userSettings.industry}
- Position: ${userSettings.position}
- Language: ${userSettings.englishVariant} English

Your target audience is: ${userSettings.audience}.
The primary goal of your posts is: ${userSettings.postGoal}.
You should naturally incorporate these keywords: ${userSettings.keywords}.

Writing style examples:
${userSettings.contentExamples.map((example, i) => `Example ${i + 1}: "${example}"`).join('\n')}

Create engaging, professional LinkedIn posts that match this style and voice.`;

    const userPrompt = `Generate a compelling LinkedIn post about: "${topic}".

The post should:
1. Have a strong, attention-grabbing opening
2. Provide valuable insights or actionable advice
3. Include relevant industry keywords naturally
4. End with a thought-provoking question or call-to-action
5. Be optimized for LinkedIn engagement

Return the response as JSON with "title" and "text" fields.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = JSON.parse(completion.choices[0].message.content);
    return {
      title: response.title,
      text: response.text,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate enhanced post with OpenAI');
  }
};

// Generate multiple post variations
const generatePostVariations = async (topic, userSettings, count = 3) => {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const systemPrompt = `You are an expert LinkedIn content creator specializing in ${userSettings.industry}. 
Create ${count} different variations of LinkedIn posts about the same topic, each with a unique angle and approach.

User Profile:
- Tone: ${userSettings.toneOfVoice}
- Industry: ${userSettings.industry}
- Position: ${userSettings.position}
- Audience: ${userSettings.audience}
- Goal: ${userSettings.postGoal}
- Keywords: ${userSettings.keywords}`;

    const userPrompt = `Create ${count} different LinkedIn post variations about: "${topic}".

Each variation should:
1. Take a different angle or perspective
2. Have unique value propositions
3. Appeal to different aspects of the audience
4. Maintain professional quality and engagement potential

Return as JSON array with objects containing "title", "text", and "angle" fields.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2000,
    });

    const response = JSON.parse(completion.choices[0].message.content);
    return response.variations || response.posts || [response];
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate post variations with OpenAI');
  }
};

// Optimize existing post for better engagement
const optimizePost = async (originalPost, userSettings) => {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const systemPrompt = `You are a LinkedIn engagement optimization expert. Analyze and improve posts for maximum engagement while maintaining authenticity and professional value.

User Profile:
- Industry: ${userSettings.industry}
- Audience: ${userSettings.audience}
- Goal: ${userSettings.postGoal}`;

    const userPrompt = `Optimize this LinkedIn post for better engagement:

Original Post:
Title: "${originalPost.title}"
Text: "${originalPost.text}"

Improvements to make:
1. Enhance hook and opening line
2. Improve structure and readability
3. Add compelling call-to-action
4. Optimize for LinkedIn algorithm
5. Maintain authentic voice and value

Return optimized version as JSON with "title", "text", and "improvements" fields.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 1200,
    });

    const response = JSON.parse(completion.choices[0].message.content);
    return {
      title: response.title,
      text: response.text,
      improvements: response.improvements,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to optimize post with OpenAI');
  }
};

module.exports = {
  generateEnhancedPost,
  generatePostVariations,
  optimizePost,
  isAvailable: () => !!openai,
};
