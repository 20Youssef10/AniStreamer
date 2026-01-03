
import { API_BASE_URL } from '../constants';

export interface MalThemes {
  openings: string[];
  endings: string[];
}

class MalService {
  private cache = new Map<string, any>();
  private clientId = '077252f0edc212a3d155be6e4a9c0fbe';

  // --- Auth & PKCE ---

  private generateRandomString(length: number) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
    }
    return result;
  }

  private async sha256(plain: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return hash;
  }

  private base64urlencode(a: ArrayBuffer) {
    const bytes = new Uint8Array(a);
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
  }

  async getLoginUrl(redirectUri: string): Promise<string> {
      const verifier = this.generateRandomString(128);
      const challengeBuffer = await this.sha256(verifier);
      const challenge = this.base64urlencode(challengeBuffer);

      window.sessionStorage.setItem('mal_code_verifier', verifier);

      return `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${this.clientId}&code_challenge=${challenge}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  async exchangeToken(code: string, redirectUri: string) {
      const verifier = window.sessionStorage.getItem('mal_code_verifier');
      if (!verifier) throw new Error("No code verifier found");

      // Use the external backend endpoint
      const response = await fetch(`${API_BASE_URL}/api/mal/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              code,
              code_verifier: verifier,
              redirect_uri: redirectUri
          })
      });

      if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown Error' }));
          throw new Error(err.error || 'Failed to exchange token');
      }

      const data = await response.json();
      window.sessionStorage.removeItem('mal_code_verifier');
      return data;
  }

  // --- Data ---

  async getScore(id: number, type: 'anime' | 'manga'): Promise<number | null> {
    if (!id) return null;
    const key = `score_${type}_${id}`;
    if (this.cache.has(key)) return this.cache.get(key);

    try {
      const response = await fetch(`https://api.jikan.moe/v4/${type}/${id}`);
      
      if (response.status === 429) {
          console.warn("MAL API Rate Limited");
          return null;
      }
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const score = data.data?.score || null;
      
      if (score) this.cache.set(key, score);
      return score;
    } catch (e) {
      console.error("MAL Fetch Error", e);
      return null;
    }
  }

  async getThemes(id: number): Promise<MalThemes | null> {
      if (!id) return null;
      const key = `themes_${id}`;
      if (this.cache.has(key)) return this.cache.get(key);

      try {
          const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/themes`);
          
          if (response.status === 429) return null;
          if (!response.ok) return null;

          const json = await response.json();
          const data = json.data;
          
          const themes = {
              openings: data.openings || [],
              endings: data.endings || []
          };
          
          this.cache.set(key, themes);
          return themes;
      } catch (e) {
          console.error("MAL Theme Fetch Error", e);
          return null;
      }
  }
}

export const malService = new MalService();
