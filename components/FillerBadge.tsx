
import React from 'react';
import { otakuService } from '../services/otaku';
import { ShieldAlert, BookOpenCheck } from 'lucide-react';

interface FillerBadgeProps {
    animeId: number;
    episodeNumber: number;
}

const FillerBadge: React.FC<FillerBadgeProps> = ({ animeId, episodeNumber }) => {
    const isFiller = otakuService.isFiller(animeId, episodeNumber);

    if (isFiller) {
        return (
            <span 
                className="flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-wider font-bold"
                title="This implies original content not in the manga"
            >
                <ShieldAlert className="w-3 h-3" /> Filler
            </span>
        );
    }

    return (
        <span 
            className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/10 uppercase tracking-wider font-bold opacity-50"
            title="Manga Canon"
        >
            <BookOpenCheck className="w-3 h-3" /> Canon
        </span>
    );
};

export default FillerBadge;
