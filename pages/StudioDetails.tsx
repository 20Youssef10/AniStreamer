
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { Studio } from '../types';
import AnimeCard from '../components/AnimeCard';
import { Film, Heart, Globe } from 'lucide-react';

const StudioDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom Description
  const [customDescriptions, setCustomDescriptions] = useState<Record<string, string>>({});
  const [selectedLang, setSelectedLang] = useState<string>('original');

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
        try {
            const data = await anilistService.getStudioDetails(parseInt(id));
            setStudio(data);

            const customContent = await firebaseService.getCustomDescription('studio', parseInt(id));
            if (customContent) {
                setCustomDescriptions(customContent);
                if (customContent['ar']) setSelectedLang('ar');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    fetch();
  }, [id]);

  if (loading || !studio) return <div className="p-10 text-center">Loading Studio...</div>;

  const currentDescription = selectedLang === 'original' ? '' : (customDescriptions[selectedLang] || '');

  return (
    <div className="animate-fadeIn space-y-8">
        <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 text-center relative">
            <h1 className="text-4xl font-display font-bold mb-2">{studio.name}</h1>
            <div className="flex justify-center gap-6 text-slate-400 mb-4">
                <span className="flex items-center gap-2"><Film className="w-4 h-4" /> {studio.media.nodes.length} Productions</span>
                <span className="flex items-center gap-2 text-primary"><Heart className="w-4 h-4 fill-current" /> {studio.favourites} Favorites</span>
            </div>

            {Object.keys(customDescriptions).length > 0 && (
                <div className="bg-dark-900/50 p-4 rounded-xl max-w-2xl mx-auto">
                    <div className="flex justify-end mb-2">
                        <div className="flex items-center gap-2 bg-dark-900 rounded-lg p-1 border border-white/10">
                            <Globe className="w-4 h-4 text-slate-400 ml-2" />
                            <select 
                                value={selectedLang} 
                                onChange={(e) => setSelectedLang(e.target.value)}
                                className="bg-transparent text-sm text-slate-300 outline-none border-none p-1 cursor-pointer"
                            >
                                <option value="original">Original (Empty)</option>
                                {Object.keys(customDescriptions).map(lang => (
                                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {currentDescription && (
                        <div 
                            className="prose prose-invert max-w-none text-slate-300 text-sm whitespace-pre-wrap leading-relaxed text-left"
                            dangerouslySetInnerHTML={{ __html: currentDescription }}
                        />
                    )}
                </div>
            )}
        </div>

        <div>
            <h2 className="text-2xl font-bold mb-6">All Productions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {studio.media.nodes.map(media => (
                    <AnimeCard key={media.id} anime={media} />
                ))}
            </div>
        </div>
    </div>
  );
};

export default StudioDetails;
