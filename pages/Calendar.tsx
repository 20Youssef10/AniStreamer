
import React, { useEffect, useState } from 'react';
import { anilistService } from '../services/anilist';
import { Link } from 'react-router-dom';
import { Clock, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import LazyImage from '../components/LazyImage';

interface AiringSchedule {
  id: number;
  airingAt: number;
  episode: number;
  media: any;
}

const Calendar: React.FC = () => {
  const [schedule, setSchedule] = useState<AiringSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await anilistService.getWeeklySchedule();
        setSchedule(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Group by Day
  const groupedSchedule: Record<string, AiringSchedule[]> = {};
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Sort by time first
  schedule.sort((a, b) => a.airingAt - b.airingAt);

  schedule.forEach(item => {
      const date = new Date(item.airingAt * 1000);
      const dayName = days[date.getDay()];
      if (!groupedSchedule[dayName]) groupedSchedule[dayName] = [];
      groupedSchedule[dayName].push(item);
  });

  // Reorder days starting from today
  const todayIndex = new Date().getDay();
  const orderedDays = [...days.slice(todayIndex), ...days.slice(0, todayIndex)];

  if (loading) return (
      <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-display font-bold">Airing Schedule</h1>
            <p className="text-slate-400">Simulcasts airing over the next 7 days (Local Time).</p>
          </div>
      </div>

      <div className="space-y-12">
          {orderedDays.map(day => {
              const items = groupedSchedule[day];
              if (!items || items.length === 0) return null;

              return (
                  <div key={day} className="space-y-4">
                      <h2 className="text-xl font-bold border-b border-white/5 pb-2 text-primary">{day}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {items.map(item => {
                              const airingDate = new Date(item.airingAt * 1000);
                              const timeString = airingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              const isAired = Date.now() > item.airingAt * 1000;

                              return (
                                  <Link to={`/anime/${item.media.id}`} key={item.id} className="bg-dark-800 p-3 rounded-xl border border-white/5 hover:border-primary/50 transition-colors flex gap-3 group">
                                      <LazyImage src={item.media.coverImage.medium} alt="" className="w-16 h-20 object-cover rounded" />
                                      <div className="flex-1 overflow-hidden">
                                          <div className="flex justify-between items-start">
                                              <span className="text-xs font-bold text-slate-400 bg-dark-900 px-2 py-0.5 rounded flex items-center gap-1">
                                                  <Clock className="w-3 h-3" /> {timeString}
                                              </span>
                                              <span className="text-xs font-bold text-primary">Ep {item.episode}</span>
                                          </div>
                                          <h3 className="font-semibold text-sm truncate mt-1 group-hover:text-primary transition-colors">
                                              {item.media.title.english || item.media.title.romaji}
                                          </h3>
                                          <div className="text-xs text-slate-500 mt-1 truncate">
                                              {item.media.genres.slice(0, 2).join(', ')}
                                          </div>
                                      </div>
                                  </Link>
                              )
                          })}
                      </div>
                  </div>
              )
          })}
      </div>
    </div>
  );
};

export default Calendar;
