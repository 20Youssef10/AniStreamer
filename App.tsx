
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { configService } from './services/config';
import { firebaseService } from './services/firebase';
import { aiService } from './services/ai'; // Import aiService
import { setTranslations } from './services/i18n';
import { onAuthStateChanged } from 'firebase/auth';
import { ToastProvider } from './context/ToastContext';
import { PlayerProvider } from './context/PlayerContext';
import { BrandingProvider } from './context/BrandingContext';

import Layout from './components/Layout';
import GlobalPlayer from './components/GlobalPlayer';
import ScrollToTop from './components/ScrollToTop';
import SpotifyCallback from './components/SpotifyCallback';
import AniListCallback from './components/AniListCallback';
import MalCallback from './components/MalCallback';
import Home from './pages/Home';
import AnimePage from './pages/AnimePage'; 
import Search from './pages/Search';
import Calendar from './pages/Calendar';
import Details from './pages/Details';
import MangaDetails from './pages/MangaDetails';
import CharacterDetails from './pages/CharacterDetails';
import StaffDetails from './pages/StaffDetails';
import StudioDetails from './pages/StudioDetails';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Identify from './pages/Identify';
import MoodSelector from './pages/MoodSelector';
import Feed from './pages/Feed';
import Community from './pages/Community';
import WatchParty from './pages/WatchParty';
import Compare from './pages/Compare';
import Settings from './pages/Settings';
import Games from './pages/Games';
import News from './pages/News';
import Media from './pages/Media';
import Developer from './pages/Developer';
import Analytics from './pages/Analytics';
import AIAssistant from './pages/AIAssistant'; 
import AIStudio from './pages/AIStudio'; 
import ARHub from './pages/ARHub';
import AdminDashboard from './pages/AdminDashboard';
import Swiper from './pages/Swiper';
import Pomodoro from './pages/Pomodoro';
import Birthdays from './pages/Birthdays';
import GlobalChat from './pages/GlobalChat';
import TierList from './pages/TierList';
import Leaderboard from './pages/Leaderboard';
import Reader from './pages/Reader';
import TopCharacters from './pages/TopCharacters';
import GlobalRanking from './pages/GlobalRanking';
import ComingSoon from './pages/ComingSoon';
import About from './pages/About';
import Isekai from './pages/Isekai';
import SpeedTest from './pages/SpeedTest';
import Quotes from './pages/Quotes';

const App: React.FC = () => {
  const [init, setInit] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await configService.loadConfig();
        await firebaseService.init();
        
        // Fetch System Config for AI Key & Model
        try {
            const sysConfig = await firebaseService.getSystemConfig();
            if (sysConfig.geminiApiKey) {
                aiService.setApiKey(sysConfig.geminiApiKey);
            }
            if (sysConfig.defaultModel) {
                aiService.setModel(sysConfig.defaultModel);
            }
        } catch (err) {
            console.warn("Failed to load system config:", err);
        }

        // Fetch Translations
        try {
            const translations = await firebaseService.getTranslations();
            if (translations) {
                setTranslations(translations);
            }
        } catch (err) {
            console.warn("Failed to load translations:", err);
        }

        try {
          const auth = firebaseService.getAuthInstance();
          onAuthStateChanged(auth, (currentUser: any) => {
            setUser(currentUser);
            setInit(true);
          });
        } catch (authError) {
          console.warn("Firebase Auth not available:", authError);
          setInit(true);
        }
      } catch (e) {
        console.error("App Initialization Error:", e);
        setInit(true);
      }
    };
    initialize();
  }, []);

  if (!init) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <BrandingProvider>
      <ToastProvider>
        <PlayerProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Layout user={user}>
              <GlobalPlayer />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/anime" element={<AnimePage />} />
                <Route path="/upcoming" element={<ComingSoon />} />
                <Route path="/search" element={<Search />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/games" element={<Games />} />
                <Route path="/news" element={<News />} />
                <Route path="/media" element={<Media />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/ai" element={<AIAssistant />} />
                <Route path="/ai-studio" element={<AIStudio />} />
                <Route path="/ar" element={<ARHub />} />
                <Route path="/swipe" element={<Swiper />} />
                <Route path="/focus" element={<Pomodoro />} />
                <Route path="/birthdays" element={<Birthdays />} />
                <Route path="/chat" element={<GlobalChat />} />
                <Route path="/tierlist" element={<TierList />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/reader" element={<Reader />} />
                <Route path="/top-characters" element={<TopCharacters />} />
                <Route path="/ranking" element={<GlobalRanking />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/about" element={<About />} />
                <Route path="/isekai" element={<Isekai />} />
                <Route path="/speed-test" element={<SpeedTest />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/callback" element={<SpotifyCallback />} /> 
                <Route path="/auth/anilist/callback" element={<AniListCallback />} />
                <Route path="/auth/mal/callback" element={<MalCallback />} />
                <Route path="/anime/:id" element={<Details user={user} />} />
                <Route path="/manga/:id" element={<MangaDetails user={user} />} />
                <Route path="/character/:id" element={<CharacterDetails />} />
                <Route path="/staff/:id" element={<StaffDetails />} />
                <Route path="/studio/:id" element={<StudioDetails />} />
                <Route path="/identify" element={<Identify />} />
                <Route path="/moods" element={<MoodSelector />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/community" element={<Community />} />
                <Route path="/party" element={<WatchParty />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/developer" element={<Developer />} />
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
                <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" replace />} />
                <Route path="/profile/:id" element={<Profile user={user} />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </PlayerProvider>
      </ToastProvider>
    </BrandingProvider>
  );
};

export default App;
