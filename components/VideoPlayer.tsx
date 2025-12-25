
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize, Minimize, Volume2, VolumeX, SkipForward, Layers, Monitor, Lightbulb, LightbulbOff, Mic, MicOff, FastForward, RotateCcw, RotateCw, Settings, Gauge, PictureInPicture, Settings2, X, Sliders, Activity, ZoomIn, ZoomOut, Check, Camera, Zap, MessageSquare } from 'lucide-react';
import { EpisodeSource } from '../types';
import { useToast } from '../context/ToastContext';
import { externalService, SkipTime } from '../services/external';
import Hls from 'hls.js';
import DanmakuLayer from './DanmakuLayer'; // IMPORT DANMAKU

interface VideoPlayerProps {
    sources: EpisodeSource[];
    onEnded?: () => void;
    onNext?: () => void;
    onProgress?: (progress: number) => void;
    poster?: string;
    title?: string;
    malId?: number; 
    episodeNumber?: number; 
    onTheaterMode?: () => void;
    isTheater?: boolean;
}

interface VideoStats {
    droppedFrames: number;
    totalFrames: number;
    resolution: string;
    buffer: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ sources = [], onEnded, onNext, onProgress, poster, title, malId, episodeNumber, onTheaterMode, isTheater }) => {
    const [currentSource, setCurrentSource] = useState<EpisodeSource | null>(sources?.[0] || null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const hasSyncedRef = useRef(false);
    
    // Audio Context for Boost
    const audioCtxRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    
    // Basic State
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [lightsOff, setLightsOff] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [qualities, setQualities] = useState<{height: number, level: number}[]>([]);
    const [currentQuality, setCurrentQuality] = useState(-1); // -1 = Auto
    
    // Advanced Features State
    const [showProSettings, setShowProSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [videoStats, setVideoStats] = useState<VideoStats>({ droppedFrames: 0, totalFrames: 0, resolution: 'N/A', buffer: 0 });
    const [boostEnabled, setBoostEnabled] = useState(false);
    const [danmakuEnabled, setDanmakuEnabled] = useState(false); // NEW STATE FOR DANMAKU
    
    // Visual Filters
    const [filters, setFilters] = useState({
        brightness: 100,
        contrast: 100,
        saturate: 100,
        hue: 0,
        blur: 0
    });
    
    // Transform
    const [zoom, setZoom] = useState(1);

    // Skip Logic
    const [skipTimes, setSkipTimes] = useState<SkipTime[]>([]);
    const [activeSkip, setActiveSkip] = useState<SkipTime | null>(null);

    const { showToast } = useToast();

    // ... (Keep existing useEffects for Sync, Stats, HLS, Skip, Keyboard) ...
    // Sync sources prop to state
    useEffect(() => {
        if (sources && sources.length > 0) {
            setCurrentSource(sources[0]);
        } else {
            setCurrentSource(null);
        }
    }, [sources]);

    // Reset sync state when episode changes
    useEffect(() => {
        hasSyncedRef.current = false;
        setQualities([]);
        setCurrentQuality(-1);
        resetFilters();
        // Reset Audio Context if needed? No, reuse or let it be.
    }, [episodeNumber]);

    // Update Stats Loop
    useEffect(() => {
        let interval: any;
        if (showStats && videoRef.current) {
            interval = setInterval(() => {
                const v = videoRef.current;
                if (!v) return;
                const quality = (v as any).getVideoPlaybackQuality?.();
                let bufferEnd = 0;
                if (v.buffered.length > 0) {
                    for (let i = 0; i < v.buffered.length; i++) {
                        if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime) {
                            bufferEnd = v.buffered.end(i);
                            break;
                        }
                    }
                }
                setVideoStats({
                    droppedFrames: quality?.droppedVideoFrames || 0,
                    totalFrames: quality?.totalVideoFrames || 0,
                    resolution: `${v.videoWidth}x${v.videoHeight}`,
                    buffer: Math.max(0, bufferEnd - v.currentTime)
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [showStats]);

    // Initialize HLS and Source
    useEffect(() => {
        if (!currentSource || currentSource.type !== 'video' || isSpecialEmbed(currentSource.url)) return;
        const video = videoRef.current;
        if (!video) return;
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        const isHLS = currentSource.url.includes('.m3u8');
        if (isHLS && Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hls.loadSource(currentSource.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                const levels = data.levels.map((l, i) => ({ height: l.height, level: i }));
                const uniqueLevels = new Map();
                levels.forEach(l => uniqueLevels.set(l.height, l.level));
                const sorted = Array.from(uniqueLevels.entries()).map(([height, level]) => ({ height, level })).sort((a,b) => b.height - a.height);
                setQualities(sorted);
                if (playing) video.play().catch(() => {});
            });
            hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = currentSource.url;
        } else {
            video.src = currentSource.url;
        }
        return () => { if (hlsRef.current) hlsRef.current.destroy(); };
    }, [currentSource]);

    // Fetch Skip Times
    useEffect(() => {
        if (malId && episodeNumber) {
            externalService.getSkipTimes(malId, episodeNumber).then(times => {
                setSkipTimes(times);
                if (times.length > 0) showToast("Auto-skip enabled", "info");
            });
        }
    }, [malId, episodeNumber]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            if (!videoRef.current) return;
            switch(e.key.toLowerCase()) {
                case ' ': case 'k': e.preventDefault(); togglePlay(); break;
                case 'arrowleft': seek(-5); break;
                case 'arrowright': seek(5); break;
                case 'f': toggleFullscreen(); break;
                case 'm': setMuted(m => !m); break;
                case 'd': setDanmakuEnabled(d => !d); break; // Add D for Danmaku
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [playing, muted, fullscreen]);

    // ... (Helper methods: togglePlay, seek, etc. - Keep existing) ...
    const togglePlay = () => {
        if (!videoRef.current) return;
        if (playing) videoRef.current.pause();
        else videoRef.current.play();
        setPlaying(!playing);
    };
    const seek = (seconds: number) => { if(videoRef.current) videoRef.current.currentTime += seconds; };
    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const speed = parseFloat(e.target.value);
        setPlaybackRate(speed);
        if(videoRef.current) videoRef.current.playbackRate = speed;
    };
    const togglePiP = async () => {
        try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else if (videoRef.current) await videoRef.current.requestPictureInPicture(); } catch(e) { console.error(e); }
    };
    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        const currentProgress = (currentTime / duration) * 100;
        setProgress(currentProgress);
        if (currentProgress > 80 && !hasSyncedRef.current) { hasSyncedRef.current = true; onProgress?.(currentProgress); }
        const skip = skipTimes.find(s => currentTime >= s.interval.startTime && currentTime < s.interval.endTime);
        setActiveSkip(skip || null);
    };
    const performSkip = () => {
        if (videoRef.current && activeSkip) {
            videoRef.current.currentTime = activeSkip.interval.endTime;
            showToast(`Skipped ${activeSkip.skipType.toUpperCase()}`, "success");
            setActiveSkip(null);
        }
    };
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setFullscreen(true); }
        else { document.exitFullscreen(); setFullscreen(false); }
    };
    const changeQuality = (level: number) => {
        if (hlsRef.current) { hlsRef.current.currentLevel = level; setCurrentQuality(level); }
        setShowSettingsMenu(false);
    };
    const resetFilters = () => { setFilters({ brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0 }); setZoom(1); };
    const takeSnapshot = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl; link.download = `anistream_snap_${Date.now()}.png`; link.click();
            showToast("Snapshot Saved!", "success");
        }
    };
    const toggleAudioBoost = () => {
        if (!videoRef.current) return;
        if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            gainNodeRef.current = audioCtxRef.current.createGain();
            audioSourceRef.current = audioCtxRef.current.createMediaElementSource(videoRef.current);
            audioSourceRef.current.connect(gainNodeRef.current);
            gainNodeRef.current.connect(audioCtxRef.current.destination);
        }
        if (!boostEnabled) {
            gainNodeRef.current!.gain.value = 3; setBoostEnabled(true); showToast("Audio Boost Active (300%)", "info");
        } else {
            gainNodeRef.current!.gain.value = 1; setBoostEnabled(false); showToast("Audio Boost Disabled", "info");
        }
    };
    const isSpecialEmbed = (url: string) => url.includes('drive.google.com') || url.includes('mega.nz') || url.includes('mega.co.nz');
    const getProcessedEmbedUrl = (url: string) => {
        if (url.includes('drive.google.com')) return url.replace(/\/view(\?.*)?$/, '/preview');
        if (url.includes('mega.nz') || url.includes('mega.co.nz')) return url.replace('/file/', '/embed/');
        return url;
    };

    if (!currentSource) return <div className="aspect-video bg-black flex items-center justify-center text-slate-500">No Sources Available</div>;

    const filterString = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) hue-rotate(${filters.hue}deg) blur(${filters.blur}px)`;

    // Embed Handling
    if (currentSource.type === 'embed' || isSpecialEmbed(currentSource.url)) {
        return (
            <div className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ${fullscreen ? 'rounded-none' : ''}`}>
                <iframe src={getProcessedEmbedUrl(currentSource.url)} className="w-full h-full border-none" allowFullScreen allow="autoplay; encrypted-media" />
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group ${fullscreen ? 'rounded-none' : ''}`}
             onMouseEnter={() => setShowControls(true)}
             onMouseLeave={() => { setShowControls(false); setShowSettingsMenu(false); setShowProSettings(false); }}
        >
            {lightsOff && <div className="fixed inset-0 bg-black/95 z-40 pointer-events-none transition-opacity"></div>}
            
            {/* DANMAKU LAYER */}
            <DanmakuLayer active={danmakuEnabled && playing} />

            {/* Stats Overlay */}
            {showStats && (
                <div className="absolute top-4 left-4 z-40 bg-black/70 backdrop-blur-md p-4 rounded-xl text-xs font-mono text-green-400 border border-green-500/30 select-none pointer-events-none">
                    <div className="font-bold text-white mb-2 border-b border-white/10 pb-1">Stats for Nerds</div>
                    <div>Res: {videoStats.resolution}</div>
                    <div>Frames: {videoStats.totalFrames} (Dropped: {videoStats.droppedFrames})</div>
                    <div>Buffer: {videoStats.buffer.toFixed(2)}s</div>
                    <div>Time: {videoRef.current?.currentTime.toFixed(2)} / {videoRef.current?.duration.toFixed(2)}</div>
                    <div>Filter: {filters.brightness !== 100 ? 'Active' : 'None'}</div>
                </div>
            )}

            {/* Skip Overlay Button */}
            {activeSkip && (
                <button onClick={performSkip} className="absolute bottom-24 left-4 z-50 bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg animate-bounce flex items-center gap-2 hover:bg-slate-200 transition-colors">
                    <FastForward className="w-5 h-5 fill-current" />
                    Skip {activeSkip.skipType === 'op' ? 'Opening' : activeSkip.skipType === 'ed' ? 'Ending' : 'Recap'}
                </button>
            )}

            <div className="w-full h-full relative z-30 overflow-hidden bg-black flex items-center justify-center">
                <video
                    ref={videoRef} 
                    className="w-full h-full object-contain transition-all duration-200"
                    style={{ filter: filterString, transform: `scale(${zoom})` }}
                    poster={poster} 
                    onTimeUpdate={handleTimeUpdate} 
                    onEnded={() => { setPlaying(false); onEnded?.(); }}
                    onClick={togglePlay} 
                    muted={muted} 
                    playsInline
                    crossOrigin="anonymous"
                />
            </div>

            {/* Pro Settings Overlay */}
            {showProSettings && (
                <div className="absolute top-0 right-0 h-full w-72 bg-dark-900/95 backdrop-blur-xl border-l border-white/10 z-50 p-4 animate-slideInRight overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold flex items-center gap-2 text-primary"><Sliders className="w-4 h-4" /> Pro Controls</h3>
                        <button onClick={() => setShowProSettings(false)} className="hover:text-white text-slate-400"><X className="w-4 h-4"/></button>
                    </div>
                    {/* ... (Keep existing sliders for brightness/contrast etc) ... */}
                    <div className="space-y-6">
                        <div className="space-y-3"><label className="text-xs font-bold text-slate-500 uppercase flex justify-between">Brightness <span>{filters.brightness}%</span></label><input type="range" min="50" max="150" value={filters.brightness} onChange={(e) => setFilters({...filters, brightness: Number(e.target.value)})} className="w-full accent-primary h-1.5 bg-white/10 rounded-lg cursor-pointer" /></div>
                        {/* ... other sliders ... */}
                        <div className="pt-4 border-t border-white/10 space-y-2">
                            <button onClick={() => setShowStats(!showStats)} className={`w-full flex items-center justify-between p-3 rounded-lg text-sm ${showStats ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-300'}`}><span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Stats for Nerds</span>{showStats && <Check className="w-4 h-4" />}</button>
                            <button onClick={toggleAudioBoost} className={`w-full flex items-center justify-between p-3 rounded-lg text-sm ${boostEnabled ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-slate-300'}`}><span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Audio Boost</span>{boostEnabled && <Check className="w-4 h-4" />}</button>
                            <button onClick={takeSnapshot} className="w-full flex items-center justify-between p-3 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-slate-300"><span className="flex items-center gap-2"><Camera className="w-4 h-4" /> Take Snapshot</span></button>
                            <button onClick={resetFilters} className="w-full p-3 rounded-lg text-sm bg-white/5 text-slate-400 hover:text-white mt-2">Reset All Effects</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 z-40 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>
                {currentSource.type === 'video' && (
                    <div className="w-full flex items-center gap-4 mb-3 group/slider">
                        <input type="range" min="0" max="100" step="0.1" value={progress} onChange={(e) => { if(videoRef.current) videoRef.current.currentTime = (parseFloat(e.target.value)/100)*videoRef.current.duration; }} className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary hover:h-2 transition-all" />
                    </div>
                )}
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-white">
                        <button onClick={togglePlay} className="hover:text-primary transition-colors">{playing ? <Pause className="w-7 h-7 fill-current"/> : <Play className="w-7 h-7 fill-current"/>}</button>
                        <div className="flex items-center gap-2 group/volume relative">
                            <button onClick={() => setMuted(!muted)}>{muted ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}</button>
                            <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 flex items-center"><input type="range" min="0" max="1" step="0.1" value={muted ? 0 : volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if(videoRef.current) videoRef.current.volume = v; setMuted(v === 0); }} className="w-24 h-1 accent-white ml-2"/></div>
                        </div>
                        <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded hidden sm:inline-block border border-white/5">{currentSource.name}</span>
                    </div>

                    <div className="flex items-center gap-3 text-white relative">
                        {/* Settings Menu */}
                        {showSettingsMenu && !showProSettings && (
                            <div className="absolute bottom-12 right-0 bg-dark-900/95 backdrop-blur-md border border-white/10 rounded-xl p-2 min-w-[200px] animate-slideUp shadow-xl flex flex-col gap-2">
                                <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10"><span className="text-xs font-bold text-slate-400 uppercase">Settings</span><button onClick={() => setShowSettingsMenu(false)}><X className="w-3 h-3 text-slate-400"/></button></div>
                                <div className="p-2"><div className="flex items-center justify-between text-sm mb-1"><span className="flex items-center gap-2"><Gauge className="w-3 h-3"/> Speed</span><span className="text-primary font-bold">{playbackRate}x</span></div><input type="range" min="0.5" max="2" step="0.25" value={playbackRate} onChange={handleSpeedChange} className="w-full accent-primary h-1 bg-white/20 rounded cursor-pointer" /></div>
                                
                                <button onClick={() => setDanmakuEnabled(!danmakuEnabled)} className={`flex items-center justify-between px-2 py-2 hover:bg-white/5 rounded text-sm ${danmakuEnabled ? 'text-green-400' : 'text-slate-300'}`}>
                                    <span className="flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Danmaku Mode</span>
                                    {danmakuEnabled && <Check className="w-3 h-3" />}
                                </button>

                                <button onClick={() => { setShowProSettings(true); setShowSettingsMenu(false); }} className="flex items-center gap-2 px-2 py-2 hover:bg-white/5 rounded text-sm text-yellow-400 font-bold"><Sliders className="w-3 h-3" /> Pro Settings</button>
                                {/* Quality Control */}
                                {qualities.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-1 border-t border-white/10 pt-2">
                                        <span className="text-[10px] font-bold text-slate-500 px-2 uppercase">Quality</span>
                                        <button onClick={() => changeQuality(-1)} className={`text-left px-3 py-1.5 rounded text-sm flex justify-between ${currentQuality === -1 ? 'bg-primary/20 text-primary' : 'text-white hover:bg-white/5'}`}>Auto {currentQuality === -1 && <Check className="w-3 h-3"/>}</button>
                                        {qualities.map(q => (
                                            <button key={q.level} onClick={() => changeQuality(q.level)} className={`text-left px-3 py-1.5 rounded text-sm flex justify-between ${currentQuality === q.level ? 'bg-primary/20 text-primary' : 'text-white hover:bg-white/5'}`}>{q.height}p {currentQuality === q.level && <Check className="w-3 h-3"/>}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={() => seek(-10)} className="hover:text-primary transition-colors p-1" title="-10s"><RotateCcw className="w-5 h-5"/></button>
                        <button onClick={() => seek(10)} className="hover:text-primary transition-colors p-1" title="+10s"><RotateCw className="w-5 h-5"/></button>
                        <button onClick={() => setLightsOff(!lightsOff)} className={`p-1 ${lightsOff ? 'text-yellow-400' : 'hover:text-primary'} transition-colors`} title="Lights Off">{lightsOff ? <Lightbulb className="w-5 h-5 fill-current" /> : <LightbulbOff className="w-5 h-5" />}</button>
                        <button onClick={togglePiP} className="hover:text-primary transition-colors hidden sm:block p-1" title="Picture in Picture"><PictureInPicture className="w-5 h-5" /></button>
                        <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className={`hover:text-primary transition-colors p-1 ${showSettingsMenu ? 'text-primary' : ''}`} title="Settings"><Settings className="w-5 h-5" /></button>
                        {onNext && <button onClick={onNext} className="hover:text-primary transition-colors p-1" title="Next Episode"><SkipForward className="w-5 h-5"/></button>}
                        <button onClick={toggleFullscreen} className="hover:text-primary transition-colors p-1" title="Fullscreen">{fullscreen ? <Minimize className="w-5 h-5"/> : <Maximize className="w-5 h-5"/>}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
