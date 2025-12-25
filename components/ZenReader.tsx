
import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Headphones, Volume2, X, Music, Play, Pause } from 'lucide-react';

interface ZenReaderProps {
    genres: string[];
}

const AMBIENCE_MAP: Record<string, string> = {
    'Action': 'https://www.youtube.com/embed/5qap5aO4i9A', // Lofi Battle
    'Adventure': 'https://www.youtube.com/embed/gT2E2FpcfX8', // Fantasy Tavern
    'Horror': 'https://www.youtube.com/embed/CoM9qBf52T8', // Spooky
    'Romance': 'https://www.youtube.com/embed/tNkZsRW7h2c', // Piano
    'Slice of Life': 'https://www.youtube.com/embed/-5KAN9_CzSA', // Cafe
    'Sci-Fi': 'https://www.youtube.com/embed/U9FzqxDb_r4', // Cyberpunk
    'Fantasy': 'https://www.youtube.com/embed/xL0UT8V2kIA', // Magical Forest
    'Mystery': 'https://www.youtube.com/embed/jfKfPfyJRdk', // Rain & Jazz
    'Default': 'https://www.youtube.com/embed/jfKfPfyJRdk' // Lofi Girl
};

const ZenReader: React.FC<ZenReaderProps> = ({ genres }) => {
    const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
    const [isOpen, setIsOpen] = useState(false);
    const [suggestedTrack, setSuggestedTrack] = useState<{name: string, url: string} | null>(null);

    useEffect(() => {
        // Find best match
        const match = genres.find(g => AMBIENCE_MAP[g]);
        const url = match ? AMBIENCE_MAP[match] : AMBIENCE_MAP['Default'];
        setSuggestedTrack({
            name: match ? `${match} Ambience` : 'Relaxing Lofi',
            url
        });
    }, [genres]);

    const playAmbience = () => {
        if (suggestedTrack) {
            playTrack({
                title: suggestedTrack.name,
                artist: "Zen Mode",
                anime: "Background",
                url: suggestedTrack.url,
                source: "youtube",
                artwork: "https://i.pinimg.com/originals/f9/ba/92/f9ba926f743c3327685d038222a0a2df.gif"
            });
        }
    };

    if (!suggestedTrack) return null;

    return (
        <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-2 md:bottom-8 md:right-20">
            {isOpen && (
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl mb-2 w-64 shadow-2xl animate-slideUp">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold flex items-center gap-2 text-sm"><Headphones className="w-4 h-4 text-purple-400" /> Zen Mode</h4>
                        <button onClick={() => setIsOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-white" /></button>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                        Recommended for <b>{genres[0]}</b>:
                    </p>
                    <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg">
                        <div className="p-2 bg-purple-500/20 rounded-full text-purple-400">
                            <Music className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{suggestedTrack.name}</div>
                        </div>
                        <button 
                            onClick={playAmbience}
                            className="p-2 bg-white text-black rounded-full hover:bg-slate-200 transition-colors"
                        >
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                        </button>
                    </div>
                </div>
            )}

            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`p-3 rounded-full shadow-lg border border-white/10 transition-all hover:scale-110 ${isOpen ? 'bg-purple-600 text-white' : 'bg-dark-800 text-slate-400 hover:text-white'}`}
                title="Zen Mode Music"
            >
                {currentTrack?.artist === "Zen Mode" && isPlaying ? (
                    <div className="flex gap-0.5 items-end h-4 w-4 justify-center">
                        <div className="w-1 bg-white animate-[bounce_1s_infinite] h-full"></div>
                        <div className="w-1 bg-white animate-[bounce_1.2s_infinite] h-2/3"></div>
                        <div className="w-1 bg-white animate-[bounce_0.8s_infinite] h-full"></div>
                    </div>
                ) : (
                    <Headphones className="w-6 h-6" />
                )}
            </button>
        </div>
    );
};

export default ZenReader;
