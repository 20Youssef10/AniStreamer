
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { Anime, UserListEntry, AnimeSort, NewsArticle } from '../types';
import AnimeCard from '../components/AnimeCard';
import { TrendingUp, Book, Tv, ArrowRight, PlayCircle, ChevronLeft, ChevronRight, Info, Star, Calendar, Award, Shuffle, Sparkles, Search, Newspaper, Zap, Trophy, Globe, Clock } from 'lucide-react';
import LazyImage from '../components/LazyImage';
import { t } from '../services/i18n';
import { useSettings } from '../context/SettingsContext';

const Home: React.FC = () => {
  // Data States
  const [trending, setTrending] = useState<Anime[]>([]);
  const [seasonal, setSeasonal] = useState<Anime[]>([]);
  const [upcoming, setUpcoming] = useState<Anime[]>([]);
  const [allTimePopular, setAllTimePopular] = useState<Anime[]>([]);
  const [top100, setTop100] = useState<Anime[]>([]);
  const [newEpisodes, setNewEpisodes] = useState<Anime[]>([]);
  const [topRatedEverywhere, setTopRatedEverywhere] = useState<Anime[]>([]);
  const [aiRecs, setAiRecs] = useState<Anime[]>([]);
  const [recentNews, setRecentNews] = useState<NewsArticle[]>([]);
  
  // UI States
  const [watching, setWatching] = useState<UserListEntry[]>([]);
  const [nextAiring, setNextAiring] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [recTitle, setRecTitle] = useState("AI Recommendations");
  
  // Search State
  const [homeQuery, setHomeQuery] = useState('');
  
  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const navigate = useNavigate();
  const { settings } = useSettings();

  useEffect(() => {
    const fetchData = async () => {
      try {
        let user = null;
        let recGenre = undefined;
        try {
            const auth = firebaseService.getAuthInstance();
            user = auth.currentUser;
        } catch (e) {
            console.debug("Firebase auth unavailable.");
        }
        
        if (user) {
            try {
                const list = await firebaseService.getUserAnimeList(user.uid);
                const active = list.filter(e => e.status === 'WATCHING' || e.status === 'READING').sort((a,b) => b.updatedAt - a.updatedAt).slice(0, 5);
                setWatching(active);

                // Genre Recommendation Logic
                if (list.length > 0) {
                    const allGenres = list.flatMap(entry => entry.genres || []);
                    if (allGenres.length > 0) {
                        const counts: Record<string, number> = {};
                        allGenres.forEach(g => counts[g] = (counts[g] || 0) + 1);
                        const topGenre = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                        recGenre = topGenre;
                        setRecTitle(`Because you like ${topGenre}`);
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch user list", e);
            }
        }

        // Season Calculation
        const date = new Date();
        const month = date.getMonth();
        const year = date.getFullYear();
        let season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' = 'WINTER';
        if (month >= 2 && month <= 4) season = 'SPRING';
        else if (month >= 5 && month <= 7) season = 'SUMMER';
        else if (month >= 8 && month <= 10) season = 'FALL';

        const nextSeasonData = anilistService.getNextSeason();

        // Parallel Fetching
        const [
            trendData, 
            seasonalData, 
            upcomingData, 
            allTimeData,
            top100Data,
            newEpsData,
            topRatedData,
            recData,
            newsData
        ] = await Promise.all([
          anilistService.getTrending(10, false, 'ANIME'),
          anilistService.getSeasonal(season, year, 'ANIME', 10),
          anilistService.getSeasonal(nextSeasonData.season, nextSeasonData.year, 'ANIME', 10), // Next Season
          anilistService.getPopularAllTime('ANIME', 10),
          anilistService.getTopRated('ANIME', 10), // Using Top Rated as Top 100 base
          anilistService.getNewEpisodes(10),
          anilistService.getTopRated('ANIME', 10), // Duplicate of Top 100 logic but conceptually different per prompt
          anilistService.searchAnime({ page: 1, genre: recGenre, sort: AnimeSort.POPULARITY_DESC, type: 'ANIME' }),
          firebaseService.getPublishedNews(4)
        ]);
        
        setTrending(trendData);
        setSeasonal(seasonalData);
        setUpcoming(upcomingData);
        setAllTimePopular(allTimeData);
        setTop100(top100Data);
        setNewEpisodes(newEpsData);
        setTopRatedEverywhere(topRatedData);
        setAiRecs(recData.Page.media.slice(0, 10));
        setRecentNews(newsData);

        // Find Next Airing from Trending
        const airing = trendData.find(a => a.nextAiringEpisode);
        setNextAiring(airing || null);

      } catch (error) {
        console.error("Failed to fetch home data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Carousel Logic
  const heroItems = trending.slice(0, 5);

  useEffect(() => {
    if (!heroItems.length || isPaused) return;
    const interval = setInterval(() => {
        setCurrentSlide(curr => (curr + 1) % heroItems.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroItems.length, isPaused]);

  const nextSlide = () => setCurrentSlide(curr => (curr + 1) % heroItems.length);
  const prevSlide = () => setCurrentSlide(curr => (curr - 1 + heroItems.length) % heroItems.length);

  const handleRandom = async () => {
    try {
      const id = await anilistService.getRandomAnimeId();
      navigate(`/anime/${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleHomeSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (homeQuery.trim()) {
          navigate(`/search?q=${encodeURIComponent(homeQuery)}`);
      }
  };

  const getCountdownString = (seconds: number) => {
      const days = Math.floor(seconds / (3600 * 24));
      const hours = Math.floor((seconds % (3600 * 24)) / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${days}d ${hours}h ${mins}m`;
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
    <div className="space-y-16 animate-fadeIn pb-12">
      
      {/* Home Search Bar */}
      <div className="w-full max-w-3xl mx-auto px-4">
          <form onSubmit={handleHomeSearch} className="relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <input
                  type="text"
                  placeholder={t('search', settings.language) + " anime, manga, characters..."}
                  className="w-full bg-dark-800 border border-white/10 rounded-full py-4 pl-14 pr-14 text-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-xl relative z-10 transition-all"
                  value={homeQuery}
                  onChange={(e) => setHomeQuery(e.target.value)}
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 z-20" />
              {homeQuery && (
                  <button type="button" onClick={() => setHomeQuery('')} className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white z-20">
                      <ChevronRight className="w-5 h-5 rotate-45" />
                  </button>
              )}
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-primary rounded-full text-white z-20 hover:scale-105 transition-transform">
                  <ArrowRight className="w-5 h-5" />
              </button>
          </form>
      </div>

      {/* Hero Carousel */}
      {heroItems.length > 0 && (
        <div 
            className="relative w-full h-[500px] md:h-[600px] rounded-3xl overflow-hidden group shadow-2xl shadow-primary/10"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {heroItems.map((item, idx) => (
                <div 
                    key={item.id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                >
                    <LazyImage 
                        src={item.bannerImage || item.coverImage.large} 
                        alt={item.title.romaji}
                        className="w-full h-full object-cover transition-transform duration-[10s] scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent" />
                    
                    <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 items-center md:items-start text-center md:text-left">
                        <div className="max-w-3xl space-y-6 w-full">
                            <div className="flex items-center gap-2 justify-center md:justify-start animate-slideIn">
                                <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> #{idx + 1} Trending
                                </span>
                                <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white text-xs font-bold rounded-full uppercase tracking-wider border border-white/10">
                                    {item.format}
                                </span>
                                <span className="px-3 py-1 bg-green-500/80 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                     <Star className="w-3 h-3 fill-current" /> {item.averageScore}%
                                </span>
                            </div>

                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white leading-tight line-clamp-2 drop-shadow-lg animate-slideIn" style={{animationDelay: '100ms'}}>
                                {item.title.english || item.title.romaji}
                            </h1>
                            
                            <div 
                                className="text-slate-200 line-clamp-2 md:line-clamp-3 text-sm md:text-lg max-w-2xl drop-shadow-md animate-slideIn opacity-90" 
                                style={{animationDelay: '200ms'}} 
                                dangerouslySetInnerHTML={{__html: item.description}} 
                            />

                            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center md:justify-start w-full animate-slideIn" style={{animationDelay: '300ms'}}>
                                <Link to={`/anime/${item.id}`} className="px-8 py-4 bg-white text-dark-900 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-lg hover:scale-105 transform duration-200">
                                    <PlayCircle className="w-5 h-5 fill-current" /> Watch Now
                                </Link>
                                <button onClick={handleRandom} className="px-8 py-4 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-lg hover:scale-105 transform duration-200">
                                    <Shuffle className="w-5 h-5" /> Surprise Me
                                </button>
                                <Link to={`/anime/${item.id}`} className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center justify-center gap-2 hover:scale-105 transform duration-200">
                                    <Info className="w-5 h-5" /> Details
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <button onClick={(e) => { e.preventDefault(); prevSlide(); }} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/20 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden md:block border border-white/10 hover:scale-110">
                <ChevronLeft className="w-8 h-8" />
            </button>
            <button onClick={(e) => { e.preventDefault(); nextSlide(); }} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/20 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden md:block border border-white/10 hover:scale-110">
                <ChevronRight className="w-8 h-8" />
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {heroItems.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-white/50 hover:bg-white'}`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
      )}

      {/* Countdown Section */}
      {nextAiring && nextAiring.nextAiringEpisode && (
          <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-1 relative overflow-hidden shadow-lg transform hover:scale-[1.01] transition-transform">
              <div className="absolute inset-0 opacity-20">
                  <img src={nextAiring.bannerImage || nextAiring.coverImage.large} className="w-full h-full object-cover" />
              </div>
              <div className="relative bg-dark-900/90 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                      <img src={nextAiring.coverImage.medium} className="w-16 h-24 rounded-lg object-cover shadow-lg" />
                      <div>
                          <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Airing Soon</div>
                          <h3 className="text-xl font-bold text-white">{nextAiring.title.english || nextAiring.title.romaji}</h3>
                          <p className="text-slate-400">Episode {nextAiring.nextAiringEpisode.episode}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-6">
                      <div className="text-center">
                          <div className="text-3xl font-mono font-bold text-white tracking-widest">{getCountdownString(nextAiring.nextAiringEpisode.timeUntilAiring)}</div>
                          <div className="text-xs text-slate-500 uppercase mt-1">Time Remaining</div>
                      </div>
                      <Link to={`/anime/${nextAiring.id}`} className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform">
                          <ChevronRight className="w-6 h-6" />
                      </Link>
                  </div>
              </div>
          </section>
      )}

      {/* Continue Watching Section */}
      {watching.length > 0 && (
          <section>
              <div className="flex items-center gap-2 mb-6">
                  <PlayCircle className="text-primary w-6 h-6" />
                  <h2 className="text-2xl font-display font-bold">Continue Watching</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {watching.map(entry => (
                      <Link to={`/${entry.type === 'MANGA' ? 'manga' : 'anime'}/${entry.animeId}`} key={entry.animeId} className="group relative bg-dark-800 rounded-xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all">
                          <div className="aspect-video relative">
                              <LazyImage src={entry.image || ''} alt={entry.title || ''} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                  <PlayCircle className="w-10 h-10 text-white" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-dark-900">
                                  <div className="h-full bg-primary" style={{width: '60%'}}></div>
                              </div>
                          </div>
                          <div className="p-3">
                              <h3 className="font-bold text-sm truncate">{entry.title}</h3>
                              <p className="text-xs text-slate-400">{entry.type === 'MANGA' ? `Chapter ${entry.progress}` : `Episode ${entry.progress}`}</p>
                          </div>
                      </Link>
                  ))}
              </div>
          </section>
      )}

      {/* 1. Trending Now */}
      {renderSection("Trending Now", <TrendingUp className="text-red-500 w-6 h-6" />, trending, "/search?sort=TRENDING_DESC&type=ANIME")}

      {/* 2. Popular This Season */}
      {renderSection("Popular This Season", <Calendar className="text-green-500 w-6 h-6" />, seasonal, "/search?season=CURRENT&type=ANIME")}

      {/* 3. Upcoming Next Season */}
      {renderSection("Upcoming Next Season", <Clock className="text-blue-400 w-6 h-6" />, upcoming, "/upcoming")}

      {/* 4. All Time Popular */}
      {renderSection("All Time Popular", <Trophy className="text-yellow-500 w-6 h-6" />, allTimePopular, "/search?sort=POPULARITY_DESC&type=ANIME")}

      {/* 5. Top 100 Anime/Manga */}
      {renderSection("Top 100", <Award className="text-purple-500 w-6 h-6" />, top100, "/ranking")}

      {/* 6. AI Recommendations */}
      {renderSection(recTitle, <Sparkles className="text-pink-500 w-6 h-6" />, aiRecs)}

      {/* 7. New Episodes */}
      {renderSection("New Episodes", <Zap className="text-yellow-400 w-6 h-6" />, newEpisodes)}

      {/* 8. Top Rated Everywhere */}
      {renderSection("Top Rated Everywhere", <Globe className="text-blue-500 w-6 h-6" />, topRatedEverywhere, "/ranking")}

      {/* 9. Recent News */}
      {recentNews.length > 0 && (
          <section>
              <div className="flex items-center gap-2 mb-6">
                  <Newspaper className="text-orange-500 w-6 h-6" />
                  <h2 className="text-2xl font-display font-bold">Recent News</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentNews.map(news => (
                      <Link to="/news" key={news.id} className="bg-dark-800 rounded-xl overflow-hidden border border-white/5 hover:border-orange-500/50 transition-colors group">
                          <div className="aspect-video relative overflow-hidden">
                              <LazyImage src={news.image} alt={news.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-bold text-white">{news.category}</div>
                          </div>
                          <div className="p-4">
                              <h3 className="font-bold text-white line-clamp-2 mb-2 group-hover:text-orange-400 transition-colors">{news.title}</h3>
                              <p className="text-xs text-slate-400 line-clamp-3">{news.summary}</p>
                              <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500">
                                  <span>{new Date(news.createdAt).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>{news.author.name}</span>
                              </div>
                          </div>
                      </Link>
                  ))}
              </div>
          </section>
      )}
    </div>
  );
};

export default Home;
