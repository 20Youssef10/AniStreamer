
import React, { useState, useEffect } from 'react';
import { anilistService } from '../services/anilist';
import { Character } from '../types';
import { HelpCircle } from 'lucide-react';

const OtakuLoader: React.FC = () => {
    const [char, setChar] = useState<Character | null>(null);
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        const fetchChar = async () => {
            try {
                // Fetch a random popular character
                const chars = await anilistService.getRandomCharacters(1);
                if (chars.length > 0) setChar(chars[0]);
            } catch (e) {
                // Fallback silently
            }
        };
        fetchChar();
    }, []);

    if (!char) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm animate-pulse">Loading data...</p>
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center h-80 gap-6 animate-fadeIn">
            <div className="text-center space-y-2">
                <h3 className="text-xl font-display font-bold text-white">Who's that Character?</h3>
                <p className="text-slate-400 text-xs">Waiting for data...</p>
            </div>

            <div 
                className="relative w-48 h-64 cursor-pointer group"
                onClick={() => setRevealed(true)}
            >
                <img 
                    src={char.image.large} 
                    alt="Mystery Character" 
                    className={`w-full h-full object-contain transition-all duration-700 ${revealed ? 'brightness-100 blur-0' : 'brightness-0 blur-sm group-hover:blur-0'}`}
                />
                {!revealed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <HelpCircle className="w-12 h-12 text-white/50 animate-bounce" />
                    </div>
                )}
            </div>

            <div className="h-8">
                {revealed ? (
                    <div className="text-center animate-slideUp">
                        <span className="text-primary font-bold text-lg">{char.name.full}</span>
                        <div className="text-xs text-slate-500">It's them!</div>
                    </div>
                ) : (
                    <button 
                        onClick={() => setRevealed(true)}
                        className="px-4 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold text-slate-300 transition-colors"
                    >
                        Reveal
                    </button>
                )}
            </div>
        </div>
    );
};

export default OtakuLoader;
