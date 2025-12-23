
import React, { useState, useEffect } from 'react';
import { anilistService } from '../services/anilist';
import { Character } from '../types';
import { Calendar, Gift, Cake } from 'lucide-react';
import LazyImage from '../components/LazyImage';
import { Link } from 'react-router-dom';

const Birthdays: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const data = await anilistService.getBirthdays();
        setCharacters(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBirthdays();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
        <div className="text-center py-8">
            <div className="inline-flex items-center justify-center p-4 bg-pink-500/10 rounded-full mb-4">
                <Cake className="w-8 h-8 text-pink-500" />
            </div>
            <h1 className="text-4xl font-display font-bold">Today's Birthdays</h1>
            <p className="text-slate-400 text-lg">{dateStr}</p>
        </div>

        {loading ? (
            <div className="text-center py-20 text-slate-500">Finding cakes...</div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {characters.map(char => (
                    <Link to={`/character/${char.id}`} key={char.id} className="group relative bg-dark-800 rounded-2xl overflow-hidden border border-white/5 hover:border-pink-500/50 transition-all hover:-translate-y-1">
                        <div className="aspect-[3/4] relative">
                            <LazyImage src={char.image.large} alt={char.name.full} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 bg-pink-500 text-white p-1.5 rounded-full shadow-lg">
                                <Gift className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="p-4 text-center">
                            <h3 className="font-bold truncate text-slate-200 group-hover:text-pink-400 transition-colors">{char.name.full}</h3>
                            <p className="text-xs text-slate-500 truncate">
                                {char.media.nodes[0]?.title.romaji || 'Unknown Anime'}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        )}
        
        {characters.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-500">
                No major character birthdays today.
            </div>
        )}
    </div>
  );
};

export default Birthdays;
