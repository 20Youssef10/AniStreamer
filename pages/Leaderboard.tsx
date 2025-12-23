
import React, { useEffect, useState } from 'react';
import { firebaseService } from '../services/firebase';
import { UserProfile } from '../types';
import { Trophy, Medal, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

const Leaderboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        try {
            const data = await firebaseService.getLeaderboard();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    fetch();
  }, []);

  if (loading) return <div className="text-center py-20">Loading rankings...</div>;

  const topThree = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fadeIn py-8">
        <div className="text-center space-y-4">
            <h1 className="text-4xl font-display font-bold flex items-center justify-center gap-3">
                <Trophy className="text-yellow-500 w-10 h-10" /> Global Rankings
            </h1>
            <p className="text-slate-400">Top Otakus ranked by XP and activity.</p>
        </div>

        {/* Podium */}
        {topThree.length > 0 && (
            <div className="flex justify-center items-end gap-4 md:gap-8 pb-8 border-b border-white/5">
                {/* 2nd Place */}
                {topThree[1] && (
                    <div className="flex flex-col items-center">
                        <div className="relative mb-4">
                            <Link to={`/profile/${topThree[1].uid}`}>
                                {topThree[1].photoURL ? (
                                    <img src={topThree[1].photoURL} className="w-20 h-20 rounded-full border-4 border-slate-300 shadow-xl object-cover" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full border-4 border-slate-300 shadow-xl bg-dark-700 flex items-center justify-center font-bold text-2xl text-slate-500">
                                        {topThree[1].displayName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </Link>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-300 text-black font-bold text-xs px-2 py-0.5 rounded-full">2nd</div>
                        </div>
                        <div className="font-bold text-white text-lg">{topThree[1].displayName || 'User'}</div>
                        <div className="text-slate-400 text-sm">{topThree[1].xp} XP</div>
                        <div className="h-32 w-24 bg-gradient-to-t from-slate-700/50 to-slate-500/20 rounded-t-lg mt-4 border-t border-slate-500/30"></div>
                    </div>
                )}

                {/* 1st Place */}
                {topThree[0] && (
                    <div className="flex flex-col items-center z-10">
                        <Crown className="w-8 h-8 text-yellow-400 mb-2 animate-bounce" />
                        <div className="relative mb-4">
                            <Link to={`/profile/${topThree[0].uid}`}>
                                {topThree[0].photoURL ? (
                                    <img src={topThree[0].photoURL} className="w-28 h-28 rounded-full border-4 border-yellow-400 shadow-2xl object-cover" />
                                ) : (
                                    <div className="w-28 h-28 rounded-full border-4 border-yellow-400 shadow-2xl bg-dark-700 flex items-center justify-center font-bold text-3xl text-slate-500">
                                        {topThree[0].displayName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </Link>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-bold text-sm px-3 py-0.5 rounded-full">1st</div>
                        </div>
                        <div className="font-bold text-white text-xl">{topThree[0].displayName || 'User'}</div>
                        <div className="text-yellow-400 font-bold">{topThree[0].xp} XP</div>
                        <div className="h-40 w-32 bg-gradient-to-t from-yellow-700/50 to-yellow-500/20 rounded-t-lg mt-4 border-t border-yellow-500/30"></div>
                    </div>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                    <div className="flex flex-col items-center">
                        <div className="relative mb-4">
                            <Link to={`/profile/${topThree[2].uid}`}>
                                {topThree[2].photoURL ? (
                                    <img src={topThree[2].photoURL} className="w-20 h-20 rounded-full border-4 border-orange-400 shadow-xl object-cover" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full border-4 border-orange-400 shadow-xl bg-dark-700 flex items-center justify-center font-bold text-2xl text-slate-500">
                                        {topThree[2].displayName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </Link>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-400 text-black font-bold text-xs px-2 py-0.5 rounded-full">3rd</div>
                        </div>
                        <div className="font-bold text-white text-lg">{topThree[2].displayName || 'User'}</div>
                        <div className="text-slate-400 text-sm">{topThree[2].xp} XP</div>
                        <div className="h-24 w-24 bg-gradient-to-t from-orange-800/50 to-orange-500/20 rounded-t-lg mt-4 border-t border-orange-500/30"></div>
                    </div>
                )}
            </div>
        )}

        {/* List */}
        <div className="bg-dark-800 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="divide-y divide-white/5">
                {rest.map((user, idx) => (
                    <div key={user.uid} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                        <div className="w-8 text-center font-bold text-slate-500">#{idx + 4}</div>
                        <Link to={`/profile/${user.uid}`} className="shrink-0">
                            <div className="w-12 h-12 rounded-full bg-dark-700 overflow-hidden border border-white/10">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">{user.displayName?.[0]}</div>
                                )}
                            </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                            <Link to={`/profile/${user.uid}`} className="font-bold text-white hover:text-primary transition-colors truncate block">{user.displayName || 'Unknown'}</Link>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                <span>Lvl {user.level}</span>
                                <span>•</span>
                                <span>{user.badges?.length || 0} Badges</span>
                            </div>
                        </div>
                        <div className="text-right font-mono text-slate-400 font-bold">
                            {user.xp.toLocaleString()} XP
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default Leaderboard;
