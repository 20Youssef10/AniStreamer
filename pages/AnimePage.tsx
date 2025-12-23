
import React, { useEffect, useState } from 'react';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { Anime } from '../types';
import AnimeCard from '../components/AnimeCard';
import { TrendingUp, Calendar, Flame, Sparkles, Clock, Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnimePage: React.FC = () => {
  const [trending, setTrending] = useState<Anime[]>([]);
  const [seasonal, setSeasonal] = useState<Anime[]>([]);
  const [upcoming, setUpcoming] = useState<Anime[]>([]);
  const [recommended, setRecommended] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [recTitle, setRecTitle] = useState("Recommended For You");
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        let user = null;
        try {
            const auth = firebaseService.getAuthInstance();
            user = auth.currentUser;
        } catch (authError) {
            console.warn("AnimePage: Firebase Auth check failed", authError);
        }
        
        let recGenre = "Action"; 
        let title = "Recommended (General)";

        if (user) {
            try {
                const list = await firebaseService.getUserAnimeList(user.uid);
                if (list.length > 0) {
                    const allGenres = list.flatMap(entry => entry.genres || []);
                    if (allGenres.length > 0) {
                        const counts: Record<string, number> = {};
                        allGenres.forEach(g => counts[g] = (counts[g] || 0) + 1);
                        const topGenre = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                        recGenre = topGenre;
                        title = `Because you watch ${topGenre}`;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch recommendations", e);
            }
        }
        setRecTitle(title);

        const [trendData, seasonData, upcomingData, recData] = await Promise.all([
          anilistService.getTrending(10, false, 'ANIME'),
          anilistService.getSeasonal('SPRING', 2024),
          anilistService.getUpcoming(),
          anilistService.searchAnime({ page: 1, genre: recGenre, type: 'ANIME' })
        ]);
        setTrending(trendData);
        setSeasonal(seasonData);
        setUpcoming(upcomingData);
        setRecommended(recData.Page.media.slice(0, 5));
      } catch (error) {
        console.error("Failed to fetch anime page data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
          navigate(`/search?q=${encodeURIComponent(searchQuery)}&type=ANIME`);
      }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fadeIn">
      <div className="text-center py-8">
          <h1 className="text-4xl font-display font-bold mb-4">Discover Anime</h1>
          <p className="text-slate-400 mb-8">Explore the world of Japanese animation.</p>
          
          <form onSubmit={handleSearch} className="max-w-xl mx-auto relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <input 
                  type="text" 
                  placeholder="Find your next favorite anime..." 
                  className="w-full bg-dark-800 border border-white/10 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary relative z-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-20" />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary rounded-full text-white z-20 hover:bg-blue-600 transition-colors">
                  <ArrowRight className="w-4 h-4" />
              </button>
          </form>
      </div>

      {/* Trending Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Flame className="text-orange-500" />
          <h2 className="text-2xl font-display font-bold">Trending Now</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {trending.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

      {/* Seasonal Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="text-green-500" />
          <h2 className="text-2xl font-display font-bold">This Season</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {seasonal.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

      {/* AI Recommendations */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="text-purple-400" />
          <h2 className="text-2xl font-display font-bold">{recTitle}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {recommended.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

       {/* Upcoming Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Clock className="text-blue-400" />
          <h2 className="text-2xl font-display font-bold">Coming Soon</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {upcoming.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default AnimePage;
