
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { firebaseService } from '../services/firebase';
import { mangadexService } from '../services/mangadex';
import { mangahookService } from '../services/mangahook';
import { aiService } from '../services/ai';
import { UserListEntry, MangaChapter, ManualChapter } from '../types';
import { BookOpen, ChevronLeft, ChevronRight, Settings, ArrowLeft, Loader2, Maximize2, Download, CloudOff, Sun, Contrast, Columns, Smartphone, Mic, EyeOff, PlayCircle, PauseCircle, AlignLeft, AlignRight, ArrowDown, MoveHorizontal, MoveVertical, Maximize } from 'lucide-react';
import LazyImage from '../components/LazyImage';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { db } from '../services/db'; 

const Reader: React.FC = () => {
  const [viewMode, setViewMode] = useState<'LIBRARY' | 'CHAPTERS' | 'READING'>('LIBRARY');
  const [activeManga, setActiveManga] = useState<UserListEntry | null>(null);
  const [chapters, setChapters] = useState<MangaChapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<any>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [offlineIds, setOfflineIds] = useState<string[]>([]);
  
  // Advanced Settings
  const [doublePage, setDoublePage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // New Features
  const [zenMode, setZenMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const scrollInterval = useRef<number | null>(null);

  // AI Dubbing State
  const [isDubbing, setIsDubbing] = useState(false);
  const [dubLoading, setDubLoading] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0); 

  const { showToast } = useToast();
  const { settings, updateSettings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
      db.chapters.toArray().then(items => setOfflineIds(items.map(i => i.id)));
      if (window.innerWidth > 768) setDoublePage(true);
  }, []);

  useEffect(() => {
      if (location.state?.manga) {
          setActiveManga(location.state.manga);
          if (location.state?.chapter) {
              openChapter(location.state.chapter);
          } else {
              setViewMode('CHAPTERS');
          }
      }
  }, [location.state]);

  // 13. Auto Scroll Logic
  useEffect(() => {
      if (autoScroll) {
          scrollInterval.current = window.setInterval(() => {
              window.scrollBy(0, 1); // Slow scroll
          }, 20);
      } else {
          if (scrollInterval.current) clearInterval(scrollInterval.current);
      }
      return () => { if (scrollInterval.current) clearInterval(scrollInterval.current); };
  }, [autoScroll]);

  const handleDownload = async (chapter: MangaChapter) => {
      if (downloadingId) return;
      setDownloadingId(chapter.id);
      try {
          const service = chapter.source === 'hook' ? mangahookService : mangadexService;
          const imgs = chapter.source === 'hook' ? await mangahookService.getPages(chapter.id) : await mangadexService.getChapterPages(chapter.id);
          
          await db.chapters.add({
              id: chapter.id,
              mangaId: activeManga?.animeId || 0,
              title: chapter.title || `Chapter ${chapter.chapter}`,
              pages: imgs,
              timestamp: Date.now()
          });
          setOfflineIds(prev => [...prev, chapter.id]);
          showToast("Chapter saved for offline!", "success");
      } catch (e) {
          showToast("Download failed", "error");
      } finally {
          setDownloadingId(null);
      }
  };

  const openChapter = async (ch: any) => {
      setPages([]);
      const offline = await db.chapters.get(ch.id);
      if (offline) {
          setPages(offline.pages);
          setCurrentChapter(ch);
          setViewMode('READING');
          showToast("Reading from local storage", "info");
      } else {
          setCurrentChapter(ch);
          setViewMode('READING');
          try {
              let imgs: string[] = [];
              if (Array.isArray(ch.pages) && ch.pages.length > 0) {
                  // Manual chapter with direct pages
                  imgs = ch.pages;
              } else {
                  // Fetch from API
                  if (ch.source === 'hook') {
                      imgs = await mangahookService.getPages(ch.id);
                  } else {
                      // Default to MangaDex
                      imgs = await mangadexService.getChapterPages(ch.id);
                  }
              }
              
              if (imgs.length === 0) throw new Error("No pages found");
              setPages(imgs);
              
              const auth = firebaseService.getAuthInstance();
              if (auth.currentUser) {
                  await firebaseService.awardXP(auth.currentUser.uid, 30, 'chapter');
              }
          } catch (e) {
              console.error(e);
              showToast("Failed to load pages", "error");
          }
      }
  };

  const handleDubPage = async (pageUrl: string) => {
      if (dubLoading) return;
      setDubLoading(true);
      showToast("AI is reading the page...", "info");
      
      try {
          const base64 = await urlToBase64(pageUrl);
          const lines = await aiService.analyzeMangaPage(base64);
          
          if (lines.length === 0) {
              showToast("No dialogue detected.", "info");
          } else {
              speakLines(lines);
          }
      } catch (e) {
          console.error(e);
          showToast("Failed to dub page.", "error");
      } finally {
          setDubLoading(false);
      }
  };

  const urlToBase64 = async (url: string) => {
      // Use corsproxy for fetching image to convert to base64 if needed, 
      // or handle cross-origin constraints.
      // For now, simple fetch assuming CORS or local proxy availability.
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
      });
  };

  const speakLines = (lines: {text: string, speaker: string, gender: string}[]) => {
      let index = 0;
      const playNext = () => {
          if (index >= lines.length) return;
          const line = lines[index];
          const utter = new SpeechSynthesisUtterance(line.text);
          const voices = window.speechSynthesis.getVoices();
          if (line.gender === 'Female') utter.voice = voices.find(v => v.name.includes('Female')) || null;
          else if (line.gender === 'Male') utter.voice = voices.find(v => v.name.includes('Male')) || null;
          if (line.gender === 'Female') utter.pitch = 1.2;
          if (line.gender === 'Male') utter.pitch = 0.9;
          utter.onend = () => { index++; playNext(); };
          window.speechSynthesis.speak(utter);
      };
      playNext();
  };

  const getRenderedPages = () => {
      if (!doublePage) return pages.map(p => [p]);
      const chunks = [];
      for (let i = 0; i < pages.length; i += 2) {
          const chunk = [pages[i], pages[i + 1]].filter(Boolean);
          // If RTL, swap order for display so visual [Left][Right] becomes [Page N+1][Page N]
          // Actually standard reading is [Page N][Page N-1] in visual order if your eyes go Right to Left.
          // But web flex-row is Left to Right. 
          // If RTL, we want [Page Next] [Page Curr] so Page Curr is on Right? 
          // Standard Manga: Page 1 is on the Right. Page 2 is on the Left.
          // So chunk [p1, p2] should look like [p2][p1] visually.
          if (settings.reader.direction === 'rtl' && chunk.length === 2) {
              chunks.push([chunk[1], chunk[0]]);
          } else {
              chunks.push(chunk);
          }
      }
      return chunks;
  };

  const getBackgroundColor = () => {
      switch (settings.reader.background) {
          case 'white': return '#ffffff';
          case 'gray': return '#333333';
          default: return '#121212'; // Black
      }
  };

  const getImageStyle = () => {
      const base: React.CSSProperties = { maxHeight: '100vh' };
      if (settings.reader.fit === 'height') {
          base.height = '100vh';
          base.width = 'auto';
      } else if (settings.reader.fit === 'width') {
          base.width = '100%';
          base.height = 'auto';
      } else {
          // Original / Contain
          base.objectFit = 'contain';
      }
      return base;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-8 relative">
        {viewMode === 'CHAPTERS' && (
            <div className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <h2 className="font-bold">Chapters</h2>
                    <span className="text-xs text-slate-500">Total: {chapters.length}</span>
                </div>
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                    {chapters.map(ch => (
                        <div key={ch.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                            <button onClick={() => openChapter(ch)} className="flex-1 text-left">
                                <div className="font-bold text-slate-200">Chapter {ch.chapter}</div>
                                <div className="text-xs text-slate-500">{ch.title}</div>
                            </button>
                            <div className="flex gap-2">
                                {offlineIds.includes(ch.id) ? (
                                    <CloudOff className="w-4 h-4 text-green-500" />
                                ) : (
                                    <button onClick={() => handleDownload(ch)} className="p-2 hover:bg-primary/20 text-primary rounded-lg transition-colors">
                                        {downloadingId === ch.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {viewMode === 'READING' && (
            <div className="animate-fadeIn relative">
                {/* 12. Zen Mode Toggle (Hides Top Bar) */}
                <div className={`fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md z-50 flex justify-between items-center border-t border-white/10 md:sticky md:top-0 md:bottom-auto transition-transform duration-300 ${zenMode ? '-translate-y-full md:-translate-y-full opacity-0 hover:translate-y-0 hover:opacity-100' : 'translate-y-0 opacity-100'}`}>
                    <button onClick={() => { window.speechSynthesis.cancel(); setViewMode('CHAPTERS'); navigate(-1); }} className="flex items-center gap-2 text-slate-300 hover:text-white"><ArrowLeft className="w-5 h-5"/> <span className="hidden md:inline">Back</span></button>
                    <div className="text-sm font-bold text-white truncate max-w-[200px]">{currentChapter?.title || `Chapter ${currentChapter?.chapter}`}</div>
                    
                    <div className="flex gap-2">
                        {/* Auto Scroll Toggle */}
                        <button onClick={() => setAutoScroll(!autoScroll)} className={`p-2 rounded-full ${autoScroll ? 'bg-green-500 text-white animate-pulse' : 'text-slate-300 hover:bg-white/10'}`} title="Auto Scroll">
                            {autoScroll ? <PauseCircle className="w-5 h-5"/> : <PlayCircle className="w-5 h-5"/>}
                        </button>

                        <button onClick={() => setZenMode(!zenMode)} className={`p-2 rounded-full ${zenMode ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/10'}`} title="Zen Mode">
                            <EyeOff className="w-5 h-5" />
                        </button>

                        <button 
                            onClick={() => handleDubPage(pages[currentPageIndex])}
                            disabled={dubLoading}
                            className={`p-2 rounded-full border border-white/10 transition-colors ${dubLoading ? 'bg-purple-600 animate-pulse' : 'bg-dark-800 hover:bg-white/10'}`}
                            title="AI Dub Current Page"
                        >
                            <Mic className={`w-5 h-5 ${dubLoading ? 'text-white' : 'text-purple-400'}`} />
                        </button>

                        <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full ${showSettings ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="fixed bottom-16 right-4 z-50 w-72 bg-dark-800 border border-white/10 rounded-2xl p-4 shadow-2xl animate-slideUp md:top-16 md:bottom-auto max-h-[80vh] overflow-y-auto custom-scrollbar">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Settings className="w-4 h-4"/> Reader Settings</h3>
                        
                        <div className="space-y-6">
                            {/* Layout */}
                            <div>
                                <label className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                                    <span>Pages</span>
                                </label>
                                <div className="flex gap-2 bg-dark-900 p-1 rounded-lg">
                                    <button onClick={() => setDoublePage(false)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold ${!doublePage ? 'bg-primary text-white' : 'text-slate-400'}`}>
                                        <Smartphone className="w-4 h-4" /> Single
                                    </button>
                                    <button onClick={() => setDoublePage(true)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold ${doublePage ? 'bg-primary text-white' : 'text-slate-400'}`}>
                                        <Columns className="w-4 h-4" /> Double
                                    </button>
                                </div>
                            </div>

                            {/* Reading Direction */}
                            <div>
                                <label className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                                    <span>Reading Direction</span>
                                </label>
                                <div className="grid grid-cols-3 gap-1 bg-dark-900 p-1 rounded-lg">
                                    <button onClick={() => updateSettings({ reader: {...settings.reader, direction: 'vertical'} })} className={`flex items-center justify-center py-2 rounded text-[10px] font-bold ${settings.reader.direction === 'vertical' ? 'bg-primary text-white' : 'text-slate-400'}`}>
                                        <ArrowDown className="w-4 h-4" /> Vert
                                    </button>
                                    <button onClick={() => updateSettings({ reader: {...settings.reader, direction: 'ltr'} })} className={`flex items-center justify-center py-2 rounded text-[10px] font-bold ${settings.reader.direction === 'ltr' ? 'bg-primary text-white' : 'text-slate-400'}`}>
                                        <AlignLeft className="w-4 h-4" /> LTR
                                    </button>
                                    <button onClick={() => updateSettings({ reader: {...settings.reader, direction: 'rtl'} })} className={`flex items-center justify-center py-2 rounded text-[10px] font-bold ${settings.reader.direction === 'rtl' ? 'bg-primary text-white' : 'text-slate-400'}`}>
                                        <AlignRight className="w-4 h-4" /> RTL
                                    </button>
                                </div>
                            </div>

                            {/* Image Fit */}
                            <div>
                                <label className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                                    <span>Image Scaling</span>
                                </label>
                                <div className="grid grid-cols-3 gap-1 bg-dark-900 p-1 rounded-lg">
                                    <button onClick={() => updateSettings({ reader: {...settings.reader, fit: 'width'} })} className={`flex items-center justify-center py-2 rounded text-[10px] font-bold ${settings.reader.fit === 'width' ? 'bg-primary text-white' : 'text-slate-400'}`}>
                                        <MoveHorizontal className="w-4 h-4" /> Wid
                                    </button>
                                    <button onClick={() => updateSettings({ reader: {...settings.reader, fit: 'height'} })} className={`flex items-center justify-center py-2 rounded text-[10px] font-bold ${settings.reader.fit === 'height' ? 'bg-primary text-white' : 'text-slate-400'}`}>
                                        <MoveVertical className="w-4 h-4" /> Hei
                                    </button>
                                    <button onClick={() => updateSettings({ reader: {...settings.reader, fit: 'contain'} })} className={`flex items-center justify-center py-2 rounded text-[10px] font-bold ${settings.reader.fit === 'contain' ? 'bg-primary text-white' : 'text-slate-400'}`}>
                                        <Maximize className="w-4 h-4" /> Org
                                    </button>
                                </div>
                            </div>

                            {/* Brightness */}
                            <div>
                                <label className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                                    <span>Brightness ({settings.reader.brightness}%)</span> <Sun className="w-3 h-3"/>
                                </label>
                                <input 
                                    type="range" min="30" max="150" 
                                    value={settings.reader.brightness} 
                                    onChange={e => updateSettings({ reader: {...settings.reader, brightness: Number(e.target.value)} })} 
                                    className="w-full accent-primary h-1.5 bg-dark-900 rounded-lg cursor-pointer" 
                                />
                            </div>

                            {/* Background Color */}
                            <div>
                                <label className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                                    <span>Background</span>
                                </label>
                                <div className="flex gap-2">
                                    {['black', 'gray', 'white'].map(bg => (
                                        <button 
                                            key={bg}
                                            onClick={() => updateSettings({ reader: {...settings.reader, background: bg as 'white' | 'black' | 'gray'} })}
                                            className={`w-8 h-8 rounded-full border-2 ${settings.reader.background === bg ? 'border-primary scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: bg === 'white' ? '#fff' : bg === 'gray' ? '#333' : '#121212' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pages Container */}
                <div 
                    className={`flex flex-col items-center gap-2 min-h-screen py-4 ${doublePage ? 'px-4' : ''}`} 
                    style={{
                        backgroundColor: getBackgroundColor(),
                        filter: `brightness(${settings.reader.brightness}%)`
                    }}
                >
                    {pages.length > 0 ? (
                        getRenderedPages().map((chunk, i) => (
                            <div 
                                key={i} 
                                className={`flex justify-center shadow-2xl relative ${doublePage ? 'max-w-screen-xl w-full' : 'max-w-2xl w-full'}`}
                            >
                                {chunk.map((src, idx) => (
                                    <div key={`${i}-${idx}`} className={`relative ${doublePage ? 'w-1/2' : 'w-full'}`}>
                                        <img 
                                            src={src} 
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                            className="transition-all duration-300"
                                            style={getImageStyle()}
                                            onMouseEnter={() => setCurrentPageIndex((i * (doublePage ? 2 : 1)) + idx)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p>Loading Pages...</p>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default Reader;
