
import { GoogleGenAI, Modality, Type } from "@google/genai";

class AIService {
  private defaultModel: string = 'gemini-3-flash-preview';
  private _apiKey: string | undefined;

  constructor() {
      // Initialize with environment variable if available
      this._apiKey = process.env.API_KEY;
  }

  // Helper to ensure a new client instance is created with current API key
  private get client(): GoogleGenAI {
    try {
        const key = this._apiKey || process.env.API_KEY;
        if (!key) throw new Error("API Key missing");
        return new GoogleGenAI({ apiKey: key });
    } catch (e) {
        console.error("Failed to initialize GoogleGenAI. API_KEY might be missing.");
        throw new Error("AI Service Unavailable: Missing Configuration");
    }
  }

  setApiKey(key: string) {
      if (key) {
          this._apiKey = key;
      }
  }

  getApiKey(): string | undefined {
      return this._apiKey || process.env.API_KEY;
  }

  setModel(model: string) {
      if (model) this.defaultModel = model;
  }

  private cleanBase64(data: string) {
      if (data.includes(',')) {
          return data.split(',')[1];
      }
      return data;
  }

  // 1. Chat
  async chat(message: string, history: {role: 'user' | 'model', text: string}[] = [], systemInstruction?: string) {
    try {
        const contents = history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        }));
        contents.push({ role: 'user', parts: [{ text: message }] });

        const response = await this.client.models.generateContent({
            model: this.defaultModel,
            contents: contents,
            config: systemInstruction ? { systemInstruction } : undefined
        });
        return response.text;
    } catch (e) {
        console.error("AI Chat Error:", e);
        return "I'm having trouble connecting to the neural network right now. Please try again later.";
    }
  }

  // 1b. Fast Chat
  async fastChat(message: string) {
      try {
          const response = await this.client.models.generateContent({
              model: 'gemini-2.5-flash-lite-latest',
              contents: message
          });
          return response.text;
      } catch (e) {
          console.error("AI FastChat Error:", e);
          return "Connection interrupted.";
      }
  }

  // 2. Search Grounding
  async search(query: string) {
    try {
        const response = await this.client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: query,
            config: { tools: [{ googleSearch: {} }] },
        });
        return {
            text: response.text || "No results found.",
            sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
        };
    } catch (e) {
        console.error("AI Search Error:", e);
        throw new Error("AI Search Unavailable");
    }
  }

  // SEMANTIC: "Vibe" Search
  async vibeSearch(vibe: string): Promise<string[]> {
      try {
          const response = await this.client.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Recommend 6 specific anime titles that match this vibe/description: "${vibe}". Return ONLY a JSON array of strings (exact titles). Do not include explanation.`,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                  }
              }
          });
          const json = JSON.parse(response.text || '[]');
          return json;
      } catch (e) {
          console.error("Vibe Search Error", e);
          return [];
      }
  }

  // UTILITY: Generate User Bio
  async generateUserBio(preferences: string[], favorites: string[], tone: string = 'otaku'): Promise<string> {
      try {
          const prompt = `Write a short, engaging bio (max 200 characters) for an anime profile. 
          Preferences: ${preferences.join(', ')}. 
          Favorite Anime: ${favorites.join(', ')}. 
          Tone: ${tone} (e.g., mysterious, enthusiastic, chuunibyou). 
          Don't use hashtags.`;

          const response = await this.client.models.generateContent({
              model: 'gemini-2.5-flash-lite-latest',
              contents: prompt
          });
          return response.text || "Just an anime fan passing through.";
      } catch (e) {
          return "Error generating bio.";
      }
  }

  // UTILITY: Get Character Quotes
  async getCharacterQuotes(characterName: string, animeName: string): Promise<string[]> {
      try {
          const prompt = `Find or generate 3-5 famous, inspirational, or iconic quotes spoken by the character "${characterName}" from the anime/manga "${animeName}". 
          If specific quotes aren't strictly verbatim in database, generate quotes that capture their exact personality and speech style.
          Return ONLY a JSON array of strings.`;

          const response = await this.client.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                  }
              }
          });
          
          return JSON.parse(response.text || '[]');
      } catch (e) {
          console.error("Get Quotes Error", e);
          return [];
      }
  }

  // UTILITY: Character Analysis
  async analyzeCharacter(name: string, anime: string, description: string): Promise<string> {
      try {
          const prompt = `Analyze the character "${name}" from "${anime}".
          Description Context: ${description}
          
          Provide a detailed markdown summary including:
          1. **Personality Archetype** (e.g., Tsundere, Dandere, etc.)
          2. **Role & Significance** in the story.
          3. **Key Psychological Traits**.
          4. **Why fans love (or hate) them**.
          
          Keep it engaging and insightful. Use Markdown formatting.`;

          const response = await this.client.models.generateContent({
              model: 'gemini-3-pro-preview', // Using Pro for better analysis
              contents: prompt,
          });
          
          return response.text || "Analysis unavailable.";
      } catch (e) {
          console.error("Analysis Error", e);
          return "Failed to generate analysis.";
      }
  }

  // GAME: Isekai Game Engine
  async isekaiEngine(world: string, action: string, state: any, language: string = 'en') {
      try {
          const systemPrompt = `You are a Dungeon Master for an Isekai RPG set in the world of "${world}". 
          The player has just been reincarnated/transported here.
          Respond in language: ${language}.
          
          Current State:
          HP: ${state.hp}
          Inventory: ${state.inventory.join(', ')}
          Location: ${state.location}
          
          User Action: "${action}"
          
          Task:
          1. Narrate the outcome of the action (keep it exciting, max 3 sentences).
          2. Update HP (damage or healing).
          3. Update Inventory (items found or used).
          4. Provide 3 specific choices for what to do next.
          
          Output JSON format:
          {
            "narrative": "string",
            "hp_change": number (e.g. -10 or 5 or 0),
            "inventory_add": [],
            "inventory_remove": [],
            "new_location": "string (optional, only if changed)",
            "choices": ["string", "string", "string"]
          }`;

          const response = await this.client.models.generateContent({
              model: 'gemini-3-flash-preview', // Good balance of speed and reasoning
              contents: action,
              config: {
                  systemInstruction: systemPrompt,
                  responseMimeType: "application/json"
              }
          });
          
          return JSON.parse(response.text || '{}');
      } catch (e) {
          console.error("Isekai Error", e);
          throw e;
      }
  }

  // UTILITY: Manga Dubbing (OCR + Speaker ID)
  async analyzeMangaPage(imageBase64: string): Promise<{text: string, speaker: string, gender: 'Male' | 'Female' | 'Narrator'}[]> {
      try {
          const cleanData = this.cleanBase64(imageBase64);
          const response = await this.client.models.generateContent({
              model: 'gemini-2.5-flash-image', // Specialized for vision
              contents: {
                  parts: [
                      { inlineData: { mimeType: 'image/png', data: cleanData } },
                      { text: "Extract text from speech bubbles in reading order. Identify the likely speaker name (guess if unknown) and their gender. Return JSON array." }
                  ]
              },
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              text: { type: Type.STRING },
                              speaker: { type: Type.STRING },
                              gender: { type: Type.STRING, enum: ['Male', 'Female', 'Narrator'] }
                          }
                      }
                  }
              }
          });
          return JSON.parse(response.text || '[]');
      } catch (e) {
          console.error("Manga Dub Error", e);
          return [];
      }
  }

  // 3. Image Editing
  async editImage(imageBase64: string, prompt: string) {
    try {
        const cleanData = this.cleanBase64(imageBase64);
        const response = await this.client.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: cleanData } },
                    { text: prompt }
                ]
            }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("AI Image Edit Error:", e);
        throw e;
    }
  }

  // 4. Video Generation (Veo)
  async generateVideo(prompt: string, aspectRatio: '16:9' | '9:16' = '16:9', imageBase64?: string) {
      // Check for API Key selection (mandatory for Veo)
      if (typeof window !== 'undefined' && (window as any).aistudio) {
           const aistudio = (window as any).aistudio;
           if (!await aistudio.hasSelectedApiKey()) {
               await aistudio.openSelectKey();
           }
      }
      
      const payload: any = {
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
          config: {
              numberOfVideos: 1,
              resolution: '720p',
              aspectRatio: aspectRatio
          }
      };

      if (imageBase64) {
          payload.image = {
              imageBytes: this.cleanBase64(imageBase64),
              mimeType: 'image/png'
          };
      }

      try {
          const ai = this.client; // Re-instantiate to pick up key if changed
          let operation = await ai.models.generateVideos(payload);

          // Polling for video completion
          while (!operation.done) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              operation = await ai.operations.getVideosOperation({ operation: operation });
          }

          const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
          if (videoUri) {
              const currentKey = this.getApiKey();
              return `${videoUri}&key=${currentKey}`; 
          }
          throw new Error("Video generation failed or timed out.");
      } catch (e) {
          console.error("AI Video Gen Error:", e);
          throw e;
      }
  }

  // 5. Image/Video Analysis
  async analyzeMedia(mimeType: string, dataBase64: string, prompt: string) {
      try {
          const response = await this.client.models.generateContent({
              model: this.defaultModel,
              contents: {
                  parts: [
                      { inlineData: { mimeType, data: this.cleanBase64(dataBase64) } },
                      { text: prompt }
                  ]
              }
          });
          return response.text;
      } catch (e) {
          console.error("AI Analyze Error:", e);
          return "I couldn't analyze the media. Please try again.";
      }
  }

  // 6. Thinking Mode
  async complexQuery(query: string) {
      try {
          const response = await this.client.models.generateContent({
              model: 'gemini-3-pro-preview',
              contents: query,
              config: {
                  thinkingConfig: { thinkingBudget: 16000 }
              }
          });
          return response.text;
      } catch (e) {
          console.error("AI Thinking Error:", e);
          return "Reasoning engine offline.";
      }
  }

  // 7. Audio Transcription
  async transcribeAudio(audioBase64: string) {
      try {
          const response = await this.client.models.generateContent({
              model: 'gemini-3-flash-preview', 
              contents: {
                  parts: [
                      { inlineData: { mimeType: 'audio/mp3', data: this.cleanBase64(audioBase64) } },
                      { text: "Transcribe this audio verbatim." }
                  ]
              }
          });
          return response.text;
      } catch (e) {
          console.error("AI Transcribe Error:", e);
          return "Transcription failed.";
      }
  }

  // 8. Text to Speech
  async generateSpeech(text: string, voice: string = 'Kore'): Promise<AudioBuffer> {
      try {
          const response = await this.client.models.generateContent({
              model: "gemini-2.5-flash-preview-tts",
              contents: [{ parts: [{ text }] }],
              config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                      voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: voice },
                      },
                  },
              },
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!base64Audio) throw new Error("No audio generated");

          const binaryString = atob(base64Audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }

          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
          
          // Decode raw PCM scaling by 32768
          const dataInt16 = new Int16Array(bytes.buffer);
          const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
          const channelData = buffer.getChannelData(0);
          for (let i = 0; i < dataInt16.length; i++) {
              channelData[i] = dataInt16[i] / 32768.0;
          }
          
          return buffer;
      } catch (e) {
          console.error("AI TTS Error:", e);
          throw e;
      }
  }
}

export const aiService = new AIService();
