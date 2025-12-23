
import React, { useState, useRef, useEffect } from 'react';
import { aiService } from '../services/ai';
import { Send, Sword, Shield, Map as MapIcon, RefreshCw, Backpack, Heart, Skull, Globe } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

interface GameState {
    hp: number;
    inventory: string[];
    location: string;
    narrative: string;
    choices: string[];
}

const WORLDS = [
    { name: "Re:Zero", image: "https://c4.wallpaperflare.com/wallpaper/787/854/424/re-zero-kara-hajimeru-isekai-seikatsu-emilia-re-zero-natsuki-subaru-rem-re-zero-wallpaper-preview.jpg" },
    { name: "Mushoku Tensei", image: "https://c4.wallpaperflare.com/wallpaper/34/967/780/mushoku-tensei-isekai-ittara-honki-dasu-rudeus-greyrat-sylphiette-mushoku-tensei-wallpaper-preview.jpg" },
    { name: "Konosuba", image: "https://c4.wallpaperflare.com/wallpaper/872/791/566/konosuba-megumin-konosuba-aqua-konosuba-darkness-konosuba-wallpaper-preview.jpg" },
    { name: "Overlord", image: "https://c4.wallpaperflare.com/wallpaper/237/262/676/overlord-anime-ainz-ooal-gown-albedo-overlord-wallpaper-preview.jpg" },
    { name: "Slime Isekai", image: "https://c4.wallpaperflare.com/wallpaper/362/275/737/tensei-shitara-slime-datta-ken-rimuru-tempest-anime-boys-anime-girls-wallpaper-preview.jpg" },
    { name: "Shield Hero", image: "https://c4.wallpaperflare.com/wallpaper/559/364/976/anime-the-rising-of-the-shield-hero-naofumi-iwatani-raphtalia-wallpaper-preview.jpg" }
];

