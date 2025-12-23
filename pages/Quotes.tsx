
import React, { useState, useEffect } from 'react';
import { Quote, RefreshCw, Copy, Share2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface AnimeQuote {
    quote: string;
    character: string;
    anime: string;
}

const Quotes: React.FC = () => {
    const [quote, setQuote] = useState<AnimeQuote | null>(null);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const fetchQuote = async () => {
        setLoading(true);
        try {
            const res = await fetch('https://animechan.xyz/api/random');
            const data = await res.json();
            setQuote(data);
        } catch (e) {
            // Fallback quotes if API fails
            const fallbacks = [
                { quote: "People die if they are killed.", character: "Emiya Shirou", anime: "Fate/stay night" },
                { quote: "I am the bone of my sword.", character: "Archer", anime: "Fate/stay night" },
                { quote: "Whatever happens, happens.", character: "Spike Spiegel", anime: "Cowboy Bebop" }
            ];
            setQuote(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuote();
    }, []);

    const copyQuote = () => {
        if (quote) {
            navigator.clipboard.writeText(`"${quote.quote}" - ${quote.character}`);
            showToast("Quote copied!", "success");
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-fadeIn flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-display font-bold mb-2">Wise Words</h1>
                <p className="text-slate-400">Legendary lines from your favorite characters.</p>
            </div>

            {quote && (
                <div className="relative w-full max-w-2xl p-12 bg-dark-800 rounded-3xl border border-white/5 shadow-2xl flex flex-col items-center text-center group transition-all hover:border-primary/30">
                    <Quote className="w-12 h-12 text-primary/20 absolute top-8 left-8" />
                    <Quote className="w-12 h-12 text-primary/20 absolute bottom-8 right-8 rotate-180" />
                    
                    <p className={`text-2xl md:text-3xl font-serif leading-relaxed mb-8 transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                        "{quote.quote}"
                    </p>
                    
                    <div className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                        <div className="font-bold text-lg text-white">{quote.character}</div>
                        <div className="text-sm text-primary">{quote.anime}</div>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button onClick={fetchQuote} disabled={loading} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={copyQuote} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                            <Copy className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Quotes;
