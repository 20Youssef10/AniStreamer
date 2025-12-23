
import { configService } from './config';

class YouTubeService {
    private get apiKey() {
        return configService.getConfig().youtube?.apiKey;
    }

    async searchVideos(query: string, maxResults: number = 5) {
        if (!this.apiKey) {
            console.error("YouTube API Key is not configured.");
            return [];
        }

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`YouTube API error: ${response.status}`);
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
            return [];
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
}

export const youtubeService = new YouTubeService();
