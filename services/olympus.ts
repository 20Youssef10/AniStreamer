
import { MangaSource, SourceChapter, SourceManga } from '../types';
import { API_BASE_URL } from '../constants';

class OlympusService implements MangaSource {
  id = 'olympus';
  name = 'Olympus';
  version = '1.0.1';
  icon = 'https://olympusscans.com/wp-content/uploads/2022/06/cropped-Logo-Olympus-1-192x192.png';
  isNsfw = false;
  baseUrl = 'https://olympusscans.com';

  private async fetchProxy(path: string): Promise<Document> {
      const targetUrl = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
      
      // Try using public CORS proxy first as it mimics browser headers better for scraping
      try {
          const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
          if (response.ok) {
              const html = await response.text();
              return new DOMParser().parseFromString(html, 'text/html');
          }
      } catch (e) {
          console.warn("Public proxy failed, trying backend...", e);
      }

      // Fallback to our external backend proxy
      // Construct absolute URL: https://backend.com/api/olympus/proxy...
      const response = await fetch(`${API_BASE_URL}/api/olympus/proxy?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) throw new Error(`Olympus Proxy Failed: ${response.status}`);
      const html = await response.text();
      return new DOMParser().parseFromString(html, 'text/html');
  }

  async searchManga(query: string): Promise<SourceManga[]> {
    try {
        const doc = await this.fetchProxy(`?s=${encodeURIComponent(query)}&post_type=wp-manga`);
        
        const rows = Array.from(doc.querySelectorAll('.c-tabs-item__content'));
        
        return rows.map(row => {
            const linkTag = row.querySelector('.post-title h3 a') as HTMLAnchorElement;
            const imgTag = row.querySelector('img') as HTMLImageElement;
            
            if (!linkTag) return null;

            const title = linkTag.textContent?.trim() || 'Unknown';
            const url = new URL(linkTag.href);
            const relativePath = url.pathname;
            
            let image = imgTag?.src || '';
            if (imgTag?.dataset?.src) image = imgTag.dataset.src;
            if (imgTag?.getAttribute('srcset')) image = imgTag.getAttribute('srcset')!.split(',')[0].split(' ')[0];

            return {
                id: relativePath,
                title: title,
                image: image,
                status: 'Unknown',
                sourceId: this.id
            };
        }).filter(Boolean) as SourceManga[];

    } catch (e) {
        console.error("Olympus Search Error", e);
        return [];
    }
  }

  async searchMangaId(title: string): Promise<string | null> {
      const results = await this.searchManga(title);
      return results.length > 0 ? results[0].id : null;
  }

  async getChapters(mangaId: string): Promise<SourceChapter[]> {
      try {
          const doc = await this.fetchProxy(mangaId); 
          
          const chapterItems = Array.from(doc.querySelectorAll('li.wp-manga-chapter'));
          
          return chapterItems.map(li => {
              const a = li.querySelector('a');
              if (!a) return null;
              
              const href = a.getAttribute('href') || '';
              // Handle relative or absolute URLs
              let link = href;
              try {
                  const urlObj = new URL(href, this.baseUrl);
                  link = urlObj.pathname;
              } catch(e) {}

              const titleText = a.textContent?.trim() || '';
              
              const match = titleText.match(/Chapter\s*([\d\.]+)/i) || titleText.match(/Cap[ií]tulo\s*([\d\.]+)/i);
              const number = match ? match[1] : '0';
              
              const dateSpan = li.querySelector('.chapter-release-date i');
              let date = Date.now();
              if (dateSpan?.textContent) {
                  date = new Date(dateSpan.textContent.trim()).getTime();
              }

              return {
                  id: link,
                  number: number,
                  title: titleText,
                  language: 'es', 
                  date: isNaN(date) ? Date.now() : date,
                  source: 'manual' 
              };
          }).filter(Boolean) as SourceChapter[];

      } catch (e) {
          console.error("Olympus Chapters Error", e);
          return [];
      }
  }

  async getPages(chapterId: string): Promise<string[]> {
      try {
          const doc = await this.fetchProxy(chapterId); 
          
          const images = Array.from(doc.querySelectorAll('.reading-content img'));
          
          return images.map(img => {
              const el = img as HTMLImageElement;
              return (el.dataset.src || el.src || '').trim();
          }).filter(url => url.length > 0);

      } catch (e) {
          console.error("Olympus Pages Error", e);
          return [];
      }
  }
}

export const olympusService = new OlympusService();
