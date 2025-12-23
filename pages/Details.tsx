
// ... imports ...
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { aiService } from '../services/ai';
import { malService, MalThemes } from '../services/mal';
import { spotifyService } from '../services/spotify';
import { Anime, UserListEntry, DiscussionPost, Episode } from '../types';
import { STATUS_OPTIONS } from '../constants';
import { Calendar, Star, Heart, MessageSquare, BookOpen, Users, Link as LinkIcon, Briefcase, Share2, X, Plus, Edit, ChevronDown, ChevronUp, ChevronRight, ThumbsUp, Reply, Trophy, Hash, PlayCircle, Monitor, Info, Film, Sparkles, BrainCircuit, Download, MessageCircle, Music, ExternalLink, Headphones, Disc, Tv, Globe } from 'lucide-react';
import LazyImage from '../components/LazyImage';
import { useToast } from '../context/ToastContext';
import { MentionInput } from '../components/Layout';
import VideoPlayer from '../components/VideoPlayer';
import AnimeCard from '../components/AnimeCard';
import { usePlayer } from '../context/PlayerContext';

interface DetailsProps {
  user: any | null;
}

const Details: React.FC<DetailsProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [userEntry, setUserEntry] = useState<UserListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'episodes' | 'characters' | 'staff' | 'recommendations' | 'discussions' | 'music'>('overview');
  
  // Rating & Themes
  const [malScore, setMalScore] = useState<number | null>(null);
  const [themes, setThemes] = useState<MalThemes | null>(null);
  const [playingTheme, setPlayingTheme] = useState<string | null>(null);

  // Episodes
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [watchingEpisode, setWatchingEpisode] = useState<Episode | null>(null);

  // Trailer Modal State
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  // AI Recommendations
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [loadingAiRecs, setLoadingAiRecs] = useState(false);

  // Character Tabs
  const [charRole, setCharRole] = useState<'MAIN' | 'SUPPORTING'>('MAIN');
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Description Localization
  const [customDescriptions, setCustomDescriptions] = useState<Record<string, string>>({});
  const [selectedLang, setSelectedLang] = useState<string>('original');

  // Modals & Forms
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserListEntry>>({});
  const [saving, setSaving] = useState(false);
  const [discussions, setDiscussions] = useState<DiscussionPost[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const { showToast } = useToast();
  const { spotifyToken, playSpotifyUri } = usePlayer();

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setLoading(true);
      setAnime(null);
      setAiRecs([]);
      setThemes(null);
      setCustomDescriptions({});
      
      try {
        const data = await anilistService.getAnimeDetails(parseInt(id));
        setAnime(data);

        // Fetch Custom Description
        const customContent = await firebaseService.getCustomDescription('anime', parseInt(id));
        if (customContent) {
            setCustomDescriptions(customContent);
            // Auto select arabic if available and user might prefer it (simple check)
            if (customContent['ar']) setSelectedLang('ar');
        }

        if (data.idMal) {
            malService.getScore(data.idMal, 'anime').then(score => setMalScore(score));
            malService.getThemes(data.idMal).then(t => setThemes(t));
        }

        if (user) {
          const list = await firebaseService.getUserAnimeList(user.uid);
          const entry = list.find(e => e.animeId === data.id);
          if (entry) {
              setUserEntry(entry);
              setEditForm(entry);
          } else {
              setEditForm({
                  status: 'WATCHING',
                  score: 0,
                  progress: 0,
                  priority: 'MEDIUM',
                  rewatchCount: 0,
                  private: false,
                  notes: ''
              });
          }
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to load anime details", 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Subscribe to Episodes
    const unsubEpisodes = firebaseService.subscribeToEpisodes(parseInt(id), setEpisodes);

    const unsubDiscussions = firebaseService.subscribeToDiscussions(parseInt(id), (posts) => {
      setDiscussions(posts);
    });
    return () => {
        unsubEpisodes();
        unsubDiscussions();
    };
  }, [id, user]);

  // ... (Keep existing handlers: handleSaveEntry, handleAutoTrack, playEpisode, etc.)
  const handleSaveEntry = async (e: React.FormEvent, overrideEntry?: UserListEntry) => {
    if(e) e.preventDefault();
    if (!user || !anime) return;
    setSaving(true);
    try {
      const entryData = overrideEntry || editForm;
      const newEntry: UserListEntry = {
        animeId: anime.id,
        status: entryData.status as any || 'WATCHING',
        score: Number(entryData.score) || 0,
        progress: Number(entryData.progress) || 0,
        priority: entryData.priority as any || 'MEDIUM',
        rewatchCount: Number(entryData.rewatchCount) || 0,
        notes: entryData.notes || '',
        private: !!entryData.private,
        updatedAt: Date.now(),
        title: anime.title.english || anime.title.romaji,
        image: anime.coverImage.medium,
        genres: anime.genres,
        type: 'ANIME'
      };

      await firebaseService.updateUserAnimeEntry(user.uid, newEntry);
      
      if (!overrideEntry) { 
          const { newLevel } = await firebaseService.awardXP(user.uid, 50, 'episode'); 
          if (newLevel) showToast(`Leveled Up to ${newLevel}!`, 'success');
          else showToast("List updated!", 'success');
      }

      setUserEntry(newEntry);
      setIsListModalOpen(false);
    } catch {
      showToast("Failed to update list", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoTrack = async (epNum: number) => {
      if (!user || !anime) return;
      if (userEntry && userEntry.progress >= epNum) return; 

      const updatedForm = { ...editForm, progress: epNum, status: 'WATCHING' };
      if (userEntry?.status === 'PLANNING' || userEntry?.status === 'DROPPED') {
          updatedForm.status = 'WATCHING';
      }
      await handleSaveEntry({ preventDefault: () => {} } as any, updatedForm as UserListEntry);
      
      const { newLevel } = await firebaseService.awardXP(user.uid, 50, 'episode');
      showToast(`Episode ${epNum} tracked! ${newLevel ? `Level Up: ${newLevel}` : ''}`, 'success');
  };

  const playEpisode = (ep: Episode) => {
      setWatchingEpisode(ep);
  };

  const handleDownloadEpisode = (ep: Episode) => {
      const source = ep.sources[0];
      if (!source) return showToast("No source available", "error");
      showToast("Opening download link...", "info");
      window.open(source.url, '_blank');
  };

  const handleEpisodeDiscussion = (ep: Episode) => {
      setActiveTab('discussions');
      setNewComment(`Episode ${ep.number} Discussion: `);
      setTimeout(() => {
          const commentBox = document.getElementById('comment-box');
          if (commentBox) commentBox.scrollIntoView({ behavior: 'smooth' });
          const input = document.getElementById('comment-box') as HTMLTextAreaElement;
          if(input) input.focus();
      }, 100);
  };

  const getAIRecommendations = async () => {
      if (!anime) return;
      setLoadingAiRecs(true);
      try {
          const prompt = `Recommend 5 anime similar to "${anime.title.english || anime.title.romaji}". 
          Genre: ${anime.genres.join(', ')}. 
          Vibe: ${anime.description ? anime.description.substring(0, 200) : 'Generic'}. 
          Return ONLY a JSON array of objects with keys: "title", "reason".`;
          
          const text = await aiService.chat(prompt);
          const jsonMatch = text.match(/\[.*\]/s);
          if (jsonMatch) {
              const recs = JSON.parse(jsonMatch[0]);
              setAiRecs(recs);
          } else {
              showToast("AI returned unstructured data.", "error");
          }
      } catch (e) {
          showToast("AI Recommendations failed", "error");
      } finally {
          setLoadingAiRecs(false);
      }
  };

  const toggleFavorite = async () => {
    if (!user || !anime) return;
    try {
        await firebaseService.toggleFavorite(user.uid, anime.id, true);
        showToast("Added to favorites", 'success');
    } catch {
        showToast("Failed to favorite", 'error');
    }
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !anime || !newComment.trim()) return;
    try {
        await firebaseService.addDiscussionPost(anime.id, {
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            content: newComment,
            createdAt: Date.now(),
            likes: 0
        });
        setNewComment('');
        await firebaseService.awardXP(user.uid, 10, 'comment');
        showToast("Comment posted!", 'success');
    } catch {
        showToast("Failed to post comment", 'error');
    }
  };

  const playThemeOnSpotify = async (themeName: string) => {
      if (!spotifyToken) return showToast("Please connect Spotify in Settings first", "error");
      setPlayingTheme(themeName);
      const cleanQuery = themeName.replace(/[""]/g, "").split(' by ')[0]; 
      try {
          const tracks = await spotifyService.searchTracks(cleanQuery, spotifyToken);
          if (tracks.length > 0) {
              const bestMatch = tracks[0];
              playSpotifyUri(bestMatch.uri, {
                  title: bestMatch.name,
                  artist: bestMatch.artists.map(a => a.name).join(', '),
                  anime: anime?.title.romaji || 'Anime Theme',
                  url: '',
                  source: 'spotify',
                  artwork: bestMatch.album.images[0]?.url,
                  spotifyUri: bestMatch.uri
              });
              showToast(`Playing: ${bestMatch.name}`, "success");
          } else {
              showToast("Song not found on Spotify", "error");
          }
      } catch (e) {
          showToast("Failed to play on Spotify", "error");
      } finally {
          setPlayingTheme(null);
      }
  };

  const openYouTubeSearch = (themeName: string) => {
      const query = `${anime?.title.romaji} ${themeName}`;
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
  };

  if (loading || !anime) {
    return <div className="h-[50vh] flex items-center justify-center text-slate-400">Loading details...</div>;
  }

  const streamLinks = anime.externalLinks?.filter(l => l.type === 'STREAMING') || [];
  const officialLinks = anime.externalLinks?.filter(l => l.type !== 'STREAMING') || [];
  const currentDescription = selectedLang === 'original' ? anime.description : (customDescriptions[selectedLang] || anime.description);

  return (
    <div className="pb-20">
      {/* Cinematic Trailer Modal */}
      {showTrailerModal && anime.trailer && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-fadeIn" onClick={() => setShowTrailerModal(false)}>
              <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <iframe 
                    src={`https://www.youtube.com/embed/${anime.trailer.id}?autoplay=1`} 
                    title="Trailer"
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay"
                  />
                  <button 
                    onClick={() => setShowTrailerModal(false)} 
                    className="absolute -top-12 right-0 p-2 text-white hover:text-red-400 transition-colors flex items-center gap-2"
                  >
                      <X className="w-6 h-6" /> Close Trailer
                  </button>
              </div>
          </div>
      )}

      {/* Watch Modal (Episodes) */}
      {watchingEpisode && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-center animate-fadeIn">
              <div className="relative w-full max-w-6xl mx-auto p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-4 text-white">
                      <div>
                          <h2 className="text-xl font-bold">{anime.title.english || anime.title.romaji}</h2>
                          <p className="text-slate-400">Episode {watchingEpisode.number} - {watchingEpisode.title}</p>
                      </div>
                      <button onClick={() => setWatchingEpisode(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="flex-1 flex items-center bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
                      <VideoPlayer 
                        sources={watchingEpisode.sources} 
                        poster={anime.bannerImage || anime.coverImage.large}
                        title={anime.title.english || anime.title.romaji}
                        malId={anime.idMal}
                        episodeNumber={watchingEpisode.number}
                        onProgress={() => handleAutoTrack(watchingEpisode.number)}
                        onNext={() => {
                            const nextEp = episodes.find(e => e.number === watchingEpisode.number + 1);
                            if (nextEp) setWatchingEpisode(nextEp);
                            else showToast("No next episode found", "info");
                        }}
                      />
                  </div>
              </div>
          </div>
      )}

      {/* Hero */}
      <div className="relative w-full h-[35vh] md:h-[50vh] overflow-hidden">
        <div className="absolute inset-0">
          <LazyImage 
            src={anime.bannerImage || anime.coverImage.large} 
            alt="Banner" 
            className="w-full h-full object-cover blur-sm opacity-50 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent" />
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-24 md:-mt-32 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="relative group rounded-xl shadow-2xl overflow-hidden bg-dark-800 w-48 md:w-full mx-auto md:mx-0">
                <LazyImage 
                  src={anime.coverImage.large} 
                  alt={anime.title.romaji} 
                  className="w-full aspect-[2/3] object-cover transition-transform group-hover:scale-105 duration-700"
                />
                {anime.averageScore && (
                   <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-yellow-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                       <Star className="w-3 h-3 fill-current" /> {anime.averageScore}%
                   </div>
               )}
            </div>
            
            {user ? (
              <div className="space-y-3">
                 <button 
                    onClick={() => setIsListModalOpen(true)}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-lg ${
                        userEntry 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                        : 'bg-white text-dark-900 hover:bg-slate-200'
                    }`}
                 >
                     {userEntry ? <><Edit className="w-4 h-4" /> Edit Entry</> : <><Plus className="w-4 h-4" /> Add to List</>}
                 </button>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={toggleFavorite} className="flex items-center justify-center gap-2 py-3 bg-dark-800 hover:bg-pink-500/20 text-pink-500 rounded-xl transition-colors border border-white/5">
                        <Heart className="w-4 h-4" /> Favorite
                    </button>
                    <button className="flex items-center justify-center gap-2 py-3 bg-dark-800 hover:bg-white/5 text-slate-300 rounded-xl transition-colors border border-white/5">
                        <Share2 className="w-4 h-4" /> Share
                    </button>
                 </div>
              </div>
            ) : (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center backdrop-blur-sm">
                    <p className="text-sm text-blue-200 font-medium">Log in to track this anime</p>
                </div>
            )}
          </div>

          {/* Right Column */}
          <div className="pt-2 md:pt-12 min-w-0 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-black text-white leading-tight mb-2 drop-shadow-lg break-words">
              {anime.title.english || anime.title.romaji}
            </h1>
            <h2 className="text-xl text-slate-300 font-medium mb-6 opacity-80 italic">{anime.title.native}</h2>
            
            {/* Description */}
            <div className="mb-10 bg-dark-800/30 p-6 rounded-2xl border border-white/5 backdrop-blur-sm relative text-left">
                {Object.keys(customDescriptions).length > 0 && (
                    <div className="flex justify-end mb-2">
                        <div className="flex items-center gap-2 bg-dark-900 rounded-lg p-1 border border-white/10">
                            <Globe className="w-4 h-4 text-slate-400 ml-2" />
                            <select 
                                value={selectedLang} 
                                onChange={(e) => setSelectedLang(e.target.value)}
                                className="bg-transparent text-sm text-slate-300 outline-none border-none p-1 cursor-pointer"
                            >
                                <option value="original">Original</option>
                                {Object.keys(customDescriptions).map(lang => (
                                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
                <div 
                    className={`prose prose-invert max-w-none text-slate-200 leading-relaxed ${!showFullDesc ? 'line-clamp-3' : ''}`}
                    dangerouslySetInnerHTML={{ __html: currentDescription }} 
                />
                <button 
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="flex items-center gap-1 text-primary font-bold text-sm mt-3 hover:text-white transition-colors"
                >
                    {showFullDesc ? <>Show Less <ChevronUp className="w-4 h-4" /></> : <>Read More <ChevronDown className="w-4 h-4" /></>}
                </button>
            </div>

            {/* AI Recommendations Section */}
            <div className="mb-10 text-left">
                <button 
                    onClick={getAIRecommendations}
                    disabled={loadingAiRecs}
                    className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors mb-4"
                >
                    <Sparkles className="w-4 h-4" /> 
                    {loadingAiRecs ? "Thinking..." : "Ask AI for Hybrid Recommendations"}
                </button>
                
                {aiRecs.length > 0 && (
                    <div className="grid gap-4 animate-fadeIn">
                        {aiRecs.map((rec, i) => (
                            <div key={i} className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl flex items-start gap-4">
                                <BrainCircuit className="w-6 h-6 text-purple-400 mt-1 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-white">{rec.title}</h4>
                                    <p className="text-sm text-slate-400 mt-1">{rec.reason}</p>
                                    <Link to={`/search?q=${encodeURIComponent(rec.title)}`} className="text-xs text-purple-400 hover:underline mt-2 block">Find this Anime &rarr;</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10 mb-8 flex gap-8 overflow-x-auto pb-1 no-scrollbar justify-start">
              {[
                {id: 'overview', label: 'Overview', icon: Info},
                {id: 'episodes', label: 'Episodes', icon: PlayCircle},
                {id: 'music', label: 'Soundtrack', icon: Music},
                {id: 'characters', label: 'Characters', icon: Users},
                {id: 'staff', label: 'Staff', icon: Briefcase},
                {id: 'recommendations', label: 'Recommendations', icon: ThumbsUp},
                {id: 'discussions', label: 'Discussions', icon: MessageSquare},
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                    activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px] text-left">
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Streaming & Trailer Section */}
                  {(streamLinks.length > 0 || anime.trailer?.site === 'youtube') && (
                      <div className="grid md:grid-cols-2 gap-6">
                          {anime.trailer?.site === 'youtube' && (
                              <div className="bg-dark-800 p-4 rounded-xl border border-white/5">
                                  <h3 className="font-bold mb-3 flex items-center gap-2"><Film className="w-4 h-4 text-red-500" /> Trailer</h3>
                                  <div 
                                    className="aspect-video bg-black rounded-lg overflow-hidden relative cursor-pointer group"
                                    onClick={() => setShowTrailerModal(true)}
                                  >
                                      <LazyImage 
                                        src={anime.trailer.thumbnail || anime.bannerImage || anime.coverImage.large} 
                                        alt="Trailer"
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-all duration-300"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                              <PlayCircle className="w-8 h-8 text-white fill-current" />
                                          </div>
                                      </div>
                                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-bold">
                                          CINEMATIC MODE
                                      </div>
                                  </div>
                              </div>
                          )}
                          
                          {streamLinks.length > 0 && (
                              <div className="bg-dark-800 p-4 rounded-xl border border-white/5">
                                  <h3 className="font-bold mb-3 flex items-center gap-2"><Tv className="w-4 h-4 text-green-400" /> Watch On</h3>
                                  <div className="grid grid-cols-2 gap-3">
                                      {streamLinks.map((link, i) => (
                                          <a 
                                            key={i} 
                                            href={link.url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="flex items-center gap-2 p-3 bg-dark-900 hover:bg-white/5 rounded-lg border border-white/5 transition-colors group"
                                            style={{ borderColor: link.color }}
                                          >
                                              {link.icon ? <img src={link.icon} className="w-5 h-5 rounded-sm" /> : <ExternalLink className="w-4 h-4" />}
                                              <span className="text-sm font-bold group-hover:text-primary transition-colors">{link.site}</span>
                                          </a>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  {/* Rankings & Info */}
                  <div className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
                          <InfoItem label="Format" value={anime.format} />
                          <InfoItem label="Episodes" value={anime.episodes} />
                          <InfoItem label="Status" value={anime.status} />
                          <InfoItem label="Season" value={`${anime.season} ${anime.seasonYear}`} />
                          <InfoItem label="Source" value={anime.source} />
                          <InfoItem 
                            label="Studio" 
                            value={anime.studios?.nodes?.[0] ? (
                                <Link to={`/studio/${anime.studios.nodes[0].id}`} className="hover:text-primary transition-colors">
                                    {anime.studios.nodes[0].name}
                                </Link>
                            ) : undefined}
                          />
                          <InfoItem label="Duration" value={anime.duration ? `${anime.duration} mins` : undefined} />
                          <InfoItem label="Popularity" value={(anime.popularity || 0).toLocaleString()} />
                      </div>
                  </div>

                  {/* External Info Links */}
                  {officialLinks.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                          {officialLinks.map((link, i) => (
                              <a 
                                key={i} 
                                href={link.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-4 py-2 bg-dark-800 rounded-full border border-white/10 text-xs font-bold hover:bg-white/10 flex items-center gap-2 text-slate-300"
                              >
                                  {link.site} <ExternalLink className="w-3 h-3" />
                              </a>
                          ))}
                      </div>
                  )}

                  {/* Relations */}
                  {anime.relations && anime.relations.edges && anime.relations.edges.length > 0 && (
                      <div>
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><LinkIcon className="w-5 h-5 text-primary" /> Related Media</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(anime.relations.edges as any[]).map((edge: any) => (
                                  edge.node && (
                                    <Link 
                                        to={edge.node.type === 'MANGA' ? `/manga/${edge.node.id}` : `/anime/${edge.node.id}`} 
                                        key={edge.node.id} 
                                        className="bg-dark-800 p-3 rounded-xl flex gap-4 items-center border border-white/5 hover:border-primary/50 hover:bg-dark-700 transition-all group"
                                    >
                                        <LazyImage src={edge.node.coverImage.medium} className="w-14 h-20 object-cover rounded-lg shadow-md shrink-0" alt="" />
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-bold text-primary uppercase mb-1 tracking-wide">{edge.relationType.replace('_', ' ')}</div>
                                            <h4 className="font-bold text-sm text-white truncate group-hover:text-primary transition-colors">{edge.node.title.english || edge.node.title.romaji}</h4>
                                            <div className="text-xs text-slate-500 mt-1">{edge.node.format} • {edge.node.type}</div>
                                        </div>
                                    </Link>
                                  )
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Tags */}
                  {anime.tags && anime.tags.length > 0 && (
                      <div>
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><Hash className="w-5 h-5 text-primary" /> Tags</h3>
                          <div className="flex flex-wrap gap-2">
                              {anime.tags.map(tag => (
                                  <div key={tag.id} className="px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 bg-dark-800 border-white/10 text-slate-300">
                                      {tag.name}
                                      <span className="opacity-50 font-normal">{tag.rank}%</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                </div>
              )}

              {/* ... Rest of tabs (episodes, music, etc.) remain unchanged ... */}
              {activeTab === 'episodes' && (
                  <div className="animate-fadeIn">
                      {anime.nextAiringEpisode && (
                          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 rounded-2xl mb-6 border border-white/10 shadow-lg">
                              <h3 className="text-lg font-bold text-white mb-2">Next Episode Airing Soon</h3>
                              <div className="text-3xl font-mono font-bold text-blue-300">
                                  Ep {anime.nextAiringEpisode.episode}: {Math.floor(anime.nextAiringEpisode.timeUntilAiring / 86400)}d {Math.floor((anime.nextAiringEpisode.timeUntilAiring % 86400) / 3600)}h
                              </div>
                          </div>
                      )}
                      
                      {episodes.length > 0 ? (
                          <div className="flex flex-col gap-3">
                              {episodes.map(ep => {
                                  const source = ep.sources[0];
                                  return (
                                  <div 
                                    key={ep.id} 
                                    className="flex items-center gap-4 bg-dark-800 p-3 rounded-xl border border-white/5 hover:border-primary/50 transition-all group"
                                  >
                                      <button 
                                        onClick={() => playEpisode(ep)}
                                        className="w-32 md:w-40 aspect-video bg-black relative shrink-0 rounded-lg overflow-hidden group-hover:shadow-lg transition-shadow"
                                      >
                                          {ep.thumbnail ? (
                                              <img src={ep.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                          ) : (
                                              <div className="flex items-center justify-center h-full text-slate-600"><Film className="w-6 h-6"/></div>
                                          )}
                                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                              <PlayCircle className="w-10 h-10 text-white fill-current" />
                                          </div>
                                      </button>

                                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playEpisode(ep)}>
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="text-primary font-bold text-sm">Episode {ep.number}</span>
                                              {ep.isFiller && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Filler</span>}
                                              {source?.audio && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase">{source.audio}</span>}
                                              {ep.language && <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">{ep.language}</span>}
                                          </div>
                                          <h4 className="font-bold text-white truncate text-sm md:text-base group-hover:text-primary transition-colors">
                                              {ep.title || `Episode ${ep.number}`}
                                          </h4>
                                          <p className="text-xs text-slate-500 mt-1">{new Date(ep.createdAt).toLocaleDateString()}</p>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                          {ep.sources && ep.sources.length > 0 && (
                                              <button 
                                                onClick={() => handleDownloadEpisode(ep)}
                                                className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors flex items-center gap-1"
                                                title="Download Episode"
                                              >
                                                  <Download className="w-4 h-4" />
                                                  <span className="text-xs font-bold hidden md:block">Download</span>
                                              </button>
                                          )}
                                          <button 
                                            onClick={() => handleEpisodeDiscussion(ep)}
                                            className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-primary rounded-full transition-colors flex items-center gap-1"
                                            title="Discuss Episode"
                                          >
                                              <MessageCircle className="w-4 h-4" />
                                              <span className="text-xs font-bold hidden md:block">Comment</span>
                                          </button>
                                      </div>
                                  </div>
                              )})}
                          </div>
                      ) : (
                          <div className="bg-dark-800 rounded-2xl border border-white/5 p-12 text-center">
                              <Monitor className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
                              <h3 className="text-xl font-bold text-white mb-2">No Episodes Available</h3>
                              <p className="text-slate-400 max-w-md mx-auto">
                                  We couldn't find any streamable episodes for this series yet. Check back later or update your list progress manually.
                              </p>
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'music' && (
                  <div className="animate-fadeIn space-y-6">
                      {!themes || (themes.openings.length === 0 && themes.endings.length === 0) ? (
                          <div className="text-center py-12 bg-dark-800 rounded-xl border border-white/5">
                              <Disc className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
                              <p className="text-slate-400">No theme songs found.</p>
                          </div>
                      ) : (
                          <div className="grid md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                  <h3 className="font-bold flex items-center gap-2 text-lg text-primary"><PlayCircle className="w-5 h-5" /> Openings</h3>
                                  {themes.openings.map((theme, i) => (
                                      <div key={i} className="bg-dark-800 p-4 rounded-xl border border-white/5 flex items-center justify-between group">
                                          <div className="flex items-center gap-3 min-w-0">
                                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{i + 1}</div>
                                              <div className="truncate text-sm text-slate-300 font-medium pr-2">{theme}</div>
                                          </div>
                                          <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                              {spotifyToken ? (
                                                  <button onClick={() => playThemeOnSpotify(theme)} className="p-2 bg-[#1DB954]/10 text-[#1DB954] rounded-full hover:bg-[#1DB954]/20 transition-colors"><Headphones className="w-4 h-4" /></button>
                                              ) : (
                                                  <button onClick={() => showToast("Connect Spotify in Settings", "info")} className="p-2 bg-white/5 text-slate-500 rounded-full hover:bg-white/10"><Headphones className="w-4 h-4" /></button>
                                              )}
                                              <button onClick={() => openYouTubeSearch(theme)} className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-colors"><ExternalLink className="w-4 h-4" /></button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                              <div className="space-y-4">
                                  <h3 className="font-bold flex items-center gap-2 text-lg text-blue-400"><Disc className="w-5 h-5" /> Endings</h3>
                                  {themes.endings.map((theme, i) => (
                                      <div key={i} className="bg-dark-800 p-4 rounded-xl border border-white/5 flex items-center justify-between group">
                                          <div className="flex items-center gap-3 min-w-0">
                                              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">{i + 1}</div>
                                              <div className="truncate text-sm text-slate-300 font-medium pr-2">{theme}</div>
                                          </div>
                                          <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                              {spotifyToken ? (
                                                  <button onClick={() => playThemeOnSpotify(theme)} className="p-2 bg-[#1DB954]/10 text-[#1DB954] rounded-full hover:bg-[#1DB954]/20 transition-colors"><Headphones className="w-4 h-4" /></button>
                                              ) : (
                                                  <button onClick={() => showToast("Connect Spotify in Settings", "info")} className="p-2 bg-white/5 text-slate-500 rounded-full hover:bg-white/10"><Headphones className="w-4 h-4" /></button>
                                              )}
                                              <button onClick={() => openYouTubeSearch(theme)} className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-colors"><ExternalLink className="w-4 h-4" /></button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'characters' && (
                <div className="animate-fadeIn">
                    <div className="flex gap-2 mb-6 bg-dark-800 p-1 rounded-lg w-fit">
                        <button onClick={() => setCharRole('MAIN')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${charRole === 'MAIN' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}>Main</button>
                        <button onClick={() => setCharRole('SUPPORTING')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${charRole === 'SUPPORTING' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}>Supporting</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {anime.characters?.edges.filter(edge => edge.role === charRole).map((edge, index) => (
                        <Link to={`/character/${edge.node.id}`} key={`${edge.node.id}-${index}`} className="flex items-center gap-4 bg-dark-800 p-4 rounded-xl border border-white/5 hover:border-primary/50 transition-all group">
                            <LazyImage src={edge.node.image.medium} alt={edge.node.name.full} className="w-16 h-16 rounded-full object-cover shadow-lg" />
                            <div>
                                <div className="font-bold text-white group-hover:text-primary transition-colors">{edge.node.name.full}</div>
                                {edge.voiceActors && edge.voiceActors.length > 0 && (
                                    <div className="text-xs text-slate-400 mt-1">{edge.voiceActors[0]?.name.full} ({edge.voiceActors[0]?.languageV2})</div>
                                )}
                            </div>
                        </Link>
                    ))}
                    </div>
                </div>
              )}

              {activeTab === 'staff' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                  {anime.staff?.edges?.map((edge, i) => (
                    <Link to={`/staff/${edge.node.id}`} key={i} className="flex items-center gap-4 bg-dark-800 p-4 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
                      <LazyImage src={edge.node.image.medium} alt={edge.node.name.full} className="w-14 h-14 rounded-full object-cover" />
                      <div>
                        <div className="font-bold text-white text-sm">{edge.node.name.full}</div>
                        <div className="text-xs text-primary mt-1 font-medium">{edge.role}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {activeTab === 'recommendations' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-fadeIn">
                      {anime.recommendations?.nodes.map((rec, i) => (
                          <AnimeCard key={i} anime={rec.mediaRecommendation} />
                      ))}
                      {(!anime.recommendations?.nodes || anime.recommendations.nodes.length === 0) && (
                          <div className="col-span-full text-center py-10 text-slate-500">
                              No recommendations found.
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'discussions' && (
                  <div className="animate-fadeIn space-y-6">
                      {user && (
                          <form onSubmit={postComment} className="flex gap-3 items-start bg-dark-800 p-4 rounded-xl border border-white/5">
                              <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0">{user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">{user.displayName?.[0]}</div>}</div>
                              <div className="flex-1">
                                <MentionInput id="comment-box" value={newComment} onChange={setNewComment} placeholder="Join the discussion..." className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-sm focus:border-primary outline-none text-white min-h-[80px]" />
                                <div className="flex justify-end mt-2"><button type="submit" className="bg-primary px-6 py-2 rounded-lg font-bold text-sm text-white hover:bg-blue-600 transition-colors">Post</button></div>
                              </div>
                          </form>
                      )}
                      <div className="space-y-4">
                          {discussions.map(post => {
                              if (post.isHidden) return null; // Skip hidden posts
                              return (
                                <div key={post.id} className={`bg-dark-800 p-5 rounded-xl border ${post.isFlagged ? 'border-red-500/30' : 'border-white/5'}`}>
                                    <div className="flex justify-between mb-3 items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{post.userName}</span>
                                            <span className="text-xs text-slate-500">• {new Date(post.createdAt).toLocaleDateString()}</span>
                                            {post.isFlagged && <span className="text-[10px] text-red-400 bg-red-500/10 px-2 rounded">Under Review</span>}
                                        </div>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                                    <div className="mt-4 flex gap-4 text-xs font-bold text-slate-500 border-t border-white/5 pt-3">
                                        <button className="flex items-center gap-1 hover:text-white"><ThumbsUp className="w-3 h-3"/> {post.likes}</button>
                                        <button className="flex items-center gap-1 hover:text-white"><Reply className="w-3 h-3"/> Reply</button>
                                    </div>
                                </div>
                              )
                          })}
                      </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal (Existing) */}
      {isListModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsListModalOpen(false)}>
              <div className="bg-dark-800 w-full max-w-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-dark-900/50">
                      <h3 className="text-xl font-bold text-white">Edit List Entry</h3>
                      <button onClick={() => setIsListModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={(e) => handleSaveEntry(e)} className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                              <select value={editForm.status} onChange={e => setEditForm(prev => ({...prev, status: e.target.value as any}))} className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-white">
                                  {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Score</label>
                              <input type="number" min="0" max="100" value={editForm.score} onChange={e => setEditForm(prev => ({...prev, score: Number(e.target.value)}))} className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-white" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Episode Progress</label>
                          <div className="flex items-center gap-3">
                              <input type="number" min="0" max={anime.episodes || 999} value={editForm.progress} onChange={e => setEditForm(prev => ({...prev, progress: Number(e.target.value)}))} className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-white" />
                              <span className="text-slate-400 font-bold whitespace-nowrap">/ {anime.episodes || '?'}</span>
                          </div>
                      </div>
                      <button type="submit" disabled={saving} className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg">{saving ? 'Saving...' : 'Save Entry'}</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

const InfoItem = ({ label, value }: { label: string, value: React.ReactNode }) => {
    if (!value) return null;
    return (
        <div className="p-4 bg-dark-800 hover:bg-white/5 transition-colors">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">{label}</div>
            <div className="text-sm text-slate-200 font-medium truncate">{value}</div>
        </div>
    );
};

export default Details;
