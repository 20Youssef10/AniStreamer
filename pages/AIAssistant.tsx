
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Send, Bot, User, Sparkles, Loader2, RefreshCw, Zap, Heart, Sword, Coffee, Phone, Mic, MicOff, PhoneOff, Activity, Search, X, Volume2, Radio } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { Character } from '../types';
import LazyImage from '../components/LazyImage';
import { aiService } from '../services/ai';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
}

const SCENARIOS = [
    { id: 'casual', label: 'Casual Hangout', icon: Coffee, color: 'text-amber-400', prompt: "We are just hanging out casually. Keep it relaxed." },
    { id: 'romance', label: 'Heart to Heart', icon: Heart, color: 'text-pink-400', prompt: "We are having a deep, emotional conversation. There is a romantic tension." },
    { id: 'battle', label: 'Training Arc', icon: Sword, color: 'text-red-400', prompt: "We are in the middle of intense training or a battle. Be aggressive and motivating." },
    { id: 'adventure', label: 'Adventure', icon: Zap, color: 'text-yellow-400', prompt: "We are on a quest together. Analyze the surroundings and lead the way." },
];

// --- Audio Utils for Gemini Live ---
function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const AIAssistant: React.FC = () => {
  // Mode State
  const [mode, setMode] = useState<'SELECT' | 'CHAT' | 'CALL'>('SELECT');
  
  // Selection State
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Character[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  // --- Live Call State ---
  const [isCallActive, setIsCallActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [micMuted, setMicMuted] = useState(false);
  const [modelSpeaking, setModelSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const sessionRef = useRef<any>(null);

  // Search Logic
  useEffect(() => {
      const delayDebounceFn = setTimeout(async () => {
          if (query.length > 2) {
              setIsSearching(true);
              try {
                  const queryChar = `
                    query ($search: String) {
                        Page(perPage: 6) {
                            characters(search: $search, sort: FAVOURITES_DESC) {
                                id
                                name { full native }
                                image { large medium }
                                description(asHtml: false)
                                favourites
                            }
                        }
                    }
                  `;
                  
                  const response = await fetch('https://graphql.anilist.co', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                      body: JSON.stringify({ query: queryChar, variables: { search: query } })
                  });
                  const data = await response.json();
                  setSearchResults(data.data.Page.characters);
              } catch (e) {
                  console.error(e);
              } finally {
                  setIsSearching(false);
              }
          }
      }, 500);

      return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up audio on unmount
  useEffect(() => {
      return () => {
          endCall();
      };
  }, []);

  const startChat = () => {
      if (!selectedChar) return;
      setMode('CHAT');
      setMessages([{
          id: 'system',
          role: 'model',
          text: `*${selectedChar.name.full} enters the scene.*`
      }]);
      triggerAIResponse([], true);
  };

  const triggerAIResponse = async (history: Message[], isIntro: boolean = false) => {
      if (!selectedChar) return;
      setLoading(true);

      try {
        const systemPrompt = `
            You are to roleplay as the character "${selectedChar.name.full}" from anime/manga.
            Character Description: ${selectedChar.description ? selectedChar.description.substring(0, 1000) : "A mysterious anime character."}
            Current Scenario: ${selectedScenario.prompt}
            Rules:
            1. NEVER break character. You are NOT an AI assistant. You are ${selectedChar.name.full}.
            2. Respond in ${settings.language === 'ar' ? 'Arabic' : 'English'}.
            3. Keep responses conversational (2-4 sentences).
            ${isIntro ? "Start the conversation based on the scenario." : ""}
        `;

        const responseText = await aiService.chat(
            isIntro ? "Start." : history[history.length - 1].text, 
            history.map(m => ({ role: m.role, text: m.text })),
            systemPrompt
        );

        const text = responseText || "*stares silently*";
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text }]);

      } catch (err) {
          console.error(err);
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "*(The connection was interrupted...)*" }]);
      } finally {
          setLoading(false);
      }
  };

  const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || loading) return;
      const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
      const newHistory = [...messages, userMsg];
      setMessages(newHistory);
      setInput('');
      triggerAIResponse(newHistory);
  };

  const reset = () => {
      endCall();
      setMode('SELECT');
      setMessages([]);
      setQuery('');
      setSearchResults([]);
      setSelectedChar(null);
  };

  // --- LIVE CALL LOGIC ---

  const startCall = async () => {
      if (!selectedChar) return;

      // Handle mandatory API key selection for real-time voice
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        if (!await (window as any).aistudio.hasSelectedApiKey()) {
          await (window as any).aistudio.openSelectKey();
        }
      }

      setMode('CALL');
      setIsCallActive(true);
      setConnectionStatus('connecting');
      
      try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext({ sampleRate: 24000 });
          nextStartTimeRef.current = audioContextRef.current.currentTime;

          audioInputContextRef.current = new AudioContext({ sampleRate: 16000 });
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;

          const config = {
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, 
                },
                systemInstruction: `You are ${selectedChar.name.full}. ${selectedChar.description ? selectedChar.description.substring(0, 500) : ''}. ${selectedScenario.prompt}. Act naturally, speak as the character. Keep responses concise.`,
            }
          };

          // Use the stored key if available, otherwise fallback to env
          const apiKey = aiService.getApiKey() || process.env.API_KEY;
          const liveAI = new GoogleGenAI({ apiKey });
          
          const sessionPromise = liveAI.live.connect({
              ...config,
              callbacks: {
                  onopen: () => {
                      console.log("Live Session Opened");
                      setConnectionStatus('connected');
                      
                      const inputCtx = audioInputContextRef.current!;
                      const source = inputCtx.createMediaStreamSource(stream);
                      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                      processorRef.current = processor;

                      processor.onaudioprocess = (e) => {
                          if (micMuted) return;
                          
                          const inputData = e.inputBuffer.getChannelData(0);
                          let sum = 0;
                          for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                          const rms = Math.sqrt(sum / inputData.length);
                          setAudioLevel(Math.min(100, rms * 500)); 

                          const l = inputData.length;
                          const int16 = new Int16Array(l);
                          for (let i = 0; i < l; i++) {
                              int16[i] = inputData[i] * 32768;
                          }
                          const b64 = arrayBufferToBase64(int16.buffer);
                          
                          // Use sessionPromise to prevent race conditions with initialization
                          sessionPromise.then(session => {
                              session.sendRealtimeInput({
                                  media: {
                                      mimeType: 'audio/pcm;rate=16000',
                                      data: b64
                                  }
                              });
                          });
                      };

                      source.connect(processor);
                      processor.connect(inputCtx.destination);
                  },
                  onmessage: async (msg: LiveServerMessage) => {
                      const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                      if (audioData) {
                          setModelSpeaking(true);
                          const ctx = audioContextRef.current;
                          if (!ctx) return;

                          const bytes = base64ToUint8Array(audioData);
                          const dataInt16 = new Int16Array(bytes.buffer);
                          const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
                          const channelData = buffer.getChannelData(0);
                          for (let i = 0; i < dataInt16.length; i++) {
                              channelData[i] = dataInt16[i] / 32768.0;
                          }

                          const source = ctx.createBufferSource();
                          source.buffer = buffer;
                          source.connect(ctx.destination);
                          
                          const now = ctx.currentTime;
                          const start = Math.max(nextStartTimeRef.current, now);
                          source.start(start);
                          nextStartTimeRef.current = start + buffer.duration;
                          
                          sourceNodesRef.current.push(source);
                          source.onended = () => {
                              if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
                                  setModelSpeaking(false);
                              }
                          };
                      }
                      
                      if (msg.serverContent?.interrupted) {
                          sourceNodesRef.current.forEach(n => { try { n.stop(); } catch(e){} });
                          sourceNodesRef.current = [];
                          nextStartTimeRef.current = 0;
                          setModelSpeaking(false);
                      }
                  },
                  onclose: () => {
                      endCall();
                  },
                  onerror: (e) => {
                      console.error("Live Session Error", e);
                      endCall();
                  }
              }
          });
          
          sessionRef.current = sessionPromise;

      } catch (e) {
          console.error("Failed to start call", e);
          endCall();
      }
  };

  const endCall = () => {
      setIsCallActive(false);
      setModelSpeaking(false);
      setAudioLevel(0);
      setConnectionStatus('disconnected');
      
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (processorRef.current) processorRef.current.disconnect();
      if (audioInputContextRef.current) audioInputContextRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
      sourceNodesRef.current.forEach(n => { try { n.stop(); } catch(e){} });
      
      if (mode === 'CALL') setMode('CHAT');
  };

  // --- RENDER ---

  if (mode === 'SELECT') {
      return (
          <div className="max-w-5xl mx-auto space-y-12 animate-fadeIn py-12 px-4">
              <div className="text-center space-y-6">
                  <div className="relative inline-block">
                      <div className="w-24 h-24 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/30 relative z-10 animate-float">
                          <Sparkles className="w-12 h-12 text-white" />
                      </div>
                      <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  </div>
                  <div>
                      <h1 className="text-5xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Soul Link</h1>
                      <p className="text-slate-400 text-lg mt-2 max-w-lg mx-auto">Establish a neural connection. Speak directly with your favorite characters using advanced real-time voice synthesis.</p>
                  </div>
              </div>

              <div className="relative max-w-2xl mx-auto group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur-lg transition-opacity opacity-0 group-hover:opacity-100"></div>
                  <div className="relative bg-dark-800 border border-white/10 rounded-2xl flex items-center p-2 shadow-xl focus-within:border-purple-500 transition-colors">
                      <Search className="w-6 h-6 text-slate-400 ml-4" />
                      <input 
                        type="text" 
                        placeholder="Search character (e.g. Naruto, Rem, Gojo)..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-transparent border-none rounded-xl py-4 px-4 text-xl focus:outline-none focus:ring-0 text-white placeholder:text-slate-500"
                        autoFocus
                      />
                      {isSearching && <Loader2 className="w-6 h-6 animate-spin text-purple-500 mr-4" />}
                  </div>
              </div>

              {searchResults.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {searchResults.map(char => (
                          <button 
                            key={char.id}
                            onClick={() => setSelectedChar(char)}
                            className={`relative group rounded-2xl overflow-hidden transition-all duration-300 ${selectedChar?.id === char.id ? 'ring-4 ring-purple-500 scale-105 z-10' : 'hover:scale-105 hover:z-10'}`}
                          >
                              <div className="aspect-[3/4] relative">
                                  <LazyImage src={char.image.large} alt={char.name.full} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                                  <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                                      <span className="block text-sm font-bold text-white truncate drop-shadow-md">{char.name.full}</span>
                                      <span className="text-[10px] text-slate-300 flex items-center gap-1">
                                          <Heart className="w-3 h-3 fill-current text-pink-500" /> {char.favourites}
                                      </span>
                                  </div>
                              </div>
                          </button>
                      ))}
                  </div>
              )}

              {selectedChar && (
                  <div className="bg-dark-800/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 animate-slideUp shadow-2xl">
                      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                          <img src={selectedChar.image.large} className="w-32 h-32 rounded-full object-cover border-4 border-purple-500 shadow-lg" alt="" />
                          <div className="flex-1 space-y-6 w-full">
                              <div>
                                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                      Link with <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{selectedChar.name.full}</span>
                                  </h3>
                                  <p className="text-slate-400 text-sm mt-1">Choose a scenario to initialize the personality matrix.</p>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {SCENARIOS.map(sc => (
                                      <button
                                        key={sc.id}
                                        onClick={() => setSelectedScenario(sc)}
                                        className={`p-4 rounded-xl border flex items-center gap-4 transition-all text-left group ${
                                            selectedScenario.id === sc.id 
                                            ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500' 
                                            : 'bg-dark-900 border-white/5 hover:bg-dark-700 hover:border-white/20'
                                        }`}
                                      >
                                          <div className={`p-3 rounded-full ${selectedScenario.id === sc.id ? 'bg-purple-500 text-white' : 'bg-dark-800 text-slate-400 group-hover:text-white'}`}>
                                              <sc.icon className="w-6 h-6" />
                                          </div>
                                          <div>
                                              <div className={`font-bold text-sm ${selectedScenario.id === sc.id ? 'text-white' : 'text-slate-300'}`}>{sc.label}</div>
                                              <div className="text-[10px] opacity-60 line-clamp-1">{sc.prompt}</div>
                                          </div>
                                      </button>
                                  ))}
                              </div>

                              <button 
                                onClick={startChat}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-lg text-white shadow-lg shadow-purple-900/50 hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
                              >
                                  <Zap className="w-6 h-6 fill-current" /> Initialize Soul Link
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // --- CALL SCREEN ---
  if (mode === 'CALL' && selectedChar) {
      return (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
              {/* Dynamic Atmospheric Background */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-110 blur-3xl opacity-40"
                style={{ backgroundImage: `url(${selectedChar.image.large})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>

              {/* Header Info */}
              <div className="absolute top-8 left-0 right-0 z-20 text-center px-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4 border backdrop-blur-md transition-colors ${
                      connectionStatus === 'connected' 
                      ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  }`}>
                      <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div> 
                      {connectionStatus === 'connected' ? 'Soul Link Stable' : 'Synchronizing...'}
                  </div>
                  <h1 className="text-4xl font-display font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{selectedChar.name.full}</h1>
                  <p className="text-slate-300 text-sm font-medium flex items-center justify-center gap-2 mt-2 opacity-80">
                      <selectedScenario.icon className={`w-4 h-4 ${selectedScenario.color}`} /> {selectedScenario.label}
                  </p>
              </div>

              {/* Main Visualizer Area */}
              <div className="relative z-10 w-full max-w-md aspect-square flex items-center justify-center">
                  
                  {/* AI Speaking Visualizer - Organic Ripples */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${modelSpeaking ? 'opacity-100' : 'opacity-0'}`}>
                      <div className="absolute w-64 h-64 rounded-full border-2 border-purple-500/30 animate-[ping_2s_linear_infinite]"></div>
                      <div className="absolute w-72 h-72 rounded-full border border-purple-400/20 animate-[ping_3s_linear_infinite_0.5s]"></div>
                      <div className="absolute w-80 h-80 rounded-full bg-purple-500/10 blur-xl animate-pulse"></div>
                  </div>

                  {/* Character Avatar */}
                  <div className={`relative w-64 h-64 rounded-full overflow-hidden border-4 shadow-[0_0_60px_rgba(0,0,0,0.5)] transition-all duration-300 ${modelSpeaking ? 'border-purple-400 scale-105 shadow-[0_0_40px_rgba(168,85,247,0.4)]' : 'border-white/10 scale-100'}`}>
                      <img src={selectedChar.image.large} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent"></div>
                  </div>

                  {/* User Audio Feedback (Dynamic Arc) */}
                  <div className="absolute bottom-[-40px] flex items-center gap-1 h-12">
                      {!modelSpeaking && !micMuted && (
                          Array.from({ length: 5 }).map((_, i) => (
                              <div 
                                key={i} 
                                className="w-1.5 bg-green-400 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(74,222,128,0.5)]" 
                                style={{ 
                                    height: `${Math.max(4, audioLevel * (1 + Math.random()))}px`,
                                    opacity: Math.max(0.3, audioLevel / 20)
                                }}
                              ></div>
                          ))
                      )}
                  </div>
              </div>

              {/* Floating Glass Controls */}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 p-4 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
                  <button 
                    onClick={() => setMicMuted(!micMuted)}
                    className={`p-4 rounded-full transition-all duration-300 ${micMuted ? 'bg-white text-dark-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                      {micMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                  
                  <button 
                    onClick={endCall}
                    className="p-5 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg shadow-red-900/50 hover:scale-110 transition-all"
                  >
                      <PhoneOff className="w-8 h-8 fill-current" />
                  </button>

                  <div className="p-4 rounded-full bg-white/5 text-slate-400">
                      {connectionStatus === 'connected' ? <Volume2 className="w-6 h-6 animate-pulse" /> : <Activity className="w-6 h-6" />}
                  </div>
              </div>
          </div>
      );
  }

  // --- CHAT SCREEN ---
  return (
    <div className="relative h-[calc(100vh-100px)] overflow-hidden flex flex-col rounded-[2.5rem] border border-white/10 shadow-2xl animate-fadeIn bg-dark-900">
        {/* Chat Background */}
        {selectedChar && (
            <div className="absolute inset-0 z-0">
                <img src={selectedChar.image.large} className="w-full h-full object-cover opacity-[0.08] blur-sm grayscale" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/90 to-dark-900/80" />
            </div>
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => reset()}>
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10">
                        <img src={selectedChar?.image.medium} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-dark-900 rounded-full p-0.5">
                        <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-dark-900 animate-pulse"></div>
                    </div>
                </div>
                <div>
                    <h2 className="font-bold text-white text-lg leading-tight flex items-center gap-2">
                        {selectedChar?.name.full}
                    </h2>
                    <div className={`text-xs font-medium flex items-center gap-1 ${selectedScenario.color}`}>
                        <selectedScenario.icon className="w-3 h-3" /> {selectedScenario.label}
                    </div>
                </div>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={startCall}
                    className="group relative px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold text-sm shadow-lg shadow-green-900/20 hover:scale-105 transition-all flex items-center gap-2 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                    <Phone className="w-4 h-4 fill-current" /> <span className="hidden sm:inline">Soul Link</span>
                </button>
                <button onClick={reset} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors border border-white/5">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Messages Area */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
            {messages.map(msg => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slideIn`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-lg border border-white/5 ${msg.role === 'user' ? 'bg-dark-800' : 'bg-transparent'}`}>
                        {msg.role === 'user' ? (
                            <User className="w-5 h-5 text-slate-400" />
                        ) : (
                            <img src={selectedChar?.image.medium} alt="AI" className="w-full h-full object-cover" />
                        )}
                    </div>
                    
                    <div className={`max-w-[85%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-6 py-4 rounded-3xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user' 
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-purple-900/20' 
                            : 'bg-dark-800 border border-white/5 text-slate-200 rounded-tl-none shadow-black/20'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                </div>
            ))}
            
            {loading && (
                <div className="flex gap-4 animate-pulse">
                     <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/5">
                        <img src={selectedChar?.image.medium} alt="AI" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-dark-800 border border-white/5 px-6 py-4 rounded-3xl rounded-tl-none flex items-center gap-2">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="relative z-10 p-4 md:p-6 bg-dark-900/80 backdrop-blur-xl border-t border-white/5">
            <form onSubmit={handleSend} className="relative max-w-4xl mx-auto flex gap-3">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={`Message ${selectedChar?.name.full}...`}
                        className="w-full bg-dark-800 border border-white/10 rounded-full py-4 pl-6 pr-4 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none shadow-inner transition-all text-white placeholder:text-slate-500"
                        disabled={loading}
                        autoFocus
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={!input.trim() || loading}
                    className="p-4 bg-white text-black rounded-full hover:scale-105 hover:bg-slate-200 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg flex-shrink-0"
                >
                    <Send className="w-5 h-5 fill-current" />
                </button>
            </form>
        </div>
    </div>
  );
};

export default AIAssistant;
