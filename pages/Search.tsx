
import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { aiService } from '../services/ai';
import { Anime, AnimeSort, SearchFilters, MediaType, SavedSearch } from '../types';
import { ANIME_GENRES } from '../constants';
import AnimeCard from '../components/AnimeCard';
import { Search as SearchIcon, SlidersHorizontal, Sparkles, BrainCircuit, Bookmark, Trash2, Save, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Search: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { showToast } = useToast();
  const auth = firebaseService.getAuthInstance();
  const user = auth.currentUser;
  
  // Vibe Search Toggle
  const [isVibeMode, setIsVibeMode] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
      query: searchParams.get('q') || '',
      sort: AnimeSort.POPULARITY_DESC,
      page: 1,
      type: (searchParams.get('type') as MediaType) || 'ANIME'
  });

  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Saved Search State
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');

  // Fetch Saved Searches
  useEffect(() => {
      if (user) {
          firebaseService.getSavedSearches(user.uid).then(setSavedSearches);
      }
  }, [user]);

  // Sync with URL changes
  useEffect(() => {
      const q = searchParams.get('q');
      const type = searchParams.get('type') as MediaType;
      // Only update if URL params exist and differ, to avoid overwriting state during internal navigation if logic exists
      if (q !== null || type) {
          setFilters(prev => ({
              ...prev,
              query: q || '',
              type: type || prev.type,
              page: 1 
          }));
      }
  }, [location.search]);

  const fetchResults = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); setResults([]); }
    
    try {
      if (isVibeMode && filters.query) {
          // Vibe Search Logic
          const titles = await aiService.vibeSearch(filters.query);
          if (titles.length > 0) {
              const promises = titles.map(t => anilistService.searchAnime({ query: t, page: 1, perPage: 1 } as any));
              const responses = await Promise.all(promises);
              const aiResults = responses.map(r => r.Page.media[0]).filter(Boolean);
              setResults(aiResults);
              setHasNextPage(false);
          } else {
              setResults([]);
          }
      } else {
          // Standard Search
          const currentPage = reset ? 1 : filters.page;
          const data = await anilistService.searchAnime({ ...filters, page: currentPage });
          setResults(prev => reset ? data.Page.media : [...prev, ...data.Page.media]);
          setHasNextPage(data.Page.pageInfo.hasNextPage);
          setFilters(prev => ({...prev, page: (reset ? 2 : (prev.page || 1) + 1)}));
      }
    } catch (e) {
        console.error("Search failed", e);
        showToast("Search failed", "error");
    } finally { 
        setLoading(false); 
    }
  }, [filters.query, filters.genre, filters.year, filters.type, filters.sort, isVibeMode]);

  // Debounce API calls
  useEffect(() => {
      const timer = setTimeout(() => {
          fetchResults(true);
      }, 800); 
      return () => clearTimeout(timer);
  }, [filters.query, filters.genre, filters.year, filters.type, filters.sort, isVibeMode]);

  const handleSaveSearch = async () => {
      if (!user) return showToast("Login to save searches", "error");
      if (!newSearchName.trim()) return showToast("Enter a name", "error");

      try {
          // Clean filters to remove unnecessary pagination data for saving
          const filtersToSave = { ...filters, page: 1 };
          await firebaseService.saveSearchQuery(user.uid, newSearchName, filtersToSave);
          showToast("Search saved!", "success");
          setShowSaveModal(false);
          setNewSearchName('');
          // Refresh list
          const updated = await firebaseService.getSavedSearches(user.uid);
          setSavedSearches(updated);
      } catch (e) {
          showToast("Failed to save", "error");
      }
  };

  const handleDeleteSearch = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user || !confirm("Delete this saved search?")) return;
      try {
          await firebaseService.deleteSavedSearch(user.uid, id);
          setSavedSearches(prev => prev.filter(s => s.id !== id));
          showToast("Deleted", "success");
      } catch (e) {
          showToast("Failed to delete", "error");
      }
  };

  const applySavedSearch = (saved: SavedSearch) => {
      setIsVibeMode(false);
      setFilters({ ...saved.filters, page: 1 });
      showToast(`Applied "${saved.name}"`, "info");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn relative">
      <div className="lg:w-64 space-y-6">
        <div className="bg-dark-800 p-5 rounded-2xl border border-white/5 space-y-6 sticky top-24">
            <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Filters</h3>
                {user && !isVibeMode && (
                    <button 
                        onClick={() => setShowSaveModal(true)} 
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-primary transition-colors"
                        title="Save Current Search"
                    >
                        <Save className="w-4 h-4" />
                    </button>
                )}
            </div>
            
            {/* Vibe Toggle */}
            <button 
                onClick={() => setIsVibeMode(!isVibeMode)}
                className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold ${isVibeMode ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white shadow-lg' : 'bg-dark-900 border-white/10 text-slate-400 hover:text-white'}`}
            >
                {isVibeMode ? <BrainCircuit className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                {isVibeMode ? 'Vibe Search ON' : 'Standard Search'}
            </button>

            <div className="relative">
                <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                    type="text" value={filters.query || ''} 
                    onChange={(e) => setFilters({...filters, query: e.target.value})}
                    placeholder={isVibeMode ? "Describe the feeling/plot..." : "Search titles..."}
                    className={`w-full bg-dark-900 border border-white/10 rounded-lg pl-9 p-2 text-sm outline-none focus:border-primary transition-colors ${isVibeMode ? 'focus:border-purple-500' : ''}`}
                />
            </div>
            
            {!isVibeMode && (
                <>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                        <div className="flex gap-2 bg-dark-900 p-1 rounded-lg">
                            <button onClick={() => setFilters({...filters, type: 'ANIME'})} className={`flex-1 text-xs py-1.5 rounded ${filters.type === 'ANIME' ? 'bg-primary text-white' : 'text-slate-400'}`}>Anime</button>
                            <button onClick={() => setFilters({...filters, type: 'MANGA'})} className={`flex-1 text-xs py-1.5 rounded ${filters.type === 'MANGA' ? 'bg-primary text-white' : 'text-slate-400'}`}>Manga</button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Genre</label>
                        <div className="flex flex-wrap gap-2">
                            {ANIME_GENRES.slice(0, 12).map(g => (
                                <button key={g} onClick={() => setFilters({...filters, genre: filters.genre === g ? undefined : g})} className={`text-[10px] px-2 py-1 rounded border transition-colors ${filters.genre === g ? 'bg-primary text-white border-primary' : 'border-white/5 text-slate-500 hover:bg-white/5'}`}>{g}</button>
                            ))}
                        </div>
                    </div>
                </>
            )}
            
            {isVibeMode && (
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 text-xs text-purple-300">
                    <p>Tip: Try descriptions like "Anime that makes you cry about music" or "Cyberpunk with a female lead".</p>
                </div>
            )}

            {/* Saved Searches List */}
            {user && savedSearches.length > 0 && !isVibeMode && (
                <div className="pt-4 border-t border-white/5">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Saved Searches</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {savedSearches.map(saved => (
                            <div key={saved.id} onClick={() => applySavedSearch(saved)} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer group text-sm">
                                <div className="flex items-center gap-2 truncate">
                                    <Bookmark className="w-3 h-3 text-primary shrink-0" />
                                    <span className="truncate text-slate-300 group-hover:text-white">{saved.name}</span>
                                </div>
                                <button onClick={(e) => handleDeleteSearch(saved.id, e)} className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
      
      <div className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6">
              {results.map(item => <AnimeCard key={item.id} anime={item} />)}
          </div>
          
          {loading && <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>}
          
          {!loading && results.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                  {isVibeMode ? "Gemini couldn't find a match. Be more specific!" : "No results found."}
              </div>
          )}

          {!loading && hasNextPage && results.length > 0 && !isVibeMode && (
              <div className="flex justify-center py-8">
                  <button onClick={() => fetchResults(false)} className="px-6 py-2 bg-dark-800 rounded-full text-sm font-bold border border-white/5 hover:bg-dark-700">Load More</button>
              </div>
          )}
      </div>

      {/* Save Search Modal */}
      {showSaveModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
              <div className="bg-dark-800 w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold">Save Search Query</h3>
                      <button onClick={() => setShowSaveModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
                  </div>
                  <input 
                      value={newSearchName}
                      onChange={e => setNewSearchName(e.target.value)}
                      placeholder="e.g., '90s Mecha', 'Best Isekai'"
                      className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-sm focus:border-primary outline-none mb-4"
                      autoFocus
                  />
                  <div className="flex gap-2">
                      <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2 bg-dark-900 hover:bg-dark-700 rounded-lg text-sm font-bold">Cancel</button>
                      <button onClick={handleSaveSearch} disabled={!newSearchName.trim()} className="flex-1 py-2 bg-primary hover:bg-blue-600 rounded-lg text-sm font-bold text-white disabled:opacity-50">Save</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Search;
