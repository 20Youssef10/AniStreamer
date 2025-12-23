
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Track } from '../types';

// Add type definitions for Spotify SDK on window
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: (() => void) | undefined;
    Spotify: any;
  }
}

interface PlayerContextProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  isMinimized: boolean;
  spotifyToken: string | null;
  playTrack: (track: Track) => void;
  playSpotifyUri: (uri: string, trackInfo: Track) => void;
  togglePlay: () => void;
  toggleMinimize: () => void;
  closePlayer: () => void;
  disconnectSpotify: () => void;
}

const PlayerContext = createContext<PlayerContextProps | undefined>(undefined);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Spotify State
  const [spotifyToken, setSpotifyToken] = useState<string | null>(window.localStorage.getItem('spotify_token'));
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
      // Initialize Spotify Player if token exists
      if (spotifyToken) {
          if (!document.getElementById('spotify-player-script')) {
              const script = document.createElement("script");
              script.id = 'spotify-player-script';
              script.src = "https://sdk.scdn.co/spotify-player.js";
              script.async = true;
              document.body.appendChild(script);
          }

          window.onSpotifyWebPlaybackSDKReady = () => {
              const p = new window.Spotify.Player({
                  name: 'AniStream Web Player',
                  getOAuthToken: (cb: any) => { cb(spotifyToken); },
                  volume: 0.5
              });

              p.addListener('ready', ({ device_id }: any) => {
                  console.log('Ready with Device ID', device_id);
                  setDeviceId(device_id);
              });

              p.addListener('not_ready', ({ device_id }: any) => {
                  console.log('Device ID has gone offline', device_id);
              });

              p.addListener('player_state_changed', (state: any) => {
                  if (!state) return;
                  setIsPlaying(!state.paused);
                  // Update current track info from Spotify state if needed
                  // For now we rely on what was clicked to populate the player UI for simplicity
                  // But realistically we should sync track name here
                  if (state.track_window?.current_track) {
                      const spTrack = state.track_window.current_track;
                      // Optional: Sync UI with actual playing track if we wanted
                  }
              });

              p.addListener('authentication_error', () => {
                  console.warn("Spotify Auth Error");
                  disconnectSpotify();
              });

              p.connect();
              setPlayer(p);
          };
      }

      return () => {
          if (player) player.disconnect();
      };
  }, [spotifyToken]);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsMinimized(false);
    // If generic play is called and it's a youtube/local track, pause spotify
    if (player && track.source !== 'spotify') {
        player.pause();
    }
  };

  const playSpotifyUri = async (uri: string, trackInfo: Track) => {
      if (!deviceId || !spotifyToken) return;
      
      setCurrentTrack(trackInfo);
      setIsMinimized(false);

      const body: any = {};
      // Check if it's a track or a context (album/playlist)
      if (uri.includes(':track:')) {
          body.uris = [uri];
      } else {
          body.context_uri = uri;
      }

      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${spotifyToken}`
          },
      });
  };

  const togglePlay = () => {
    if (currentTrack?.source === 'spotify' && player) {
        player.togglePlay();
    }
    setIsPlaying(prev => !prev);
  };

  const toggleMinimize = () => {
    setIsMinimized(prev => !prev);
  };

  const closePlayer = () => {
    if (currentTrack?.source === 'spotify' && player) {
        player.pause();
    }
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  const disconnectSpotify = () => {
      setSpotifyToken(null);
      window.localStorage.removeItem('spotify_token');
      if (player) player.disconnect();
      setPlayer(null);
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      isMinimized,
      spotifyToken,
      playTrack,
      playSpotifyUri,
      togglePlay,
      toggleMinimize,
      closePlayer,
      disconnectSpotify
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
