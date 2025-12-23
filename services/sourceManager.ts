
import { MangaSource } from '../types';
import { mangadexService } from './mangadex';
import { mangahookService } from './mangahook';
import { olympusService } from './olympus';

class SourceManager {
    private sources: Map<string, MangaSource> = new Map();

    constructor() {
        this.registerSource(mangadexService);
        this.registerSource(mangahookService);
        this.registerSource(olympusService);
    }

    registerSource(source: MangaSource) {
        this.sources.set(source.id, source);
    }

    getSources(): MangaSource[] {
        return Array.from(this.sources.values());
    }

    getSource(id: string): MangaSource | undefined {
        return this.sources.get(id);
    }

    async searchAll(query: string) {
        const promises = Array.from(this.sources.values()).map(s => 
            s.searchManga(query).then(res => res.map(m => ({...m, sourceId: s.id})))
        );
        const results = await Promise.all(promises);
        return results.flat();
    }
}

export const sourceManager = new SourceManager();
