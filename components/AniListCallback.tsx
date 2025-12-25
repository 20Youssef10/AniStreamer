
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../services/firebase';
import { useToast } from '../context/ToastContext';
import { anilistService } from '../services/anilist';

const AniListCallback: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    // Handle Hash params for Implicit Grant (This works Frontend-Only)
    const hash = window.location.hash;
    let token = null;
    let error = null;

    if (hash && hash.includes('access_token')) {
        token = hash.substring(1).split('&').find(elem => elem.startsWith('access_token'))?.split('=')[1];
    } 
    
    // Check search params for errors
    const params = new URLSearchParams(window.location.search);
    if (!error) error = params.get('error');
    
    // Note: The 'code' flow requires a client secret, which we cannot store safely in frontend-only app.
    // We assume the user is redirected using Implicit Grant (response_type=token) if possible, 
    // or we display an error if they try to use the Code flow without a backend.
    const code = params.get('code');

    if (error) {
        showToast(`AniList Connection Failed: ${error}`, "error");
        navigate('/settings');
        return;
    }

    const finalize = () => {
        setTimeout(() => navigate('/settings'), 500);
    };

    if (token) {
        saveToken(token).then(finalize);
    } else if (code) {
        showToast("Authorization Code flow requires backend. Please use Implicit Grant.", "error");
        finalize();
    } else {
        // No code found
        finalize();
    }
  }, [navigate, showToast]);

  const saveToken = async (token: string) => {
      const auth = firebaseService.getAuthInstance();
      const user = auth.currentUser;
      
      anilistService.setToken(token);
      
      if (user) {
          try {
              await firebaseService.connectAniList(user.uid, token);
              showToast("AniList Connected!", "success");
          } catch (e) {
              console.error(e);
              showToast("Connected to Session (Sync failed)", "info");
          }
      } else {
          showToast("Connected to Session", "info");
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 text-white">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Connecting to AniList...</p>
        </div>
    </div>
  );
};

export default AniListCallback;
