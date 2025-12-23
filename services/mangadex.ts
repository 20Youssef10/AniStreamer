
import { MangaSource, SourceChapter, SourceManga, MangaChapter } from '../types';
import { API_BASE_URL } from '../constants';

const PROXY_URL = 'https://corsproxy.io/?';
const API_URL = 'https://api.mangadex.org';

class MangadexService implements MangaSource {
  id = 'mangadex';
  name = 'MangaDex';
  version = '1.0.0';
  icon = 'https://mangadex.org/favicon.ico';
  isNsfw = false;

  /**
   * Search for a manga by title
   */
  async searchManga(query: string): Promise<SourceManga[]> {
    if (!query) return [];
    try {
      // Use local backend proxy via API_BASE_URL for reliable search
      const response = await fetch(`${API_BASE_URL}/api/mangadex/search?title=${encodeURIComponent(query)}`);
      
      if (!response.ok) throw new Error(`MangaDex API error: ${response.status}`);
      
      const data = await response.json();
      
      return (data.data || []).map((m: any) => {
          const coverFile = m.relationships.find((r: any) => r.type === 'cover_art')?.attributes?.fileName;
          const cover = coverFile ? `https://uploads.mangadex.org/covers/${m.id}/${coverFile}.256.jpg` : '';
          return {
              id: m.id,
              title: m.attributes.title.en || Object.values(m.attributes.title)[0] || 'Unknown',
              image: cover,
              status: m.attributes.status
          };
      });
    } catch (error) {
      console.error('MangaDex Search Error:', error);
      return [];
    }
  }

  // Legacy Method for backward compatibility
  async searchMangaId(title: string): Promise<string | null> {
      const results = await this.searchManga(title);
      return results.length > 0 ? results[0].id : null;
  }

  /**
   * Get chapters for a specific manga ID
   */
  async getChapters(mangaId: string): Promise<SourceChapter[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mangadex/chapters/${mangaId}`);

      if (!response.ok) throw new Error(`MangaDex API error: ${response.status}`);

      const data = await response.json();
      if (!data.data) return [];

      return data.data.map((ch: any) => ({
        id: ch.id,
        number: ch.attributes.chapter,
        title: ch.attributes.title,
        language: ch.attributes.translatedLanguage,
        date: new Date(ch.attributes.publishAt).getTime(),
        volume: ch.attributes.volume
      }));
    } catch (error) {
      console.error('MangaDex Chapters Error:', error);
      return [];
    }
  }

  /**
   * Get pages (images) for a specific chapter
   */
  async getPages(chapterId: string): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mangadex/pages/${chapterId}`);

      if (!response.ok) throw new Error(`MangaDex API error: ${response.status}`);
      
      const data = await response.json();

      if (!data.baseUrl || !data.chapter || !data.chapter.hash || !data.chapter.data) {
          return [];
      }

      const baseUrl = data.baseUrl;
      const hash = data.chapter.hash;
      const files = data.chapter.data;

      return files.map((file: string) => `${baseUrl}/data/${hash}/${file}`);
    } catch (error) {
      console.error('MangaDex Pages Error:', error);
      return [];
    }
  }
  
  // Legacy Adapter
  async getChapterPages(chapterId: string): Promise<string[]> {
      return this.getPages(chapterId);
  }
}

export const mangadexService = new MangadexService();
