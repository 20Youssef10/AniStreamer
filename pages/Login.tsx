
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../services/firebase';
import { useBranding } from '../context/BrandingContext';
import { User, Chrome, Ghost, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { branding } = useBranding();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await firebaseService.loginWithGoogle();
      navigate('/');
      showToast('Welcome back!', 'success');
    } catch (err: any) {
      console.error("Google Login Error:", err);
      // Display specific error code or message
      if (err.code === 'auth/popup-closed-by-user') {
          setError('Sign-in cancelled.');
      } else if (err.code === 'auth/unauthorized-domain') {
          setError('Domain not authorized in Firebase Console.');
      } else {
          setError(err.message || 'Failed to login with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await firebaseService.loginAnonymously();
      navigate('/');
      showToast('Logged in as Guest', 'info');
    } catch (err: any) {
      setError('Guest login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) return setError("Please fill in all fields.");
      
      setLoading(true);
      setError('');
      try {
          if (mode === 'signup') {
              await firebaseService.registerWithEmail(email, password);
              showToast("Account created successfully!", 'success');
          } else {
              await firebaseService.loginWithEmail(email, password);
              showToast("Welcome back!", 'success');
          }
          navigate('/');
      } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') setError('Email already registered.');
          else if (err.code === 'auth/wrong-password') setError('Incorrect password.');
          else if (err.code === 'auth/user-not-found') setError('User not found.');
          else if (err.code === 'auth/weak-password') setError('Password is too weak.');
          else setError('Authentication failed. Please try again.');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-900 relative overflow-hidden">
        {/* Background Atmosphere */}
        {branding.loginBackground ? (
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${branding.loginBackground})` }}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            </div>
        ) : (
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                 <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                 <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
            </div>
        )}

      <div className="w-full max-w-md bg-dark-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 relative z-10 overflow-hidden">
        
        {/* Header */}
        <div className="text-center p-8 pb-0">
          <img src={branding.logoUrl} className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg shadow-primary/20 object-cover" alt="App Logo" />
          <h1 className="text-3xl font-bold text-white mb-2">{branding.appName}</h1>
          <p className="text-slate-400 text-sm">Discover, Track, and Watch Together.</p>
        </div>

        {/* Tabs */}
        <div className="flex p-2 m-6 mb-2 bg-dark-900/50 rounded-xl border border-white/5">
             <button 
                onClick={() => setMode('signin')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'signin' ? 'bg-dark-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
                 Sign In
             </button>
             <button 
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'signup' ? 'bg-dark-800 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
                 Sign Up
             </button>
        </div>

        <div className="p-8 pt-4">
            {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center animate-fadeIn">
                {error}
            </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="email" 
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-dark-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary outline-none transition-colors"
                            required
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-dark-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary outline-none transition-colors"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                >
                    {loading ? 'Processing...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
            </form>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-dark-800 text-slate-500">Or continue with</span>
                </div>
            </div>

            <div className="space-y-3">
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-dark-900 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                    <Chrome className="w-5 h-5" />
                    Google Account
                </button>

                 <button
                    onClick={handleGuestLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-dark-700/50 text-slate-300 font-bold py-3 rounded-xl hover:bg-dark-700 transition-colors disabled:opacity-50 border border-white/5 hover:border-white/20 group"
                >
                    <Ghost className="w-5 h-5 group-hover:text-white" />
                    Continue as Guest
                </button>
            </div>
        </div>
        
        <div className="p-4 bg-dark-900/50 border-t border-white/5 text-center">
             <p className="text-xs text-slate-500">
                By continuing, you agree to our Terms of Service.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
