import React, { useState } from 'react';
import { anilistService } from '../services/anilist';
import { Anime } from '../types';
import AnimeCard from '../components/AnimeCard';
import { Smile, Frown, Zap, Heart, CloudLightning, Coffee } from 'lucide-react';

const MOODS = [
  { id: 'happy', label: 'Happy', icon: Smile, color: 'bg-yellow-500', genre: 'Comedy', tag: 'Iyashikei' },
  { id: 'hyped', label: 'Hyped', icon: Zap, color: 'bg-red-500', genre: 'Action', tag: 'Shounen' },
  { id: 'sad', label: 'Melancholy', icon: Frown, color: 'bg-blue-500', genre: 'Drama', tag: 'Tragedy' },
  { id: 'love', label: 'Romantic', icon: Heart, color: 'bg-pink-500', genre: 'Romance', tag: null },
  { id: 'thrill', label: 'Thrilled', icon: CloudLightning, color: 'bg-purple-500', genre: 'Thriller', tag: 'Psychological' },
  { id: 'chill', label: 'Chill', icon: Coffee, color: 'bg-green-500', genre: 'Slice of Life', tag: 'Relaxing' },
];

const MoodSelector: React.FC = () => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  const handleMoodSelect = async (mood: typeof MOODS[0]) => {
    setSelectedMood(mood.id);
    setLoading(true);
    setResults([]);
    try {
      const data = await anilistService.searchAnime({ page: 1, genre: mood.genre }, mood.tag || undefined);
      setResults(data.Page.media);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display font-bold">What's your mood?</h1>
        <p className="text-slate-400">Select a vibe and we'll recommend the perfect anime.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {MOODS.map(mood => (
          <button
            key={mood.id}
            onClick={() => handleMoodSelect(mood)}
            className={`p-6 rounded-2xl flex flex-col items-center gap-4 transition-all hover:scale-105 ${
              selectedMood === mood.id ? 'ring-4 ring-white/20 bg-dark-800' : 'bg-dark-800 hover:bg-dark-700'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${mood.color}`}>
              <mood.icon className="w-6 h-6" />
            </div>
            <span className="font-bold">{mood.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {results.length > 0 && (
        <div className="animate-fadeIn">
           <h2 className="text-2xl font-bold mb-6">Perfect Matches</h2>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {results.map(anime => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default MoodSelector;