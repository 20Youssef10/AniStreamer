
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebase';
import { UserListEntry } from '../types';
import LazyImage from '../components/LazyImage';
import { GripVertical, Download, Save, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Simple Tier Definitions
const TIERS = [
  { id: 'S', color: 'bg-red-500', label: 'S' },
  { id: 'A', color: 'bg-orange-500', label: 'A' },
  { id: 'B', color: 'bg-yellow-500', label: 'B' },
  { id: 'C', color: 'bg-green-500', label: 'C' },
  { id: 'D', color: 'bg-blue-500', label: 'D' },
];

const TierList: React.FC = () => {
  const [items, setItems] = useState<UserListEntry[]>([]);
  const [placements, setPlacements] = useState<Record<string, UserListEntry[]>>({
      'S': [], 'A': [], 'B': [], 'C': [], 'D': [], 'pool': []
  });
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<UserListEntry | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchList = async () => {
        const auth = firebaseService.getAuthInstance();
        if (!auth.currentUser) return;
        const list = await firebaseService.getUserAnimeList(auth.currentUser.uid);
        // Filter mainly completed or watching
        const pool = list.filter(e => e.status === 'COMPLETED' || e.status === 'WATCHING').slice(0, 50); 
        setPlacements(prev => ({ ...prev, pool }));
        setLoading(false);
    };
    fetchList();
  }, []);

  const handleDragStart = (e: React.DragEvent, item: UserListEntry, sourceTier: string) => {
      setDraggedItem(item);
      e.dataTransfer.setData('sourceTier', sourceTier);
      e.dataTransfer.setData('itemId', item.animeId.toString());
  };

  const handleDrop = (e: React.DragEvent, targetTier: string) => {
      e.preventDefault();
      const sourceTier = e.dataTransfer.getData('sourceTier');
      if (!draggedItem) return;

      // Remove from source
      const newSourceList = placements[sourceTier].filter(i => i.animeId !== draggedItem.animeId);
      // Add to target
      const newTargetList = [...placements[targetTier], draggedItem];

      setPlacements(prev => ({
          ...prev,
          [sourceTier]: newSourceList,
          [targetTier]: newTargetList
      }));
      setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  if (loading) return <div className="text-center py-20">Loading your anime list...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-display font-bold">Tier List Maker</h1>
                <p className="text-slate-400">Rank your favorites.</p>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-primary px-4 py-2 rounded-lg font-bold text-white">
                <Download className="w-4 h-4" /> Save / Print
            </button>
        </div>

        {/* Tiers */}
        <div className="space-y-2 bg-dark-900 p-4 rounded-xl border border-white/5" id="tier-list-export">
            {TIERS.map(tier => (
                <div key={tier.id} className="flex min-h-[100px] border-b border-white/5 last:border-0">
                    <div className={`${tier.color} w-24 flex items-center justify-center text-3xl font-black text-black/50 p-4 rounded-l-lg shrink-0`}>
                        {tier.label}
                    </div>
                    <div 
                        className="flex-1 bg-dark-800 flex flex-wrap gap-2 p-2 rounded-r-lg transition-colors hover:bg-dark-700/50"
                        onDrop={(e) => handleDrop(e, tier.id)}
                        onDragOver={handleDragOver}
                    >
                        {placements[tier.id].map(item => (
                            <div 
                                key={item.animeId}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item, tier.id)}
                                className="w-16 h-24 relative group cursor-grab active:cursor-grabbing"
                            >
                                <LazyImage src={item.image || ''} alt={item.title || ''} className="w-full h-full object-cover rounded shadow-md pointer-events-none" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        {/* Pool */}
        <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Unranked Pool
            </h3>
            <div 
                className="flex flex-wrap gap-3 min-h-[100px]"
                onDrop={(e) => handleDrop(e, 'pool')}
                onDragOver={handleDragOver}
            >
                {placements['pool'].length === 0 && <p className="text-slate-500 text-sm">All items ranked!</p>}
                {placements['pool'].map(item => (
                    <div 
                        key={item.animeId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item, 'pool')}
                        className="w-20 h-28 relative group cursor-grab active:cursor-grabbing transition-transform hover:scale-105"
                        title={item.title}
                    >
                        <LazyImage src={item.image || ''} alt={item.title || ''} className="w-full h-full object-cover rounded-lg shadow-md pointer-events-none" />
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default TierList;
