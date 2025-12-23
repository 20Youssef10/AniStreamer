
import React, { useState, useEffect } from 'react';
import { anilistService } from '../services/anilist';
import { Character } from '../types';
import LazyImage from '../components/LazyImage';
import { Heart, Trophy, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const TopCharacters: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchChars = async (reset = false) => {
      setLoading(true);
      try {
          const currentPage = reset ? 1 : page;
          const { characters: newChars, hasNextPage: hasMore } = await anilistService.getTopCharacters(currentPage);
          setCharacters(prev => reset ? newChars : [...prev, ...newChars]);
          setHasNextPage(hasMore);
          setPage(prev => prev + 1);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchChars(true);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
        <div className="text-center py-12">
            <h1 className="text-4xl font-display font-bold flex items-center justify-center gap-3">
                <Trophy className="text-yellow-500 w-10 h-10" /> Hall of Fame
            </h1>
            <p className="text-slate-400 mt-2">The most loved characters across the anime universe.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {characters.map((char, index) => (
                <Link to={`/character/${char.id}`} key={char.id} className="group relative bg-dark-800 rounded-2xl overflow-hidden border border-white/5 hover:border-pink-500/50 transition-all hover:-translate-y-1">
                    <div className="aspect-[3/4] relative">
                        <LazyImage src={char.image.large} alt={char.name.full} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                            #{index + 1}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
                            <h3 className="font-bold text-white text-lg leading-tight line-clamp-1 group-hover:text-pink-400 transition-colors">{char.name.full}</h3>
                            <div className="flex items-center gap-1 text-pink-400 font-bold text-sm mt-1">
                                <Heart className="w-4 h-4 fill-current" />
                                {char.favourites.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>

        {hasNextPage && (
            <div className="flex justify-center pt-8">
                <button 
                    onClick={() => fetchChars()} 
                    disabled={loading}
                    className="px-8 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-full font-bold transition-all flex items-center gap-2 border border-white/10"
                >
                    {loading ? 'Loading...' : <><ChevronDown className="w-5 h-5" /> Load More</>}
                </button>
            </div>
        )}
    </div>
  );
};

export default TopCharacters;
