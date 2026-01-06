
import React, { useState, useEffect } from 'react';
import { aiService } from '../services/ai';
import { firebaseService } from '../services/firebase';
import { anilistService } from '../services/anilist';
import PremiumGuard from '../components/PremiumGuard';
import { Sparkles, MessageSquare, Image as ImageIcon, Video, Search, Mic, BrainCircuit, Upload, Send, Loader2, Download, Bolt, Volume2, Play, User } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { AIFeatureConfig, UserProfile } from '../types';

const AIStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [config, setConfig] = useState<AIFeatureConfig>({});
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
      const init = async () => {
          const [conf, authUser] = await Promise.all([
              firebaseService.getAIFeatures(),
              firebaseService.getAuthInstance().currentUser
          ]);
          setConfig(conf);
          
          if (authUser) {
              const profile = await firebaseService.getUserData(authUser.uid);
              setUserProfile(profile);
          }
          setLoading(false);
      };
      init();
  }, []);

  const tabs = [
      { id: 'chat', label: 'Chat & Think', icon: MessageSquare },
      { id: 'character', label: 'Character Chat', icon: User },
      { id: 'search', label: 'Smart Search', icon: Search },
      { id: 'image', label: 'Image Editor', icon: ImageIcon },
      { id: 'video', label: 'Video Gen', icon: Video },
      { id: 'analyze', label: 'Analyze Media', icon: BrainCircuit },
      { id: 'tts', label: 'Text to Speech', icon: Volume2 },
  ];

  // Filter tabs based on 'enabled' config
  const enabledTabs = tabs.filter(t => config[t.id]?.enabled !== false);

  const isTabPremium = (id: string) => config[id]?.isPremium;
  const canAccess = (id: string) => !isTabPremium(id) || userProfile?.isPremium;

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-purple-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn py-8">
        <div className="text-center space-y-4">
            <h1 className="text-4xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                AniStream AI Studio
            </h1>
            <p className="text-slate-400">Powered by Gemini & Veo. Create, Analyze, and Discover.</p>
        </div>

        {/* Tab Nav */}
        <div className="flex flex-wrap justify-center gap-4">
            {enabledTabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                        activeTab === tab.id 
                        ? 'bg-white text-black shadow-lg scale-105' 
                        : 'bg-dark-800 text-slate-400 hover:text-white border border-white/5'
                    }`}
                >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                    {isTabPremium(tab.id) && <span className="bg-yellow-500 text-black text-[10px] px-1.5 py-0.5 rounded font-bold ml-1">PRO</span>}
                </button>
            ))}
        </div>

        <div className="bg-dark-900 rounded-3xl border border-white/10 p-1 min-h-[600px]">
            <div className="bg-dark-800 rounded-[22px] h-full p-6 md:p-8">
                {/* Dynamic Guard */}
                {canAccess(activeTab) ? (
                    <>
                        {activeTab === 'chat' && <ChatModule />}
                        {activeTab === 'character' && <CharacterChatModule />}
                        {activeTab === 'search' && <SearchModule />}
                        {activeTab === 'image' && <ImageEditorModule />}
                        {activeTab === 'video' && <VideoGenModule />}
                        {activeTab === 'analyze' && <AnalysisModule />}
                        {activeTab === 'tts' && <TTSModule />}
                    </>
                ) : (
                    <PremiumGuard>
                        <div /> {/* Placeholder to satisfy children prop */}
                    </PremiumGuard>
                )}
            </div>
        </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const CharacterChatModule = () => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedChar, setSelectedChar] = useState<any>(null);
    const [systemInstruction, setSystemInstruction] = useState('You are a helpful anime character. Stay in character.');
    const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingSearch, setLoadingSearch] = useState(false);

    const searchCharacters = async (e: React.FormEvent) => {
        e.preventDefault();
        if (query.length < 2) return;
        setLoadingSearch(true);
        try {
             const q = `
            query ($search: String) {
                Page(perPage: 5) {
                    characters(search: $search, sort: FAVOURITES_DESC) {
                        id
                        name { full }
                        image { large }
                        description
                    }
                }
            }
          `;
          const data = await anilistService.fetchGraphQL(q, { search: query });
          setSearchResults(data.Page.characters);
        } catch(e) {
            console.error(e);
        } finally {
            setLoadingSearch(false);
        }
    };

    const selectChar = (char: any) => {
        setSelectedChar(char);
        // clean description of html tags
        const desc = char.description ? char.description.replace(/<[^>]*>?/gm, '') : "No description.";
        setSystemInstruction(`You are ${char.name.full}. ${desc.substring(0, 800)}\n\nStay in character at all times. Respond conversationally.`);
        setSearchResults([]);
        setQuery('');
        setMessages([]); 
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const newMsgs = [...messages, { role: 'user' as const, text: input }];
        setMessages(newMsgs);
        setInput('');
        setLoading(true);
        
        try {
            const response = await aiService.chat(input, messages, systemInstruction);
            setMessages([...newMsgs, { role: 'model', text: response }]);
        } catch(e) {
            setMessages([...newMsgs, { role: 'model', text: "Error." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 min-h-[500px]">
            <div className="w-full md:w-1/3 flex flex-col gap-4">
                <div className="bg-dark-900 p-4 rounded-2xl border border-white/5 h-full">
                    <h3 className="font-bold mb-4 text-purple-400 flex items-center gap-2"><User className="w-5 h-5"/> Character Setup</h3>
                    <form onSubmit={searchCharacters} className="relative mb-4">
                        <input 
                            value={query} 
                            onChange={e => setQuery(e.target.value)} 
                            placeholder="Search Character..." 
                            className="w-full bg-dark-800 border border-white/10 rounded-lg p-3 pr-10 text-sm focus:border-purple-500 outline-none transition-colors"
                        />
                        <button type="submit" className="absolute right-2 top-2.5 text-slate-400 hover:text-white"><Search className="w-4 h-4"/></button>
                    </form>
                    
                    {loadingSearch && <div className="text-center py-4"><Loader2 className="animate-spin w-6 h-6 mx-auto text-purple-500"/></div>}
                    
                    {searchResults.length > 0 && (
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar mb-4 bg-dark-800 rounded-lg p-2 border border-white/5">
                            {searchResults.map(char => (
                                <button key={char.id} onClick={() => selectChar(char)} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-left transition-colors">
                                    <img src={char.image.large} className="w-8 h-8 rounded-full object-cover"/>
                                    <span className="text-sm font-bold truncate">{char.name.full}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedChar && (
                        <div className="flex items-center gap-3 mb-4 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                             <img src={selectedChar.image.large} className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"/>
                             <div>
                                 <div className="font-bold text-white">{selectedChar.name.full}</div>
                                 <div className="text-[10px] text-purple-300">Active Persona</div>
                             </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">System Instruction (Editable)</label>
                        <textarea 
                            value={systemInstruction}
                            onChange={e => setSystemInstruction(e.target.value)}
                            className="w-full bg-dark-800 border border-white/10 rounded-xl p-3 text-xs h-48 focus:border-purple-500 outline-none resize-none leading-relaxed text-slate-300 custom-scrollbar"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-dark-900 rounded-2xl border border-white/5 flex flex-col p-4 h-[600px] md:h-auto">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar pr-2">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50 gap-2">
                            <MessageSquare className="w-12 h-12"/>
                            <p>Start chatting with {selectedChar ? selectedChar.name.full : 'your character'}</p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-dark-700 text-slate-200 rounded-tl-none'}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-dark-700 p-4 rounded-2xl rounded-tl-none">
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            </div>
                        </div>
                    )}
                </div>
                <form onSubmit={handleSend} className="flex gap-2">
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                        autoFocus
                    />
                    <button type="submit" disabled={!input.trim() || loading} className="p-3 bg-purple-600 rounded-xl text-white hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-lg shadow-purple-900/20">
                        <Send className="w-5 h-5"/>
                    </button>
                </form>
            </div>
        </div>
    )
}

const ChatModule = () => {
    const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const [mode, setMode] = useState<'standard' | 'thinking' | 'fast'>('standard');

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        
        const newHistory = [...messages, { role: 'user' as const, text: input }];
        setMessages(newHistory);
        setInput('');
        setThinking(true);

        try {
            let responseText = '';
            if (mode === 'thinking') {
                responseText = await aiService.complexQuery(input);
            } else if (mode === 'fast') {
                responseText = await aiService.fastChat(input);
            } else {
                responseText = await aiService.chat(input, messages);
            }
            setMessages([...newHistory, { role: 'model', text: responseText }]);
        } catch (e) {
            setMessages([...newHistory, { role: 'model', text: "Error connecting to AI." }]);
        } finally {
            setThinking(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px]">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="w-6 h-6 text-purple-400" /> AI Assistant</h2>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setMode('fast')}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${mode === 'fast' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400'}`}
                        title="Flash Lite (Fast)"
                    >
                        <Bolt className="w-3 h-3" /> Fast
                    </button>
                    <button 
                        onClick={() => setMode('standard')}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${mode === 'standard' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400'}`}
                        title="Pro (Standard)"
                    >
                        <Sparkles className="w-3 h-3" /> Pro
                    </button>
                    <button 
                        onClick={() => setMode('thinking')}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${mode === 'thinking' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400'}`}
                        title="Thinking Mode (Deep)"
                    >
                        <BrainCircuit className="w-3 h-3" /> Thinking
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar pr-2">
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 mt-20">
                        Ask me anything! <br/>
                        <span className="text-xs opacity-70">
                            Fast: Flash Lite | Pro: Gemini 3 Pro | Thinking: Deep Reason
                        </span>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-dark-700 text-slate-200 rounded-tl-none'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {thinking && <div className="text-slate-500 text-sm animate-pulse">Gemini is {mode === 'thinking' ? 'thinking deeply...' : 'typing...'}</div>}
            </div>

            <form onSubmit={handleSend} className="flex gap-2">
                <input 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500"
                />
                <button type="submit" className="p-3 bg-purple-600 rounded-xl hover:bg-purple-700 text-white"><Send className="w-5 h-5" /></button>
            </form>
        </div>
    );
};

