
import React, { useState, useEffect } from 'react';
import { anilistService } from '../services/anilist';
import { Anime, MediaType } from '../types';
import AnimeCard from '../components/AnimeCard';
import { Trophy, TrendingUp, Film, Tv, PlayCircle, Book, Monitor, Globe } from 'lucide-react';

const GlobalStats: React.FC = () => {
  const [type, setType] = useState<MediaType>('ANIME');
  const [tab, setTab] = useState<'top' | 'ongoing' | 'movie' | 'tv' | 'ova' | 'ona'>('top');
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setItems([]);
      try {
        let data: Anime[] = [];
        
        switch (tab) {
            case 'top':
                data = await anilistService.getPopularAllTime(type, 50);
                break;
            case 'ongoing':
                // For manga "ongoing" implies status RELEASING
                data = await anilistService.getAdvancedRanking(type, undefined, 'RELEASING', 50);
                break;
            case 'movie':
                // Manga doesn't really have "movies", mapping to ONE_SHOT for logic or empty
                const formatMovie = type === 'ANIME' ? 'MOVIE' : 'ONE_SHOT';
                data = await anilistService.getAdvancedRanking(type, formatMovie, undefined, 50);
                break;
            case 'tv':
                const formatTV = type === 'ANIME' ? 'TV' : 'MANGA'; 
                data = await anilistService.getAdvancedRanking(type, formatTV, undefined, 50);
                break;
            case 'ova':
                if (type === 'ANIME') {
                    data = await anilistService.getAdvancedRanking(type, 'OVA', undefined, 50);
                }
                break;
            case 'ona':
                if (type === 'ANIME') {
                    data = await anilistService.getAdvancedRanking(type, 'ONA', undefined, 50);
                }
                break;
        }
        setItems(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, tab]);

  const tabs = [
      { id: 'top', label: 'All Time Best', icon: Trophy },
      { id: 'ongoing', label: 'Top Ongoing', icon: TrendingUp },
      { id: 'movie', label: type === 'ANIME' ? 'Top Movies' : 'One Shots', icon: Film },
      { id: 'tv', label: type === 'ANIME' ? 'Top TV Series' : 'Standard Manga', icon: Tv },
      ...(type === 'ANIME' ? [
          { id: 'ova', label: 'Top OVA', icon: PlayCircle },
          { id: 'ona', label: 'Top ONA', icon: Monitor }
      ] : [])
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn py-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
            <div>
                <h1 className="text-4xl font-display font-bold flex items-center gap-3">
                    <Globe className="w-10 h-10 text-blue-500" /> Global Charts
                </h1>
                <p className="text-slate-400 mt-2">Comprehensive rankings across all formats.</p>
            </div>

            <div className="flex bg-dark-800 p-1 rounded-xl border border-white/5">
                <button 
                    onClick={() => { setType('ANIME'); setTab('top'); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${type === 'ANIME' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Tv className="w-4 h-4" /> Anime
                </button>
                <button 
                    onClick={() => { setType('MANGA'); setTab('top'); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${type === 'MANGA' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Book className="w-4 h-4" /> Manga
                </button>
            </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-4">
            {tabs.map(t => (
                <button
                    key={t.id}
                    onClick={() => setTab(t.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border ${
                        tab === t.id 
                        ? 'bg-white text-black border-white' 
                        : 'bg-dark-800 text-slate-400 border-white/5 hover:border-white/20 hover:text-white'
                    }`}
                >
                    <t.icon className="w-5 h-5" />
                    {t.label}
                </button>
            ))}
        </div>

        {loading ? (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        ) : (
            <>
                {items.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">No results found for this category.</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {items.map((item, index) => (
                            <div key={item.id} className="relative group">
                                <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-white font-bold flex items-center justify-center rounded-full shadow-lg z-20 border-2 border-dark-900">
                                    {index + 1}
                                </div>
                                <AnimeCard anime={item} />
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}
    </div>
  );
};

export default GlobalStats;
