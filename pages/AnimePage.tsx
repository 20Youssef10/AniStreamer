
import React, { useEffect, useState } from 'react';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { Anime, AnimeSort } from '../types';
import AnimeCard from '../components/AnimeCard';
import { TrendingUp, Calendar, Clock, Sparkles, Search, ArrowRight, Trophy, Zap, Globe, Award } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const AnimePage: React.FC = () => {
  const [trending, setTrending] = useState<Anime[]>([]);
  const [seasonal, setSeasonal] = useState<Anime[]>([]);
  const [upcoming, setUpcoming] = useState<Anime[]>([]);
  const [allTime, setAllTime] = useState<Anime[]>([]);
  const [top100, setTop100] = useState<Anime[]>([]);
  const [newEps, setNewEps] = useState<Anime[]>([]);
  const [topRated, setTopRated] = useState<Anime[]>([]);
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
        let title = "AI Recommendations";

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

        // Calculate Seasons
        const date = new Date();
        const month = date.getMonth();
        const year = date.getFullYear();
        let season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' = 'WINTER';
        if (month >= 2 && month <= 4) season = 'SPRING';
        else if (month >= 5 && month <= 7) season = 'SUMMER';
        else if (month >= 8 && month <= 10) season = 'FALL';
        
        const nextSeasonData = anilistService.getNextSeason();

        const [
            trendData, 
            seasonData, 
            upcomingData, 
            recData,
            allTimeData,
            top100Data,
            newEpsData,
            topRatedData
        ] = await Promise.all([
          anilistService.getTrending(10, false, 'ANIME'),
          anilistService.getSeasonal(season, year, 'ANIME', 10),
          anilistService.getSeasonal(nextSeasonData.season, nextSeasonData.year, 'ANIME', 10),
          anilistService.searchAnime({ page: 1, genre: recGenre, type: 'ANIME', sort: AnimeSort.POPULARITY_DESC }),
          anilistService.getPopularAllTime('ANIME', 10),
          anilistService.getTopRated('ANIME', 10),
          anilistService.getNewEpisodes(10),
          anilistService.getTopRated('ANIME', 10)
        ]);

        setTrending(trendData);
        setSeasonal(seasonData);
        setUpcoming(upcomingData);
        setRecommended(recData.Page.media.slice(0, 10));
        setAllTime(allTimeData);
        setTop100(top100Data);
        setNewEps(newEpsData);
        setTopRated(topRatedData);

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

  const renderSection = (title: string, icon: React.ReactNode, data: Anime[], link?: string) => (
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-2xl font-display font-bold">{title}</h2>
          </div>
          {link && (
              <Link to={link} className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 group">
                View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {data.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fadeIn pb-12">
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

      {renderSection("Trending Now", <TrendingUp className="text-red-500 w-6 h-6" />, trending, "/search?sort=TRENDING_DESC&type=ANIME")}
      {renderSection("Popular This Season", <Calendar className="text-green-500 w-6 h-6" />, seasonal, "/search?season=CURRENT&type=ANIME")}
      {renderSection("Upcoming Next Season", <Clock className="text-blue-400 w-6 h-6" />, upcoming, "/upcoming")}
      {renderSection("All Time Popular", <Trophy className="text-yellow-500 w-6 h-6" />, allTime, "/search?sort=POPULARITY_DESC&type=ANIME")}
      {renderSection("Top 100 Anime", <Award className="text-purple-500 w-6 h-6" />, top100, "/ranking")}
      {renderSection(recTitle, <Sparkles className="text-pink-400 w-6 h-6" />, recommended)}
      {renderSection("New Episodes", <Zap className="text-yellow-400 w-6 h-6" />, newEps)}
      {renderSection("Top Rated Everywhere", <Globe className="text-blue-500 w-6 h-6" />, topRated, "/ranking")}
    </div>
  );
};

export default AnimePage;
