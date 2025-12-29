
import React, { useState, useEffect, useRef } from 'react';
import { firebaseService } from '../services/firebase';
import { Tv, Play, Plus, Send, Copy, Users, Pause, RotateCcw, Link as LinkIcon, Settings, Music, Volume2 } from 'lucide-react';
import { ChatMessage, WatchParty as WatchPartyType } from '../types';
import { MentionInput } from '../components/Layout';

// Extend WatchPartyType locally to include videoUrl if not yet in types
interface ExtendedWatchParty extends WatchPartyType {
    videoUrl?: string;
}

const WatchParty: React.FC = () => {
  const [activePartyId, setActivePartyId] = useState<string | null>(null);
  const [activeParty, setActiveParty] = useState<ExtendedWatchParty | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  
  // Custom URL State
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showSoundboard, setShowSoundboard] = useState(false);

  // Sync
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHost, setIsHost] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const auth = firebaseService.getAuthInstance();
  const user = auth.currentUser;

  // Sound Effects
  const sounds = {
      'applause': 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
      'laugh': 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
      'wow': 'https://assets.mixkit.co/active_storage/sfx/2002/2002-preview.mp3',
      'boo': 'https://assets.mixkit.co/active_storage/sfx/2009/2009-preview.mp3'
  };

  // 1. Subscribe to Party Data
  useEffect(() => {
    if (!activePartyId) return;

    const unsubParty = firebaseService.subscribeToWatchParty(activePartyId, (party: ExtendedWatchParty) => {
        setActiveParty(party);
        setIsHost(party.hostId === user?.uid);
        
        // Sync Video Source if changed
        if (videoRef.current && party.videoUrl && videoRef.current.src !== party.videoUrl) {
            videoRef.current.src = party.videoUrl;
        }

        // Sync Logic for Viewers
        if (videoRef.current && party.hostId !== user?.uid) {
            // If significant drift (> 2s), snap to host time
            if (Math.abs(videoRef.current.currentTime - party.currentTime) > 2) {
                videoRef.current.currentTime = party.currentTime;
            }
            // Sync Play/Pause state
            if (party.isPlaying && videoRef.current.paused) videoRef.current.play().catch(()=>{});
            if (!party.isPlaying && !videoRef.current.paused) videoRef.current.pause();
        }
    });

    const unsubMessages = firebaseService.subscribeToPartyMessages(activePartyId, (msgs) => {
        setMessages(msgs);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    const unsubEvents = firebaseService.subscribeToPartyEvents(activePartyId, (events) => {
        events.forEach(event => {
            if (event.type === 'sfx') {
                const sfxKey = event.payload.sfx;
                const audio = new Audio(sounds[sfxKey as keyof typeof sounds]);
                audio.volume = 0.5;
                audio.play().catch(() => {});
            }
        });
    });

    return () => {
        unsubParty();
        unsubMessages();
        unsubEvents();
    };
  }, [activePartyId, user]);

  // 2. Host Controls Update Firebase
  const handleTimeUpdate = () => {
      // Handled by Interval for better performance
  };

  // Sync Interval for Host
  useEffect(() => {
      if (!isHost || !activePartyId) return;
      const interval = setInterval(() => {
          if (videoRef.current) {
              firebaseService.updateWatchPartyState(activePartyId, {
                  currentTime: videoRef.current.currentTime,
                  isPlaying: !videoRef.current.paused
              });
          }
      }, 2000); // Sync every 2 seconds
      return () => clearInterval(interval);
  }, [isHost, activePartyId]);

  const handleCreate = async () => {
    if (!user) return alert("Login required");
    setLoading(true);
    try {
      const id = await firebaseService.createWatchParty(user.uid, 1, "New Session");
      // Set default video
      await firebaseService.updateWatchPartyState(id, { 
          videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" 
      });
      setActivePartyId(id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
      if (!user) return alert("Login required");
      if (!joinCode) return;
      try {
          await firebaseService.joinWatchParty(joinCode, user.uid);
          setActivePartyId(joinCode);
      } catch (e) {
          alert("Failed to join.");
      }
  };

  const updateVideoUrl = async () => {
      if (!isHost || !activePartyId || !customUrlInput) return;
      try {
          await firebaseService.updateWatchPartyState(activePartyId, { videoUrl: customUrlInput });
          setShowSettings(false);
      } catch(e) {
          alert("Failed to update video");
      }
  };

  const sendMessage = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!newMessage.trim() || !activePartyId || !user) return;
      await firebaseService.sendPartyMessage(activePartyId, {
          userId: user.uid,
          userName: user.displayName || 'Guest',
          content: newMessage,
          timestamp: Date.now(),
          type: 'text'
      });
      setNewMessage('');
  };

  const triggerSound = async (sfx: string) => {
      if (!activePartyId || !user) return;
      await firebaseService.sendPartyEvent(activePartyId, {
          type: 'sfx',
          payload: { sfx },
          timestamp: Date.now()
      });
      // We don't play locally immediately here because we want to rely on the event subscription
      // to play it for everyone including the sender, ensuring synchronization.
      // However, for immediate feedback we could play it, but let's stick to the event stream
      // to avoid double playing if the latency is low, or check if the event is from us.
      // Given the requirement for robust implementation, relying on the event stream is better.
  };

  if (activePartyId && activeParty) {
      return (
          <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col md:flex-row gap-6 animate-fadeIn">
              <div className="flex-1 flex flex-col gap-4">
                 <div className="bg-black aspect-video rounded-2xl relative overflow-hidden shadow-2xl group border border-white/10">
                     <video 
                        ref={videoRef}
                        src={activeParty.videoUrl || "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                        className="w-full h-full object-contain"
                        controls={isHost} // Only host has native controls
                        playsInline
                     />
                     {!isHost && (
                         <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md border border-white/10 flex items-center gap-2">
                             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> Synced with Host
                         </div>
                     )}
                 </div>
                 
                 <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 flex justify-between items-center">
                     <div>
                         <h2 className="text-xl font-bold">{activeParty.animeTitle}</h2>
                         <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                             <Users className="w-4 h-4" />
                             <span>{activeParty.participants.length} watching</span>
                             {isHost && <span className="bg-primary/20 text-primary px-2 rounded text-xs ml-2 border border-primary/20">You are Host</span>}
                         </div>
                     </div>
                     <div className="flex gap-2">
                         <button onClick={() => setShowSoundboard(!showSoundboard)} className={`p-2 rounded-lg border transition-colors ${showSoundboard ? 'bg-primary text-white border-primary' : 'bg-dark-700 hover:bg-dark-600 border-white/5'}`}>
                             <Volume2 className="w-4 h-4" />
                         </button>
                         {isHost && (
                             <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 px-4 py-2 bg-dark-700 rounded-lg hover:bg-dark-600 border border-white/5">
                                 <Settings className="w-4 h-4" /> Settings
                             </button>
                         )}
                         <button onClick={() => navigator.clipboard.writeText(activePartyId)} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10">
                             <Copy className="w-4 h-4" /> Code
                         </button>
                     </div>
                 </div>

                 {/* 10. Soundboard Panel */}
                 {showSoundboard && (
                     <div className="bg-dark-800 p-4 rounded-xl border border-white/5 animate-slideUp flex gap-4 overflow-x-auto no-scrollbar">
                         {Object.keys(sounds).map(sfx => (
                             <button key={sfx} onClick={() => triggerSound(sfx)} className="flex flex-col items-center gap-1 p-3 bg-dark-900 rounded-xl hover:bg-primary/20 hover:text-primary transition-colors min-w-[80px]">
                                 <Music className="w-5 h-5" />
                                 <span className="text-xs font-bold capitalize">{sfx}</span>
                             </button>
                         ))}
                     </div>
                 )}

                 {/* Host Settings Panel */}
                 {showSettings && isHost && (
                     <div className="bg-dark-800 p-4 rounded-xl border border-white/5 animate-slideUp">
                         <h3 className="font-bold mb-2 text-sm text-slate-400 uppercase">Change Media</h3>
                         <div className="flex gap-2">
                             <input 
                                value={customUrlInput}
                                onChange={e => setCustomUrlInput(e.target.value)}
                                placeholder="Paste MP4 / WebM URL here..."
                                className="flex-1 bg-dark-900 border border-white/10 rounded-lg px-4 py-2 focus:border-primary outline-none"
                             />
                             <button onClick={updateVideoUrl} className="px-4 py-2 bg-primary rounded-lg font-bold text-white">Update</button>
                         </div>
                         <p className="text-xs text-slate-500 mt-2">Supports direct video links (mp4, webm). YouTube support is limited due to iframe restrictions.</p>
                     </div>
                 )}
              </div>

              <div className="w-full md:w-80 flex flex-col bg-dark-800 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="p-4 border-b border-white/5 font-bold flex justify-between items-center">
                      <span>Party Chat</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {messages.map(msg => (
                          <div key={msg.id} className="flex flex-col">
                              {msg.type === 'system' && msg.content.startsWith('SFX:') ? (
                                  <div className="text-center text-xs text-slate-500 italic my-1">
                                      {msg.userName} played a sound: {msg.content.split(':')[1]}
                                  </div>
                              ) : (
                                  <>
                                    <div className="flex items-baseline justify-between mb-1">
                                        <span className="text-xs text-primary font-bold">{msg.userName}</span>
                                        <span className="text-[10px] text-slate-500">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-sm text-slate-200 bg-white/5 p-2 rounded-lg rounded-tl-none">{msg.content}</p>
                                  </>
                              )}
                          </div>
                      ))}
                      <div ref={chatBottomRef} />
                  </div>
                  <form onSubmit={sendMessage} className="p-4 border-t border-white/5 flex gap-2 bg-dark-900/50">
                      <MentionInput value={newMessage} onChange={setNewMessage} placeholder="Chat..." className="flex-1 bg-dark-800 border border-white/10 rounded-lg px-3 text-sm focus:border-primary outline-none" singleLine onSubmit={() => sendMessage()} />
                      <button className="p-2 bg-primary rounded-lg text-white hover:bg-blue-600 transition-colors"><Send className="w-4 h-4" /></button>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto text-center space-y-12 py-12 animate-fadeIn">
      <div className="space-y-4">
        <h1 className="text-4xl font-display font-bold">Watch Party</h1>
        <p className="text-slate-400">Sync playback with friends worldwide.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8 rounded-3xl border border-primary/20 flex flex-col items-center justify-center gap-6">
          <div className="p-4 bg-primary/20 rounded-full text-primary mb-2">
              <Tv className="w-10 h-10" />
          </div>
          <button onClick={handleCreate} disabled={loading} className="px-8 py-3 bg-white text-primary font-bold rounded-xl hover:bg-slate-100 transition-colors w-full max-w-xs shadow-lg">
              {loading ? 'Creating...' : 'Start New Party'}
          </button>
        </div>
        <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-6">
          <div className="p-4 bg-white/5 rounded-full text-slate-400 mb-2">
              <LinkIcon className="w-10 h-10" />
          </div>
          <div className="flex gap-2 w-full max-w-xs">
            <input type="text" placeholder="Enter Party Code..." value={joinCode} onChange={e => setJoinCode(e.target.value)} className="flex-1 bg-dark-900 border border-white/10 rounded-lg px-4 focus:border-primary outline-none" />
            <button onClick={handleJoin} className="px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-bold border border-white/5">Join</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchParty;
