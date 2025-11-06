import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { UserSettings, DraftPost } from '../types';

// Get Gemini API key from environment (browser-safe)
const getGeminiApiKey = (): string => {
  // 1) Preferred: Vite-exposed variable
  const viteKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY as string | undefined;
  if (viteKey && viteKey.length > 0) {
    console.debug('[gemini] using VITE_GEMINI_API_KEY (len:', viteKey.length, ')');
    return viteKey;
  }

  // 2) Also allow non-prefixed via import.meta.env if present
  const rawKey = (import.meta as any)?.env?.GEMINI_API_KEY as string | undefined;
  if (rawKey && rawKey.length > 0) {
    console.debug('[gemini] using import.meta.env.GEMINI_API_KEY (len:', rawKey.length, ')');
    return rawKey;
  }

  // 3) Build-time define from vite.config.ts (string-literal replaced by Vite)
  // The following expressions are intentionally direct so Vite can replace them.
  // @ts-ignore
  const definedGemini = process.env.GEMINI_API_KEY;
  // @ts-ignore
  const definedApi = process.env.API_KEY;
  const defined = (definedGemini as string | undefined) || (definedApi as string | undefined);
  if (defined && defined.length > 0) {
    console.debug('[gemini] using define process.env (len:', defined.length, ')');
    return defined;
  }

  // 4) Developer override for quick local debugging
  try {
    const lsKey = localStorage.getItem('GEMINI_API_KEY');
    if (lsKey) {
      console.debug('[gemini] using localStorage GEMINI_API_KEY (len:', lsKey.length, ')');
      return lsKey;
    }
  } catch {}

  throw new Error('Gemini API key not found. Provide VITE_GEMINI_API_KEY or define process.env.GEMINI_API_KEY; then hard-reload.');
};

// Resolve preferred content-generation model with env override
const getPreferredGenModel = (): string => {
  const env = (import.meta as any)?.env || {};
  const viteModel = env.VITE_GEMINI_MODEL as string | undefined;
  // @ts-ignore (string literal replaced by Vite define, if present)
  const defineModel = (typeof process !== 'undefined') ? (process.env && process.env.GEMINI_MODEL) : undefined;
  return viteModel || (defineModel as string | undefined) || 'gemini-2.5-pro';
};

// Lazily initialize the client so missing key doesn't break initial app load
let aiClient: GoogleGenAI | null = null;
const getAiClient = (): GoogleGenAI => {
  if (!aiClient) {
    const apiKey = getGeminiApiKey();
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

// Robust JSON parser that tolerates extra text and extracts the first JSON object
const parseJsonWithFallback = (text: string): any => {
  try { return JSON.parse(text); } catch {/* continue */}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {/* ignore */}
  }
  throw new Error('Invalid JSON from model');
};

// Utility: race a promise with a timeout
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result as T;
  } catch (err) {
    clearTimeout(timeoutHandle);
    throw err;
  }
};

// Replace template variables with actual values from settings
const interpolateTemplate = (template: string, settings: UserSettings): string => {
  let result = template;
  
  // Map of variable names to actual values
  const variables: Record<string, string> = {
    toneOfVoice: settings.toneOfVoice,
    industry: settings.industry,
    position: settings.position,
    englishVariant: settings.englishVariant,
    audience: settings.audience,
    postGoal: settings.postGoal,
    keywords: settings.keywords,
    contentExample1: settings.contentExamples[0] || '',
    contentExample2: settings.contentExamples[1] || '',
  };
  
  // Replace all {{variableName}} with actual values
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
};

// Fetch prompt template from backend and apply settings
const getSystemInstruction = async (templateName: string, settings: UserSettings): Promise<string> => {
  try {
    const response = await fetch(`/api/prompts/active/${templateName}`);
    if (response.ok) {
      const data = await response.json();
      return interpolateTemplate(data.template.template, settings);
    }
  } catch (error) {
    console.warn(`Failed to fetch prompt template '${templateName}', using default`, error);
  }
  
  // Fallback to hardcoded default
  return createDefaultSystemInstruction(settings);
};

