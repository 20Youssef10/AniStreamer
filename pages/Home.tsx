
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { Anime, UserListEntry, AnimeSort } from '../types';
import AnimeCard from '../components/AnimeCard';
import { TrendingUp, Book, Tv, ArrowRight, PlayCircle, ChevronLeft, ChevronRight, Info, Star, Calendar, Award, Shuffle, Sparkles, Search } from 'lucide-react';
import LazyImage from '../components/LazyImage';
import { t } from '../services/i18n';
import { useSettings } from '../context/SettingsContext';

const Home: React.FC = () => {
  const [trendingAnime, setTrendingAnime] = useState<Anime[]>([]);
  const [trendingManga, setTrendingManga] = useState<Anime[]>([]);
  const [seasonal, setSeasonal] = useState<Anime[]>([]);
  const [topRated, setTopRated] = useState<Anime[]>([]);
  const [recommended, setRecommended] = useState<Anime[]>([]);
  const [watching, setWatching] = useState<UserListEntry[]>([]);
  const [nextAiring, setNextAiring] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [recTitle, setRecTitle] = useState("Recommended For You");
  
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
        // Safe Firebase Auth Check
        let user = null;
        let recGenre = undefined;
        try {
            const auth = firebaseService.getAuthInstance();
            user = auth.currentUser;
        } catch (e) {
            console.debug("Firebase not initialized or auth unavailable, skipping user data.");
        }
        
        if (user) {
            try {
                const list = await firebaseService.getUserAnimeList(user.uid);
                const active = list.filter(e => e.status === 'WATCHING').sort((a,b) => b.updatedAt - a.updatedAt).slice(0, 5);
                setWatching(active);

                // Recommendation Logic
                if (list.length > 0) {
                    const allGenres = list.flatMap(entry => entry.genres || []);
                    if (allGenres.length > 0) {
                        const counts: Record<string, number> = {};
                        allGenres.forEach(g => counts[g] = (counts[g] || 0) + 1);
                        const topGenre = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                        recGenre = topGenre;
                        setRecTitle(`Because you watch ${topGenre}`);
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch user list", e);
            }
        }

        const month = new Date().getMonth();
        const year = new Date().getFullYear();
        let season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' = 'WINTER';
        if (month >= 2 && month <= 4) season = 'SPRING';
        else if (month >= 5 && month <= 7) season = 'SUMMER';
        else if (month >= 8 && month <= 10) season = 'FALL';

        const [trendAnimeData, trendMangaData, seasonalData, topRatedData, recData] = await Promise.all([
          anilistService.getTrending(10, false, 'ANIME'),
          anilistService.getTrendingManga(10),
          anilistService.getSeasonal(season, year),
          anilistService.searchAnime({ sort: AnimeSort.SCORE_DESC, page: 1, type: 'ANIME' }),
          anilistService.searchAnime({ page: 1, genre: recGenre, sort: AnimeSort.POPULARITY_DESC, type: 'ANIME' })
        ]);
        
        setTrendingAnime(trendAnimeData);
        setTrendingManga(trendMangaData);
        setSeasonal(seasonalData);
        setTopRated(topRatedData.Page.media.slice(0, 10));
        setRecommended(recData.Page.media.slice(0, 10));

        // Find Next Airing from Trending
        const airing = trendAnimeData.find(a => a.nextAiringEpisode);
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
  const heroItems = trendingAnime.slice(0, 5);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fadeIn pb-12">
      
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
                      <ChevronRight className="w-5 h-5 rotate-45" /> {/* Close icon using rotate */}
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
                    {/* Background Image */}
                    <LazyImage 
                        src={item.bannerImage || item.coverImage.large} 
                        alt={item.title.romaji}
                        className="w-full h-full object-cover transition-transform duration-[10s] scale-105"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent" />
                    
                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 items-center md:items-start text-center md:text-left">
                        <div className="max-w-3xl space-y-6 w-full">
                            {/* Tags */}
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

                            {/* Title */}
                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white leading-tight line-clamp-2 drop-shadow-lg animate-slideIn" style={{animationDelay: '100ms'}}>
                                {item.title.english || item.title.romaji}
                            </h1>
                            
                            {/* Description (Short) */}
                            <div 
                                className="text-slate-200 line-clamp-2 md:line-clamp-3 text-sm md:text-lg max-w-2xl drop-shadow-md animate-slideIn opacity-90" 
                                style={{animationDelay: '200ms'}} 
                                dangerouslySetInnerHTML={{__html: item.description}} 
                            />

                            {/* Action Buttons */}
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

            {/* Navigation Arrows (Desktop) */}
            <button 
                onClick={(e) => { e.preventDefault(); prevSlide(); }} 
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/20 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden md:block border border-white/10 hover:scale-110"
            >
                <ChevronLeft className="w-8 h-8" />
            </button>
            <button 
                onClick={(e) => { e.preventDefault(); nextSlide(); }} 
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/20 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden md:block border border-white/10 hover:scale-110"
            >
                <ChevronRight className="w-8 h-8" />
            </button>

            {/* Indicators */}
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
                      <Link to={`/anime/${entry.animeId}`} key={entry.animeId} className="group relative bg-dark-800 rounded-xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all">
                          <div className="aspect-video relative">
                              <LazyImage src={entry.image || ''} alt={entry.title || ''} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                  <PlayCircle className="w-10 h-10 text-white" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-dark-900">
                                  {/* Just a visual progress bar, hardcoded width for now or derived from logic */}
                                  <div className="h-full bg-primary" style={{width: '60%'}}></div>
                              </div>
                          </div>
                          <div className="p-3">
                              <h3 className="font-bold text-sm truncate">{entry.title}</h3>
                              <p className="text-xs text-slate-400">Episode {entry.progress}</p>
                          </div>
                      </Link>
                  ))}
              </div>
          </section>
      )}

      {/* Trending Anime Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-red-500 w-6 h-6" />
            <h2 className="text-2xl font-display font-bold">Trending Anime</h2>
          </div>
          <Link to="/search?sort=TRENDING_DESC&type=ANIME" className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 group">
            View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {trendingAnime.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

      {/* Seasonal Anime Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="text-green-500 w-6 h-6" />
            <h2 className="text-2xl font-display font-bold">Seasonal Anime</h2>
          </div>
          <Link to="/search?sort=START_DATE_DESC" className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 group">
            View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {seasonal.slice(0, 5).map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

      {/* Recommended Anime Section */}
      {recommended.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-500 w-6 h-6" />
              <h2 className="text-2xl font-display font-bold">{recTitle}</h2>
            </div>
            <Link to="/search?sort=POPULARITY_DESC" className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 group">
              Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {recommended.map(anime => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        </section>
      )}

      {/* Top Rated Anime Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Award className="text-yellow-500 w-6 h-6" />
            <h2 className="text-2xl font-display font-bold">Top Rated</h2>
          </div>
          <Link to="/search?sort=SCORE_DESC&type=ANIME" className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 group">
            View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {topRated.slice(0, 5).map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

      {/* Trending Manga Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Book className="text-blue-500 w-6 h-6" />
            <h2 className="text-2xl font-display font-bold">Trending Manga</h2>
          </div>
          <Link to="/search?type=MANGA" className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 group">
            Read More <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {trendingManga.slice(0, 5).map(manga => (
            <AnimeCard key={manga.id} anime={manga} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
