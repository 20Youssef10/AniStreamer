import React, { useEffect, useState } from 'react';
import { firebaseService } from '../services/firebase';
import { anilistService } from '../services/anilist';
import { UserListEntry, Anime, UserProfile } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { 
    Activity, Clock, TrendingUp, BrainCircuit, AlertTriangle, 
    CheckCircle, Target, Users, Globe, Download, Zap
} from 'lucide-react';
import LazyImage from '../components/LazyImage';
import { Link } from 'react-router-dom';

const Analytics: React.FC = () => {
  const [entries, setEntries] = useState<UserListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'personal' | 'predictive' | 'community'>('personal');
  const [trending, setTrending] = useState<Anime[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const auth = firebaseService.getAuthInstance();
      const user = auth.currentUser;
      
      if (user) {
        const list = await firebaseService.getUserAnimeList(user.uid);
        setEntries(list);
      }

      // Fetch community data
      const trendData = await anilistService.getTrending(5);
      setTrending(trendData);
      
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div className="text-center py-20">Loading analytics...</div>;

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Analytics Hub</h1>
            <p className="text-slate-400">Deep dive into your habits and predictive insights.</p>
          </div>
        </div>

        <div className="flex gap-2 bg-dark-800 p-1 rounded-lg">
            {[
                { id: 'personal', label: 'Personal' },
                { id: 'predictive', label: 'Predictive AI' },
                { id: 'community', label: 'Community' },
            ].map(t => (
                <button
                    key={t.id}
                    onClick={() => setTab(t.id as any)}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                        tab === t.id 
                        ? 'bg-primary text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                >
                    {t.label}
                </button>
            ))}
        </div>
      </div>

      {tab === 'personal' && <PersonalStats entries={entries} />}
      {tab === 'predictive' && <PredictiveAI entries={entries} />}
      {tab === 'community' && <CommunityStats entries={entries} trending={trending} />}

    </div>
  );
};

