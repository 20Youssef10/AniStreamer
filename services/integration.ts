
import { firebaseService } from './firebase';
import { anilistService } from './anilist';
import { UserListEntry, Anime } from '../types';

class IntegrationService {
    
    // Parse MAL Export XML
    async parseMalXml(xmlContent: string): Promise<any[]> {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
        const animeNodes = xmlDoc.getElementsByTagName("anime");
        const list = [];

        for (let i = 0; i < animeNodes.length; i++) {
            const node = animeNodes[i];
            const getVal = (tag: string) => node.getElementsByTagName(tag)[0]?.textContent || "";
            
            list.push({
                malId: parseInt(getVal("series_animedb_id")),
                title: getVal("series_title"),
                type: getVal("series_type"),
                episodes: parseInt(getVal("series_episodes")),
                myStatus: getVal("my_status"),
                myScore: parseInt(getVal("my_score")),
                myProgress: parseInt(getVal("my_watched_episodes")),
                myStartDate: getVal("my_start_date"),
                myFinishDate: getVal("my_finish_date"),
            });
        }
        return list;
    }

    private mapStatus(malStatus: string): UserListEntry['status'] {
        switch (malStatus) {
            case 'Completed': return 'COMPLETED';
            case 'Watching': return 'WATCHING';
            case 'Plan to Watch': return 'PLANNING';
            case 'Dropped': return 'DROPPED';
            case 'On-Hold': return 'PAUSED';
            default: return 'PLANNING';
        }
    }

    async importMalList(userId: string, xmlContent: string, onProgress?: (percent: number) => void) {
        const parsed = await this.parseMalXml(xmlContent);
        if (parsed.length === 0) throw new Error("No entries found in XML");

        // Batch map MAL IDs to AniList IDs
        const malIds = parsed.map(p => p.malId);
        const mapped = await anilistService.getAnimeByMalIds(malIds);
        // Explicitly type the map to allow correct lookups
        const mapDict = new Map<number, Anime>(mapped.map(m => [m.idMal || 0, m]));

        const finalList: UserListEntry[] = [];
        let processed = 0;

        for (const item of parsed) {
            const anilistData = mapDict.get(item.malId);
            if (anilistData) {
                // Construct Entry using metadata from AniList
                finalList.push({
                    animeId: anilistData.id,
                    status: this.mapStatus(item.myStatus),
                    score: item.myScore * 10, // MAL is 1-10, AniStream/AniList 1-100
                    progress: item.myProgress,
                    priority: 'MEDIUM',
                    rewatchCount: 0,
                    notes: 'Imported from MAL',
                    private: false,
                    updatedAt: Date.now(),
                    startDate: item.myStartDate,
                    finishDate: item.myFinishDate,
                    title: anilistData.title.romaji || anilistData.title.english || item.title,
                    image: anilistData.coverImage.medium,
                    genres: anilistData.genres,
                    type: 'ANIME' 
                });
            }
            processed++;
            if (onProgress) onProgress(Math.round((processed / parsed.length) * 100));
        }

        // Batch save to Firebase
        await firebaseService.importUserList(userId, finalList);
        return finalList.length;
    }
}

export const integrationService = new IntegrationService();
