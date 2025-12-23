import { TraceResult } from '../types';
import { anilistService } from './anilist';

class TraceService {
  private API_URL = 'https://api.trace.moe/search?anilistInfo';

  async searchByImage(imageBlob: Blob): Promise<TraceResult> {
    const formData = new FormData();
    formData.append('image', imageBlob);

    const response = await fetch(this.API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to search image');
    }

    const data = await response.json();
    return data;
  }

  async searchByUrl(url: string): Promise<TraceResult> {
    const response = await fetch(`${this.API_URL}&url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error('Failed to search image url');
    }

    const data = await response.json();
    return data;
  }
}

export const traceService = new TraceService();