
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../services/firebase';
import { malService } from '../services/mal';
import { useToast } from '../context/ToastContext';

const MalCallback: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
        showToast(`MAL Connection Failed: ${error}`, "error");
        navigate('/settings');
        return;
    }

    const handleConnect = async () => {
        if (code) {
            const auth = firebaseService.getAuthInstance();
            const user = auth.currentUser;
            
            if (user) {
                try {
                    const redirectUri = `${window.location.origin}/auth/mal/callback`;
                    const tokenData = await malService.exchangeToken(code, redirectUri);
                    await firebaseService.connectMAL(user.uid, tokenData);
                    showToast("MyAnimeList Connected Successfully!", "success");
                } catch (e: any) {
                    console.error(e);
                    showToast(e.message || "Failed to exchange MAL token.", "error");
                }
            } else {
                showToast("Please login to connect MAL.", "error");
            }
            navigate('/settings');
        } else {
            // No code found
            navigate('/settings');
        }
    };

    handleConnect();
  }, [navigate, showToast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 text-white">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Connecting to MyAnimeList...</p>
        </div>
    </div>
  );
};

export default MalCallback;
