
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { anilistService } from '../services/anilist';
import { spotifyService } from '../services/spotify';
import { youtubeService } from '../services/youtube';
import { Anime, SpotifyTrack, Track } from '../types';
import { Image, Music, Film, Play, Download, ExternalLink, Search, LogOut, Maximize2, X, Mic2, RefreshCw, PlayCircle, Youtube } from 'lucide-react';
import LazyImage from '../components/LazyImage';
import { usePlayer } from '../context/PlayerContext';

const Media: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'gallery' | 'video' | 'music'>('gallery');
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying, spotifyToken, playSpotifyUri, disconnectSpotify } = usePlayer();

  // Gallery State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Video State (Cinematic Mode)
  const [playingTrailer, setPlayingTrailer] = useState<string | null>(null);

  // Search State
  const [searchMode, setSearchMode] = useState<'spotify' | 'youtube'>('youtube');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Dynamic Playlist State
  const [playlist, setPlaylist] = useState<Track[]>([]);

  useEffect(() => {
    if (tabParam === 'music' || tabParam === 'video' || tabParam === 'gallery') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await anilistService.getAnimeWithTrailers();
        setItems(data);
        
        // Generate dynamic playlist from trending anime
        const trending = await anilistService.getTrending(20);
        const dynamicTracks: Track[] = trending
            .filter(a => a.trailer?.site === 'youtube')
            .map(a => ({
                title: a.title.english || a.title.romaji,
                artist: "Original Soundtrack",
                anime: a.title.romaji,
                url: `https://www.youtube.com/embed/${a.trailer?.id}`,
                source: 'local',
                youtubeId: a.trailer?.id,
                artwork: a.coverImage.medium,
                lyrics: `Check out the official trailer/OP for ${a.title.romaji}!`
            }));
        setPlaylist(dynamicTracks);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownload = (url: string) => {
      window.open(url, '_blank');
  };

  const handleSpotifyConnect = async () => {
      const url = await spotifyService.getLoginUrl();
      window.location.href = url;
  };

  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      
      setSearching(true);
      try {
          if (searchMode === 'spotify' && spotifyToken) {
              const results = await spotifyService.searchTracks(searchQuery, spotifyToken);
              setSearchResults(results);
          } else {
              const results = await youtubeService.searchVideos(searchQuery + " anime ost op ed");
              setSearchResults(results);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setSearching(false);
      }
  };

  const playYoutubeTrack = (vid: any) => {
      playTrack({
          title: vid.title,
          artist: vid.channelTitle,
          anime: "YouTube",
          url: `https://www.youtube.com/embed/${vid.id}`,
          source: 'youtube',
          youtubeId: vid.id,
          artwork: vid.thumbnail
      });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Lightbox for Images */}
      {lightboxImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-fadeIn" onClick={() => setLightboxImage(null)}>
              <div className="relative max-w-7xl w-full h-full flex flex-col items-center justify-center">
                  <img src={lightboxImage} alt="Full View" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                  <div className="absolute top-4 right-4 flex gap-4">
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(lightboxImage); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors">
                          <Download className="w-6 h-6" />
                      </button>
                      <button onClick={() => setLightboxImage(null)} className="p-3 bg-white/10 hover:bg-red-500/50 rounded-full text-white backdrop-blur-md transition-colors">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Cinematic Modal for Trailers */}
      {playingTrailer && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-fadeIn" onClick={() => setPlayingTrailer(null)}>
              <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <iframe 
                    src={`https://www.youtube.com/embed/${playingTrailer}?autoplay=1`} 
                    title="Trailer"
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay"
                  />
                  <button 
                    onClick={() => setPlayingTrailer(null)} 
                    className="absolute -top-12 right-0 p-2 text-white hover:text-red-400 transition-colors flex items-center gap-2"
                  >
                      <X className="w-6 h-6" /> Close Cinema Mode
                  </button>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-6">
          <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500">
            {activeTab === 'music' ? <Music className="w-8 h-8" /> : activeTab === 'video' ? <Film className="w-8 h-8" /> : <Image className="w-8 h-8" />}
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">
                {activeTab === 'music' ? 'Music Station' : activeTab === 'video' ? 'Trailers' : 'Media Gallery'}
            </h1>
            <p className="text-slate-400">Official art, trailers, and soundtracks.</p>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 overflow-x-auto pb-2">
          {[
              { id: 'gallery', label: 'Wallpapers', icon: Image },
              { id: 'video', label: 'Trailers', icon: Film },
              { id: 'music', label: 'Music Station', icon: Music },
          ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'bg-dark-800 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
              </button>
          ))}
      </div>

      {loading && activeTab !== 'music' && <div className="py-20 text-center text-slate-500">Loading media...</div>}

      {!loading && activeTab === 'gallery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.filter(i => i.bannerImage).map(anime => (
                  <div key={anime.id} className="group relative bg-dark-800 rounded-xl overflow-hidden border border-white/5 aspect-video cursor-zoom-in" onClick={() => setLightboxImage(anime.bannerImage!)}>
                      <LazyImage src={anime.bannerImage!} alt={anime.title.romaji} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                          <h3 className="font-bold text-center px-4 text-white drop-shadow-md">{anime.title.romaji}</h3>
                          <div className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-bold hover:bg-slate-200 transition-colors pointer-events-none">
                              <Maximize2 className="w-4 h-4" /> View Full
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {!loading && activeTab === 'video' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {items.filter(i => i.trailer?.site === 'youtube').map(anime => (
                  <div key={anime.id} className="bg-dark-800 p-4 rounded-2xl border border-white/5 group hover:border-red-500/30 transition-colors">
                      <div 
                        className="aspect-video bg-black rounded-xl overflow-hidden mb-4 relative cursor-pointer group-hover:shadow-2xl shadow-black/50 transition-all"
                        onClick={() => setPlayingTrailer(anime.trailer!.id)}
                      >
                          <LazyImage 
                            src={anime.trailer!.thumbnail || anime.bannerImage || anime.coverImage.large} 
                            alt="Trailer Thumbnail"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-500"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                  <Play className="w-8 h-8 text-white fill-current ml-1" />
                              </div>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-bold">
                              TRAILER
                          </div>
                      </div>
                      
                      <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg text-white group-hover:text-red-400 transition-colors">{anime.title.english || anime.title.romaji}</h3>
                            <p className="text-slate-400 text-sm">Official Trailer</p>
                          </div>
                          <a 
                             href={`https://www.youtube.com/watch?v=${anime.trailer!.id}`} 
                             target="_blank" 
                             rel="noreferrer"
                             className="p-2 bg-white/5 rounded-full text-slate-400 hover:bg-red-600 hover:text-white transition-colors"
                             onClick={(e) => e.stopPropagation()}
                          >
                              <ExternalLink className="w-5 h-5" />
                          </a>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'music' && (
          <div className="flex flex-col lg:flex-row gap-8 min-h-[500px]">
              {/* Main Player Area / Search */}
              <div className="flex-1 space-y-6">
                  <div className="bg-dark-800 p-6 rounded-3xl border border-white/5">
                      <div className="flex justify-between items-center mb-6">
                          <div className="flex gap-2 p-1 bg-dark-900 rounded-xl">
                              <button onClick={() => setSearchMode('youtube')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${searchMode === 'youtube' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400'}`}>
                                  <Youtube className="w-4 h-4" /> YouTube
                              </button>
                              <button onClick={() => setSearchMode('spotify')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${searchMode === 'spotify' ? 'bg-[#1DB954] text-white shadow-lg' : 'text-slate-400'}`}>
                                  <Music className="w-4 h-4" /> Spotify
                              </button>
                          </div>
                          {searchMode === 'spotify' && spotifyToken && (
                              <button onClick={disconnectSpotify} className="text-[10px] text-red-400 hover:text-white">Disconnect Spotify</button>
                          )}
                      </div>

                      {searchMode === 'spotify' && !spotifyToken ? (
                          <div className="text-center py-12 bg-dark-900 rounded-2xl border border-white/5">
                              <Music className="w-12 h-12 text-[#1DB954] mx-auto mb-4" />
                              <h3 className="font-bold mb-2">Spotify Playback</h3>
                              <p className="text-xs text-slate-500 mb-6">Connect to search and play from Spotify.</p>
                              <button onClick={handleSpotifyConnect} className="px-6 py-2 bg-[#1DB954] text-white rounded-full font-bold text-sm">Connect Now</button>
                          </div>
                      ) : (
                          <>
                            <form onSubmit={handleSearch} className="relative mb-6">
                                <input 
                                    type="text" 
                                    placeholder={searchMode === 'spotify' ? "Search Spotify..." : "Search Anime Music on YouTube..."} 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full bg-dark-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none transition-colors ${searchMode === 'spotify' ? 'focus:border-[#1DB954]' : 'focus:border-red-600'}`}
                                />
                                <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <button type="submit" className={`absolute right-2 top-2 p-1.5 text-white rounded-lg ${searchMode === 'spotify' ? 'bg-[#1DB954]' : 'bg-red-600'}`}>Go</button>
                            </form>

                            {searching ? <div className="text-center py-8"><RefreshCw className="animate-spin w-6 h-6 mx-auto text-slate-600" /></div> : (
                                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                    {searchResults.map((item, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => searchMode === 'spotify' ? playSpotifyUri(item.uri, {
                                                title: item.name,
                                                artist: item.artists.map((a: any) => a.name).join(', '),
                                                anime: '',
                                                url: '',
                                                source: 'spotify',
                                                spotifyUri: item.uri,
                                                artwork: item.album.images[0]?.url
                                            }) : playYoutubeTrack(item)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-left group"
                                        >
                                            <img src={searchMode === 'spotify' ? (item.album?.images[2]?.url || item.album?.images[0]?.url) : item.thumbnail} alt="" className="w-10 h-10 rounded object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold truncate text-sm transition-colors ${searchMode === 'spotify' ? 'group-hover:text-[#1DB954]' : 'group-hover:text-red-500'}`}>
                                                    {searchMode === 'spotify' ? item.name : item.title}
                                                </div>
                                                <div className="text-xs text-slate-400 truncate">
                                                    {searchMode === 'spotify' ? item.artists.map((a: any) => a.name).join(', ') : item.channelTitle}
                                                </div>
                                            </div>
                                            <Play className="w-4 h-4 text-slate-500 group-hover:text-white" />
                                        </button>
                                    ))}
                                </div>
                            )}
                          </>
                      )}
                  </div>

                  {/* Featured Visualizer & Lyrics */}
                  {currentTrack && (
                    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl border border-white/10 min-h-[300px]">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                        
                        {currentTrack.lyrics ? (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-20 flex flex-col p-8 overflow-y-auto custom-scrollbar text-left space-y-4 animate-fadeIn">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-transparent flex items-center gap-2"><Mic2 className="w-4 h-4" /> Info / Lyrics</h3>
                                <p className="whitespace-pre-wrap text-lg font-medium leading-relaxed text-slate-200">
                                    {currentTrack.lyrics}
                                </p>
                            </div>
                        ) : (
                            <div className="relative z-10 space-y-2 w-full">
                                <div className="w-48 h-48 mx-auto mb-6 rounded-2xl shadow-2xl overflow-hidden border-4 border-white/10">
                                    {currentTrack.artwork ? (
                                        <img src={currentTrack.artwork} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-black flex items-center justify-center"><Music className="w-16 h-16 text-white/50" /></div>
                                    )}
                                </div>
                                <h2 className="text-2xl font-display font-bold text-white truncate px-4">{currentTrack.title}</h2>
                                <p className="text-indigo-200 text-lg">{currentTrack.artist}</p>
                            </div>
                        )}

                        <div className="mt-8 flex gap-4 relative z-10">
                            {isPlaying && !currentTrack.lyrics && (
                                <div className="flex gap-1 items-end h-8">
                                    {[1,2,3,4,5,6,7,8,9,10].map(i => (
                                        <div key={i} className="w-1.5 bg-pink-500 animate-pulse rounded-t-full" style={{height: `${Math.random() * 100}%`, animationDuration: `${0.3 + Math.random()}s`}} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                  )}
              </div>

              {/* Dynamic Playlist Sidebar */}
              <div className="w-full lg:w-80 bg-dark-800 rounded-3xl border border-white/10 overflow-hidden flex flex-col h-fit">
                  <div className="p-6 border-b border-white/5 bg-dark-900/50 flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2">
                          <RefreshCw className="w-5 h-5 text-primary" /> Trending Now
                      </h3>
                      <span className="text-xs text-slate-500">YouTube OPs</span>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-1 max-h-[500px] custom-scrollbar">
                      {playlist.length === 0 ? <div className="p-4 text-center text-slate-500">Loading Tracks...</div> : playlist.map((track, idx) => (
                          <button
                            key={idx}
                            onClick={() => playTrack(track)}
                            className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left group ${
                                currentTrack?.youtubeId === track.youtubeId 
                                ? 'bg-primary/20 border border-primary/50' 
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                                  {track.artwork ? <img src={track.artwork} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-dark-900 flex items-center justify-center font-bold text-xs">{idx + 1}</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className={`font-bold truncate text-sm ${currentTrack?.youtubeId === track.youtubeId ? 'text-primary' : 'text-slate-200'}`}>
                                      {track.title}
                                  </div>
                                  <div className="text-xs text-slate-400 truncate">{track.anime}</div>
                              </div>
                              <Play className="w-3 h-3 text-slate-600 group-hover:text-white" />
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Media;
