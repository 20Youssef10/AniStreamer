
import Dexie, { type EntityTable } from 'dexie';

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

const db = new Dexie('AniStream_Unified') as Dexie & {
    apiCache: EntityTable<CacheEntry, 'key'>;
    chapters: EntityTable<OfflineChapter, 'id'>;
};

db.version(1).stores({
    apiCache: 'key, timestamp',
    chapters: 'id, mangaId, timestamp'
});

export { db };
