
import React, { useEffect, useState, useRef } from 'react';
import { firebaseService } from '../services/firebase';
import { aiService } from '../services/ai';
import { anilistService } from '../services/anilist';
import { UserListEntry, UserProfile, FriendRequest, Anime, Character, CustomList, UserRecommendation, SupportMessage } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Edit2, X, Award, Zap, Grid, Share2, Flame, Loader2, UserPlus, Check, UserMinus, Heart, Film, Users, Image as ImageIcon, BookOpen, Clock, Tv, Plus, Search, Trash2, ArrowRight, Sparkles, MessageCircle, Send, FileBadge, AtSign } from 'lucide-react';
import LazyImage from '../components/LazyImage';
import { useToast } from '../context/ToastContext';
import AnimeCard from '../components/AnimeCard';
import { MentionInput } from '../components/Layout';

interface ProfileProps {
  user: any;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>(); // ID can be UID or Username
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'favorites' | 'custom_lists' | 'recommendations' | 'badges' | 'friends' | 'support'>('overview');
  const [entries, setEntries] = useState<UserListEntry[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [recommendations, setRecommendations] = useState<UserRecommendation[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { showToast } = useToast();

  // Support Chat State
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Favorites Data
  const [favAnime, setFavAnime] = useState<Anime[]>([]);
  const [favChars, setFavChars] = useState<Character[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(false);

  // Edit State
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [generatingBio, setGeneratingBio] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // Custom List Create Modal
  const [showListModal, setShowListModal] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [listSearchResults, setListSearchResults] = useState<Anime[]>([]);
  const [selectedListItems, setSelectedListItems] = useState<Anime[]>([]);

  // Recommendation Create Modal
  const [showRecModal, setShowRecModal] = useState(false);
  const [recSource, setRecSource] = useState<Anime | null>(null);
  const [recTarget, setRecTarget] = useState<Anime | null>(null);
  const [recReason, setRecReason] = useState('');
  const [recSearchSource, setRecSearchSource] = useState('');
  const [recSearchTarget, setRecSearchTarget] = useState('');
  const [recSourceResults, setRecSourceResults] = useState<Anime[]>([]);
  const [recTargetResults, setRecTargetResults] = useState<Anime[]>([]);

  // Derived state to check ownership
  const isOwnProfile = user && userProfile && user.uid === userProfile.uid;

  useEffect(() => {
    const fetchProfileData = async () => {
        setLoading(true);
        let profile: UserProfile | null = null;

        // 1. If no ID param, use current logged in user
        if (!id && user) {
            profile = await firebaseService.getUserData(user.uid);
        } 
        // 2. If ID param exists
        else if (id) {
            // Try fetching by UID first
            profile = await firebaseService.getUserData(id);
            // If not found, try fetching by Username
            if (!profile) {
                profile = await firebaseService.getUserByUsername(id);
            }
        }

        setUserProfile(profile);

        if (profile) {
            // If viewing own profile, populate edit fields
            if (user && profile.uid === user.uid) {
                setDisplayName(profile.displayName || '');
                setUsername(profile.username || '');
                setPhotoURL(profile.photoURL || '');
                setBio(profile.bio || '');
            }

            // Fetch Sub-collections
            const unsubList = firebaseService.subscribeToUserList(profile.uid, (data) => setEntries(data || []));
            const unsubCustom = firebaseService.subscribeToCustomLists(profile.uid, setCustomLists);
            const unsubRecs = firebaseService.subscribeToRecommendations(profile.uid, setRecommendations);

            // Fetch Friends
            if (profile.friends && profile.friends.length > 0) {
                const friendsData = [];
                for (const fid of profile.friends) {
                    const fData = await firebaseService.getUserData(fid);
                    if (fData) friendsData.push(fData);
                }
                setFriendsList(friendsData);
            }

            setLoading(false);
            return () => {
                unsubList();
                unsubCustom();
                unsubRecs();
            };
        } else {
            setLoading(false);
        }
    };

    fetchProfileData();
  }, [id, user]);

  // Support Chat Subscription
  useEffect(() => {
      if (activeTab === 'support' && isOwnProfile && user) {
          const unsub = firebaseService.subscribeToSupportChat(user.uid, (msgs: SupportMessage[]) => {
              setSupportMessages(msgs);
              setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          });
          // Mark read
          firebaseService.markSupportChatRead(user.uid, false);
          return () => unsub();
      }
  }, [activeTab, isOwnProfile, user]);

  // Fetch Favorites when tab changes
  useEffect(() => {
      if (activeTab === 'favorites' && userProfile) {
          const fetchFavs = async () => {
              setLoadingFavs(true);
              try {
                  const [anime, chars] = await Promise.all([
                      userProfile.favorites && userProfile.favorites.length > 0 ? anilistService.getAnimeByIds(userProfile.favorites) : Promise.resolve([]),
                      userProfile.favoriteChars && userProfile.favoriteChars.length > 0 ? anilistService.getCharactersByIds(userProfile.favoriteChars) : Promise.resolve([])
                  ]);
                  setFavAnime(anime);
                  setFavChars(chars);
              } catch (e) {
                  console.error(e);
              } finally {
                  setLoadingFavs(false);
              }
          };
          fetchFavs();
      }
  }, [activeTab, userProfile]);

  const validateUsername = async (val: string) => {
      if (val.length < 3) {
          setUsernameError("Min 3 chars");
          return false;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(val)) {
          setUsernameError("Alphanumeric & _ only");
          return false;
      }
      if (user) {
          const isAvailable = await firebaseService.checkUsernameAvailability(val, user.uid);
          if (!isAvailable) {
              setUsernameError("Username taken");
              return false;
          }
      }
      setUsernameError("");
      return true;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (usernameError) return showToast("Fix username error", "error");
      
      const isValid = await validateUsername(username);
      if (!isValid) return;

      try {
          await firebaseService.updateUserProfile(displayName, photoURL, bio, username);
          showToast("Profile updated!", 'success');
          setIsEditing(false);
          // If username changed, redirect to new URL if currently on profile page
          if (username !== userProfile?.username) {
              navigate(`/profile/${username}`);
          }
      } catch (err) {
          showToast("Failed to update profile", 'error');
      }
  };

  const handleGenerateBio = async () => {
      if (!userProfile) return;
      setGeneratingBio(true);
      try {
          const topAnime = entries.filter(e => e.score >= 80).map(e => e.title || '').slice(0, 5);
          const genres = Array.from(new Set(entries.flatMap(e => e.genres || []))).slice(0, 5) as string[];
          const generated = await aiService.generateUserBio(genres, topAnime, 'enthusiastic otaku');
          setBio(generated);
      } catch(e) {
          showToast("Failed to generate bio", "error");
      } finally {
          setGeneratingBio(false);
      }
  };

  // 11. Generate Otaku Certificate
  const generateCertificate = () => {
      if (!userProfile) return;
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          // Background
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, 800, 600);
          
          // Border
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 10;
          ctx.strokeRect(20, 20, 760, 560);

          // Text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 40px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('OTAKU CERTIFICATE', 400, 100);

          ctx.font = '30px sans-serif';
          ctx.fillText(`Presented to: ${userProfile.displayName}`, 400, 200);
          
          ctx.font = '20px sans-serif';
          ctx.fillStyle = '#3b82f6';
          ctx.fillText(`@${userProfile.username || userProfile.uid.slice(0,8)}`, 400, 230);

          ctx.fillStyle = '#ffffff';
          ctx.font = '24px sans-serif';
          ctx.fillText(`Level: ${userProfile.level} (${userProfile.xp} XP)`, 400, 300);
          ctx.fillText(`Episodes Watched: ${totalEpisodes}`, 400, 350);
          ctx.fillText(`Badges Earned: ${userProfile.badges?.length || 0}`, 400, 400);

          ctx.font = 'italic 20px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('Certified by AniStream', 400, 500);

          // Download
          const link = document.createElement('a');
          link.download = `certificate_${userProfile.username || userProfile.uid}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          showToast("Certificate downloaded!", "success");
      }
  };

  // Support Message
  const sendSupportMessage = async (e?: React.FormEvent) => {
      if(e) e.preventDefault();
      if (!user || !supportInput.trim()) return;
      
      await firebaseService.sendSupportMessage(user.uid, supportInput, false);
      setSupportInput('');
  };

  // Custom List Logic
  const handleSearchListAnime = async (q: string) => {
      setListSearch(q);
      if (q.length > 2) {
          const res = await anilistService.searchAnime({ query: q, page: 1 });
          setListSearchResults(res.Page.media.slice(0, 5));
      }
  };

  const addToList = (anime: Anime) => {
      if (!selectedListItems.find(i => i.id === anime.id)) {
          setSelectedListItems([...selectedListItems, anime]);
      }
      setListSearch('');
      setListSearchResults([]);
  };

  const saveCustomList = async () => {
      if (!userProfile?.uid || !newListTitle) return;
      try {
          await firebaseService.createCustomList(userProfile.uid, {
              name: newListTitle,
              description: newListDesc,
              items: selectedListItems.map(i => i.id),
              createdAt: Date.now(),
              isPublic: true
          });
          setShowListModal(false);
          setNewListTitle(''); setNewListDesc(''); setSelectedListItems([]);
          showToast("List created!", "success");
      } catch(e) {
          showToast("Failed to create list", "error");
      }
  };

  const deleteCustomList = async (listId: string) => {
      if (!userProfile?.uid || !confirm("Delete this list?")) return;
      await firebaseService.deleteCustomList(userProfile.uid, listId);
  };

  // Recommendation Logic
  const handleSearchRec = async (type: 'source' | 'target', q: string) => {
      if (type === 'source') setRecSearchSource(q); else setRecSearchTarget(q);
      
      if (q.length > 2) {
          const res = await anilistService.searchAnime({ query: q, page: 1 });
          if (type === 'source') setRecSourceResults(res.Page.media.slice(0, 5));
          else setRecTargetResults(res.Page.media.slice(0, 5));
      }
  };

  const saveRecommendation = async () => {
      if (!userProfile?.uid || !recSource || !recTarget || !recReason) return;
      try {
          await firebaseService.createRecommendation(userProfile.uid, {
              sourceId: recSource.id,
              sourceTitle: recSource.title.romaji,
              sourceImage: recSource.coverImage.medium,
              targetId: recTarget.id,
              targetTitle: recTarget.title.romaji,
              targetImage: recTarget.coverImage.medium,
              reason: recReason,
              likes: 0,
              createdAt: Date.now()
          });
          setShowRecModal(false);
          setRecSource(null); setRecTarget(null); setRecReason('');
          showToast("Recommendation shared!", "success");
      } catch(e) {
          showToast("Failed to save recommendation", "error");
      }
  };

  const deleteRecommendation = async (recId: string) => {
      if (!userProfile?.uid || !confirm("Delete this recommendation?")) return;
      await firebaseService.deleteRecommendation(userProfile.uid, recId);
  };

  // Friend Logic
  const handleFriendRequest = async () => {
      if (!userProfile || !user) return;
      const currentUserData = await firebaseService.getUserData(user.uid);
      if (currentUserData) {
          await firebaseService.sendFriendRequest(currentUserData, userProfile.uid);
          showToast("Friend request sent!", "success");
      }
  };

  // Shared Logic
  const statusCounts = entries.reduce((acc, curr) => { acc[curr.status] = (acc[curr.status] || 0) + 1; return acc; }, {} as Record<string, number>);
  const pieData = Object.keys(statusCounts).map(key => ({ name: key.replace('_', ' '), value: statusCounts[key] }));
  const genreCounts: Record<string, number> = {};
  entries.forEach(e => e.genres?.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
  const topGenres = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]).slice(0, 3);
  const animeEntries = entries.filter(e => e.type !== 'MANGA');
  const mangaEntries = entries.filter(e => e.type === 'MANGA');
  const totalEpisodes = animeEntries.reduce((acc, curr) => acc + (curr.progress || 0), 0);
  const totalChapters = mangaEntries.reduce((acc, curr) => acc + (curr.progress || 0), 0);
  const daysWatched = (totalEpisodes * 24) / 60 / 24;
  const scoreCounts = Array(10).fill(0);
  entries.forEach(e => { if(e.score > 0) scoreCounts[Math.min(Math.floor((e.score - 1) / 10), 9)]++; });
  const scoreData = scoreCounts.map((count, i) => ({ name: `${i*10 + 1}-${(i+1)*10}`, count }));
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
  const level = userProfile?.level || 1;
  const currentXP = userProfile?.xp || 0;
  const nextLevelXP = Math.pow(level, 2) * 100;
  const prevLevelXP = Math.pow(level - 1, 2) * 100;
  const progress = Math.min(100, Math.max(0, ((currentXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100));

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Profile...</div>;
  if (!userProfile) return <div className="p-8 text-center text-slate-400">User not found</div>;

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="relative bg-dark-800 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 h-48 bg-dark-900">
            {userProfile?.settings?.backgroundImage || userProfile?.photoURL ? (
                <img src={userProfile?.settings?.backgroundImage || userProfile?.photoURL} className="w-full h-full object-cover opacity-30 blur-sm" alt="" />
            ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/20 to-purple-600/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-800 to-transparent"></div>
        </div>

        <div className="relative z-10 p-8 pt-24">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                <div className="relative group shrink-0">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-dark-800 shadow-2xl bg-dark-900">
                        {userProfile?.photoURL ? (
                            <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-white">
                                {userProfile?.displayName ? userProfile.displayName[0] : '?'}
                            </div>
                        )}
                    </div>
                    {isOwnProfile && (
                        <button onClick={() => setIsEditing(true)} className="absolute bottom-0 right-0 bg-primary p-2 rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                <div className="flex-1 mb-2 w-full md:w-auto">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-1 justify-center md:justify-start">
                        <h1 className="text-3xl font-display font-bold text-white">{userProfile?.displayName || 'User'}</h1>
                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold border border-primary/20">Lvl {level}</span>
                    </div>
                    
                    {/* Username Display */}
                    <div className="text-slate-400 text-sm mb-2 font-mono flex items-center justify-center md:justify-start gap-1">
                        <AtSign className="w-3 h-3" />
                        {userProfile?.username || userProfile.uid.slice(0,8)}
                    </div>

                    <p className="text-slate-400 text-sm mb-4">{userProfile?.badges?.length || 0} Badges • {(userProfile?.xp || 0).toLocaleString()} XP</p>
                    
                    {/* Bio Display */}
                    {userProfile?.bio && <p className="text-sm text-slate-300 italic mb-4 max-w-2xl bg-black/20 p-2 rounded-lg border border-white/5 mx-auto md:mx-0">"{userProfile.bio}"</p>}

                    <div className="flex gap-2 justify-center md:justify-start">
                        {topGenres.map(g => <span key={g} className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-300">{g}</span>)}
                    </div>
                </div>

                <div className="flex gap-3 mt-4 md:mt-0">
                    {isOwnProfile ? (
                        <>
                            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-primary hover:bg-blue-600 rounded-lg text-white font-bold transition-colors shadow-lg">
                                Edit Profile
                            </button>
                            <button onClick={generateCertificate} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors border border-white/5" title="Generate Certificate">
                                <FileBadge className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={handleFriendRequest}
                            disabled={userProfile?.friends?.includes(user?.uid) || userProfile?.friendRequests?.some(r => r.fromId === user?.uid)}
                            className="px-4 py-2 bg-primary hover:bg-blue-600 rounded-lg text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <UserPlus className="w-5 h-5" /> 
                            {userProfile?.friends?.includes(user?.uid) ? "Friends" : "Add Friend"}
                        </button>
                    )}
                    <button onClick={() => {navigator.clipboard.writeText(window.location.href); showToast("Link copied!", "success")}} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors"><Share2 className="w-5 h-5 text-slate-300" /></button>
                </div>
            </div>

            <div className="mt-8 bg-dark-900/50 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span className="font-bold text-primary">Level Progress</span>
                    <span>{Math.floor(nextLevelXP - currentXP)} XP to Lvl {level + 1}</span>
                </div>
                <div className="h-3 bg-dark-900 rounded-full overflow-hidden border border-white/5 relative">
                    <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 overflow-x-auto pb-1 no-scrollbar">
          {[
              {id: 'overview', label: 'Overview'}, 
              {id: 'custom_lists', label: 'Custom Lists'}, 
              {id: 'recommendations', label: 'Recommendations'}, 
              {id: 'favorites', label: 'Favorites'}, 
              {id: 'badges', label: 'Badges'}, 
              {id: 'friends', label: 'Friends'},
              ...(isOwnProfile ? [{id: 'support', label: 'Support'}] : [])
          ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 font-bold capitalize transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-dark-800 p-4 rounded-xl border border-white/5 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2"><Tv className="w-4 h-4" /> Anime Stats</div>
                        <div className="text-2xl font-bold text-white">{animeEntries.length} <span className="text-sm font-normal text-slate-500">Titles</span></div>
                        <div className="text-xs text-slate-400 mt-1">{totalEpisodes} Episodes ({daysWatched.toFixed(1)} Days)</div>
                    </div>
                    <div className="bg-dark-800 p-4 rounded-xl border border-white/5 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2"><BookOpen className="w-4 h-4" /> Manga Stats</div>
                        <div className="text-2xl font-bold text-white">{mangaEntries.length} <span className="text-sm font-normal text-slate-500">Titles</span></div>
                        <div className="text-xs text-slate-400 mt-1">{totalChapters} Chapters Read</div>
                    </div>
                </div>

                <div className="bg-dark-800 rounded-xl border border-white/5 overflow-hidden">
                    <h3 className="p-4 border-b border-white/5 font-bold">Recent Activity</h3>
                    {entries.length === 0 ? <div className="p-8 text-center text-slate-500">No activity yet.</div> : (
                        <div className="divide-y divide-white/5">
                            {entries.sort((a,b) => b.updatedAt - a.updatedAt).slice(0, 5).map(entry => (
                                <Link to={`/${entry.type === 'MANGA' ? 'manga' : 'anime'}/${entry.animeId}`} key={entry.animeId} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group">
                                    <LazyImage src={entry.image || ''} alt="" className="w-12 h-16 object-cover rounded" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-200 group-hover:text-primary">{entry.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{entry.status}</span>
                                            {entry.score > 0 && <span className="text-xs text-yellow-500">★ {entry.score}</span>}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-dark-800 p-6 rounded-xl border border-white/5">
                    <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase">Stats</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#fff' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
          </div>
      )}

      {/* CUSTOM LISTS TAB */}
      {activeTab === 'custom_lists' && (
          <div className="space-y-6">
              {isOwnProfile && (
                  <button onClick={() => setShowListModal(true)} className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-all">
                      <Plus className="w-5 h-5"/> Create New List
                  </button>
              )}
              
              <div className="grid md:grid-cols-2 gap-6">
                  {customLists.map(list => (
                      <div key={list.id} className="bg-dark-800 p-6 rounded-2xl border border-white/5 relative group hover:border-primary/30 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <h3 className="font-bold text-xl text-white">{list.name}</h3>
                                  <p className="text-sm text-slate-400 mt-1">{list.description}</p>
                              </div>
                              {isOwnProfile && (
                                  <button onClick={() => deleteCustomList(list.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                              )}
                          </div>
                          <div className="flex gap-2 overflow-hidden h-32 relative">
                              {/* We need to fetch items or store minimal item data. For now, assuming list has IDs, we link to them. A real app would fetch thumbnails. */}
                              <div className="w-full h-full bg-dark-900 rounded-lg flex items-center justify-center text-slate-500 text-sm border border-white/5">
                                  {list.items.length} items (Click to view - Not Implemented Full View)
                              </div>
                          </div>
                      </div>
                  ))}
                  {customLists.length === 0 && !isOwnProfile && <div className="col-span-full text-center py-12 text-slate-500">No custom lists yet.</div>}
              </div>
          </div>
      )}

      {/* RECOMMENDATIONS TAB */}
      {activeTab === 'recommendations' && (
          <div className="space-y-6">
              {isOwnProfile && (
                  <button onClick={() => setShowRecModal(true)} className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:border-pink-500/50 hover:bg-pink-500/5 transition-all">
                      <Zap className="w-5 h-5"/> Create Recommendation
                  </button>
              )}

              <div className="grid gap-4">
                  {recommendations.map(rec => (
                      <div key={rec.id} className="bg-dark-800 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-6 items-center relative group">
                          {isOwnProfile && (
                              <button onClick={() => deleteRecommendation(rec.id)} className="absolute top-2 right-2 p-2 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                          )}
                          
                          <div className="flex items-center gap-4 flex-1">
                              <Link to={`/anime/${rec.sourceId}`} className="shrink-0 w-20">
                                  <img src={rec.sourceImage} className="w-full rounded-lg shadow-lg" alt=""/>
                                  <div className="text-[10px] text-center mt-1 truncate text-slate-400">If you like this</div>
                              </Link>
                              <ArrowRight className="w-6 h-6 text-slate-500 shrink-0" />
                              <Link to={`/anime/${rec.targetId}`} className="shrink-0 w-20">
                                  <img src={rec.targetImage} className="w-full rounded-lg shadow-lg" alt=""/>
                                  <div className="text-[10px] text-center mt-1 truncate text-primary font-bold">Try this</div>
                              </Link>
                              <div className="flex-1 border-l border-white/10 pl-6 ml-2">
                                  <p className="text-sm text-slate-300 italic">"{rec.reason}"</p>
                              </div>
                          </div>
                      </div>
                  ))}
                  {recommendations.length === 0 && !isOwnProfile && <div className="text-center py-12 text-slate-500">No recommendations yet.</div>}
              </div>
          </div>
      )}

      {/* FAVORITES TAB */}
      {activeTab === 'favorites' && (
          <div className="space-y-8 animate-fadeIn">
              {loadingFavs ? <div className="text-center py-12 text-slate-500">Loading favorites...</div> : (
                  <>
                      {/* Favorite Anime */}
                      <div>
                          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Film className="w-5 h-5 text-primary"/> Favorite Anime</h3>
                          {favAnime.length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                  {favAnime.map(anime => (
                                      <AnimeCard key={anime.id} anime={anime} />
                                  ))}
                              </div>
                          ) : <p className="text-slate-500">No favorite anime yet.</p>}
                      </div>

                      {/* Favorite Characters */}
                      <div>
                          <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-pink-500"/> Favorite Characters</h3>
                          {favChars.length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                  {favChars.map(char => (
                                      <Link to={`/character/${char.id}`} key={char.id} className="group relative bg-dark-800 rounded-xl overflow-hidden">
                                          <LazyImage src={char.image.large} alt={char.name.full} className="w-full aspect-[3/4] object-cover" />
                                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                                              <div className="font-bold text-white text-sm truncate">{char.name.full}</div>
                                              <div className="text-xs text-pink-400 flex items-center gap-1"><Heart className="w-3 h-3 fill-current"/> {(char.favourites || 0).toLocaleString()}</div>
                                          </div>
                                      </Link>
                                  ))}
                              </div>
                          ) : <p className="text-slate-500">No favorite characters yet.</p>}
                      </div>
                  </>
              )}
          </div>
      )}

      {/* BADGES TAB */}
      {activeTab === 'badges' && (
          <div>
              <div className="mb-6 bg-dark-800 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                      <h3 className="font-bold text-lg">Total Experience</h3>
                      <p className="text-slate-400 text-sm">Keep earning XP to unlock features and badges.</p>
                  </div>
                  <div className="text-3xl font-display font-bold text-primary">
                      {currentXP.toLocaleString()} XP
                  </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {userProfile?.badges && userProfile.badges.length > 0 ? (
                      userProfile.badges.map((badge, i) => (
                          <div key={i} className="bg-dark-800 p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-3 hover:border-yellow-500/50 transition-colors group relative overflow-hidden">
                              <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <div className="text-4xl bg-black/30 p-4 rounded-full border border-white/10 group-hover:scale-110 transition-transform relative z-10">{badge.icon}</div>
                              <div className="relative z-10">
                                  <div className="font-bold text-white">{badge.name}</div>
                                  <div className="text-xs text-slate-500 mt-1">{badge.description}</div>
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="col-span-full py-12 text-center text-slate-500 bg-dark-800 rounded-xl border border-white/5">
                          <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>No badges unlocked yet. Keep watching and leveling up!</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* FRIENDS TAB */}
      {activeTab === 'friends' && (
          <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {friendsList.length > 0 ? (
                      friendsList.map(friend => (
                          <div key={friend.uid} className="bg-dark-800 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center relative group">
                              <Link to={`/profile/${friend.uid}`}>
                                  <img src={friend.photoURL || ''} alt="" className="w-16 h-16 rounded-full mb-3 object-cover border-2 border-dark-900 group-hover:border-primary transition-colors" />
                              </Link>
                              <Link to={`/profile/${friend.uid}`} className="font-bold text-white hover:underline">{friend.displayName}</Link>
                              <div className="text-xs text-slate-400 mt-1">Lvl {friend.level} • {friend.xp} XP</div>
                          </div>
                      ))
                  ) : (
                      <div className="col-span-full text-center py-12 text-slate-500">No friends yet. Add some from the community!</div>
                  )}
              </div>
          </div>
      )}

      {/* SUPPORT TAB */}
      {activeTab === 'support' && isOwnProfile && (
          <div className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b border-white/5 bg-dark-900/50 flex justify-between items-center">
                  <div>
                      <h3 className="font-bold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-green-400" /> Admin Support</h3>
                      <p className="text-xs text-slate-400">Direct line to the AniStream team.</p>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {supportMessages.length === 0 && <div className="text-center text-slate-500 py-12">No messages yet. Ask us anything!</div>}
                  {supportMessages.map(msg => (
                      <div key={msg.id} className={`flex ${!msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] p-3 rounded-xl text-sm ${!msg.isAdmin ? 'bg-primary text-white rounded-tr-none' : 'bg-dark-900 border border-white/10 rounded-tl-none'}`}>
                              {msg.text}
                              <div className="text-[10px] opacity-50 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                          </div>
                      </div>
                  ))}
                  <div ref={chatBottomRef} />
              </div>
              <form onSubmit={sendSupportMessage} className="p-4 border-t border-white/5 flex gap-2">
                  <MentionInput 
                      value={supportInput} 
                      onChange={setSupportInput} 
                      placeholder="Type a message to admin..."
                      className="flex-1 bg-dark-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-primary outline-none"
                      singleLine
                      onSubmit={() => sendSupportMessage()}
                  />
                  <button type="submit" className="p-2 bg-primary rounded-lg text-white"><Send className="w-4 h-4" /></button>
              </form>
          </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-dark-800 w-full max-w-lg p-6 rounded-2xl border border-white/10 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">Edit Profile</h3>
                      <button onClick={() => setIsEditing(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div>
                          <label className="block text-sm text-slate-400 mb-1">Display Name</label>
                          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 outline-none focus:border-primary" />
                      </div>
                      <div>
                          <label className="block text-sm text-slate-400 mb-1">Username (Unique)</label>
                          <div className="relative">
                              <input 
                                type="text" 
                                value={username} 
                                onChange={e => {
                                    setUsername(e.target.value.toLowerCase());
                                    validateUsername(e.target.value.toLowerCase());
                                }} 
                                placeholder="unique_username"
                                className={`w-full bg-dark-900 border rounded-lg p-3 pl-8 outline-none focus:border-primary ${usernameError ? 'border-red-500' : 'border-white/10'}`} 
                              />
                              <AtSign className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                          </div>
                          {usernameError && <p className="text-red-500 text-xs mt-1">{usernameError}</p>}
                      </div>
                       <div>
                          <label className="block text-sm text-slate-400 mb-1">Avatar URL</label>
                          <div className="flex gap-2">
                              <input type="url" value={photoURL} onChange={e => setPhotoURL(e.target.value)} placeholder="https://..." className="flex-1 bg-dark-900 border border-white/10 rounded-lg p-3 outline-none focus:border-primary" />
                              <img src={photoURL || 'https://via.placeholder.com/40'} className="w-12 h-12 rounded-lg border border-white/10 object-cover" alt="Preview"/>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm text-slate-400 mb-1">Bio</label>
                          <div className="relative">
                              <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 h-32 outline-none focus:border-primary" placeholder="Tell us about yourself..." />
                              <button type="button" onClick={handleGenerateBio} disabled={generatingBio} className="absolute bottom-2 right-2 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-md flex items-center gap-1">
                                  {generatingBio ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} AI Write
                              </button>
                          </div>
                      </div>
                      <button type="submit" disabled={!!usernameError} className="w-full bg-primary py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save Changes</button>
                  </form>
              </div>
          </div>
      )}

      {/* List Creation Modal */}
      {showListModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-dark-800 w-full max-w-2xl p-6 rounded-2xl border border-white/10 shadow-2xl h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">Create Custom List</h3>
                      <button onClick={() => setShowListModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                      <input placeholder="List Title" value={newListTitle} onChange={e => setNewListTitle(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-lg p-3" />
                      <textarea placeholder="Description" value={newListDesc} onChange={e => setNewListDesc(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 h-20" />
                      
                      <div>
                          <label className="block text-sm font-bold mb-2">Add Anime</label>
                          <div className="relative mb-2">
                              <input placeholder="Search..." value={listSearch} onChange={e => handleSearchListAnime(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 pl-8" />
                              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                          </div>
                          {listSearchResults.length > 0 && (
                              <div className="bg-dark-900 border border-white/10 rounded-lg p-2 space-y-2 mb-4">
                                  {listSearchResults.map(anime => (
                                      <button key={anime.id} onClick={() => addToList(anime)} className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded text-left">
                                          <img src={anime.coverImage.medium} className="w-8 h-8 rounded object-cover" />
                                          <span className="truncate text-sm">{anime.title.romaji}</span>
                                      </button>
                                  ))}
                              </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                              {selectedListItems.map(item => (
                                  <div key={item.id} className="bg-primary/20 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                      {item.title.romaji}
                                      <button onClick={() => setSelectedListItems(prev => prev.filter(i => i.id !== item.id))}><X className="w-3 h-3 hover:text-white" /></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <button onClick={saveCustomList} disabled={!newListTitle} className="w-full bg-primary py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors mt-4 disabled:opacity-50">Create List</button>
              </div>
          </div>
      )}

      {/* Recommendation Modal */}
      {showRecModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-dark-800 w-full max-w-2xl p-6 rounded-2xl border border-white/10 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">Create Recommendation</h3>
                      <button onClick={() => setShowRecModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">If you like...</label>
                              {!recSource ? (
                                  <div className="relative">
                                      <input value={recSearchSource} onChange={e => handleSearchRec('source', e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-lg p-2" placeholder="Search..." />
                                      {recSourceResults.length > 0 && (
                                          <div className="absolute top-full left-0 right-0 bg-dark-900 border border-white/10 z-10 mt-1 rounded max-h-40 overflow-y-auto">
                                              {recSourceResults.map(a => (
                                                  <button key={a.id} onClick={() => {setRecSource(a); setRecSearchSource(''); setRecSourceResults([]);}} className="w-full text-left p-2 hover:bg-white/5 text-sm flex items-center gap-2">
                                                      <img src={a.coverImage.medium} className="w-6 h-8 object-cover rounded"/> {a.title.romaji}
                                                  </button>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              ) : (
                                  <div className="bg-dark-900 p-2 rounded flex items-center gap-2 relative">
                                      <img src={recSource.coverImage.medium} className="w-8 h-10 object-cover rounded" />
                                      <span className="text-sm font-bold truncate">{recSource.title.romaji}</span>
                                      <button onClick={() => setRecSource(null)} className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5"><X className="w-3 h-3 text-white"/></button>
                                  </div>
                              )}
                          </div>

                          <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">You might like...</label>
                              {!recTarget ? (
                                  <div className="relative">
                                      <input value={recSearchTarget} onChange={e => handleSearchRec('target', e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-lg p-2" placeholder="Search..." />
                                      {recTargetResults.length > 0 && (
                                          <div className="absolute top-full left-0 right-0 bg-dark-900 border border-white/10 z-10 mt-1 rounded max-h-40 overflow-y-auto">
                                              {recTargetResults.map(a => (
                                                  <button key={a.id} onClick={() => {setRecTarget(a); setRecSearchTarget(''); setRecTargetResults([]);}} className="w-full text-left p-2 hover:bg-white/5 text-sm flex items-center gap-2">
                                                      <img src={a.coverImage.medium} className="w-6 h-8 object-cover rounded"/> {a.title.romaji}
                                                  </button>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              ) : (
                                  <div className="bg-dark-900 p-2 rounded flex items-center gap-2 relative">
                                      <img src={recTarget.coverImage.medium} className="w-8 h-10 object-cover rounded" />
                                      <span className="text-sm font-bold truncate">{recTarget.title.romaji}</span>
                                      <button onClick={() => setRecTarget(null)} className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5"><X className="w-3 h-3 text-white"/></button>
                                  </div>
                              )}
                          </div>
                      </div>

                      <textarea 
                        value={recReason} onChange={e => setRecReason(e.target.value)}
                        placeholder="Why do you recommend this?"
                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 h-24"
                      />

                      <button onClick={saveRecommendation} disabled={!recSource || !recTarget || !recReason} className="w-full bg-primary py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50">Post Recommendation</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Profile;