// Fetch system prompt for news commentary (super admin configurable)
const getSystemPrompt = async (promptName: string): Promise<string | null> => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    const response = await fetch(`/api/super-admin/system-prompts/${promptName}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.prompt.isActive ? data.prompt.content : null;
    }
  } catch (error) {
    console.warn(`Failed to fetch system prompt '${promptName}'`, error);
  }
  return null;
};

const createDefaultSystemInstruction = (settings: UserSettings): string => {
  return `You are an expert content creator for LinkedIn. Your persona is defined by the following characteristics:
- Tone of Voice: ${settings.toneOfVoice}
- Industry: ${settings.industry}
- Position: ${settings.position}
- Language: ${settings.englishVariant} English

Your target audience is: ${settings.audience}.
The primary goal of your posts is: ${settings.postGoal}.
You should naturally incorporate the following keywords: ${settings.keywords}.

You will be given examples of the user's writing style. Learn from them to match the user's voice and style.
Example 1: "${settings.contentExamples[0]}"
${settings.contentExamples.length > 1 ? `Example 2: "${settings.contentExamples[1]}"` : ''}

Do not use emojis unless specifically asked. Be concise and professional. Structure posts for readability on LinkedIn, using short paragraphs and bullet points where appropriate.
`;
};

export const generatePostIdeas = async (topic: string, settings: UserSettings): Promise<string[]> => {
  try {
    const startedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    
    // Try to get system prompt from database first
    let systemInstruction = await getSystemPrompt('article_idea_generation');
    if (systemInstruction) {
      systemInstruction = interpolateTemplate(systemInstruction, settings);
    } else {
      // Fallback to old template system
      systemInstruction = await getSystemInstruction('idea_generation', settings);
    }
    const userPrompt = `Generate 5 distinct LinkedIn post ideas based on the topic: "${topic}".
    Each idea should be a short, compelling title or a one-sentence concept.
    Return the ideas as a JSON array of strings.`;

    const response = await withTimeout(
      getAiClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "A single LinkedIn post idea."
          }
        }
      }
      }),
      10000,
      'Idea generation'
    );

    const jsonText = response.text.trim();
    const ideas = JSON.parse(jsonText);
    const endedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    console.log(`[metrics] ideaGenerationMs=${(endedAt - startedAt).toFixed(0)}`);
    return ideas.slice(0, 5);
  } catch (error) {
    console.error("Error generating post ideas:", error);
    return ["Failed to generate ideas. Please try again.", "Check console for details.", "Could be an API key issue."];
  }
};

export const generateDraftPost = async (idea: string, settings: UserSettings): Promise<Omit<DraftPost, 'id'>> => {
    try {
      const startedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      
      // Check if this is a news commentary (contains article context)
      const isNewsCommentary = idea.includes('Context: Commenting on article');
      
      // Try to get system prompt from database first
      let systemInstruction = await getSystemPrompt('article_generation');
      if (systemInstruction) {
        systemInstruction = interpolateTemplate(systemInstruction, settings);
      } else {
        // Fallback to old template system
        systemInstruction = await getSystemInstruction('post_generation', settings);
      }
      
      // If news commentary, prepend super admin rules and news comment prompt
      if (isNewsCommentary) {
        const superAdminRules = await getSystemPrompt('super_admin_rules');
        const newsCommentPrompt = await getSystemPrompt('news_comment_generation');
        
        if (superAdminRules) {
          systemInstruction = superAdminRules + '\n\n' + systemInstruction;
        }
        if (newsCommentPrompt) {
          systemInstruction = systemInstruction + '\n\n' + newsCommentPrompt;
        }
      }
      
      const userPrompt = `Generate a full LinkedIn post based on the following idea: "${idea}".
  
      The post should include a compelling headline and a body of text suitable for a LinkedIn audience. The tone, style, and keywords should align with the persona I provided.
      The output should be a JSON object with two keys: "title" (a string for the headline) and "text" (a string for the post body).`;
  
      const preferredModel = getPreferredGenModel();

      const infer = async (model: string, timeoutMs: number) => {
        const response = await withTimeout(
          getAiClient().models.generateContent({
            model,
            contents: userPrompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'The compelling headline for the LinkedIn post.' },
                  text: { type: Type.STRING, description: 'The full body content of the LinkedIn post, formatted for readability.' },
                },
                required: ['title', 'text'],
              },
            },
          }),
          timeoutMs,
          `Draft generation (${model})`
        );
        const raw = (response as any)?.text?.trim?.() ?? '';
        return parseJsonWithFallback(raw);
      };

      let draft: { title: string; text: string };
      try {
        // Try the best model first
        draft = await infer(preferredModel, 15000);
      } catch (primaryErr) {
        console.warn(`[gemini] Primary model failed (${preferredModel}), falling back to gemini-2.5-flash`, primaryErr);
        // Fallback to fast/robust model
        draft = await infer('gemini-2.5-flash', 20000);
      }
      const endedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      console.log(`[metrics] draftGenerationMs=${(endedAt - startedAt).toFixed(0)}`);
      return draft;
    } catch (error) {
      console.error("Error generating draft post:", error);
      return { title: 'Error', text: 'Failed to generate post draft. Please check the console.' };
    }
};

export const generatePostImage = async (postText: string, settings?: UserSettings): Promise<string | undefined> => {
    try {
        const startedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        
        // Try to get system prompt from database first
        let imagePrompt = await getSystemPrompt('image_generation');
        
        if (imagePrompt) {
          // Replace {{postText}} placeholder
          imagePrompt = imagePrompt.replace(/\{\{postText\}\}/g, postText.substring(0, 500));
        } else {
          // Fallback to old template system or default
          if (settings) {
            try {
              const response = await fetch('/api/prompts/active/image_generation');
              if (response.ok) {
                const data = await response.json();
                const template = data.template.template;
                imagePrompt = template.replace(/\{\{postText\}\}/g, postText.substring(0, 500));
              } else {
                imagePrompt = `Create a visually appealing and professional image that complements the following LinkedIn post. The image should be abstract or conceptual, suitable for a professional tech audience. Avoid text in the image. The style should be modern and clean. Post content: "${postText.substring(0, 500)}..."`;
              }
            } catch (error) {
              console.warn('Failed to fetch image generation template, using default', error);
              imagePrompt = `Create a visually appealing and professional image that complements the following LinkedIn post. The image should be abstract or conceptual, suitable for a professional tech audience. Avoid text in the image. The style should be modern and clean. Post content: "${postText.substring(0, 500)}..."`;
            }
          } else {
            imagePrompt = `Create a visually appealing and professional image that complements the following LinkedIn post. The image should be abstract or conceptual, suitable for a professional tech audience. Avoid text in the image. The style should be modern and clean. Post content: "${postText.substring(0, 500)}..."`;
          }
        }

        const response = await withTimeout(
          getAiClient().models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: {
              numberOfImages: 1,
              aspectRatio: '16:9',
              outputMimeType: 'image/jpeg',
            },
          }),
          15000,
          'Image generation'
        );
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const endedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
            console.log(`[metrics] imageGenerationMs=${(endedAt - startedAt).toFixed(0)}`);
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        return undefined;
    } catch (error) {
        console.error("Error generating post image:", error);
        return undefined;
    }
};

export const enhanceImage = async (base64ImageData: string, prompt: string): Promise<string | undefined> => {
    try {
        const mimeType = base64ImageData.split(';')[0].split(':')[1];
        const data = base64ImageData.split(',')[1];

        const response = await getAiClient().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data, mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        return undefined;
    } catch (error) {
        console.error("Error enhancing image:", error);
        return undefined;
    }
};

export const generateConciseForX = async (
    originalTitle: string,
    originalText: string,
    settings: UserSettings
): Promise<string | undefined> => {
    try {
        const prompt = `Transform this LinkedIn post into a concise X (Twitter) post that fits within 280 characters.

Original LinkedIn Post:
Title: ${originalTitle}
Content: ${originalText}

Requirements:
- Maximum 280 characters total
- Maintain the core message and value
- Use a ${settings.tone} tone
- Make it engaging for X's fast-paced audience
- Include relevant hashtags if space allows
- Remove LinkedIn-specific language
- Keep it punchy and direct

Return only the X version, no explanations or quotes.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
        });

        const xVersion = response.text?.trim();
        
        // Ensure it's within character limit
        if (xVersion && xVersion.length <= 280) {
            return xVersion;
        } else if (xVersion) {
            // If it's too long, ask Gemini to make it shorter
            const shortenPrompt = `This X post is ${xVersion.length} characters, which exceeds the 280 character limit. Please shorten it while keeping the core message:

"${xVersion}"

Make it exactly 280 characters or less. Return only the shortened version.`;

            const shortenResponse = await getAiClient().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: shortenPrompt }] }],
            });

            return shortenResponse.text?.trim();
        }

        return undefined;
    } catch (error) {
        console.error("Error generating concise X version:", error);
        return undefined;
    }
};

