
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, Home, User, LogOut, Menu, X, Camera, Smile, Shuffle, Moon, Sun, 
  Settings, Calendar, Gamepad2, Newspaper, Image, RefreshCw, Book, 
  BarChart2, Brain, Box, Users, Radio, GitCompare, Code, Activity, MoreHorizontal, ChevronDown, Tv, ShieldAlert, Bell, AtSign, Layers, Timer, Cake, MessageCircle, BarChart, BookOpen, Mic, Trophy, Globe, Sparkles, Zap, Clock, Info, Music, Sword, Lock, ArrowUp, Keyboard, Wifi, Quote
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useBranding } from '../context/BrandingContext';
import { firebaseService } from '../services/firebase';
import { anilistService } from '../services/anilist';
import { t } from '../services/i18n';
import NotificationPanel from './NotificationPanel';
import { FeatureLockConfig } from '../types';
import ShortcutsModal from './ShortcutsModal';
import confetti from 'canvas-confetti';

export interface LayoutProps {
  children: React.ReactNode;
  user: any;
}

export const MentionInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  singleLine?: boolean;
  onSubmit?: () => void;
  id?: string;
}> = ({ value, onChange, placeholder, className, singleLine, onSubmit, id }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onSubmit) onSubmit();
    }
  };

  if (singleLine) {
    return (
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <textarea
      id={id}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
};

const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [listening, setListening] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // New Features State
  const [scrollProgress, setScrollProgress] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [konamiIndex, setKonamiIndex] = useState(0);
  
  // Feature Locks
  const [featureLocks, setFeatureLocks] = useState<FeatureLockConfig>({});
  const [userLevel, setUserLevel] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { settings, updateSettings } = useSettings();
  const { branding } = useBranding();
  const { showToast } = useToast();
  const isDark = settings.theme === 'dark';

  const navigate = useNavigate();
  const location = useLocation();
  const touchStartY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  useEffect(() => {
      // Subscribe to system config for locks
      const fetchSys = async () => {
          const sys = await firebaseService.getSystemConfig();
          if (sys?.featureLocks) setFeatureLocks(sys.featureLocks);
      };
      fetchSys();

      if (user) {
          const unsub = firebaseService.subscribeToNotifications(user.uid, (notifs) => {
              setUnreadCount(notifs.filter(n => !n.read).length);
          });
          // Also fetch user level & admin status
          firebaseService.getUserData(user.uid).then(p => {
              if (p) {
                  setUserLevel(p.level);
                  const isMaster = user.email === 'youssef2010.mahmoud@gmail.com';
                  setIsAdmin(p.isAdmin || isMaster);
              }
          });
          return () => unsub();
      }
  }, [user]);

  // Scroll Progress & Scroll Top Logic
  useEffect(() => {
      const handleScroll = () => {
          const totalScroll = document.documentElement.scrollTop;
          const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          const scroll = `${totalScroll / windowHeight}`;
          setScrollProgress(Number(scroll));
          setShowScrollTop(totalScroll > 400);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Session Timer
  useEffect(() => {
      const timer = setInterval(() => {
          setSessionTime(prev => prev + 1);
      }, 60000); // Update every minute
      return () => clearInterval(timer);
  }, []);

  // Global Keyboard Listeners (Shortcuts + Konami)
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Ignore inputs
          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

          // Shortcuts
          if (e.key === '?') {
              setShowShortcuts(prev => !prev);
          }

          // Konami Code
          if (e.key === KONAMI_CODE[konamiIndex]) {
              const nextIndex = konamiIndex + 1;
              if (nextIndex === KONAMI_CODE.length) {
                  // Trigger Konami
                  confetti({
                      particleCount: 200,
                      spread: 100,
                      origin: { y: 0.6 }
                  });
                  showToast("Secret Mode Activated! 🎮", "success");
                  document.documentElement.classList.add('animate-spin-slow'); // Easter egg effect
                  setTimeout(() => document.documentElement.classList.remove('animate-spin-slow'), 5000);
                  setKonamiIndex(0);
              } else {
                  setKonamiIndex(nextIndex);
              }
          } else {
              setKonamiIndex(0);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiIndex]);

  // Voice Navigation Implementation (unchanged)
  const startVoiceNav = () => { 
      // ... (existing implementation)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          showToast("Voice navigation not supported in this browser", "error");
          return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      setListening(true);
      showToast("Listening...", "info");

      recognition.onresult = (event: any) => {
          if (event.results && event.results[0] && event.results[0][0]) {
              const command = event.results[0][0].transcript.toLowerCase().trim();
              setListening(false);
              showToast(`Heard: "${command}"`, "success");
              // Basic nav logic
              navigate(`/search?q=${encodeURIComponent(command)}`);
          } else {
              setListening(false);
          }
      };
      recognition.start();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    await firebaseService.logout();
    navigate('/login');
  };

  const handleRandom = async () => { 
      setRefreshing(true);
      try {
          const id = await anilistService.getRandomAnimeId();
          navigate(`/anime/${id}`);
          showToast("Found a random anime!", "success");
      } catch (e) {
          showToast("Failed to fetch random anime", "error");
      } finally {
          setRefreshing(false);
      }
  };

  const isLocked = (featureId: string) => {
      if (isAdmin) return false; // Admin bypass
      const lock = featureLocks[featureId];
      if (!lock) return false;
      
      // If locked is true, check level requirements. If no level req, it's totally locked.
      if (lock.locked) {
          if (lock.minLevel > 0) {
              return userLevel < lock.minLevel;
          }
          return true;
      }
      return false;
  };

  const allNavItems = [
    { id: 'home', label: t('home', settings.language), path: '/', icon: Home, category: 'main' },
    { id: 'anime', label: 'Anime', path: '/anime', icon: Tv, category: 'main' },
    { id: 'ai_studio', label: 'AI Studio', path: '/ai-studio', icon: Sparkles, category: 'main' },
    { id: 'manga', label: 'Manga', path: '/search?type=MANGA', icon: Book, category: 'main' },
    { id: 'isekai', label: 'Isekai RPG', path: '/isekai', icon: Sword, category: 'main' },
    { id: 'music', label: 'Music', path: '/media?tab=music', icon: Music, category: 'main' },
    { id: 'upcoming', label: 'Coming Soon', path: '/upcoming', icon: Clock, category: 'main' },
    { id: 'news', label: 'News', path: '/news', icon: Newspaper, category: 'main' },
    { id: 'feed', label: 'Feed', path: '/feed', icon: Activity, category: 'social' },
    { id: 'community', label: 'Community', path: '/community', icon: Users, category: 'social' },
    { id: 'chat', label: 'Global Chat', path: '/chat', icon: MessageCircle, category: 'social' },
    { id: 'party', label: 'Watch Party', path: '/party', icon: Radio, category: 'social' },
    { id: 'calendar', label: 'Calendar', path: '/calendar', icon: Calendar, category: 'tools' },
    { id: 'focus', label: 'Focus Dojo', path: '/focus', icon: Timer, category: 'tools' },
    { id: 'ranking', label: 'Global Rank', path: '/ranking', icon: Globe, category: 'tools' },
    { id: 'top_chars', label: 'Top Characters', path: '/top-characters', icon: Trophy, category: 'tools' },
    { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: BarChart, category: 'tools' },
    { id: 'reader', label: 'Manga Reader', path: '/reader', icon: BookOpen, category: 'tools' },
    { id: 'games', label: 'Games', path: '/games', icon: Gamepad2, category: 'tools' },
    { id: 'media', label: 'Media', path: '/media', icon: Image, category: 'tools' },
    { id: 'compare', label: 'Compare', path: '/compare', icon: GitCompare, category: 'tools' },
    { id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart2, category: 'tools' },
    { id: 'identify', label: 'Identify', path: '/identify', icon: Camera, category: 'ai' },
    { id: 'ar', label: t('arHub', settings.language), path: '/ar', icon: Box, category: 'ai' },
    { id: 'about', label: 'About Us', path: '/about', icon: Info, category: 'main' },
    // New Feature Links
    { id: 'speed', label: 'Speed Test', path: '/speed-test', icon: Wifi, category: 'tools' },
    { id: 'quotes', label: 'Quotes', path: '/quotes', icon: Quote, category: 'tools' },
  ];

  if (isAdmin) {
      allNavItems.push({ id: 'admin', label: 'Admin', path: '/admin', icon: ShieldAlert, category: 'admin' });
  }

  // Filter visible items
  const accessibleItems = allNavItems.map(item => ({
      ...item,
      locked: isLocked(item.id)
  }));

  const desktopVisibleItems = accessibleItems.slice(0, 6);
  const desktopHiddenItems = accessibleItems.slice(6);

  const mobileNavItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Anime', path: '/anime', icon: Tv },
    { label: 'AI', path: '/ai-studio', icon: Sparkles },
    { label: 'Profile', path: user ? '/profile' : '/login', icon: User },
    { label: 'Menu', action: () => setIsMobileMenuOpen(true), icon: Menu },
  ];

  return (
    <div 
        className={`min-h-screen font-sans transition-colors duration-300 flex flex-col ${isDark ? 'bg-dark-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
        style={settings.backgroundImage ? { backgroundColor: 'rgba(15, 23, 42, 0.9)' } : {}}
    >
      {/* 1. Scroll Progress Bar */}
      <div className="fixed top-0 left-0 h-1 bg-primary z-[60] transition-all duration-100" style={{ width: `${scrollProgress * 100}%` }}></div>

      {/* Navbar */}
      <nav className={`hidden md:block sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${isDark ? 'bg-dark-900/80 border-white/10' : 'bg-white/80 border-slate-200'}`}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            <img src={branding.logoUrl} alt={branding.appName} className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform object-cover" />
            <span className={`font-display font-bold text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{branding.appName}</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8 relative flex items-center gap-2">
            <div className="relative w-full">
                <input
                type="text"
                placeholder={t('search', settings.language) + "..."}
                className={`w-full border rounded-full py-2 px-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${isDark ? 'bg-dark-800 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>
            <button type="button" onClick={startVoiceNav} className={`p-2 rounded-full hover:bg-dark-700 transition-colors border border-white/10 ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-dark-800 text-slate-400'}`}>
                <Mic className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-2">
            {/* 2. Session Timer Display (Subtle) */}
            <div className="text-xs text-slate-500 font-mono hidden lg:block mr-2" title="Session Time">
                {Math.floor(sessionTime / 60)}h {sessionTime % 60}m
            </div>

            <button onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })} className="p-2 text-slate-400 hover:text-primary transition-colors">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {user && (
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-primary transition-colors relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-dark-900"></div>}
                </button>
            )}

            <button onClick={handleRandom} className={`p-2 text-slate-400 hover:text-primary transition-colors ${refreshing ? 'animate-spin' : ''}`} title="Surprise Me"><Shuffle className="w-5 h-5" /></button>
            <Link to="/settings" className="p-2 text-slate-400 hover:text-primary transition-colors"><Settings className="w-5 h-5" /></Link>

            <div className="h-6 w-px bg-white/10 mx-2" />

            {desktopVisibleItems.map((item) => {
              const Icon = item.icon;
              return item.locked ? (
                  <div key={item.id} className="p-2 text-slate-600 cursor-not-allowed flex items-center relative group" title={`Locked! Needs Lvl ${featureLocks[item.id]?.minLevel}`}>
                      <Icon className="w-5 h-5 opacity-50" />
                      <Lock className="w-3 h-3 absolute top-1 right-1 text-red-500" />
                  </div>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`p-2 transition-colors ${location.pathname === item.path || (location.pathname + location.search) === item.path ? 'text-primary' : 'text-slate-400 hover:text-white'}`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })}

            <div className="relative" ref={moreMenuRef}>
              <button onClick={() => setShowMoreMenu(!showMoreMenu)} className={`p-2 transition-colors flex items-center gap-1 ${showMoreMenu ? 'text-primary' : 'text-slate-400 hover:text-white'}`}>
                <MoreHorizontal className="w-5 h-5" />
                <ChevronDown className={`w-3 h-3 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-dark-800 border border-white/10 rounded-xl shadow-xl overflow-hidden animate-fadeIn z-50">
                  <div className="py-1 max-h-96 overflow-y-auto custom-scrollbar">
                    {desktopHiddenItems.map((item) => {
                      const Icon = item.icon;
                      if (item.locked) {
                          return (
                              <div key={item.id} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 cursor-not-allowed bg-dark-900/50">
                                  <Icon className="w-4 h-4" />
                                  <span>{item.label} <span className="text-[10px] ml-1 text-red-500">(Lvl {featureLocks[item.id]?.minLevel})</span></span>
                                  <Lock className="w-3 h-3 ml-auto text-red-500" />
                              </div>
                          )
                      }
                      return (
                        <Link key={item.path} to={item.path} onClick={() => setShowMoreMenu(false)} className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${item.path === '/admin' ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                          <Icon className="w-4 h-4 text-primary" />
                          {item.label}
                        </Link>
                      );
                    })}
                    {/* Shortcuts Trigger in Menu */}
                    <button onClick={() => { setShowShortcuts(true); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-slate-300 hover:bg-white/5 hover:text-white border-t border-white/5">
                        <Keyboard className="w-4 h-4 text-primary" /> Shortcuts (?)
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-6 w-px bg-white/10 mx-2" />

            {!user ? (
              <Link to="/login" className="px-4 py-2 bg-primary hover:bg-blue-600 rounded-full text-xs font-bold transition-colors text-white">Login</Link>
            ) : (
              <Link to="/profile" className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-white/10">
                      {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-primary" />}
                  </div>
                  <span className="text-xs font-bold text-slate-300 hidden xl:block">{user.displayName?.split(' ')[0]}</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <div className={`md:hidden flex items-center justify-between p-4 sticky top-0 z-40 backdrop-blur-md border-b ${isDark ? 'bg-dark-900/90 border-white/5' : 'bg-white/90 border-slate-200'}`}>
         <Link to="/" className="flex items-center gap-2">
            <img src={branding.logoUrl} alt={branding.appName} className="w-8 h-8 rounded-lg shadow-lg object-cover" />
            <span className="font-display font-bold text-lg">{branding.appName}</span>
         </Link>
         <div className="flex gap-2">
             <button onClick={startVoiceNav} className={`p-2 rounded-full transition-colors ${listening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400'}`}>
                 <Mic className="w-5 h-5" />
             </button>
             {user && (
                 <>
                    <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 relative">
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></div>}
                    </button>
                    <Link to="/party" className="p-2 text-primary bg-primary/10 rounded-full"><Radio className="w-5 h-5" /></Link>
                 </>
             )}
             <button onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })} className="p-2 text-slate-400">
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
         </div>
      </div>

      {user && <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} userId={user.uid} />}
      
      {/* 4. Shortcuts Modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t pb-safe ${isDark ? 'bg-dark-900 border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-around items-center h-16 mobile-safe-bottom">
          {mobileNavItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = item.path && (location.pathname === item.path || (location.pathname + location.search) === item.path);
            return item.action ? (
                <button key={idx} onClick={item.action} className={`flex flex-col items-center gap-1 p-2 ${isMobileMenuOpen ? 'text-primary' : 'text-slate-400'}`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-[10px]">{item.label}</span>
                </button>
            ) : (
                <Link key={idx} to={item.path!} onClick={() => setIsMobileMenuOpen(false)} className={`flex flex-col items-center gap-1 p-2 ${isActive && !isMobileMenuOpen ? 'text-primary' : 'text-slate-400'}`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-[10px]">{item.label}</span>
                </Link>
            );
          })}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className={`fixed inset-0 z-[60] pt-20 px-4 md:hidden animate-fadeIn pb-24 overflow-y-auto ${isDark ? 'bg-dark-900' : 'bg-white'}`}>
           <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
          <form onSubmit={handleSearch} className="mb-6 relative">
            <input type="text" placeholder="Search anything..." className={`w-full p-3 rounded-lg px-10 ${isDark ? 'bg-dark-800 text-white' : 'bg-slate-100 text-black'}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
          </form>
          <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                 {accessibleItems.map((item) => (
                    item.locked ? (
                        <div key={item.id} className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl aspect-square border bg-dark-800/50 border-white/5 opacity-50 relative">
                            <item.icon className="w-8 h-8 text-slate-500" />
                            <span className="font-bold text-xs text-center text-slate-500">{item.label}</span>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                                <Lock className="w-6 h-6 text-red-500" />
                            </div>
                        </div>
                    ) : (
                        <Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl aspect-square border ${isDark ? 'bg-dark-800 border-white/5 hover:bg-dark-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'} ${item.path === '/admin' ? 'border-yellow-500/20 bg-yellow-500/5' : ''}`}>
                            <item.icon className={`w-8 h-8 ${location.pathname === item.path || (location.pathname + location.search) === item.path ? 'text-primary' : (item.path === '/admin' ? 'text-yellow-500' : 'text-slate-400')}`} />
                            <span className={`font-bold text-xs text-center ${item.path === '/admin' ? 'text-yellow-500' : ''}`}>{item.label}</span>
                        </Link>
                    )
                 ))}
              </div>
              <div className="p-4 bg-dark-800 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between mb-4"><span className="font-bold text-slate-400">Settings & Account</span></div>
                  <div className="grid grid-cols-2 gap-4">
                      <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 bg-dark-900 rounded-xl"><Settings className="w-5 h-5 text-slate-400" /><span className="text-sm font-bold">Settings</span></Link>
                      {user ? <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-3 bg-red-500/10 text-red-500 rounded-xl"><LogOut className="w-5 h-5" /><span className="text-sm font-bold">Sign Out</span></button> : <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 bg-primary/10 text-primary rounded-xl"><User className="w-5 h-5" /><span className="text-sm font-bold">Sign In</span></Link>}
                  </div>
              </div>
          </div>
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
          <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-24 right-4 md:bottom-8 z-30 p-3 bg-primary text-white rounded-full shadow-lg border border-white/10 hover:bg-blue-600 transition-all animate-bounce"
              title="Return to Top"
          >
              <ArrowUp className="w-6 h-6" />
          </button>
      )}

      <main className="container mx-auto px-4 py-6 md:py-8 flex-1 pb-24 md:pb-8" ref={contentRef}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
