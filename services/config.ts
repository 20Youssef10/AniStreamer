
import { AppConfig } from '../types';
import { DEFAULT_CONFIG } from '../constants';

class ConfigService {
  private config: AppConfig = DEFAULT_CONFIG;
  private initialized = false;

  async loadConfig(): Promise<AppConfig> {
    if (this.initialized) return this.config;

    this.config = DEFAULT_CONFIG;

    try {
      // Attempt to fetch config.txt from the public root.
      // This allows updating keys/urls without rebuilding the app.
      const response = await fetch('/config.txt');
      if (response.ok) {
        const text = await response.text();
        this.parseConfigText(text);
        console.log("Configuration loaded from config.txt");
      }
    } catch (error) {
      console.warn("Could not load config.txt, using defaults.", error);
    }

    this.initialized = true;
    return this.config;
  }

  private parseConfigText(text: string) {
    // Helper to extract value by key pattern
    const extract = (pattern: RegExp) => {
        const match = text.match(pattern);
        return match ? match[1] : null;
    };

    // Firebase Config Extraction
    const apiKey = extract(/apiKey:\s*"([^"]+)"/);
    const authDomain = extract(/authDomain:\s*"([^"]+)"/);
    const projectId = extract(/projectId:\s*"([^"]+)"/);
    const storageBucket = extract(/storageBucket:\s*"([^"]+)"/);
    const messagingSenderId = extract(/messagingSenderId:\s*"([^"]+)"/);
    const appId = extract(/appId:\s*"([^"]+)"/);
    const measurementId = extract(/measurementId:\s*"([^"]+)"/);
    
    // VAPID Key
    const vapidKey = extract(/key pair for cloud messaging:\s*([^\s]+)/);

    // AniList Config
    const anilistId = extract(/ID:\s*(\d+)/);
    const anilistSecret = extract(/Secret:\s*([^\s]+)/);

    if (apiKey && authDomain && projectId) {
        this.config.firebase = {
            apiKey,
            authDomain,
            projectId,
            storageBucket: storageBucket || '',
            messagingSenderId: messagingSenderId || '',
            appId: appId || '',
            measurementId: measurementId || undefined,
            vapidKey: vapidKey || undefined
        };
    }

    if (anilistId || anilistSecret) {
        this.config.anilist = {
            ...this.config.anilist,
            clientId: anilistId || undefined,
            clientSecret: anilistSecret || undefined
        };
    }
  }

  getConfig(): AppConfig {
    return this.config;
  }
}

export const configService = new ConfigService();
