
import React, { useEffect, useState } from 'react';
import { db, HistoryEntry } from '../services/db';
import { Anime } from '../types';
import AnimeCard from '../components/AnimeCard';
import { History as HistoryIcon, Trash2, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const History: React.FC = () => {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchHistory = async () => {
    setLoading(true);
    try {
        // Fetch ordered by timestamp descending
        const data = await db.history.orderBy('timestamp').reverse().toArray();
        setItems(data);
    } catch (e) {
        console.error("Failed to load history", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const clearHistory = async () => {
      if (!confirm("Are you sure you want to clear your entire history?")) return;
      await db.history.clear();
      setItems([]);
      showToast("History cleared", "success");
  };

  // Helper to convert HistoryEntry to Anime type for the card component
  const mapToAnime = (entry: HistoryEntry): Anime => ({
      id: entry.mediaId,
      type: entry.type,
      title: entry.title,
      coverImage: { large: entry.coverImage, medium: entry.coverImage }, // Reuse image
      bannerImage: entry.bannerImage,
      description: '',
      averageScore: 0,
      popularity: 0,
      favourites: 0,
      genres: [],
      startDate: { year: 0, month: 0, day: 0 },
      format: entry.format,
      status: entry.status
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                    <HistoryIcon className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-display font-bold">History</h1>
                    <p className="text-slate-400">Recently visited anime and manga.</p>
                </div>
            </div>
            
            {items.length > 0 && (
                <button 
                    onClick={clearHistory}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-bold text-sm"
                >
                    <Trash2 className="w-4 h-4" /> Clear All
                </button>
            )}
        </div>

        {loading ? (
            <div className="text-center py-20 text-slate-500">Loading history...</div>
        ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 opacity-50">
                <Clock className="w-16 h-16 mb-4" />
                <p className="text-lg">No history found.</p>
                <p className="text-sm">Visit some pages to populate this list!</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {items.map(item => (
                    <div key={item.id} className="relative group">
                        <AnimeCard anime={mapToAnime(item)} />
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md">
                            {new Date(item.timestamp).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default History;
