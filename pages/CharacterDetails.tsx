
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { aiService } from '../services/ai'; // Import AI Service
import { Character, CharacterComment } from '../types';
import LazyImage from '../components/LazyImage';
import { Heart, Film, Book, Mic, MessageSquare, Send, ThumbsUp, Globe, ChevronDown, ChevronUp, Quote, Copy, Loader2, BrainCircuit } from 'lucide-react';
import { MentionInput } from '../components/Layout';
import { useToast } from '../context/ToastContext';

const CharacterDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [char, setChar] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaTab, setMediaTab] = useState<'ANIME' | 'MANGA' | 'COMMENTS' | 'QUOTES' | 'ANALYSIS'>('ANIME');
  const [comments, setComments] = useState<CharacterComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Custom Description
  const [customDescriptions, setCustomDescriptions] = useState<Record<string, string>>({});
  const [selectedLang, setSelectedLang] = useState<string>('original');
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Quotes State
  const [quotes, setQuotes] = useState<string[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Analysis State
  const [analysis, setAnalysis] = useState<string>('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const { showToast } = useToast();
  const auth = firebaseService.getAuthInstance();
  const user = auth.currentUser;

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
        try {
            const data = await anilistService.getCharacterDetails(parseInt(id));
            setChar(data);

            const customContent = await firebaseService.getCustomDescription('character', parseInt(id));
            if (customContent) {
                setCustomDescriptions(customContent);
                if (customContent['ar']) setSelectedLang('ar');
            }

            if (user) {
                const userData = await firebaseService.getUserData(user.uid);
                if (userData && userData.favoriteChars && userData.favoriteChars.includes(parseInt(id))) {
                    setIsFavorite(true);
                }
            }

            // Fetch Quotes using AI if we have context
            const animeContext = data.media?.edges?.find(e => e.node.type === 'ANIME')?.node.title.romaji 
                              || data.media?.edges?.[0]?.node.title.romaji;
            
            if (data.name.full && animeContext) {
                // Background fetch quotes
                aiService.getCharacterQuotes(data.name.full, animeContext)
                    .then(res => setQuotes(res))
                    .catch(err => console.error(err));
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    fetch();

    const unsub = firebaseService.subscribeToCharacterComments(parseInt(id), setComments);
    return () => unsub();
  }, [id, user]);

  const fetchAnalysis = async () => {
      if (analysis || !char) return;
      setLoadingAnalysis(true);
      const animeContext = char.media?.edges?.[0]?.node.title.romaji || "Unknown Anime";
      const desc = char.description || "No description.";
      try {
          const res = await aiService.analyzeCharacter(char.name.full, animeContext, desc);
          setAnalysis(res);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingAnalysis(false);
      }
  };

  // Trigger analysis load when tab is selected
  useEffect(() => {
      if (mediaTab === 'ANALYSIS') {
          fetchAnalysis();
      }
  }, [mediaTab]);

  const handlePostComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !id || !newComment.trim()) return;
      try {
          await firebaseService.addCharacterComment(parseInt(id), {
              userId: user.uid,
              userName: user.displayName || 'Anonymous',
              userAvatar: user.photoURL || '',
              content: newComment,
              createdAt: Date.now(),
              likes: 0
          });
          setNewComment('');
          showToast("Comment posted!", "success");
      } catch (e) {
          showToast("Failed to post comment", "error");
      }
  };

  const toggleFavorite = async () => {
      if (!user || !id) return showToast("Login to favorite", "error");
      const cid = parseInt(id);
      try {
          await firebaseService.toggleFavorite(user.uid, cid, !isFavorite, 'CHARACTER');
          setIsFavorite(!isFavorite);
          showToast(isFavorite ? "Removed from favorites" : "Added to favorites", "success");
      } catch (e) {
          showToast("Failed to update favorites", "error");
      }
  };

  const copyQuote = (text: string) => {
      navigator.clipboard.writeText(text);
      showToast("Quote copied!", "success");
  };

  if (loading || !char) return <div className="p-10 text-center">Loading Character...</div>;

  const edges = char.media.edges || [];
  const animeEdges = edges.filter((e: any) => e.node.type === 'ANIME');
  const mangaEdges = edges.filter((e: any) => e.node.type === 'MANGA');
  
  const displayedEdges = mediaTab === 'ANIME' ? animeEdges : mangaEdges;
  const currentDescription = selectedLang === 'original' ? char.description : (customDescriptions[selectedLang] || char.description);

  return (
    <div className="animate-fadeIn pb-12">
        <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 lg:w-1/4 space-y-4">
                <LazyImage src={char.image.large} alt={char.name.full} className="w-full rounded-2xl shadow-xl" />
                
                <button 
                    onClick={toggleFavorite}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${isFavorite ? 'bg-pink-500 text-white' : 'bg-dark-800 text-pink-500 hover:bg-pink-500/10 border border-pink-500/30'}`}
                >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                    {isFavorite ? 'Favorited' : 'Add to Favorites'}
                </button>

                <div className="bg-dark-800 p-4 rounded-xl border border-white/5 space-y-3">
                    <h3 className="font-bold border-b border-white/5 pb-2">Information</h3>
                    {char.age && <div className="flex justify-between text-sm"><span className="text-slate-400">Age</span><span>{char.age}</span></div>}
                    {char.gender && <div className="flex justify-between text-sm"><span className="text-slate-400">Gender</span><span>{char.gender}</span></div>}
                    {char.bloodType && <div className="flex justify-between text-sm"><span className="text-slate-400">Blood Type</span><span>{char.bloodType}</span></div>}
                    <div className="flex justify-between text-sm"><span className="text-slate-400">Favorites</span><span className="text-primary flex items-center gap-1"><Heart className="w-3 h-3 fill-current"/> {char.favourites}</span></div>
                </div>
            </div>

            <div className="flex-1 space-y-8">
                <div>
                    <h1 className="text-4xl font-display font-bold">{char.name.full}</h1>
                    <h2 className="text-xl text-slate-400 italic mb-4">{char.name.native}</h2>
                    
                    <div className="bg-dark-800/50 p-6 rounded-xl border border-white/5 relative">
                        {Object.keys(customDescriptions).length > 0 && (
                            <div className="flex justify-end mb-2">
                                <div className="flex items-center gap-2 bg-dark-900 rounded-lg p-1 border border-white/10">
                                    <Globe className="w-4 h-4 text-slate-400 ml-2" />
                                    <select 
                                        value={selectedLang} 
                                        onChange={(e) => setSelectedLang(e.target.value)}
                                        className="bg-transparent text-sm text-slate-300 outline-none border-none p-1 cursor-pointer"
                                    >
                                        <option value="original">Original</option>
                                        {Object.keys(customDescriptions).map(lang => (
                                            <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                        <div 
                            className={`prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed ${!showFullDesc ? 'line-clamp-4' : ''}`}
                            dangerouslySetInnerHTML={{ __html: currentDescription || 'No biography available.' }}
                        />
                        <button 
                            onClick={() => setShowFullDesc(!showFullDesc)}
                            className="flex items-center gap-1 text-primary font-bold text-sm mt-3 hover:text-white transition-colors"
                        >
                            {showFullDesc ? <>Show Less <ChevronUp className="w-4 h-4" /></> : <>Read More <ChevronDown className="w-4 h-4" /></>}
                        </button>
                    </div>
                </div>

                {/* ... Media Tabs & Comments ... */}
                <div>
                    <div className="flex gap-4 border-b border-white/10 mb-6 overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => setMediaTab('ANIME')}
                            className={`pb-2 flex items-center gap-2 font-bold transition-colors border-b-2 whitespace-nowrap ${mediaTab === 'ANIME' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                        >
                            <Film className="w-5 h-5" /> Anime ({animeEdges.length})
                        </button>
                        <button 
                            onClick={() => setMediaTab('MANGA')}
                            className={`pb-2 flex items-center gap-2 font-bold transition-colors border-b-2 whitespace-nowrap ${mediaTab === 'MANGA' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                        >
                            <Book className="w-5 h-5" /> Manga ({mangaEdges.length})
                        </button>
                        <button 
                            onClick={() => setMediaTab('ANALYSIS')}
                            className={`pb-2 flex items-center gap-2 font-bold transition-colors border-b-2 whitespace-nowrap ${mediaTab === 'ANALYSIS' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                        >
                            <BrainCircuit className="w-5 h-5" /> Analysis
                        </button>
                        <button 
                            onClick={() => setMediaTab('QUOTES')}
                            className={`pb-2 flex items-center gap-2 font-bold transition-colors border-b-2 whitespace-nowrap ${mediaTab === 'QUOTES' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                        >
                            <Quote className="w-5 h-5" /> Quotes
                        </button>
                        <button 
                            onClick={() => setMediaTab('COMMENTS')}
                            className={`pb-2 flex items-center gap-2 font-bold transition-colors border-b-2 whitespace-nowrap ${mediaTab === 'COMMENTS' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                        >
                            <MessageSquare className="w-5 h-5" /> Discussions
                        </button>
                    </div>

                    {mediaTab === 'ANALYSIS' && (
                        <div className="animate-fadeIn">
                            {loadingAnalysis ? (
                                <div className="text-center py-12 flex flex-col items-center gap-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p className="text-slate-400">Analyzing character psyche...</p>
                                </div>
                            ) : analysis ? (
                                <div className="bg-dark-800 p-8 rounded-2xl border border-white/5 shadow-2xl">
                                    <div className="prose prose-invert max-w-none text-slate-200 leading-loose">
                                        <div dangerouslySetInnerHTML={{__html: analysis.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}} />
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-white/10 text-xs text-slate-500 flex items-center gap-2">
                                        <BrainCircuit className="w-4 h-4" /> Generated by Gemini AI based on public data.
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500">Analysis unavailable.</div>
                            )}
                        </div>
                    )}

                    {mediaTab === 'QUOTES' && (
                        <div className="space-y-4 animate-fadeIn">
                            {quotes.length > 0 ? (
                                <div className="grid gap-4">
                                    {quotes.map((quote, i) => (
                                        <div key={i} className="bg-dark-800 p-6 rounded-xl border border-white/5 relative group hover:border-primary/30 transition-colors">
                                            <Quote className="w-8 h-8 text-primary/20 absolute top-4 left-4" />
                                            <p className="text-lg text-slate-200 italic font-serif leading-relaxed pl-8">"{quote}"</p>
                                            <button 
                                                onClick={() => copyQuote(quote)}
                                                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Copy Quote"
                                            >
                                                <Copy className="w-4 h-4 text-slate-400 hover:text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-slate-500 py-8">No quotes found for this character.</div>
                            )}
                        </div>
                    )}

                    {mediaTab === 'COMMENTS' && (
                        <div className="space-y-6 animate-fadeIn">
                            {user ? (
                                <form onSubmit={handlePostComment} className="flex gap-3 items-start bg-dark-800 p-4 rounded-xl border border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0">
                                        {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">{user.displayName?.[0]}</div>}
                                    </div>
                                    <div className="flex-1">
                                        <MentionInput 
                                            value={newComment}
                                            onChange={setNewComment}
                                            placeholder={`Share your thoughts on ${char.name.full}...`}
                                            className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-sm focus:border-primary outline-none text-white min-h-[80px]"
                                        />
                                        <div className="flex justify-end mt-2">
                                            <button type="submit" className="bg-primary px-6 py-2 rounded-lg font-bold text-sm text-white hover:bg-blue-600 transition-colors flex items-center gap-2">
                                                <Send className="w-4 h-4" /> Post
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="text-center p-8 bg-dark-800 rounded-xl border border-white/5 text-slate-400">
                                    Log in to join the discussion.
                                </div>
                            )}

                            <div className="space-y-4">
                                {comments.length === 0 && <div className="text-center text-slate-500 py-8">No comments yet. Be the first!</div>}
                                {comments.map(comment => (
                                    <div key={comment.id} className="bg-dark-800 p-5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                                {comment.userAvatar ? <img src={comment.userAvatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{comment.userName[0]}</div>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-white">{comment.userName}</div>
                                                <div className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <p className="text-slate-300 text-sm leading-relaxed">{comment.content}</p>
                                        <div className="mt-3 flex gap-4 text-xs font-bold text-slate-500">
                                            <button className="flex items-center gap-1 hover:text-white"><ThumbsUp className="w-3 h-3"/> {comment.likes || 0}</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {mediaTab !== 'COMMENTS' && mediaTab !== 'QUOTES' && mediaTab !== 'ANALYSIS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 animate-fadeIn">
                            {displayedEdges.map((edge: any, idx: number) => (
                                <div key={`${edge.node.id}-${idx}`} className="bg-dark-800 p-3 rounded-xl border border-white/5 flex gap-3 hover:border-white/20 transition-colors">
                                    <Link to={`/${edge.node.type.toLowerCase()}/${edge.node.id}`} className="shrink-0 w-16 h-24">
                                        <LazyImage src={edge.node.coverImage.medium} alt="" className="w-full h-full object-cover rounded" />
                                    </Link>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                        <div>
                                            <Link to={`/${edge.node.type.toLowerCase()}/${edge.node.id}`} className="font-bold text-sm line-clamp-1 hover:text-primary transition-colors">
                                                {edge.node.title.english || edge.node.title.romaji}
                                            </Link>
                                            <div className="text-xs text-slate-400">
                                                {edge.node.format} • {edge.node.seasonYear}
                                                {edge.characterRole && <span className="ml-1 text-primary">• {edge.characterRole}</span>}
                                            </div>
                                        </div>
                                        
                                        {mediaTab === 'ANIME' && edge.voiceActors && edge.voiceActors.length > 0 && (
                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                                <div className="text-xs text-slate-500 mr-auto flex items-center gap-1"><Mic className="w-3 h-3" /> Voice</div>
                                                {edge.voiceActors.slice(0, 2).map((va: any) => (
                                                    <Link to={`/staff/${va.id}`} key={va.id} className="flex items-center gap-2 group" title={va.languageV2}>
                                                        <div className="text-right">
                                                            <div className="text-xs font-bold group-hover:text-primary transition-colors">{va.name.full}</div>
                                                            <div className="text-[10px] text-slate-500">{va.languageV2}</div>
                                                        </div>
                                                        <img src={va.image.medium} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {displayedEdges.length === 0 && <div className="text-slate-500 italic">No appearances found.</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default CharacterDetails;
