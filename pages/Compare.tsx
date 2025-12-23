
import React, { useState } from 'react';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { Anime, UserProfile } from '../types';
import { Search, X, Users, Tv, BarChart2 } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Compare: React.FC = () => {
  const [mode, setMode] = useState<'ANIME' | 'USER'>('ANIME');
  
  // Anime State
  const [leftQuery, setLeftQuery] = useState('');
  const [rightQuery, setRightQuery] = useState('');
  const [leftAnime, setLeftAnime] = useState<Anime | null>(null);
  const [rightAnime, setRightAnime] = useState<Anime | null>(null);
  const [leftResults, setLeftResults] = useState<Anime[]>([]);
  const [rightResults, setRightResults] = useState<Anime[]>([]);

  // User State
  const [users, setUsers] = useState<UserProfile[]>([]); // Cache all users for search
  const [leftUser, setLeftUser] = useState<UserProfile | null>(null);
  const [rightUser, setRightUser] = useState<UserProfile | null>(null);
  const [userQueryL, setUserQueryL] = useState('');
  const [userQueryR, setUserQueryR] = useState('');

  // Fetch Users on switch
  React.useEffect(() => {
      if (mode === 'USER' && users.length === 0) {
          firebaseService.getAllUsers().then(setUsers);
      }
  }, [mode]);

  const handleSearch = async (side: 'left' | 'right', query: string) => {
    if (side === 'left') setLeftQuery(query);
    else setRightQuery(query);

    if (query.length > 2) {
      const data = await anilistService.searchAnime({ page: 1, query: query });
      if (side === 'left') setLeftResults(data.Page.media.slice(0, 5));
      else setRightResults(data.Page.media.slice(0, 5));
    }
  };

  const selectAnime = async (side: 'left' | 'right', id: number) => {
    const data = await anilistService.getAnimeDetails(id);
    if (side === 'left') {
      setLeftAnime(data);
      setLeftResults([]);
      setLeftQuery('');
    } else {
      setRightAnime(data);
      setRightResults([]);
      setRightQuery('');
    }
  };

  // User Selection Logic
  const filteredUsersL = users.filter(u => u.displayName?.toLowerCase().includes(userQueryL.toLowerCase()));
  const filteredUsersR = users.filter(u => u.displayName?.toLowerCase().includes(userQueryR.toLowerCase()));

  // Render
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      <div className="text-center space-y-4">
          <h1 className="text-3xl font-display font-bold">Comparison Tool</h1>
          <div className="flex justify-center gap-4">
              <button onClick={() => setMode('ANIME')} className={`px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all ${mode === 'ANIME' ? 'bg-primary text-white' : 'bg-dark-800 text-slate-400'}`}>
                  <Tv className="w-4 h-4" /> Anime
              </button>
              <button onClick={() => setMode('USER')} className={`px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all ${mode === 'USER' ? 'bg-primary text-white' : 'bg-dark-800 text-slate-400'}`}>
                  <Users className="w-4 h-4" /> Users
              </button>
          </div>
      </div>

      {mode === 'ANIME' ? (
          <div className="grid md:grid-cols-2 gap-8 relative">
            {/* Left Side */}
            <div className="bg-dark-800/50 p-6 rounded-2xl border border-white/5">
            {!leftAnime ? (
                <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                    type="text"
                    placeholder="Search anime..."
                    className="w-full bg-dark-900 border border-white/10 rounded-lg pl-10 p-3"
                    value={leftQuery}
                    onChange={(e) => handleSearch('left', e.target.value)}
                    />
                </div>
                {leftResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-dark-800 border border-white/10 mt-2 rounded-lg z-20 shadow-xl">
                    {leftResults.map(anime => (
                        <button
                        key={anime.id}
                        onClick={() => selectAnime('left', anime.id)}
                        className="w-full text-left p-3 hover:bg-white/5 flex gap-3 items-center"
                        >
                        <img src={anime.coverImage.medium} className="w-8 h-12 object-cover rounded" alt="" />
                        <span className="truncate">{anime.title.romaji}</span>
                        </button>
                    ))}
                    </div>
                )}
                </div>
            ) : (
                <div className="relative">
                <button onClick={() => setLeftAnime(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 z-10"><X className="w-4 h-4 text-white" /></button>
                <AnimeCard anime={leftAnime} />
                <div className="mt-4 space-y-3">
                    <StatRow label="Score" value={`${leftAnime.averageScore}%`} highlight={rightAnime && leftAnime.averageScore > rightAnime.averageScore} />
                    <StatRow label="Episodes" value={leftAnime.episodes} highlight={rightAnime && (leftAnime.episodes || 0) > (rightAnime.episodes || 0)} />
                    <StatRow label="Format" value={leftAnime.format} />
                    <StatRow label="Year" value={leftAnime.seasonYear} />
                    <div className="flex flex-wrap gap-1">
                        {leftAnime.genres.map(g => <span key={g} className="text-xs bg-white/5 px-2 py-1 rounded">{g}</span>)}
                    </div>
                    <div className="text-sm text-slate-400 line-clamp-4" dangerouslySetInnerHTML={{__html: leftAnime.description}} />
                </div>
                </div>
            )}
            </div>

            {/* Right Side */}
            <div className="bg-dark-800/50 p-6 rounded-2xl border border-white/5">
            {!rightAnime ? (
                <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                    type="text"
                    placeholder="Search anime..."
                    className="w-full bg-dark-900 border border-white/10 rounded-lg pl-10 p-3"
                    value={rightQuery}
                    onChange={(e) => handleSearch('right', e.target.value)}
                    />
                </div>
                {rightResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-dark-800 border border-white/10 mt-2 rounded-lg z-20 shadow-xl">
                    {rightResults.map(anime => (
                        <button
                        key={anime.id}
                        onClick={() => selectAnime('right', anime.id)}
                        className="w-full text-left p-3 hover:bg-white/5 flex gap-3 items-center"
                        >
                        <img src={anime.coverImage.medium} className="w-8 h-12 object-cover rounded" alt="" />
                        <span className="truncate">{anime.title.romaji}</span>
                        </button>
                    ))}
                    </div>
                )}
                </div>
            ) : (
                <div className="relative">
                <button onClick={() => setRightAnime(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 z-10"><X className="w-4 h-4 text-white" /></button>
                <AnimeCard anime={rightAnime} />
                <div className="mt-4 space-y-3">
                    <StatRow label="Score" value={`${rightAnime.averageScore}%`} highlight={leftAnime && rightAnime.averageScore > leftAnime.averageScore} />
                    <StatRow label="Episodes" value={rightAnime.episodes} highlight={leftAnime && (rightAnime.episodes || 0) > (leftAnime.episodes || 0)} />
                    <StatRow label="Format" value={rightAnime.format} />
                    <StatRow label="Year" value={rightAnime.seasonYear} />
                    <div className="flex flex-wrap gap-1">
                        {rightAnime.genres.map(g => <span key={g} className="text-xs bg-white/5 px-2 py-1 rounded">{g}</span>)}
                    </div>
                    <div className="text-sm text-slate-400 line-clamp-4" dangerouslySetInnerHTML={{__html: rightAnime.description}} />
                </div>
                </div>
            )}
            </div>
          </div>
      ) : (
          <div className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                  {/* Left User */}
                  <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
                      {!leftUser ? (
                          <div className="relative">
                              <input 
                                type="text" placeholder="Find User..." value={userQueryL} onChange={e => setUserQueryL(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 rounded-lg p-3"
                              />
                              {userQueryL && (
                                  <div className="absolute top-full left-0 right-0 bg-dark-900 border border-white/10 z-10 mt-1 rounded max-h-40 overflow-y-auto">
                                      {filteredUsersL.map(u => (
                                          <button key={u.uid} onClick={() => { setLeftUser(u); setUserQueryL(''); }} className="w-full text-left p-2 hover:bg-white/10">{u.displayName}</button>
                                      ))}
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="text-center relative">
                              <button onClick={() => setLeftUser(null)} className="absolute top-0 right-0"><X className="w-5 h-5" /></button>
                              <img src={leftUser.photoURL || ''} alt="" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
                              <h2 className="text-2xl font-bold">{leftUser.displayName}</h2>
                              <p className="text-slate-400">Level {leftUser.level}</p>
                          </div>
                      )}
                  </div>

                  {/* Right User */}
                  <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
                      {!rightUser ? (
                          <div className="relative">
                              <input 
                                type="text" placeholder="Find User..." value={userQueryR} onChange={e => setUserQueryR(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 rounded-lg p-3"
                              />
                              {userQueryR && (
                                  <div className="absolute top-full left-0 right-0 bg-dark-900 border border-white/10 z-10 mt-1 rounded max-h-40 overflow-y-auto">
                                      {filteredUsersR.map(u => (
                                          <button key={u.uid} onClick={() => { setRightUser(u); setUserQueryR(''); }} className="w-full text-left p-2 hover:bg-white/10">{u.displayName}</button>
                                      ))}
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="text-center relative">
                              <button onClick={() => setRightUser(null)} className="absolute top-0 right-0"><X className="w-5 h-5" /></button>
                              <img src={rightUser.photoURL || ''} alt="" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
                              <h2 className="text-2xl font-bold">{rightUser.displayName}</h2>
                              <p className="text-slate-400">Level {rightUser.level}</p>
                          </div>
                      )}
                  </div>
              </div>

              {leftUser && rightUser && (
                  <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
                      <h3 className="text-xl font-bold mb-6 text-center"><BarChart2 className="inline mr-2" /> Stat Comparison</h3>
                      <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={[
                                  { name: 'Level', [leftUser.displayName!]: leftUser.level, [rightUser.displayName!]: rightUser.level },
                                  { name: 'XP', [leftUser.displayName!]: leftUser.xp / 100, [rightUser.displayName!]: rightUser.xp / 100 }, // Scaled down for visual
                                  { name: 'Badges', [leftUser.displayName!]: leftUser.badges?.length || 0, [rightUser.displayName!]: rightUser.badges?.length || 0 },
                                  { name: 'Collection', [leftUser.displayName!]: leftUser.collection?.length || 0, [rightUser.displayName!]: rightUser.collection?.length || 0 },
                              ]}>
                                  <XAxis dataKey="name" tick={{fill: '#94a3b8'}} />
                                  <YAxis hide />
                                  <Tooltip contentStyle={{backgroundColor: '#1e293b'}} />
                                  <Legend />
                                  <Bar dataKey={leftUser.displayName!} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                  <Bar dataKey={rightUser.displayName!} fill="#EC4899" radius={[4, 4, 0, 0]} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

const StatRow = ({ label, value, highlight }: { label: string, value: any, highlight?: boolean }) => (
    <div className={`flex justify-between p-2 rounded ${highlight ? 'bg-green-500/10 border border-green-500/20' : 'border-b border-white/5'}`}>
        <span className="text-slate-400">{label}</span>
        <span className={`font-bold ${highlight ? 'text-green-400' : 'text-slate-200'}`}>{value || 'N/A'}</span>
    </div>
)

export default Compare;