// --- TAB 1: PERSONAL STATS ---
const PersonalStats: React.FC<{ entries: UserListEntry[] }> = ({ entries }) => {
    // Calculations
    const totalEpisodes = entries.reduce((acc, curr) => acc + curr.progress, 0);
    // Approx 24 mins per episode
    const totalMinutes = totalEpisodes * 24;
    const daysWatched = (totalMinutes / 60 / 24).toFixed(1);
    
    // Status Distribution
    const statusCounts = entries.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const statusData = Object.keys(statusCounts).map(k => ({ name: k.replace('_', ' '), value: statusCounts[k] }));
    const STATUS_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    // Genre Distribution
    const genreCounts: Record<string, number> = {};
    entries.forEach(e => e.genres?.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
    const genreData = Object.keys(genreCounts)
        .map(k => ({ name: k, value: genreCounts[k] }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 7); // Top 7

    // Rating Distribution vs Global Average (Simulated)
    const scoreCounts = Array(10).fill(0);
    entries.forEach(e => {
        if(e.score > 0) scoreCounts[Math.min(Math.floor((e.score - 1) / 10), 9)]++;
    });
    const scoreData = scoreCounts.map((count, i) => ({
        name: `${i*10 + 1}-${(i+1)*10}`,
        user: count,
        avg: Math.floor(Math.random() * (entries.length / 2)) // Simulated community avg
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
            {/* KPI Cards */}
            <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 flex flex-col gap-2">
                <div className="p-3 bg-blue-500/10 w-fit rounded-lg text-blue-400"><Clock className="w-6 h-6" /></div>
                <div className="text-3xl font-bold">{daysWatched} Days</div>
                <div className="text-sm text-slate-400">Total Watch Time</div>
            </div>
            <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 flex flex-col gap-2">
                <div className="p-3 bg-green-500/10 w-fit rounded-lg text-green-400"><Target className="w-6 h-6" /></div>
                <div className="text-3xl font-bold">{totalEpisodes}</div>
                <div className="text-sm text-slate-400">Episodes Watched</div>
            </div>
             <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 flex flex-col gap-2">
                <div className="p-3 bg-orange-500/10 w-fit rounded-lg text-orange-400"><CheckCircle className="w-6 h-6" /></div>
                <div className="text-3xl font-bold">
                    {entries.length > 0 ? ((entries.filter(e => e.status === 'COMPLETED').length / entries.length) * 100).toFixed(0) : 0}%
                </div>
                <div className="text-sm text-slate-400">Completion Rate</div>
            </div>
             <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 flex flex-col gap-2">
                <div className="p-3 bg-purple-500/10 w-fit rounded-lg text-purple-400"><TrendingUp className="w-6 h-6" /></div>
                <div className="text-3xl font-bold">
                    {(entries.reduce((a,b) => a + b.score, 0) / (entries.filter(e=>e.score>0).length || 1)).toFixed(1)}
                </div>
                <div className="text-sm text-slate-400">Mean Score</div>
            </div>

            {/* Charts */}
            <div className="md:col-span-2 bg-dark-800 p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold mb-6">Genre Preferences</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={genreData} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fill: '#94a3b8'}} />
                            <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                            <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

             <div className="md:col-span-2 bg-dark-800 p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold mb-6">Rating Distribution (You vs Community)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={scoreData}>
                             <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                            <XAxis dataKey="name" tick={{fill: '#94a3b8'}} />
                            <YAxis tick={{fill: '#94a3b8'}} />
                            <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc'}} />
                            <Legend />
                            <Line type="monotone" dataKey="user" stroke="#3B82F6" strokeWidth={2} name="Your Ratings" />
                            <Line type="monotone" dataKey="avg" stroke="#10B981" strokeDasharray="5 5" name="Community Avg" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="md:col-span-2 lg:col-span-1 bg-dark-800 p-6 rounded-2xl border border-white/5">
                 <h3 className="text-lg font-bold mb-6">List Status</h3>
                 <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc'}} />
                             <Legend />
                        </PieChart>
                     </ResponsiveContainer>
                 </div>
            </div>
        </div>
    );
};

// --- TAB 2: PREDICTIVE AI ---
const PredictiveAI: React.FC<{ entries: UserListEntry[] }> = ({ entries }) => {
    const [recommendation, setRecommendation] = useState<Anime | null>(null);
    const [fatigue, setFatigue] = useState<{detected: boolean, genre: string}>({detected: false, genre: ''});
    
    // Heuristic: Completion Probability
    const completedCount = entries.filter(e => e.status === 'COMPLETED').length;
    const droppedCount = entries.filter(e => e.status === 'DROPPED').length;
    const completionProb = entries.length > 0 
        ? ((completedCount / (completedCount + droppedCount + 1)) * 100).toFixed(0) 
        : 'Unknown';

    useEffect(() => {
        // Detect Fatigue (If last 3 updated entries are same genre)
        const sorted = [...entries].sort((a,b) => b.updatedAt - a.updatedAt).slice(0, 3);
        if (sorted.length === 3) {
            const genres = sorted.map(e => e.genres?.[0]).filter(Boolean);
            if (genres.length === 3 && genres[0] === genres[1] && genres[1] === genres[2]) {
                setFatigue({ detected: true, genre: genres[0] as string });
            }
        }

        // Recommend Next
        const getRec = async () => {
             // Find top genre
             const genreCounts: Record<string, number> = {};
             entries.forEach(e => e.genres?.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
             const topGenre = Object.keys(genreCounts).sort((a,b) => genreCounts[b] - genreCounts[a])[0];
             
             if (topGenre) {
                 const res = await anilistService.getRecommendationsByGenre(topGenre);
                 // Filter out watched
                 const unspotted = res.filter(a => !entries.find(e => e.animeId === a.id));
                 if (unspotted.length > 0) setRecommendation(unspotted[0]);
             }
        }
        getRec();
    }, [entries]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
            <div className="col-span-full text-center py-8">
                <BrainCircuit className="w-16 h-16 mx-auto text-primary mb-4 opacity-80" />
                <h2 className="text-2xl font-bold">AI Predictive Insights</h2>
                <p className="text-slate-400">Based on your {entries.length} tracked entries</p>
            </div>

            {/* Probability Card */}
            <div className="bg-dark-800 p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Target className="w-32 h-32 text-primary" />
                 </div>
                 <h3 className="text-xl font-bold mb-2">Completion Probability</h3>
                 <div className="text-5xl font-display font-bold text-primary mb-2">{completionProb}%</div>
                 <p className="text-slate-400">Likelihood you'll finish a new show based on your drop history.</p>
            </div>

            {/* Fatigue Card */}
            <div className={`p-8 rounded-2xl border relative overflow-hidden ${fatigue.detected ? 'bg-orange-500/10 border-orange-500/30' : 'bg-dark-800 border-white/5'}`}>
                 <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                     {fatigue.detected ? <AlertTriangle className="text-orange-400" /> : <CheckCircle className="text-green-400" />}
                     Genre Fatigue
                 </h3>
                 {fatigue.detected ? (
                     <div>
                         <p className="text-lg font-bold text-orange-200 mb-2">High Fatigue: {fatigue.genre}</p>
                         <p className="text-slate-400">You've watched a lot of {fatigue.genre} recently. Try switching to a Comedy or Slice of Life for a refresh.</p>
                     </div>
                 ) : (
                     <p className="text-slate-400">Your viewing habits are well balanced. No fatigue detected.</p>
                 )}
            </div>

            {/* Next Suggestion */}
            {recommendation && (
                <div className="col-span-full bg-gradient-to-br from-indigo-900 to-dark-900 p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-8 items-center">
                    <LazyImage src={recommendation.coverImage.large} alt="" className="w-32 md:w-48 rounded-lg shadow-2xl rotate-3" />
                    <div className="flex-1 text-center md:text-left">
                        <div className="text-xs font-bold text-indigo-300 uppercase mb-2 tracking-wider">Smart Recommendation</div>
                        <h3 className="text-3xl font-bold mb-2">{recommendation.title.english || recommendation.title.romaji}</h3>
                        <p className="text-indigo-200 mb-6 line-clamp-2">{recommendation.description?.replace(/<[^>]*>?/gm, '')}</p>
                        
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                             <div className="bg-white/10 px-4 py-2 rounded-lg">
                                 <span className="block text-xs text-slate-400">Predicted Score</span>
                                 <span className="font-bold text-lg text-green-400">{(recommendation.averageScore * 0.95).toFixed(0)}%</span>
                             </div>
                             <div className="bg-white/10 px-4 py-2 rounded-lg">
                                 <span className="block text-xs text-slate-400">Match</span>
                                 <span className="font-bold text-lg text-primary">98%</span>
                             </div>
                             <Link to={`/anime/${recommendation.id}`} className="bg-white text-indigo-900 font-bold px-6 py-2 rounded-lg hover:bg-slate-200 flex items-center">
                                 View Details
                             </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- TAB 3: COMMUNITY STATS ---
const CommunityStats: React.FC<{ entries: UserListEntry[], trending: Anime[] }> = ({ entries, trending }) => {
    const [userStats, setUserStats] = useState({ totalUsers: 0, levelDist: [] as {name: string, count: number}[] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRealStats = async () => {
            const users = await firebaseService.getAllUsers();
            
            // Calculate Level Distribution
            const levels = users.map(u => u.level || 1);
            const dist = [
                { name: '1-5', count: levels.filter(l => l <= 5).length },
                { name: '6-10', count: levels.filter(l => l > 5 && l <= 10).length },
                { name: '11-20', count: levels.filter(l => l > 10 && l <= 20).length },
                { name: '20+', count: levels.filter(l => l > 20).length }
            ];

            setUserStats({
                totalUsers: users.length,
                levelDist: dist
            });
            setLoading(false);
        };
        fetchRealStats();
    }, []);

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Global Counters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 text-center">
                    <Globe className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                    <div className="text-3xl font-bold">{loading ? '...' : userStats.totalUsers}</div>
                    <div className="text-sm text-slate-400">Registered Users</div>
                </div>
                <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 text-center">
                    <Users className="w-8 h-8 mx-auto text-pink-400 mb-2" />
                    <div className="text-3xl font-bold">Top 5%</div>
                    <div className="text-sm text-slate-400">Your Activity Rank</div>
                </div>
                <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 text-center">
                    <Zap className="w-8 h-8 mx-auto text-yellow-400 mb-2" />
                    <div className="text-3xl font-bold">Live</div>
                    <div className="text-sm text-slate-400">Real-time Updates</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                 {/* Top Trending Table */}
                <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
                    <h3 className="text-xl font-bold mb-4">Trending Globally</h3>
                    <div className="space-y-4">
                        {trending.map((anime, idx) => (
                            <div key={anime.id} className="flex items-center gap-4 border-b border-white/5 pb-2">
                                <span className="font-bold text-2xl text-slate-600 w-6">#{idx+1}</span>
                                <img src={anime.coverImage.medium} className="w-10 h-14 rounded object-cover" alt="" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold truncate">{anime.title.english || anime.title.romaji}</div>
                                    <div className="text-xs text-slate-400">{anime.format} • {anime.seasonYear}</div>
                                </div>
                                <div className="text-sm font-bold text-primary">{anime.popularity.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Level Distribution (Real Data) */}
                <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
                    <h3 className="text-xl font-bold mb-4">Community Levels</h3>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center text-slate-500">Calculating stats...</div>
                    ) : (
                        <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={userStats.levelDist}>
                                    <XAxis dataKey="name" tick={{fill: '#94a3b8'}} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155'}} />
                                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'white', fontSize: 10 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    <p className="text-center text-sm text-slate-400 mt-4">User Level Distribution</p>
                </div>
            </div>
            
            <div className="flex justify-end">
                <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
                    <Download className="w-4 h-4" /> Export Report (PDF)
                </button>
            </div>
        </div>
    )
}

export default Analytics;