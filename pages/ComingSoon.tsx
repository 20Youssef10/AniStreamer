
import React, { useEffect, useState } from 'react';
import { anilistService } from '../services/anilist';
import { Anime } from '../types';
import AnimeCard from '../components/AnimeCard';
import { Clock, Calendar, Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ComingSoon: React.FC = () => {
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
        try {
            const data = await anilistService.getUpcoming();
            setItems(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    fetch();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
          navigate(`/search?q=${encodeURIComponent(query)}&status=NOT_YET_RELEASED`);
      }
  };

  if (loading) return <div className="text-center py-20">Looking into the future...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
        <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20 animate-pulse">
                <Clock className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-4xl font-display font-bold">Coming Soon</h1>
            <p className="text-slate-400 mt-2 mb-8">The most anticipated anime arriving this year.</p>
            
            <form onSubmit={handleSearch} className="max-w-md mx-auto relative">
                <input 
                    type="text" 
                    placeholder="Search upcoming titles..." 
                    className="w-full bg-dark-800 border border-white/10 rounded-full py-3 pl-12 pr-12 text-white focus:outline-none focus:border-blue-500 shadow-lg"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-500 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </button>
            </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {items.map(anime => (
                <div key={anime.id} className="relative group">
                    <AnimeCard anime={anime} />
                    <div className="absolute top-2 left-2 z-20">
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> 
                            {anime.startDate.year}-{anime.startDate.month}-{anime.startDate.day || '?'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default ComingSoon;
