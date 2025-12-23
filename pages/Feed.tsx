
import React, { useEffect, useState } from 'react';
import { anilistService } from '../services/anilist';
import { Activity } from '../types';
import { Link } from 'react-router-dom';
import { Activity as ActivityIcon } from 'lucide-react';

const Feed: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const data = await anilistService.getGlobalActivity();
        setActivities(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  if (loading) return <div className="text-center py-20">Loading activity feed...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <ActivityIcon className="text-primary" />
        <h1 className="text-2xl font-bold">Global Activity</h1>
      </div>

      <div className="space-y-4">
        {activities.map(act => (
          <div key={act.id} className="bg-dark-800 p-4 rounded-xl border border-white/5 flex gap-4">
            <img src={act.user.avatar.medium} alt="" className="w-12 h-12 rounded-full" />
            <div className="flex-1">
              <div className="text-sm">
                <span className="font-bold text-primary">{act.user.name}</span>
                <span className="text-slate-400 mx-2">{act.status} {act.progress && `episode ${act.progress} of`}</span>
                <Link to={`/anime/${act.media.id}`} className="font-bold hover:underline">
                  {act.media.title.romaji}
                </Link>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(act.createdAt * 1000).toLocaleString()}
              </div>
            </div>
            <Link to={`/anime/${act.media.id}`} className="w-12 h-16 rounded overflow-hidden flex-shrink-0">
               <img src={act.media.coverImage.medium} alt="" className="w-full h-full object-cover" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;