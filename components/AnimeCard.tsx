
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, Plus, Heart, X, Book, PlayCircle, Share2, Check, Clock } from 'lucide-react';
import { Anime } from '../types';
import LazyImage from './LazyImage';
import { firebaseService } from '../services/firebase';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

interface AnimeCardProps {
  anime: Anime;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime }) => {
  const [showMenu, setShowMenu] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();
  const { settings } = useSettings();

  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
        setShowMenu(true);
        if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }
  };

  const quickAction = async (action: string) => {
      const auth = firebaseService.getAuthInstance();
      const user = auth.currentUser;
      
      if (action === 'share') {
          const url = `${window.location.origin}/#/${anime.type === 'MANGA' ? 'manga' : 'anime'}/${anime.id}`;
          navigator.clipboard.writeText(url);
          showToast("Link copied to clipboard!", "success");
          setShowMenu(false);
          return;
      }

      if (!user) {
          showToast("Login required", "error");
          setShowMenu(false);
          return;
      }

      if (action === 'favorite') {
          await firebaseService.toggleFavorite(user.uid, anime.id, true, anime.type);
          showToast("Added to favorites!", "success");
      } else {
          // List Status Actions
          let status: any = 'WATCHING';
          let message = 'Added to list';
          
          if (action === 'list') { 
              status = anime.type === 'MANGA' ? 'READING' : 'WATCHING';
              message = 'Added to Watching (+50 XP)';
          } else if (action === 'planning') {
              status = 'PLANNING';
              message = 'Added to Planning (+50 XP)';
          } else if (action === 'completed') {
              status = 'COMPLETED';
              message = 'Marked as Completed (+50 XP)';
          }

          await firebaseService.updateUserAnimeEntry(user.uid, {
            animeId: anime.id,
            status: status,
            score: 0,
            progress: 0,
            priority: 'MEDIUM',
            rewatchCount: 0,
            notes: '',
            private: false,
            updatedAt: Date.now(),
            title: anime.title.english || anime.title.romaji,
            image: anime.coverImage.medium,
            genres: anime.genres,
            type: anime.type
          });
           showToast(message, "success");
           firebaseService.awardXP(user.uid, 50);
      }
      setShowMenu(false);
  };

  const linkPath = anime.type === 'MANGA' ? `/manga/${anime.id}` : `/anime/${anime.id}`;
  const actions = settings.quickActions || ['list', 'favorite'];

  return (
    <div 
        className="relative w-full perspective-1000"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
    >
        <Link 
        to={linkPath}
        className="group flex flex-col gap-2 w-full transition-all duration-300 transform-gpu hover:-translate-y-2 hover:rotate-1"
        >
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-dark-800 shadow-xl group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all">
            {/* Image */}
            <LazyImage 
            src={anime.coverImage.large} 
            alt={anime.title.english || anime.title.romaji} 
            className="w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out"
            />
            
            {/* Gloss Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ backgroundSize: '200% 200%' }}></div>

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Type Badge */}
            {anime.type === 'MANGA' && (
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-bold text-white shadow-sm border border-white/10">
                    <Book className="w-3 h-3" />
                </div>
            )}

            {/* Score Badge */}
            {anime.averageScore && (
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-bold text-yellow-400 shadow-sm border border-white/10">
                <Star className="w-3 h-3 fill-yellow-400" />
                <span>{anime.averageScore}%</span>
            </div>
            )}

            {/* Hover Actions */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300 delay-75">
                    <PlayCircle className="w-6 h-6 text-white fill-current" />
                </div>
            </div>
        </div>

        <div className="px-1">
            <h3 className="font-display font-semibold text-slate-100 line-clamp-2 text-sm leading-tight group-hover:text-primary transition-colors">
            {anime.title.english || anime.title.romaji}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
            <span>{anime.seasonYear || 'TBA'}</span>
            <span>•</span>
            <span className={`capitalize ${anime.status === 'RELEASING' ? 'text-green-400' : ''}`}>
                {(anime.status || '').replace(/_/g, ' ').toLowerCase()}
            </span>
            </div>
        </div>
        </Link>

        {/* Quick Action Menu */}
        {showMenu && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 rounded-xl backdrop-blur-sm animate-fadeIn">
                <div className="flex flex-col gap-2 p-4 w-full">
                     {actions.map(action => (
                         <button key={action} onClick={() => quickAction(action)} className="bg-dark-800 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg border border-white/10 hover:bg-white/10 transition-colors">
                             {action === 'list' && <><Plus className="w-4 h-4"/> Quick Add</>}
                             {action === 'favorite' && <><Heart className="w-4 h-4 text-pink-500"/> Favorite</>}
                             {action === 'share' && <><Share2 className="w-4 h-4"/> Share</>}
                             {action === 'planning' && <><Clock className="w-4 h-4 text-blue-400"/> Plan to Watch</>}
                             {action === 'completed' && <><Check className="w-4 h-4 text-green-400"/> Completed</>}
                         </button>
                     ))}
                     <button onClick={() => setShowMenu(false)} className="bg-white/10 text-slate-300 py-2 rounded-lg font-bold text-sm mt-1">Cancel</button>
                </div>
            </div>
        )}
    </div>
  );
};

export default AnimeCard;
