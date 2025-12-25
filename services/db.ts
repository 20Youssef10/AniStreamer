
import Dexie, { type EntityTable } from 'dexie';
import { Anime, MediaType } from '../types';

interface CacheEntry {
    key: string;
    data: any;
    timestamp: number;
}

interface OfflineChapter {
    id: string;
    mangaId: number;
    title: string;
    pages: string[]; 
    timestamp: number;
}

export interface HistoryEntry {
    id: string; // Composite: TYPE-ID (e.g., ANIME-101)
    mediaId: number;
    type: MediaType;
    title: { romaji: string; english?: string; native?: string };
    coverImage: string;
    bannerImage?: string;
    format?: string;
    status?: string;
    timestamp: number;
}

const db = new Dexie('AniStream_Unified') as Dexie & {
    apiCache: EntityTable<CacheEntry, 'key'>;
    chapters: EntityTable<OfflineChapter, 'id'>;
    history: EntityTable<HistoryEntry, 'id'>;
};

// Bump version to 2 to add 'history' table
db.version(2).stores({
    apiCache: 'key, timestamp',
    chapters: 'id, mangaId, timestamp',
    history: 'id, timestamp'
});

export { db };
