
import { MangaSource, SourceChapter, SourceManga, MangaChapter } from '../types';

class MangadexService implements MangaSource {
  id = 'mangadex';
  name = 'MangaDex';
  version = '1.0.1';
  icon = 'https://mangadex.org/favicon.ico';
  isNsfw = false;

  private async fetchWithFallback(url: string): Promise<any> {
      try {
          // Try direct first
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Direct fetch failed: ${res.status}`);
          return await res.json();
      } catch (e) {
          console.warn("MangaDex direct fetch failed, trying proxy...", e);
          // Try Proxy
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
          return await res.json();
      }
  }

  /**
   * Search for a manga by title
   */
  async searchManga(query: string): Promise<SourceManga[]> {
    if (!query) return [];
    try {
      const url = `https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=10&contentRating[]=safe&contentRating[]=suggestive&includes[]=cover_art`;
      const data = await this.fetchWithFallback(url);
      
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
      const url = `https://api.mangadex.org/manga/${mangaId}/feed?order[chapter]=desc&limit=500&includes[]=scanlation_group`;
      const data = await this.fetchWithFallback(url);

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
      const url = `https://api.mangadex.org/at-home/server/${chapterId}`;
      const data = await this.fetchWithFallback(url);

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
