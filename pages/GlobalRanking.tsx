
import React, { useState, useEffect } from 'react';
import { anilistService } from '../services/anilist';
import { Anime, MediaType } from '../types';
import LazyImage from '../components/LazyImage';
import { TrendingUp, Star, Tv, Book, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const GlobalRanking: React.FC = () => {
  const [type, setType] = useState<MediaType>('ANIME');
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const fetchRankings = async () => {
          setLoading(true);
          try {
              const data = await anilistService.getGlobalRankings(type);
              setItems(data);
          } catch (e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      };
      fetchRankings();
  }, [type]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400">
                    <Globe className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-display font-bold">Global Rankings</h1>
                    <p className="text-slate-400">Top rated series of all time.</p>
                </div>
            </div>

            <div className="flex bg-dark-800 p-1 rounded-xl border border-white/5">
                <button 
                    onClick={() => setType('ANIME')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${type === 'ANIME' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Tv className="w-4 h-4" /> Anime
                </button>
                <button 
                    onClick={() => setType('MANGA')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${type === 'MANGA' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Book className="w-4 h-4" /> Manga
                </button>
            </div>
        </div>

        <div className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-dark-900/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-7 md:col-span-6">Title</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 md:col-span-3 text-right hidden md:block">Popularity</div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-500">Loading rankings...</div>
            ) : (
                <div className="divide-y divide-white/5">
                    {items.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group">
                            <div className="col-span-1 text-center font-display font-bold text-lg text-slate-500 group-hover:text-white">
                                #{idx + 1}
                            </div>
                            <div className="col-span-7 md:col-span-6">
                                <Link to={`/${type === 'ANIME' ? 'anime' : 'manga'}/${item.id}`} className="flex items-center gap-4">
                                    <div className="w-12 h-16 shrink-0">
                                        <LazyImage src={item.coverImage.medium} alt="" className="w-full h-full object-cover rounded shadow-md" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm md:text-base truncate group-hover:text-primary transition-colors">
                                            {item.title.english || item.title.romaji}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {item.format} • {item.seasonYear || item.startDate.year} • {item.status}
                                        </p>
                                    </div>
                                </Link>
                            </div>
                            <div className="col-span-2 flex items-center justify-center">
                                <div className="flex items-center gap-1 font-bold text-yellow-400">
                                    <Star className="w-4 h-4 fill-current" />
                                    {item.averageScore}%
                                </div>
                            </div>
                            <div className="col-span-2 md:col-span-3 text-right hidden md:flex items-center justify-end gap-1 text-slate-400">
                                <TrendingUp className="w-4 h-4" />
                                {(item.popularity || 0).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default GlobalRanking;
