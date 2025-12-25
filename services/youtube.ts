
import { configService } from './config';

class YouTubeService {
    private get apiKey() {
        // 1. User Settings Key (Priority Override)
        try {
            const local = localStorage.getItem('anistream_settings');
            if (local) {
                const settings = JSON.parse(local);
                if (settings.youtubeApiKey) return settings.youtubeApiKey;
            }
        } catch (e) {
            // Ignore parse errors
        }

        // 2. Config Key (Env/File/Default)
        const configKey = configService.getConfig().youtube?.apiKey;
        return configKey || null;
    }

    async searchVideos(query: string, maxResults: number = 5) {
        if (!this.apiKey) {
            console.warn("YouTube API Key is not configured. Using mock data.");
            return this.getMockResults(query, maxResults);
        }

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`YouTube API error: ${response.status}. Falling back to mock data.`);
                return this.getMockResults(query, maxResults);
            }
            const data = await response.json();
            return data.items.map((item: any) => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high.url,
                channelTitle: item.snippet.channelTitle,
                publishTime: item.snippet.publishTime
            }));
        } catch (error) {
            console.error("Failed to fetch YouTube videos", error);
            return this.getMockResults(query, maxResults);
        }
    }

    async getVideoDetails(videoId: string) {
        if (!this.apiKey) return null;

        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.items?.[0] || null;
        } catch (error) {
            console.error("Failed to fetch YouTube video details", error);
            return null;
        }
    }

    private getMockResults(query: string, count: number) {
        // Fallback videos to display when API quota is exceeded or key is invalid
        const mockIds = ['ATJYac_dORw', 'dd7BILZcYAY', '8OKMZjRhtqw', 'XjVA9GNE7JQ', 'jTBjZ9e3fB0'];
        return Array.from({ length: count }).map((_, i) => ({
            id: mockIds[i % mockIds.length],
            title: `[Demo] ${query} - Result ${i + 1}`,
            thumbnail: `https://img.youtube.com/vi/${mockIds[i % mockIds.length]}/hqdefault.jpg`,
            channelTitle: "AniStream Fallback",
            publishTime: new Date().toISOString()
        }));
    }
}

export const youtubeService = new YouTubeService();