const SearchModule = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<{text: string, sources: any[]} | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await aiService.search(query);
            setResult(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Search className="w-6 h-6 text-blue-400" /> Search Grounding</h2>
            
            <form onSubmit={handleSearch} className="mb-8">
                <div className="relative">
                    <input 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Ask about current anime trends, news, or facts..."
                        className="w-full bg-dark-900 border border-white/10 rounded-xl py-4 pl-6 pr-14 text-lg outline-none focus:border-blue-500"
                    />
                    <button type="submit" className="absolute right-2 top-2 p-2 bg-blue-600 rounded-lg text-white"><Search className="w-6 h-6" /></button>
                </div>
            </form>

            {loading && <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>}

            {result && (
                <div className="bg-dark-900 p-6 rounded-2xl border border-white/5 overflow-y-auto flex-1">
                    <div className="prose prose-invert max-w-none mb-6">
                        {result.text}
                    </div>
                    {result.sources.length > 0 && (
                        <div className="border-t border-white/5 pt-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Sources</h4>
                            <div className="flex flex-wrap gap-2">
                                {result.sources.map((s, i) => (
                                    <a key={i} href={s.web?.uri} target="_blank" rel="noreferrer" className="text-xs bg-dark-800 border border-white/10 px-3 py-1 rounded-full text-blue-400 hover:text-white truncate max-w-[200px]">
                                        {s.web?.title || s.web?.uri}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ImageEditorModule = () => {
    const [image, setImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!image || !prompt) return;
        setLoading(true);
        // Extract base64 (remove prefix)
        const base64 = image.split(',')[1];
        try {
            const newImage = await aiService.editImage(base64, prompt);
            setResultImage(newImage);
        } catch (e) {
            alert("Edit failed. Please try a different prompt.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><ImageIcon className="w-6 h-6 text-pink-400" /> Image Editor</h2>
            
            <div className="grid md:grid-cols-2 gap-8 flex-1">
                <div className="space-y-4">
                    <div className="aspect-square bg-dark-900 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden">
                        {image ? (
                            <img src={image} className="w-full h-full object-contain" alt="Original" />
                        ) : (
                            <label className="cursor-pointer text-center text-slate-500 p-4">
                                <Upload className="w-10 h-10 mx-auto mb-2" />
                                <span>Upload Image</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                            </label>
                        )}
                    </div>
                    <textarea 
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Instructions (e.g., 'Add a retro filter', 'Make it cyberpunk style')..."
                        className="w-full bg-dark-900 border border-white/10 rounded-xl p-4 outline-none focus:border-pink-500 h-32"
                    />
                    <button 
                        onClick={handleGenerate} 
                        disabled={loading || !image}
                        className="w-full bg-pink-600 py-3 rounded-xl font-bold text-white hover:bg-pink-700 disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Edit Image'}
                    </button>
                </div>

                <div className="aspect-square bg-black rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden">
                    {resultImage ? (
                        <>
                            <img src={resultImage} className="w-full h-full object-contain" alt="Result" />
                            <a href={resultImage} download="edited.png" className="absolute bottom-4 right-4 p-2 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform">
                                <Download className="w-6 h-6" />
                            </a>
                        </>
                    ) : (
                        <div className="text-slate-500 flex flex-col items-center">
                            <Sparkles className="w-10 h-10 mb-2 opacity-50" />
                            <span>Result will appear here</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const VideoGenModule = () => {
    const [prompt, setPrompt] = useState('');
    const [aspect, setAspect] = useState<'16:9' | '9:16'>('16:9');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [refImage, setRefImage] = useState<string | null>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setRefImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        try {
            const base64 = refImage ? refImage.split(',')[1] : undefined;
            const url = await aiService.generateVideo(prompt, aspect, base64);
            setVideoUrl(url);
        } catch (e) {
            alert("Video generation failed. Ensure API key has Veo access.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Video className="w-6 h-6 text-green-400" /> Veo Video Generator</h2>
            
            <div className="bg-dark-900 p-6 rounded-2xl border border-white/5 space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Image Prompt (Optional)</label>
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-green-500/50" onClick={() => document.getElementById('vid-img-upload')?.click()}>
                        {refImage ? (
                            <div className="flex items-center justify-center gap-2">
                                <img src={refImage} className="h-12 w-12 rounded object-cover" />
                                <span className="text-xs text-green-400">Image Loaded</span>
                            </div>
                        ) : (
                            <span className="text-slate-500 text-sm">Upload an image to animate</span>
                        )}
                        <input type="file" id="vid-img-upload" accept="image/*" className="hidden" onChange={handleUpload} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Text Prompt</label>
                    <textarea 
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Describe the video you want to generate (e.g., 'A cyberpunk city at night with neon rain')..."
                        className="w-full bg-dark-800 border border-white/10 rounded-xl p-4 outline-none focus:border-green-500 h-24"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Aspect Ratio</label>
                    <div className="flex gap-4">
                        <button onClick={() => setAspect('16:9')} className={`flex-1 py-3 rounded-xl border ${aspect === '16:9' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/10 text-slate-400'}`}>Landscape (16:9)</button>
                        <button onClick={() => setAspect('9:16')} className={`flex-1 py-3 rounded-xl border ${aspect === '9:16' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/10 text-slate-400'}`}>Portrait (9:16)</button>
                    </div>
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                >
                    {loading ? 'Generating Video (This takes time)...' : 'Generate Video'}
                </button>
            </div>

            {videoUrl && (
                <div className="mt-8">
                    <h3 className="font-bold mb-4">Result</h3>
                    <video controls src={videoUrl} className="w-full rounded-2xl shadow-2xl bg-black" />
                </div>
            )}
        </div>
    );
};

const AnalysisModule = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('Describe this image in detail.');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(f);
        }
    };

    const handleAnalyze = async () => {
        if (!file || !preview) return;
        setLoading(true);
        try {
            const base64 = preview.split(',')[1];
            // Determine if audio or image
            if (file.type.startsWith('audio')) {
                const text = await aiService.transcribeAudio(base64);
                setResult(text);
            } else {
                const text = await aiService.analyzeMedia(file.type, base64, prompt);
                setResult(text);
            }
        } catch (e) {
            setResult("Analysis failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><BrainCircuit className="w-6 h-6 text-yellow-400" /> Media Analysis</h2>
                
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center bg-dark-900">
                    <input type="file" accept="image/*,audio/*" onChange={handleUpload} className="hidden" id="upload-analysis" />
                    <label htmlFor="upload-analysis" className="cursor-pointer block">
                        {preview ? (
                            file?.type.startsWith('image') ? <img src={preview} className="max-h-48 mx-auto rounded" /> : <div className="p-4 bg-dark-800 rounded"><Mic className="w-8 h-8 mx-auto"/> {file?.name}</div>
                        ) : (
                            <div className="text-slate-500">
                                <Upload className="w-10 h-10 mx-auto mb-2" />
                                <span>Upload Image or Audio</span>
                            </div>
                        )}
                    </label>
                </div>

                <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl p-4 outline-none focus:border-yellow-500 h-24"
                    placeholder="Ask a question about the file..."
                />

                <button 
                    onClick={handleAnalyze}
                    disabled={loading || !file}
                    className="w-full bg-yellow-600 text-white font-bold py-3 rounded-xl hover:bg-yellow-700 disabled:opacity-50"
                >
                    {loading ? 'Analyzing...' : 'Analyze'}
                </button>
            </div>

            <div className="bg-dark-900 rounded-2xl p-6 border border-white/5 overflow-y-auto">
                <h3 className="font-bold text-slate-400 mb-4 uppercase text-xs">Analysis Result</h3>
                <div className="prose prose-invert">
                    {result || <span className="text-slate-600 italic">Result will appear here...</span>}
                </div>
            </div>
        </div>
    );
};

const TTSModule = () => {
    const [text, setText] = useState('');
    const [voice, setVoice] = useState('Kore');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!text) return;
        setLoading(true);
        setAudioUrl(null);
        try {
            const audioBuffer = await aiService.generateSpeech(text, voice);
            // Convert Buffer to Blob for playback
            const wav = audioBufferToWav(audioBuffer);
            const blob = new Blob([wav], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
        } catch (e) {
            console.error(e);
            alert("TTS Failed");
        } finally {
            setLoading(false);
        }
    };

    // Helper to convert Web Audio API Buffer to WAV file format for simple playback
    const audioBufferToWav = (buffer: AudioBuffer) => {
        const length = buffer.length * buffer.numberOfChannels * 2 + 44;
        const view = new DataView(new ArrayBuffer(length));
        const channels = [];
        let sample;
        let offset = 0;
        let pos = 0;

        const writeString = (s: string) => {
            for (let i = 0; i < s.length; i++) {
                view.setUint8(pos++, s.charCodeAt(i));
            }
        };

        writeString("RIFF");
        view.setUint32(pos, length - 8, true); pos += 4;
        writeString("WAVE");
        writeString("fmt ");
        view.setUint32(pos, 16, true); pos += 4;
        view.setUint16(pos, 1, true); pos += 2;
        view.setUint16(pos, buffer.numberOfChannels, true); pos += 2;
        view.setUint32(pos, buffer.sampleRate, true); pos += 4;
        view.setUint32(pos, buffer.sampleRate * 2 * buffer.numberOfChannels, true); pos += 4;
        view.setUint16(pos, buffer.numberOfChannels * 2, true); pos += 2;
        view.setUint16(pos, 16, true); pos += 2;
        writeString("data");
        view.setUint32(pos, length - pos - 4, true); pos += 4;

        for(let i=0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

        while(pos < length) {
            for(let i=0; i < buffer.numberOfChannels; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
                view.setInt16(pos, sample, true); pos += 2;
            }
            offset++;
        }
        return view.buffer;
    };

    return (
        <div className="h-full flex flex-col max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Volume2 className="w-6 h-6 text-cyan-400" /> Text to Speech</h2>
            
            <div className="bg-dark-900 p-6 rounded-2xl border border-white/5 space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Voice Model</label>
                    <div className="flex gap-2 bg-dark-800 p-1 rounded-lg w-fit">
                        {['Kore', 'Puck', 'Fenrir', 'Zephyr'].map(v => (
                            <button 
                                key={v}
                                onClick={() => setVoice(v)}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${voice === v ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Text Input</label>
                    <textarea 
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Enter text to generate speech..."
                        className="w-full bg-dark-800 border border-white/10 rounded-xl p-4 outline-none focus:border-cyan-500 h-32"
                    />
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={loading || !text}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                    Generate Audio
                </button>
            </div>

            {audioUrl && (
                <div className="mt-8 bg-dark-900 p-6 rounded-2xl border border-white/5 text-center">
                    <h3 className="font-bold mb-4 text-cyan-400">Audio Ready</h3>
                    <audio controls src={audioUrl} className="w-full mb-4" />
                    <a href={audioUrl} download="speech.wav" className="text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Download WAV
                    </a>
                </div>
            )}
        </div>
    );
};

export default AIStudio;