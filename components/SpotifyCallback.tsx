
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { spotifyService } from '../services/spotify';

const SpotifyCallback: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    // Handle Hash params for Implicit Grant fallback
    const hash = window.location.hash;
    let hashToken = null;
    if (hash && hash.includes('access_token')) {
        hashToken = hash.substring(1).split('&').find(elem => elem.startsWith('access_token'))?.split('=')[1];
    }

    if (error) {
        showToast(`Spotify Connection Failed: ${error}`, "error");
        navigate('/settings');
        return;
    }

    const finalize = () => {
        // Force a small delay to ensure local storage writes complete before redirect
        setTimeout(() => {
            navigate('/settings'); 
            // Optional: reload to refresh context if needed, though context usually listens to storage/state
        }, 500);
    };

    if (code) {
        const handleExchange = async () => {
            try {
                const data = await spotifyService.exchangeToken(code);
                if (data.access_token) {
                    window.localStorage.setItem('spotify_token', data.access_token);
                    if (data.refresh_token) {
                        window.localStorage.setItem('spotify_refresh_token', data.refresh_token);
                    }
                    showToast("Spotify Connected!", "success");
                }
            } catch (e: any) {
                console.error(e);
                showToast(`Connection Error: ${e.message}`, "error");
            } finally {
                finalize();
            }
        };
        handleExchange();
    } else if (hashToken) {
         window.localStorage.setItem('spotify_token', hashToken);
         showToast("Spotify Connected!", "success");
         finalize();
    } else {
        // No code found
        navigate('/settings');
    }
  }, [navigate, showToast]);

  return (
    <div className="h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Finalizing Spotify Connection...</p>
        </div>
    </div>
  );
};

export default SpotifyCallback;
