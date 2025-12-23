
import { SpotifyTrack, SpotifyPlaylist } from '../types';

export const SPOTIFY_CONFIG = {
  clientId: 'e4ef841d1e4242718c7bcbcf09114f61',
  redirectUri: 'https://anistream-ata1.web.app/callback', // Must match Spotify Dashboard
  authEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
  scopes: [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state"
  ]
};

class SpotifyService {
  // PKCE Helpers
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
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async getLoginUrl() {
    const verifier = this.generateRandomString(128);
    const challenge = this.base64urlencode(await this.sha256(verifier));
    
    // Store verifier for the callback step
    window.localStorage.setItem('spotify_code_verifier', verifier);

    const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.clientId,
        response_type: 'code',
        redirect_uri: SPOTIFY_CONFIG.redirectUri,
        scope: SPOTIFY_CONFIG.scopes.join(' '),
        code_challenge_method: 'S256',
        code_challenge: challenge,
        show_dialog: 'true'
    });

    return `${SPOTIFY_CONFIG.authEndpoint}?${params.toString()}`;
  }

  async exchangeToken(code: string) {
      const verifier = window.localStorage.getItem('spotify_code_verifier');
      if (!verifier) throw new Error("No code verifier found");

      const params = new URLSearchParams({
          client_id: SPOTIFY_CONFIG.clientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_CONFIG.redirectUri,
          code_verifier: verifier,
      });

      const response = await fetch(SPOTIFY_CONFIG.tokenEndpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params
      });

      const data = await response.json();
      if (!response.ok) {
          throw new Error(data.error_description || data.error || 'Failed to exchange token');
      }
      
      // Clean up verifier
      window.localStorage.removeItem('spotify_code_verifier');
      
      return data; // Contains access_token, refresh_token, expires_in
  }

  async searchTracks(query: string, token: string): Promise<SpotifyTrack[]> {
    if (!token) return [];
    
    try {
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error("Token expired");
            throw new Error("Search failed");
        }

        const data = await response.json();
        return data.tracks.items;
    } catch (e) {
        console.error("Spotify Search Error", e);
        throw e;
    }
  }

  async searchPlaylists(query: string, token: string): Promise<SpotifyPlaylist[]> {
    if (!token) return [];
    
    try {
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=6`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
             if (response.status === 401) throw new Error("Token expired");
             return [];
        }

        const data = await response.json();
        return data.playlists.items;
    } catch (e) {
        console.error("Spotify Playlist Search Error", e);
        return [];
    }
  }
}

export const spotifyService = new SpotifyService();
