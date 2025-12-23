
import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, X, Maximize2, Minimize2, Music, Disc, Mic2, Youtube } from 'lucide-react';

const GlobalPlayer: React.FC = () => {
  const { currentTrack, isPlaying, isMinimized, togglePlay, toggleMinimize, closePlayer } = usePlayer();
  const [showLyrics, setShowLyrics] = useState(false);

  if (!currentTrack) return null;

  return (
    <>
      {/* Hidden Embed for persistent audio (Only if source is local/youtube) */}
      {(currentTrack.source === 'local' || currentTrack.source === 'youtube') && (
         <div className="hidden">
            <iframe 
                width="0" height="0" 
                src={`${currentTrack.url}${currentTrack.url.includes('?') ? '&' : '?'}autoplay=${isPlaying ? '1' : '0'}&enablejsapi=1`} 
                title="audio-source"
                allow="autoplay"
            />
         </div>
      )}

      {/* Floating Lyrics Overlay */}
      {showLyrics && currentTrack.lyrics && !isMinimized && (
          <div className="fixed bottom-40 right-4 w-full max-w-sm max-h-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-[85] overflow-y-auto custom-scrollbar animate-slideUp">
              <div className="flex justify-between items-center mb-2 sticky top-0 bg-transparent">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mic2 className="w-3 h-3" /> Lyrics</span>
                  <button onClick={() => setShowLyrics(false)}><X className="w-4 h-4 text-slate-400 hover:text-white" /></button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {currentTrack.lyrics}
              </p>
          </div>
      )}

      <div className={`fixed z-[90] transition-all duration-300 ease-spring ${
          isMinimized 
          ? 'bottom-24 right-4 w-12 h-12 rounded-full overflow-hidden' 
          : 'bottom-20 right-4 w-full max-w-sm rounded-2xl'
      }`}>
          
          {isMinimized ? (
              <button 
                onClick={toggleMinimize}
                className={`w-full h-full flex items-center justify-center shadow-lg animate-spin-slow border-2 border-white/20 ${currentTrack.source === 'spotify' ? 'bg-[#1DB954]' : (currentTrack.source === 'youtube' ? 'bg-red-600' : 'bg-primary')}`}
                title="Expand Player"
              >
                  {currentTrack.artwork ? (
                      <img src={currentTrack.artwork} alt="" className="w-full h-full object-cover" />
                  ) : (
                      <Music className="w-6 h-6 text-white" />
                  )}
              </button>
          ) : (
              <div className="bg-dark-800/90 backdrop-blur-xl border border-white/10 shadow-2xl p-4 flex flex-col gap-4 relative overflow-hidden rounded-2xl">
                  {/* Decorative BG */}
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full pointer-events-none ${currentTrack.source === 'spotify' ? 'bg-[#1DB954]/20' : (currentTrack.source === 'youtube' ? 'bg-red-600/20' : 'bg-primary/20')}`} />

                  <div className="flex gap-4 items-center">
                      <div className={`w-16 h-16 bg-black rounded-lg shadow-inner flex items-center justify-center overflow-hidden shrink-0 ${isPlaying ? 'animate-pulse' : ''}`}>
                          {currentTrack.artwork ? (
                              <img src={currentTrack.artwork} alt="" className="w-full h-full object-cover" />
                          ) : (
                              <Disc className={`w-10 h-10 text-slate-700 ${isPlaying ? 'animate-spin' : ''}`} style={{animationDuration: '3s'}} />
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${currentTrack.source === 'spotify' ? 'text-[#1DB954]' : (currentTrack.source === 'youtube' ? 'text-red-500' : 'text-primary')}`}>
                              {currentTrack.source === 'spotify' ? 'Spotify' : (currentTrack.source === 'youtube' ? <><Youtube className="w-3 h-3" /> YouTube</> : 'Now Playing')}
                          </div>
                          <div className="font-bold truncate text-white text-sm">{currentTrack.title}</div>
                          <div className="text-[10px] text-slate-400 truncate">{currentTrack.artist} {currentTrack.anime ? `• ${currentTrack.anime}` : ''}</div>
                      </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex gap-2">
                          <button onClick={closePlayer} className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                              <X className="w-5 h-5" />
                          </button>
                          {currentTrack.lyrics && (
                              <button 
                                onClick={() => setShowLyrics(!showLyrics)} 
                                className={`p-2 transition-colors ${showLyrics ? 'text-primary' : 'text-slate-400 hover:text-white'}`}
                                title="Show Lyrics"
                              >
                                  <Mic2 className="w-5 h-5" />
                              </button>
                          )}
                      </div>
                      
                      <button 
                        onClick={togglePlay} 
                        className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                      >
                          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                      </button>

                      <button onClick={toggleMinimize} className="p-2 text-slate-400 hover:text-white transition-colors">
                          <Minimize2 className="w-5 h-5" />
                      </button>
                  </div>
              </div>
          )}
      </div>
    </>
  );
};

export default GlobalPlayer;
