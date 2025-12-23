
import React, { useState, useEffect } from 'react';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { Anime } from '../types';
import { useToast } from '../context/ToastContext';
import LazyImage from '../components/LazyImage';
import { Heart, X, Info, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

const Swiper: React.FC = () => {
  const [cards, setCards] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const { showToast } = useToast();

  const fetchCards = async () => {
    setLoading(true);
    try {
      // Fetch trending and some random recommendations
      const trending = await anilistService.getTrending(20);
      const shuffled = trending.sort(() => 0.5 - Math.random());
      setCards(shuffled);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (cards.length === 0) return;
    
    setSlideDirection(direction);
    
    const currentCard = cards[0];
    const auth = firebaseService.getAuthInstance();
    const user = auth.currentUser;

    if (direction === 'right') {
        if (user) {
            try {
                await firebaseService.updateUserAnimeEntry(user.uid, {
                    animeId: currentCard.id,
                    status: 'PLANNING',
                    score: 0,
                    progress: 0,
                    priority: 'MEDIUM',
                    rewatchCount: 0,
                    notes: 'Added via AniSwipe',
                    private: false,
                    updatedAt: Date.now(),
                    title: currentCard.title.english || currentCard.title.romaji,
                    image: currentCard.coverImage.medium,
                    genres: currentCard.genres,
                    type: currentCard.type
                });
                showToast("Added to Planning!", "success");
            } catch (e) {
                showToast("Login to save", "error");
            }
        } else {
            showToast("Login to save to list", "info");
        }
    }

    setTimeout(() => {
        setCards(prev => prev.slice(1));
        setSlideDirection(null);
        if (cards.length <= 2) fetchCards(); // Preload more
    }, 300);
  };

  if (loading && cards.length === 0) return <div className="text-center py-20">Loading Stack...</div>;

  return (
    <div className="max-w-md mx-auto h-[calc(100vh-160px)] flex flex-col items-center justify-center animate-fadeIn relative">
        <div className="text-center mb-6">
            <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
                <Layers className="text-primary" /> AniSwipe
            </h1>
            <p className="text-slate-400 text-sm">Right to Plan, Left to Pass</p>
        </div>

        <div className="relative w-full aspect-[2/3] max-h-[600px]">
            {cards.map((anime, index) => {
                if (index > 1) return null; // Only render top 2 for performance
                const isTop = index === 0;
                
                let transformClass = '';
                if (isTop && slideDirection === 'left') transformClass = '-translate-x-[150%] rotate-[-20deg] opacity-0';
                if (isTop && slideDirection === 'right') transformClass = 'translate-x-[150%] rotate-[20deg] opacity-0';
                if (!isTop) transformClass = 'scale-95 translate-y-4 -z-10 opacity-50';

                return (
                    <div 
                        key={anime.id}
                        className={`absolute inset-0 bg-dark-800 rounded-3xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 ease-out ${transformClass}`}
                    >
                        <LazyImage src={anime.coverImage.large} alt={anime.title.romaji} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-6">
                            <h2 className="text-2xl font-bold text-white mb-1 line-clamp-2 shadow-black drop-shadow-md">
                                {anime.title.english || anime.title.romaji}
                            </h2>
                            <div className="flex gap-2 text-sm text-slate-300 mb-2">
                                <span className="bg-white/20 px-2 py-0.5 rounded backdrop-blur-md">{anime.averageScore}%</span>
                                <span className="bg-white/20 px-2 py-0.5 rounded backdrop-blur-md">{anime.format}</span>
                                <span className="bg-white/20 px-2 py-0.5 rounded backdrop-blur-md">{anime.seasonYear}</span>
                            </div>
                            <div className="flex gap-1 flex-wrap mb-4">
                                {anime.genres.slice(0, 3).map(g => <span key={g} className="text-xs text-slate-400">#{g}</span>)}
                            </div>
                            <Link to={`/anime/${anime.id}`} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-white hover:text-black transition-colors backdrop-blur-md">
                                <Info className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                )
            })}
            
            {cards.length === 0 && !loading && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    No more cards. Refresh to reload.
                </div>
            )}
        </div>

        <div className="flex gap-6 mt-8">
            <button 
                onClick={() => handleSwipe('left')}
                className="w-16 h-16 rounded-full bg-dark-800 border border-white/10 text-red-500 flex items-center justify-center hover:scale-110 hover:bg-red-500 hover:text-white transition-all shadow-lg"
            >
                <X className="w-8 h-8" />
            </button>
            <button 
                onClick={() => handleSwipe('right')}
                className="w-16 h-16 rounded-full bg-dark-800 border border-white/10 text-green-500 flex items-center justify-center hover:scale-110 hover:bg-green-500 hover:text-white transition-all shadow-lg"
            >
                <Heart className="w-8 h-8 fill-current" />
            </button>
        </div>
    </div>
  );
};

export default Swiper;
