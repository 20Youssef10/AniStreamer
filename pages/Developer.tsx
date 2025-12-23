
import React, { useState } from 'react';
import { Code, Copy, Key, Shield, Webhook } from 'lucide-react';
import { firebaseService } from '../services/firebase';
import { useToast } from '../context/ToastContext';

const Developer: React.FC = () => {
  const auth = firebaseService.getAuthInstance();
  const user = auth.currentUser;
  const { showToast } = useToast();
  
  // Simulated API Key based on UID for demo purposes
  const apiKey = user ? `as_live_${user.uid.substring(0, 8)}_${btoa(user.uid).substring(0, 12)}` : 'Please login to generate key';
  const [showKey, setShowKey] = useState(false);

  const copyKey = () => {
      navigator.clipboard.writeText(apiKey);
      showToast("API Key copied to clipboard", 'success');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="flex items-center gap-3 border-b border-white/10 pb-6">
          <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
            <Code className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Developer Portal</h1>
            <p className="text-slate-400">Build on top of AniStream with our open API.</p>
          </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
          {/* API Credentials */}
          <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Key className="w-5 h-5 text-yellow-400" /> Credentials</h2>
              
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Client ID</label>
                  <input readOnly value={user ? `app_${user.uid.substring(0,6)}` : '...'} className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 font-mono text-sm text-slate-400" />
              </div>

              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Secret API Key</label>
                  <div className="flex gap-2">
                      <input 
                        readOnly 
                        type={showKey ? "text" : "password"} 
                        value={apiKey} 
                        className="flex-1 bg-dark-900 border border-white/10 rounded-lg p-3 font-mono text-sm text-green-400" 
                      />
                      <button onClick={() => setShowKey(!showKey)} className="p-3 bg-dark-700 rounded-lg border border-white/5 text-slate-300">
                          {showKey ? 'Hide' : 'Show'}
                      </button>
                      <button onClick={copyKey} className="p-3 bg-primary rounded-lg text-white">
                          <Copy className="w-4 h-4" />
                      </button>
                  </div>
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Keep this key secret. Do not share it in client-side code.
                  </p>
              </div>
          </div>

          {/* Webhooks */}
          <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-6">
               <h2 className="text-xl font-bold flex items-center gap-2"><Webhook className="w-5 h-5 text-pink-400" /> Webhooks</h2>
               <p className="text-sm text-slate-400">Receive real-time events when your list updates.</p>
               
               <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Endpoint URL</label>
                   <input placeholder="https://api.yourapp.com/webhooks" className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 font-mono text-sm mb-2 focus:border-primary outline-none" />
               </div>
               
               <div className="space-y-2">
                   {['list.updated', 'review.created', 'achievement.unlocked'].map(event => (
                       <label key={event} className="flex items-center gap-2 text-sm text-slate-300">
                           <input type="checkbox" className="rounded border-white/10 bg-dark-900 text-primary" />
                           {event}
                       </label>
                   ))}
               </div>
               
               <button className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg font-bold text-sm w-full border border-white/5">
                   Save Webhook Settings
               </button>
          </div>
      </div>

      {/* Documentation Preview */}
      <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
          <h2 className="text-xl font-bold mb-4">Quick Start</h2>
          <div className="bg-dark-900 p-4 rounded-xl border border-white/5 font-mono text-xs md:text-sm text-slate-300 overflow-x-auto">
              <span className="text-purple-400">curl</span> -X GET \<br/>
              &nbsp;&nbsp;https://api.anistream.app/v1/users/me/list \<br/>
              &nbsp;&nbsp;-H <span className="text-green-400">"Authorization: Bearer {user ? 'as_live_...' : '$API_KEY'}"</span>
          </div>
      </div>
    </div>
  );
};

export default Developer;
