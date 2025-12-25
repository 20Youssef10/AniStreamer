export interface MalThemes {
    openings: string[];
    endings: string[];
}

class MalService {
  private cache = new Map<string, any>();
  private clientId = '2d2b0e9f85d3923c7268597380026367'; // Public MAL Client ID for demo/open source (Replace if needed)

  async getScore(id: number, type: 'anime' | 'manga'): Promise<number | null> {
      if (!id) return null;
      const key = `score_${type}_${id}`;
      if (this.cache.has(key)) return this.cache.get(key);

      try {
          // Jikan API (Unofficial MAL API) for public data
          const response = await fetch(`https://api.jikan.moe/v4/${type}/${id}`);
          
          if (response.status === 429) return null; // Rate limit
          if (!response.ok) return null;

          const json = await response.json();
          const score = json.data?.score || null;
          
          if (score) {
              this.cache.set(key, score);
          }
          return score;
      } catch (e) {
          console.error("MAL Score Fetch Error", e);
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

  async getPictures(id: number, type: 'anime' | 'manga' | 'characters'): Promise<string[]> {
      if (!id) return [];
      const key = `pics_${type}_${id}`;
      if (this.cache.has(key)) return this.cache.get(key);

      try {
          const response = await fetch(`https://api.jikan.moe/v4/${type}/${id}/pictures`);
          
          if (response.status === 429) return [];
          if (!response.ok) return [];

          const json = await response.json();
          const images = json.data?.map((img: any) => img.jpg.large_image_url || img.jpg.image_url) || [];
          
          this.cache.set(key, images);
          return images;
      } catch (e) {
          console.error("MAL Pictures Fetch Error", e);
          return [];
      }
  }

  // --- AUTHENTICATION ---
  // Using PKCE flow for MAL if possible or simplified OAuth
  
  async getLoginUrl(redirectUri: string) {
      const codeVerifier = this.generateRandomString(128);
      window.localStorage.setItem('mal_code_verifier', codeVerifier);
      
      const params = new URLSearchParams({
          response_type: 'code',
          client_id: this.clientId,
          redirect_uri: redirectUri,
          code_challenge: codeVerifier, // MAL uses plain code_challenge if method is plain? Jikan doc isn't for auth. MAL API requires it. 
          // Note: MAL API actually requires code_challenge_method=plain if just passing string? Or S256?
          // Standard MAL OAuth: code_challenge matches verifier for plain.
          code_challenge_method: 'plain' 
      });
      return `https://myanimelist.net/v1/oauth2/authorize?${params.toString()}`;
  }

  async exchangeToken(code: string, redirectUri: string) {
      const codeVerifier = window.localStorage.getItem('mal_code_verifier');
      if (!codeVerifier) throw new Error("No code verifier found");

      const params = new URLSearchParams({
          client_id: this.clientId,
          code: code,
          code_verifier: codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
      });

      const response = await fetch('https://myanimelist.net/v1/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to exchange token');
      
      window.localStorage.removeItem('mal_code_verifier');
      return data;
  }

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
}

export const malService = new MalService();