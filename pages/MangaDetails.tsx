
// ... imports (keep existing)
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { malService } from '../services/mal';
import { mangadexService } from '../services/mangadex';
import { mangahookService } from '../services/mangahook';
import { olympusService } from '../services/olympus';
import { Anime, UserListEntry, DiscussionPost, ManualChapter, MangaChapter } from '../types';
import { STATUS_OPTIONS } from '../constants';
import { Calendar, Star, Heart, MessageSquare, BookOpen, BrainCircuit, Users, Link as LinkIcon, Briefcase, Share2, X, Plus, Zap, Book, Layers, Edit, ChevronDown, ChevronUp, ChevronRight, Globe, ThumbsUp, Reply, Trophy, Hash, Film, ExternalLink, PlayCircle, Download, CloudOff, Loader2, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import LazyImage from '../components/LazyImage';
import { useToast } from '../context/ToastContext';
import { MentionInput } from '../components/Layout';
import { db } from '../services/db';

interface MangaDetailsProps {
  user: any | null;
}

const MangaDetails: React.FC<MangaDetailsProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manga, setManga] = useState<Anime | null>(null);
  const [userEntry, setUserEntry] = useState<UserListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'chapters' | 'characters' | 'staff' | 'recommendations' | 'discussions' | 'reviews'>('overview');
  
  // Chapters
  const [manualChapters, setManualChapters] = useState<ManualChapter[]>([]);
  const [dexChapters, setDexChapters] = useState<MangaChapter[]>([]);
  const [hookChapters, setHookChapters] = useState<MangaChapter[]>([]);
  const [olympusChapters, setOlympusChapters] = useState<MangaChapter[]>([]);
  
  const [dexLoading, setDexLoading] = useState(false);
  const [hookLoading, setHookLoading] = useState(false);
  const [olympusLoading, setOlympusLoading] = useState(false);
  
  // Chapter Filtering
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);

  // ... (keep rest of state)
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [offlineIds, setOfflineIds] = useState<string[]>([]);
  const [charRole, setCharRole] = useState<'MAIN' | 'SUPPORTING'>('MAIN');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [customDescriptions, setCustomDescriptions] = useState<Record<string, string>>({});
  const [selectedLang, setSelectedLang] = useState<string>('original');
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [malScore, setMalScore] = useState<number | null>(null);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserListEntry>>({});
  const [saving, setSaving] = useState(false);
  const [discussions, setDiscussions] = useState<DiscussionPost[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const { showToast } = useToast();

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setLoading(true);
      setManga(null);
      setMalScore(null);
      setDexChapters([]);
      setHookChapters([]);
      setOlympusChapters([]);
      setCustomDescriptions({});
      setAvailableLanguages([]);
      
      // Update offline cache list
      db.chapters.toArray().then(items => setOfflineIds(items.filter(i => i.mangaId === parseInt(id)).map(i => i.id)));

      try {
        const data = await anilistService.getMangaDetails(parseInt(id));
        setManga(data);

        // Fetch Custom Description
        const customContent = await firebaseService.getCustomDescription('manga', parseInt(id));
        if (customContent) {
            setCustomDescriptions(customContent);
            if (customContent['ar']) setSelectedLang('ar');
        }

        // Fetch MAL Score
        if (data.idMal) {
            malService.getScore(data.idMal, 'manga').then(score => setMalScore(score));
        }

        const title = data.title.english || data.title.romaji;

        // Fetch MangaDex Chapters (All Languages)
        setDexLoading(true);
        const dexId = await mangadexService.searchMangaId(title);
        if (dexId) {
            const chapters = await mangadexService.getChapters(dexId);
            const mappedChapters = chapters.map(c => ({...c, source: 'dex' as const}));
            setDexChapters(mappedChapters);
            
            const langs = Array.from(new Set(chapters.map(c => c.language).filter(Boolean))) as string[];
            setAvailableLanguages(prev => Array.from(new Set([...prev, ...langs])));
            
            if (langs.includes('en') && selectedLanguage === 'en') setSelectedLanguage('en');
        }
        setDexLoading(false);

        // Fetch Hook
        fetchMangaHook(title);

        // Fetch Olympus
        fetchOlympus(title);

        if (user) {
          const list = await firebaseService.getUserAnimeList(user.uid);
          const entry = list.find(e => e.animeId === data.id);
          if (entry) {
              setUserEntry(entry);
              setEditForm(entry);
          } else {
              setEditForm({
                  status: 'READING',
                  score: 0,
                  progress: 0,
                  progressVolumes: 0,
                  priority: 'MEDIUM',
                  rewatchCount: 0, 
                  private: false,
                  notes: ''
              });
          }
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to load manga details", 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Subscribe to Chapters
    const unsubChapters = firebaseService.subscribeToChapters(parseInt(id), setManualChapters);

    // Subscribe to Discussions
    const unsub = firebaseService.subscribeToDiscussions(parseInt(id), (posts) => {
      setDiscussions(posts);
    });
    return () => {
        unsub();
        unsubChapters();
    }
  }, [id, user]);

  const fetchMangaHook = async (title: string) => {
      setHookLoading(true);
      try {
          const hookId = await mangahookService.searchMangaId(title);
          if (hookId) {
              const chapters = await mangahookService.getChapters(hookId);
              const mappedChapters = chapters.map(c => ({...c, source: 'hook' as const}));
              setHookChapters(mappedChapters);
          }
      } catch (e) {
          console.error("Hook fetch failed", e);
      } finally {
          setHookLoading(false);
      }
  };

  const fetchOlympus = async (title: string) => {
      setOlympusLoading(true);
      try {
          const olId = await olympusService.searchMangaId(title);
          if (olId) {
              const chapters = await olympusService.getChapters(olId);
              const mappedChapters = chapters.map(c => ({...c, source: 'olympus' as const}));
              setOlympusChapters(mappedChapters);
              // Add 'es' to languages if found
              if (chapters.length > 0) {
                  setAvailableLanguages(prev => Array.from(new Set([...prev, 'es'])));
              }
          }
      } catch (e) {
          console.error("Olympus fetch failed", e);
      } finally {
          setOlympusLoading(false);
      }
  };

  // ... (rest of methods: handleDownload, handleSaveEntry, etc. - ensure handleDownload passes source correctly)
  const handleDownload = async (chapter: MangaChapter, service: 'dex' | 'hook' | 'olympus') => {
      if (downloadingId) return;
      setDownloadingId(chapter.id);
      showToast("Downloading for offline reading...", "info");
      
      try {
          let imageUrls: string[] = [];
          if (service === 'dex') {
              imageUrls = await mangadexService.getChapterPages(chapter.id);
          } else if (service === 'hook') {
              imageUrls = await mangahookService.getPages(chapter.id);
          } else if (service === 'olympus') {
              imageUrls = await olympusService.getPages(chapter.id);
          }

          // In real app, fetch blobs here to store, currently just storing URLs
          await db.chapters.add({
              id: chapter.id,
              mangaId: manga?.id || 0,
              title: chapter.title || `Chapter ${chapter.chapter}`,
              pages: imageUrls,
              timestamp: Date.now()
          });
          
          setOfflineIds(prev => [...prev, chapter.id]);
          showToast("Chapter saved offline!", "success");
      } catch (e) {
          console.error(e);
          showToast("Download failed", "error");
      } finally {
          setDownloadingId(null);
      }
  };

  // ... (methods: handleSaveEntry, handleQuickRate, toggleFavorite, postComment, handleShare) -> No changes needed

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manga) return;
    setSaving(true);
    try {
      const newEntry: UserListEntry = {
        animeId: manga.id,
        status: editForm.status as any || 'READING',
        score: Number(editForm.score) || 0,
        progress: Number(editForm.progress) || 0,
        progressVolumes: Number(editForm.progressVolumes) || 0,
        priority: editForm.priority as any || 'MEDIUM',
        rewatchCount: Number(editForm.rewatchCount) || 0,
        notes: editForm.notes || '',
        private: !!editForm.private,
        startDate: editForm.startDate,
        finishDate: editForm.finishDate,
        updatedAt: Date.now(),
        title: manga.title.english || manga.title.romaji,
        image: manga.coverImage.medium,
        genres: manga.genres,
        type: 'MANGA'
      };

      await firebaseService.updateUserAnimeEntry(user.uid, newEntry);
      
      const { newLevel, unlockedBadge } = await firebaseService.awardXP(user.uid, 50);
      if (newLevel) showToast(`Leveled Up to ${newLevel}!`, 'success');
      if (unlockedBadge) showToast(`Unlocked Badge: ${unlockedBadge.name}`, 'success');
      if (!newLevel && !unlockedBadge) showToast("Manga list updated (+50 XP)", 'success');

      setUserEntry(newEntry);
      setIsListModalOpen(false);
    } catch {
      showToast("Failed to update list", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickRate = async (rating: number) => {
      if (!user || !manga) {
          showToast("Please login to rate", 'error');
          return;
      }
      const score = rating * 20; 
      const currentStatus = userEntry?.status || 'READING';
      const newEntry: UserListEntry = {
        animeId: manga.id,
        status: currentStatus,
        score: score,
        progress: userEntry?.progress || 0,
        progressVolumes: userEntry?.progressVolumes || 0,
        priority: userEntry?.priority || 'MEDIUM',
        rewatchCount: userEntry?.rewatchCount || 0,
        notes: userEntry?.notes || '',
        private: userEntry?.private || false,
        updatedAt: Date.now(),
        title: manga.title.english || manga.title.romaji,
        image: manga.coverImage.medium,
        genres: manga.genres,
        type: 'MANGA',
        startDate: userEntry?.startDate,
        finishDate: userEntry?.finishDate
      };
      try {
          await firebaseService.updateUserAnimeEntry(user.uid, newEntry);
          setUserEntry(newEntry);
          setEditForm(newEntry); 
          showToast(`Rated ${rating} stars!`, 'success');
      } catch (e) {
          showToast("Failed to save rating", 'error');
      }
  };

  const toggleFavorite = async () => {
    if (!user || !manga) return;
    try {
        await firebaseService.toggleFavorite(user.uid, manga.id, true);
        showToast("Added to favorites", 'success');
    } catch {
        showToast("Failed to favorite", 'error');
    }
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manga || !newComment.trim()) return;
    try {
        await firebaseService.addDiscussionPost(manga.id, {
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            content: newComment,
            createdAt: Date.now(),
            likes: 0
        });
        setNewComment('');
        await firebaseService.awardXP(user.uid, 10);
        showToast("Comment posted (+10 XP)", 'success');
    } catch {
        showToast("Failed to post comment", 'error');
    }
  };

  const handleShare = async () => {
      const url = window.location.href;
      try {
          await navigator.clipboard.writeText(url);
          showToast("Link copied to clipboard!", 'success');
      } catch {
          showToast("Failed to copy link", 'error');
      }
  };

  const openReader = (chapter: ManualChapter | MangaChapter) => {
      const mangaForReader = {
          ...userEntry, 
          animeId: manga?.id,
          title: manga?.title.english || manga?.title.romaji,
          image: manga?.coverImage.large,
          type: 'MANGA'
      };

      if ('pages' in chapter && Array.isArray(chapter.pages)) {
           navigate(`/reader?manga=${manga?.id}&chapter=${chapter.id}`, { 
              state: { chapter: chapter, manga: mangaForReader } 
          });
      } else {
          // It's a MangaChapter with ID only
          navigate(`/reader`, { 
              state: { chapter: chapter, manga: mangaForReader } 
          });
      }
  };

  // ... (render logic)
  if (loading || !manga) {
    return <div className="h-[50vh] flex items-center justify-center text-slate-400">Loading details...</div>;
  }

  const streamLinks = manga.externalLinks?.filter(l => l.type === 'STREAMING' || l.type === 'READING') || [];
  const officialLinks = manga.externalLinks?.filter(l => l.type !== 'STREAMING' && l.type !== 'READING') || [];
  const currentDescription = selectedLang === 'original' ? manga.description : (customDescriptions[selectedLang] || manga.description);

  // Filter Chapters Logic
  const displayChapters = [...dexChapters, ...olympusChapters].filter(ch => ch.language === selectedLanguage);
  
  // Sort Logic
  displayChapters.sort((a, b) => {
      const numA = parseFloat(a.chapter) || 0;
      const numB = parseFloat(b.chapter) || 0;
      return sortOrder === 'desc' ? numB - numA : numA - numB;
  });

  return (
    <div className="pb-20">
      {/* ... (Keep existing UI code until Tabs) ... */}
      {showTrailerModal && manga.trailer && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-fadeIn" onClick={() => setShowTrailerModal(false)}>
              <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <iframe 
                    src={`https://www.youtube.com/embed/${manga.trailer.id}?autoplay=1`} 
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

      <div className="relative w-full h-[35vh] md:h-[50vh] overflow-hidden">
        <div className="absolute inset-0">
          <LazyImage 
            src={manga.bannerImage || manga.coverImage.large} 
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
                  src={manga.coverImage.large} 
                  alt={manga.title.romaji} 
                  className="w-full aspect-[2/3] object-cover transition-transform group-hover:scale-105 duration-700"
                />
                {manga.averageScore && (
                   <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-yellow-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                       <Star className="w-3 h-3 fill-current" /> {manga.averageScore}%
                   </div>
               )}
            </div>
            {/* ... Buttons ... */}
            {user ? (
              <div className="space-y-3">
                 <button 
                    onClick={() => setIsListModalOpen(true)}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-lg ${
                        userEntry 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.02]' 
                        : 'bg-white text-dark-900 hover:bg-slate-200 hover:scale-[1.02]'
                    }`}
                 >
                     {userEntry ? <><Edit className="w-4 h-4" /> Edit Reading</> : <><Plus className="w-4 h-4" /> Add to List</>}
                 </button>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={toggleFavorite} className="flex items-center justify-center gap-2 py-3 bg-dark-800 hover:bg-pink-500/20 text-pink-500 rounded-xl transition-colors border border-white/5">
                        <Heart className="w-4 h-4" /> Favorite
                    </button>
                    <button onClick={handleShare} className="flex items-center justify-center gap-2 py-3 bg-dark-800 hover:bg-white/5 text-slate-300 rounded-xl transition-colors border border-white/5">
                        <Share2 className="w-4 h-4" /> Share
                    </button>
                 </div>

                 {userEntry && (
                     <div className="bg-dark-800 p-3 rounded-xl border border-white/5 text-center">
                         <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Your Progress</div>
                         <div className="font-bold text-white">
                             {userEntry.status} • Ch {userEntry.progress} / Vol {userEntry.progressVolumes || 0}
                         </div>
                     </div>
                 )}
              </div>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center backdrop-blur-sm">
                <p className="text-sm text-blue-200 font-medium">Log in to track this manga</p>
              </div>
            )}
            
            {user && (
                <div className="bg-dark-800 p-4 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-3 text-center">Your Rating</span>
                    <div className="flex justify-between text-slate-600 px-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button 
                                key={star}
                                onClick={() => handleQuickRate(star)}
                                className={`transition-colors hover:text-yellow-400 transform hover:scale-110 ${userEntry && userEntry.score >= star * 20 ? 'text-yellow-400' : ''}`}
                            >
                                <Star className={`w-6 h-6 ${userEntry && userEntry.score >= star * 20 ? 'fill-current' : ''}`} />
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>

          {/* Right Column */}
          <div className="pt-2 md:pt-12 min-w-0 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-black text-white leading-tight mb-2 drop-shadow-lg break-words">
              {manga.title.english || manga.title.romaji}
            </h1>
            <h2 className="text-xl text-slate-300 font-medium mb-6 opacity-80 italic">{manga.title.native}</h2>
            
            <div className="flex flex-wrap gap-3 mb-8 justify-center md:justify-start">
              <div className="flex items-center gap-2 bg-dark-800/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-green-400 text-sm font-bold">
                <Star className="w-4 h-4 fill-current" /> {manga.averageScore}%
              </div>
              <div className="flex items-center gap-2 bg-dark-800/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-pink-400 text-sm font-bold">
                <Heart className="w-4 h-4 fill-current" /> {(manga.popularity || 0).toLocaleString()}
              </div>
              <div className="flex items-center gap-2 bg-dark-800/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-slate-300 text-sm font-bold">
                <Calendar className="w-4 h-4" /> {manga.startDate?.year}
              </div>
              <div className="flex items-center gap-2 bg-dark-800/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-blue-400 text-sm font-bold">
                <Book className="w-4 h-4" /> {manga.chapters || '?'} Ch • {manga.volumes || '?'} Vol
              </div>
              <div className="flex items-center gap-2 bg-dark-800/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-slate-300 text-sm font-bold capitalize">
                 {manga.status?.replace(/_/g, ' ').toLowerCase()}
              </div>
            </div>

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

            {/* Tabs */}
            <div className="border-b border-white/10 mb-8 flex gap-8 overflow-x-auto pb-1 no-scrollbar justify-start">
              {[
                {id: 'overview', label: 'Overview', icon: BookOpen},
                {id: 'chapters', label: 'Chapters', icon: Layers},
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
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-fadeIn">
                  {(streamLinks.length > 0 || manga.trailer?.site === 'youtube') && (
                      <div className="grid md:grid-cols-2 gap-6">
                          {manga.trailer?.site === 'youtube' && (
                              <div className="bg-dark-800 p-4 rounded-xl border border-white/5">
                                  <h3 className="font-bold mb-3 flex items-center gap-2"><Film className="w-4 h-4 text-red-500" /> PV / Trailer</h3>
                                  <div 
                                    className="aspect-video bg-black rounded-lg overflow-hidden relative cursor-pointer group"
                                    onClick={() => setShowTrailerModal(true)}
                                  >
                                      <LazyImage 
                                        src={manga.trailer.thumbnail || manga.bannerImage || manga.coverImage.large} 
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
                                  <h3 className="font-bold mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-green-400" /> Read On</h3>
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

                  {/* Info Grid */}
                  <div className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
                          <InfoItem label="Format" value={manga.format} />
                          <InfoItem label="Chapters" value={manga.chapters} />
                          <InfoItem label="Volumes" value={manga.volumes} />
                          <InfoItem label="Status" value={manga.status} />
                          <InfoItem label="Start Date" value={`${manga.startDate.year}-${manga.startDate.month}-${manga.startDate.day}`} />
                          <InfoItem label="Source" value={manga.source} />
                          <InfoItem label="Mean Score" value={`${manga.meanScore}%`} />
                          <InfoItem label="Popularity" value={manga.popularity?.toLocaleString()} />
                      </div>
                  </div>

                  {/* Relations */}
                  {manga.relations?.edges?.length > 0 && (
                      <div>
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><LinkIcon className="w-5 h-5 text-primary" /> Related Media</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {manga.relations.edges.map((edge: any) => (
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
                  {manga.tags && manga.tags.length > 0 && (
                      <div>
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><Hash className="w-5 h-5 text-primary" /> Tags</h3>
                          <div className="flex flex-wrap gap-2">
                              {manga.tags.map(tag => (
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

              {/* Chapters Tab (Enhanced) */}
              {activeTab === 'chapters' && (
                  <div className="animate-fadeIn">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                          <h3 className="text-lg font-bold">Read Chapters</h3>
                          
                          <div className="flex gap-2">
                              {/* Language Filter */}
                              <div className="relative">
                                  <select 
                                    value={selectedLanguage} 
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="bg-dark-800 border border-white/10 rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:border-primary appearance-none cursor-pointer"
                                  >
                                      {availableLanguages.map(lang => (
                                          <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                                      ))}
                                      {availableLanguages.length === 0 && <option value="en">EN</option>}
                                  </select>
                                  <Globe className="w-4 h-4 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                              </div>

                              {/* Sort Order */}
                              <button 
                                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                className="bg-dark-800 border border-white/10 p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                                title="Sort Order"
                              >
                                  {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4"/> : <ArrowUp className="w-4 h-4"/>}
                              </button>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                          {/* Manual Chapters (Firebase) */}
                          {manualChapters.map(ch => (
                              <div key={`manual-${ch.id}`} className="flex items-center justify-between p-4 bg-dark-800 rounded-xl border border-white/5 hover:border-primary/50 hover:bg-dark-700 transition-all group">
                                  <button onClick={() => openReader(ch)} className="text-left flex-1">
                                      <div className="font-bold text-white group-hover:text-primary transition-colors">
                                          Chapter {ch.number}
                                          {ch.title && <span className="font-normal text-slate-400 ml-2">- {ch.title}</span>}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                          <span className="bg-primary/20 text-primary px-1.5 rounded">Official</span>
                                          {ch.language && <span className="text-slate-300 bg-white/10 px-1.5 rounded">{ch.language}</span>}
                                          <span>{ch.pages.length} Pages • {new Date(ch.createdAt).toLocaleDateString()}</span>
                                      </div>
                                  </button>
                                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-primary" />
                              </div>
                          ))}

                          {/* All Scraped Chapters (Dex, Hook, Olympus) */}
                          {displayChapters.map(ch => (
                              <div key={`${ch.source}-${ch.id}`} className="flex items-center justify-between p-4 bg-dark-800 rounded-xl border border-white/5 hover:border-green-500/50 hover:bg-dark-700 transition-all group">
                                  <button onClick={() => openReader(ch)} className="text-left flex-1">
                                      <div className="font-bold text-white group-hover:text-green-400 transition-colors">
                                          {ch.chapter ? `Chapter ${ch.chapter}` : 'Oneshot'}
                                          {ch.title && <span className="font-normal text-slate-400 ml-2">- {ch.title}</span>}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                          {ch.source === 'dex' && <span className="bg-green-500/20 text-green-400 px-1.5 rounded flex items-center gap-1"><Globe className="w-3 h-3"/> MangaDex</span>}
                                          {ch.source === 'hook' && <span className="bg-purple-500/20 text-purple-400 px-1.5 rounded flex items-center gap-1"><Globe className="w-3 h-3"/> MangaHook</span>}
                                          {ch.source === 'olympus' && <span className="bg-blue-500/20 text-blue-400 px-1.5 rounded flex items-center gap-1"><Globe className="w-3 h-3"/> Olympus</span>}
                                          
                                          {ch.language && <span className="text-slate-300 bg-white/10 px-1.5 rounded uppercase">{ch.language}</span>}
                                          <span>{ch.pages || '?'} Pages • {new Date(ch.publishAt).toLocaleDateString()}</span>
                                      </div>
                                  </button>
                                  <div className="flex gap-2">
                                      {offlineIds.includes(ch.id) ? (
                                          <CloudOff className="w-4 h-4 text-green-500" />
                                      ) : (
                                          <button onClick={() => handleDownload(ch, ch.source as any)} disabled={!!downloadingId} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                              {downloadingId === ch.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                                          </button>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>

                      {manualChapters.length === 0 && displayChapters.length === 0 && hookChapters.length === 0 && !dexLoading && !hookLoading && !olympusLoading && (
                          <div className="text-center py-12 bg-dark-800 rounded-xl border border-white/5">
                              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                              <p className="text-slate-400">No chapters found for selected language.</p>
                          </div>
                      )}
                      
                      {(dexLoading || hookLoading || olympusLoading) && (
                          <div className="text-center py-8">
                              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                              <p className="text-slate-500 text-xs">Scanning Providers...</p>
                          </div>
                      )}
                  </div>
              )}

              {/* Characters Tab */}
              {activeTab === 'characters' && (
                <div className="animate-fadeIn">
                    <div className="flex gap-2 mb-6 bg-dark-800 p-1 rounded-lg w-fit">
                        <button onClick={() => setCharRole('MAIN')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${charRole === 'MAIN' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}>Main Cast</button>
                        <button onClick={() => setCharRole('SUPPORTING')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${charRole === 'SUPPORTING' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}>Supporting</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {manga.characters?.edges.filter((edge: any) => edge.role === charRole).map((edge: any, index: number) => (
                        <Link to={`/character/${edge.node.id}`} key={`${edge.node.id}-${index}`} className="flex items-center gap-4 bg-dark-800 p-4 rounded-xl border border-white/5 hover:border-primary/50 transition-all group">
                            <LazyImage src={edge.node.image.medium} alt={edge.node.name.full} className="w-16 h-16 rounded-full object-cover shadow-lg" />
                            <div>
                                <div className="font-bold text-white group-hover:text-primary transition-colors">{edge.node.name.full}</div>
                            </div>
                        </Link>
                    ))}
                    </div>
                </div>
              )}

              {/* Staff Tab */}
              {activeTab === 'staff' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                  {manga.staff?.edges?.map((edge: any, i: number) => (
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

              {/* Recommendations Tab */}
              {activeTab === 'recommendations' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-fadeIn">
                      {manga.recommendations?.nodes.map((rec: any, i: number) => (
                          <AnimeCard key={i} anime={rec.mediaRecommendation} />
                      ))}
                      {(!manga.recommendations?.nodes || manga.recommendations.nodes.length === 0) && (
                          <div className="col-span-full text-center py-10 text-slate-500">
                              No recommendations found.
                          </div>
                      )}
                  </div>
              )}

              {/* Discussions Tab */}
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

      {/* Editor Modal (Unchanged) */}
      {isListModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsListModalOpen(false)}>
              <div className="bg-dark-800 w-full max-w-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-dark-900/50">
                      <h3 className="text-xl font-bold text-white">Edit List Entry</h3>
                      <button onClick={() => setIsListModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={handleSaveEntry} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                      {/* ... form content ... */}
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
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chapter Progress</label>
                          <div className="flex items-center gap-3">
                              <input type="number" min="0" max={manga.chapters || 999} value={editForm.progress} onChange={e => setEditForm(prev => ({...prev, progress: Number(e.target.value)}))} className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-white" />
                              <span className="text-slate-400 font-bold whitespace-nowrap">/ {manga.chapters || '?'}</span>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Volume Progress</label>
                          <div className="flex items-center gap-3">
                              <input type="number" min="0" max={manga.volumes || 99} value={editForm.progressVolumes} onChange={e => setEditForm(prev => ({...prev, progressVolumes: Number(e.target.value)}))} className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-white" />
                              <span className="text-slate-400 font-bold whitespace-nowrap">/ {manga.volumes || '?'}</span>
                          </div>
                      </div>
                      <button type="submit" disabled={saving} className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Saving...' : 'Save Entry'}</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

// ... InfoItem component ...
const InfoItem = ({ label, value }: { label: string, value: string | number | undefined | null }) => {
    if (!value) return null;
    return (
        <div className="p-4 bg-dark-800 hover:bg-white/5 transition-colors">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">{label}</div>
            <div className="text-sm text-slate-200 font-medium truncate" title={value.toString()}>{value}</div>
        </div>
    );
};

export default MangaDetails;