const Isekai: React.FC = () => {
    const [started, setStarted] = useState(false);
    const [selectedWorld, setSelectedWorld] = useState(WORLDS[0]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const { settings } = useSettings();
    
    // Game State
    const [history, setHistory] = useState<{role: 'ai'|'user', text: string}[]>([]);
    const [gameState, setGameState] = useState<GameState>({
        hp: 100,
        inventory: ['Strange Coin'],
        location: 'Unknown Void',
        narrative: '',
        choices: []
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    useEffect(() => {
        if(scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const startGame = async () => {
        setStarted(true);
        setLoading(true);
        setHistory([]);
        try {
            const initialPrompt = "I open my eyes. Where am I? What do I see?";
            const res = await aiService.isekaiEngine(selectedWorld.name, initialPrompt, gameState, settings.language);
            updateGameState(res, initialPrompt);
        } catch (e) {
            showToast("Failed to transport to world.", "error");
            setStarted(false);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionText: string) => {
        if (!actionText.trim() || loading) return;
        
        // Optimistic UI
        setHistory(prev => [...prev, { role: 'user', text: actionText }]);
        setInput('');
        setLoading(true);

        try {
            const res = await aiService.isekaiEngine(selectedWorld.name, actionText, gameState, settings.language);
            updateGameState(res);
        } catch (e) {
            setHistory(prev => [...prev, { role: 'ai', text: "The world glitches... Try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const updateGameState = (res: any, initialAction?: string) => {
        // Parse Logic
        let newHp = gameState.hp + (res.hp_change || 0);
        if (newHp > 100) newHp = 100;
        if (newHp < 0) newHp = 0;

        let newInv = [...gameState.inventory];
        if (res.inventory_add) newInv = [...newInv, ...res.inventory_add];
        if (res.inventory_remove) newInv = newInv.filter(i => !res.inventory_remove.includes(i));

        const newState = {
            hp: newHp,
            inventory: newInv,
            location: res.new_location || gameState.location,
            narrative: res.narrative,
            choices: res.choices || []
        };

        setGameState(newState);
        setHistory(prev => [...prev, { role: 'ai', text: res.narrative }]);

        if (newHp <= 0) {
            setHistory(prev => [...prev, { role: 'ai', text: "YOU DIED. GAME OVER." }]);
        }
    };

    if (!started) {
        return (
            <div className="max-w-6xl mx-auto py-12 animate-fadeIn flex flex-col h-[calc(100vh-100px)]">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-4">ISEKAI ENGINE</h1>
                    <p className="text-xl text-slate-400">Choose your destination world and begin your adventure.</p>
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-500">
                        <Globe className="w-4 h-4" /> Language: {settings.language.toUpperCase()}
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center overflow-hidden">
                    <div className="flex gap-6 overflow-x-auto pb-8 w-full px-8 snap-x snap-mandatory custom-scrollbar">
                        {WORLDS.map(world => (
                            <button 
                                key={world.name}
                                onClick={() => setSelectedWorld(world)}
                                className={`snap-center flex-shrink-0 relative w-[240px] h-[360px] rounded-3xl overflow-hidden group transition-all duration-300 ${selectedWorld.name === world.name ? 'ring-4 ring-purple-500 scale-105 shadow-2xl shadow-purple-500/30' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                            >
                                <img src={world.image} alt={world.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-6">
                                    <h3 className="text-2xl font-bold text-white text-center drop-shadow-md">{world.name}</h3>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-center mt-8 pb-8">
                    <button 
                        onClick={startGame}
                        className="px-16 py-5 bg-white text-black font-black text-xl rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center gap-2"
                    >
                        <Sword className="w-6 h-6" /> START GAME
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-6 animate-fadeIn py-4">
            {/* Game Log */}
            <div className="flex-1 bg-dark-800 rounded-3xl border border-white/5 overflow-hidden flex flex-col relative shadow-2xl">
                {/* Background Atmosphere */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <img src={selectedWorld.image} className="w-full h-full object-cover blur-sm" />
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 custom-scrollbar">
                    {history.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-lg leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-purple-600/80 text-white rounded-tr-none backdrop-blur-md' 
                                : 'bg-black/60 text-slate-200 rounded-tl-none border border-white/10 backdrop-blur-md'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-black/60 p-4 rounded-2xl rounded-tl-none border border-white/10 flex gap-2 items-center">
                                <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
                                <span className="text-sm text-slate-400">The Dungeon Master is thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-dark-900/80 backdrop-blur-xl border-t border-white/10 relative z-20">
                    {gameState.hp > 0 ? (
                        <>
                            {/* Quick Choices */}
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                                {gameState.choices.map((choice, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => handleAction(choice)}
                                        className="whitespace-nowrap px-4 py-2 bg-white/5 hover:bg-purple-500/20 hover:border-purple-500 border border-white/10 rounded-full text-sm transition-colors text-slate-300 hover:text-white"
                                    >
                                        {choice}
                                    </button>
                                ))}
                            </div>
                            
                            <form onSubmit={(e) => { e.preventDefault(); handleAction(input); }} className="flex gap-3">
                                <input 
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="What do you want to do?"
                                    className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none transition-colors"
                                    autoFocus
                                />
                                <button type="submit" disabled={loading || !input.trim()} className="p-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white transition-colors disabled:opacity-50">
                                    <Send className="w-6 h-6" />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <button onClick={() => setStarted(false)} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full">
                                Reincarnate (Restart)
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Sidebar */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
                <div className="bg-dark-800 p-6 rounded-3xl border border-white/5">
                    <h3 className="font-bold text-slate-400 uppercase text-xs mb-4 tracking-widest">Character Status</h3>
                    
                    <div className="mb-6">
                        <div className="flex justify-between mb-2">
                            <span className="flex items-center gap-2 font-bold"><Heart className="w-4 h-4 text-red-500 fill-current"/> HP</span>
                            <span className={`${gameState.hp < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{gameState.hp} / 100</span>
                        </div>
                        <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${gameState.hp}%` }}></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-dark-900 rounded-xl border border-white/5">
                            <MapIcon className="w-5 h-5 text-blue-400" />
                            <div>
                                <div className="text-xs text-slate-500 uppercase">Location</div>
                                <div className="font-bold text-sm">{gameState.location}</div>
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-400">
                                <Backpack className="w-4 h-4" /> Inventory
                            </div>
                            <div className="bg-dark-900 rounded-xl p-3 border border-white/5 min-h-[100px]">
                                {gameState.inventory.length > 0 ? (
                                    <ul className="space-y-1">
                                        {gameState.inventory.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : <div className="text-xs text-slate-600 italic">Empty</div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 p-6 rounded-3xl border border-white/10 text-center">
                    <h3 className="font-display font-bold text-xl mb-1">{selectedWorld.name}</h3>
                    <p className="text-xs text-white/60">Current World</p>
                </div>
                
                <button onClick={() => setStarted(false)} className="bg-dark-800 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 p-4 rounded-2xl border border-white/5 transition-all text-sm font-bold">
                    Quit Game
                </button>
            </div>
        </div>
    );
};

export default Isekai;
