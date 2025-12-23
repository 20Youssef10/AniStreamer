
import React, { useState } from 'react';
import { traceService } from '../services/trace';
import { TraceResult } from '../types';
import { Upload, Search, Film, Loader2, Image as ImageIcon, ExternalLink, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Identify: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'anime' | 'manga' | 'text'>('anime');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeTab === 'text') return; // Should not happen

    setPreview(URL.createObjectURL(file));
    
    // For Manga/Art mode, we don't upload to trace.moe, we show external links
    if (activeTab === 'manga') {
        return; 
    }

    setLoading(true);
    setError('');
    
    try {
      const data = await traceService.searchByImage(file);
      setResult(data);
    } catch (err) {
      setError('Failed to identify anime. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openExternalSearch = (engine: 'saucenao' | 'google' | 'iqdb') => {
      if (!preview) return;
      // Note: We can't upload local blobs to external GET requests directly. 
      // In a real app, you'd upload to a temp host (e.g. imgur) then pass the URL.
      // For this demo, we'll explain the limitation or simulate if a URL was pasted (feature for later).
      // However, we can open the sites for the user to upload there manually.
      
      let url = '';
      if (engine === 'saucenao') url = 'https://saucenao.com/';
      if (engine === 'google') url = 'https://images.google.com/';
      if (engine === 'iqdb') url = 'https://iqdb.org/';
      
      window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-display font-bold">Identity Engine</h1>
        <p className="text-slate-400">Find the source of any anime screenshot, manga panel, or character art.</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-4">
          <button 
            onClick={() => { setActiveTab('anime'); setPreview(null); setResult(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'anime' ? 'bg-primary text-white shadow-lg' : 'bg-dark-800 text-slate-400 hover:text-white border border-white/5'}`}
          >
              <Film className="w-5 h-5" /> Anime Scene
          </button>
          <button 
            onClick={() => { setActiveTab('manga'); setPreview(null); setResult(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'manga' ? 'bg-pink-500 text-white shadow-lg' : 'bg-dark-800 text-slate-400 hover:text-white border border-white/5'}`}
          >
              <ImageIcon className="w-5 h-5" /> Manga / Art
          </button>
          <button 
            onClick={() => navigate('/search')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-dark-800 text-slate-400 hover:text-white border border-white/5 hover:border-primary/50`}
          >
              <Type className="w-5 h-5" /> Text Search
          </button>
      </div>

      {/* Upload Area */}
      <div className="bg-dark-800 border-2 border-dashed border-white/10 rounded-2xl p-8 text-center transition-colors hover:border-primary/50 relative overflow-hidden min-h-[300px] flex flex-col items-center justify-center">
        {activeTab !== 'text' && (
            <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
        )}
        
        {preview ? (
            <div className="relative z-20 space-y-4">
                <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-lg pointer-events-none" />
                {activeTab === 'manga' && (
                    <div className="text-sm text-slate-300 bg-black/50 p-4 rounded-xl backdrop-blur-md">
                        <p className="mb-2">Image loaded. Use external tools to find Manga or Fanart sources:</p>
                        <div className="flex gap-2 justify-center pointer-events-auto">
                            <button onClick={() => openExternalSearch('saucenao')} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                <ExternalLink className="w-4 h-4" /> SauceNAO
                            </button>
                            <button onClick={() => openExternalSearch('google')} className="px-4 py-2 bg-white text-black rounded-lg hover:bg-slate-200 flex items-center gap-2">
                                <ExternalLink className="w-4 h-4" /> Google Lens
                            </button>
                            <button onClick={() => openExternalSearch('iqdb')} className="px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-700 flex items-center gap-2">
                                <ExternalLink className="w-4 h-4" /> IQDB
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Note: You will need to re-upload the image on the destination site.</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="flex flex-col items-center gap-4 text-slate-500">
            <Upload className="w-16 h-16 opacity-50" />
            <span className="font-medium text-lg">
                {activeTab === 'anime' ? "Upload Anime Screenshot" : "Upload Manga Page or Art"}
            </span>
            <span className="text-xs opacity-70">Supports JPG, PNG</span>
            </div>
        )}
      </div>

      {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-slate-400">Scanning millions of frames...</p>
          </div>
      )}

      {error && <div className="text-center text-red-400 p-4 bg-red-500/10 rounded-xl">{error}</div>}

      {/* Anime Results */}
      {result && result.result.length > 0 && activeTab === 'anime' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" /> Best Matches
          </h2>
          <div className="grid gap-4">
            {result.result.slice(0, 5).map((match, idx) => (
              <div key={idx} className="bg-dark-800 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-start md:items-center animate-slideIn" style={{animationDelay: `${idx * 100}ms`}}>
                <div className="w-full md:w-48 aspect-video rounded-lg overflow-hidden bg-black relative shrink-0 group">
                  <img src={match.image} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Film className="text-white w-8 h-8" />
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-white">{match.anilist.title.native || match.filename}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${match.similarity > 0.9 ? 'bg-green-500 text-white' : 'bg-yellow-500/20 text-yellow-500'}`}>
                          {(match.similarity * 100).toFixed(1)}% Match
                      </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-400 mt-1">
                    <span>Episode {match.episode}</span>
                    <span>Time: {Math.floor(match.from / 60)}:{(match.from % 60).toFixed(0).padStart(2, '0')}</span>
                  </div>
                  
                  <div className="mt-4">
                      <video src={match.video} controls className="w-full max-w-sm rounded-lg bg-black border border-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Icon component for reuse
const Sparkles = ({className}:{className?:string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
)

export default Identify;
