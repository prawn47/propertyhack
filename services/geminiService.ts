import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { UserSettings, DraftPost } from '../types';

// Get Gemini API key from environment
const getGeminiApiKey = (): string => {
  // First try Vite environment variable
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) {
    return envKey;
  }
  
  // Then try the GEMINI_API_KEY from .env.local
  const geminiKey = import.meta.env.GEMINI_API_KEY;
  if (geminiKey) {
    return geminiKey;
  }
  
  throw new Error("Gemini API key not found. Please add VITE_GEMINI_API_KEY or GEMINI_API_KEY to your .env.local file.");
};

// Initialize with API key from environment variables.
const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

const createSystemInstruction = (settings: UserSettings): string => {
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
    const systemInstruction = createSystemInstruction(settings);
    const userPrompt = `Generate 5 distinct LinkedIn post ideas based on the topic: "${topic}".
    Each idea should be a short, compelling title or a one-sentence concept.
    Return the ideas as a JSON array of strings.`;

    const response = await ai.models.generateContent({
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
    });

    const jsonText = response.text.trim();
    const ideas = JSON.parse(jsonText);
    return ideas.slice(0, 5);
  } catch (error) {
    console.error("Error generating post ideas:", error);
    return ["Failed to generate ideas. Please try again.", "Check console for details.", "Could be an API key issue."];
  }
};

export const generateDraftPost = async (idea: string, settings: UserSettings): Promise<Omit<DraftPost, 'id'>> => {
    try {
      const systemInstruction = createSystemInstruction(settings);
      const userPrompt = `Generate a full LinkedIn post based on the following idea: "${idea}".
  
      The post should include a compelling headline and a body of text suitable for a LinkedIn audience. The tone, style, and keywords should align with the persona I provided.
      The output should be a JSON object with two keys: "title" (a string for the headline) and "text" (a string for the post body).`;
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'The compelling headline for the LinkedIn post.',
              },
              text: {
                type: Type.STRING,
                description: 'The full body content of the LinkedIn post, formatted for readability.',
              },
            },
            required: ["title", "text"],
          },
        },
      });
  
      const jsonText = response.text.trim();
      const draft = JSON.parse(jsonText);
      return draft;
    } catch (error) {
      console.error("Error generating draft post:", error);
      return { title: 'Error', text: 'Failed to generate post draft. Please check the console.' };
    }
};

export const generatePostImage = async (postText: string): Promise<string | undefined> => {
    try {
        const imagePrompt = `Create a visually appealing and professional image that complements the following LinkedIn post. The image should be abstract or conceptual, suitable for a professional tech audience. Avoid text in the image. The style should be modern and clean. Post content: "${postText.substring(0, 500)}..."`;

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: {
              numberOfImages: 1,
              aspectRatio: '16:9',
              outputMimeType: 'image/jpeg',
            },
        });
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
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

        const response = await ai.models.generateContent({
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

            const shortenResponse = await ai.models.generateContent({
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

