import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebase';
import { anilistService } from '../services/anilist';
import { useToast } from '../context/ToastContext';
import { Anime, Episode } from '../types';
import { Search, ShieldAlert, Check, Trash2 } from 'lucide-react';
import LazyImage from '../components/LazyImage';

const AdminDashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Search / Selection
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Anime[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<Anime | null>(null);
    
    // Content Mode
    const [contentMode, setContentMode] = useState<'ANIME' | 'MANGA'>('ANIME');

    // Forms
    const [epForm, setEpForm] = useState({
        number: 1,
        title: '',
        url: '',
        thumbnail: '',
        type: 'video',
        audio: 'sub',
        language: 'en'
    });

    // Existing Content
    const [existingEpisodes, setExistingEpisodes] = useState<Episode[]>([]);

    const { showToast } = useToast();

    useEffect(() => {
        const auth = firebaseService.getAuthInstance();
        if (auth.currentUser) {
            setUser(auth.currentUser);
            firebaseService.getUserData(auth.currentUser.uid).then(p => {
                setIsAdmin(p?.isAdmin || false);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedMedia && contentMode === 'ANIME') {
            const unsub = firebaseService.subscribeToEpisodes(selectedMedia.id, setExistingEpisodes);
            return () => unsub();
        }
    }, [selectedMedia, contentMode]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;
        try {
            const res = await anilistService.searchAnime({ query, type: contentMode, page: 1 });
            setSearchResults(res.Page.media);
        } catch (e) {
            showToast("Search failed", "error");
        }
    };

    const handleAddEpisode = async () => {
        if (!selectedMedia) return;
        if (!epForm.url) return showToast("URL required", "error");

        try {
            await firebaseService.addEpisode(selectedMedia.id, {
                animeId: selectedMedia.id,
                number: epForm.number,
                title: epForm.title || `Episode ${epForm.number}`,
                thumbnail: epForm.thumbnail || undefined,
                sources: [{
                    name: 'Default',
                    url: epForm.url,
                    type: epForm.type as any,
                    audio: epForm.audio
                }],
                language: epForm.language,
                createdAt: Date.now()
            });
            showToast("Episode Added", "success");
            setEpForm(prev => ({ ...prev, number: prev.number + 1, title: '', url: '', thumbnail: '' }));
        } catch (e) {
            console.error(e);
            showToast("Failed to add episode", "error");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!isAdmin) return <div className="p-10 text-center text-red-500">Access Denied</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn py-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-red-500" /> Admin Dashboard
            </h1>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Left Panel: Search & Select */}
                <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-6">
                    <div className="flex bg-dark-900 p-1 rounded-lg">
                        <button onClick={() => setContentMode('ANIME')} className={`flex-1 py-2 rounded font-bold ${contentMode === 'ANIME' ? 'bg-primary text-white' : 'text-slate-400'}`}>Anime</button>
                        <button onClick={() => setContentMode('MANGA')} className={`flex-1 py-2 rounded font-bold ${contentMode === 'MANGA' ? 'bg-primary text-white' : 'text-slate-400'}`}>Manga</button>
                    </div>

                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." className="flex-1 bg-dark-900 border border-white/10 rounded-lg p-3 outline-none focus:border-primary" />
                        <button type="submit" className="p-3 bg-primary rounded-lg text-white"><Search className="w-5 h-5" /></button>
                    </form>

                    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                        {searchResults.map(item => (
                            <button key={item.id} onClick={() => setSelectedMedia(item)} className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${selectedMedia?.id === item.id ? 'bg-primary/20 border border-primary/50' : 'hover:bg-white/5'}`}>
                                <LazyImage src={item.coverImage.medium} alt="" className="w-10 h-14 rounded object-cover" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold truncate text-sm">{item.title.romaji}</div>
                                    <div className="text-xs text-slate-500">{item.format} • {item.seasonYear}</div>
                                </div>
                                {selectedMedia?.id === item.id && <Check className="w-4 h-4 text-primary" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Content Management */}
                <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-6">
                    {!selectedMedia ? (
                        <div className="text-center text-slate-500 py-12">Select a series to manage content.</div>
                    ) : (
                        <>
                            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                                <img src={selectedMedia.coverImage.medium} className="w-12 h-16 rounded object-cover" alt="" />
                                <div>
                                    <h2 className="font-bold text-lg">{selectedMedia.title.romaji}</h2>
                                    <p className="text-xs text-slate-400">ID: {selectedMedia.id}</p>
                                </div>
                            </div>

                            {contentMode === 'ANIME' ? (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-24">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Num</label>
                                            <input type="number" value={epForm.number} onChange={e => setEpForm({...epForm, number: parseInt(e.target.value)})} className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-center font-bold" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Episode Title</label>
                                            <input value={epForm.title} onChange={e => setEpForm({...epForm, title: e.target.value})} placeholder="Optional..." className="w-full bg-dark-900 border border-white/10 rounded-xl p-3" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Stream Endpoint (HLS/Direct/Embed)</label>
                                        <input 
                                            value={epForm.url} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                let type = epForm.type;
                                                // Auto-detect embed services
                                                if (val.includes('drive.google.com') || val.includes('mega.nz') || val.includes('mega.co.nz')) {
                                                    type = 'embed';
                                                }
                                                setEpForm({...epForm, url: val, type});
                                            }} 
                                            placeholder="https://..." 
                                            className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 font-mono text-xs" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Thumbnail Overide URL</label>
                                        <input value={epForm.thumbnail} onChange={e => setEpForm({...epForm, thumbnail: e.target.value})} placeholder="https://..." className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-xs" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <select value={epForm.type} onChange={e => setEpForm({...epForm, type: e.target.value})} className="bg-dark-900 border border-white/10 rounded-xl p-3 text-xs font-bold">
                                            <option value="video">DIRECT</option>
                                            <option value="embed">EMBED</option>
                                            <option value="hls">HLS</option>
                                        </select>
                                        <select value={epForm.audio} onChange={e => setEpForm({...epForm, audio: e.target.value})} className="bg-dark-900 border border-white/10 rounded-xl p-3 text-xs font-bold">
                                            <option value="sub">SUB</option>
                                            <option value="dub">DUB</option>
                                        </select>
                                        <input value={epForm.language} onChange={e => setEpForm({...epForm, language: e.target.value})} className="bg-dark-900 border border-white/10 rounded-xl p-3 text-xs font-bold" />
                                    </div>
                                    <button onClick={handleAddEpisode} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95">ADD EPISODE</button>
                                </div>
                            ) : (
                                <div className="text-center text-slate-500 py-12">Manga management coming soon.</div>
                            )}

                            {/* List Existing */}
                            <div className="border-t border-white/5 pt-6 mt-6">
                                <h3 className="font-bold mb-4">Existing Content</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {contentMode === 'ANIME' && existingEpisodes.map(ep => (
                                        <div key={ep.id} className="flex justify-between items-center p-2 bg-dark-900 rounded-lg">
                                            <span className="text-sm">Ep {ep.number}: {ep.title}</span>
                                            <button onClick={() => ep.id && firebaseService.deleteEpisode(selectedMedia.id, ep.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;