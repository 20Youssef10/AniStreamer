
import React, { useState } from 'react';
import { firebaseService } from '../services/firebase';
import { integrationService } from '../services/integration';
import { useToast } from '../context/ToastContext';
import { useSettings, PRESETS } from '../context/SettingsContext';
import { 
  Download, Upload, Palette, Lock, Shield, LayoutDashboard, Database, Globe, 
  Accessibility, Moon, Sun, AlertTriangle, Check, Link as LinkIcon, Monitor, 
  Bell, BookOpen, FileCode, Touchpad, Plus, MousePointer, Image as ImageIcon, 
  Wifi, Eye, EyeOff, Trash2, Smartphone, Maximize, Type, Volume2, Mic, Youtube
} from 'lucide-react';
import { UserListEntry } from '../types';
import { malService } from '../services/mal';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'dashboard' | 'privacy' | 'parental' | 'data' | 'localization' | 'accessibility' | 'integrations' | 'player' | 'reader'>('appearance');
  const { settings, updateSettings, resetSettings, applyPreset } = useSettings();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [malImporting, setMalImporting] = useState(false);
  
  // PIN State
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);

  // YouTube Key State (Local for input)
  const [ytKeyInput, setYtKeyInput] = useState(settings.youtubeApiKey || '');

  const auth = firebaseService.getAuthInstance();
  const user = auth.currentUser;

  // Appearance - Colors
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];

  const setPin = () => {
      if (pinInput.length < 4) return showToast("PIN must be 4 digits", "error");
      updateSettings({ parental: { ...settings.parental, pin: pinInput }});
      setPinInput('');
      showToast("Parental PIN Updated", "success");
  };

  const handleExport = async () => {
    if (!user) return showToast("Please log in to export data.", 'error');
    
    setDownloading(true);
    try {
      const list = await firebaseService.getUserAnimeList(user.uid);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(list, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "anistream_export.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      showToast("Export successful!", 'success');
    } catch (e) {
      console.error(e);
      showToast("Export failed", 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!user) return showToast("Please log in to import data.", 'error');

      setImporting(true);
      const reader = new FileReader();

      reader.onload = async (event) => {
          try {
              const content = event.target?.result as string;
              const entries: UserListEntry[] = JSON.parse(content);
              if (!Array.isArray(entries)) throw new Error("Invalid Format");
              
              await firebaseService.importUserList(user.uid, entries);
              showToast(`Successfully imported ${entries.length} items!`, 'success');
          } catch (err) {
              console.error(err);
              showToast("Failed to parse import file", 'error');
          } finally {
              setImporting(false);
          }
      };
      
      reader.readAsText(file);
  };

  const handleMalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!user) return showToast("Please log in.", 'error');

      setMalImporting(true);
      const reader = new FileReader();
      
      reader.onload = async (event) => {
          try {
              const xml = event.target?.result as string;
              const count = await integrationService.importMalList(user.uid, xml, (pct) => {
                  if (pct % 20 === 0) showToast(`Importing... ${pct}%`, 'info');
              });
              showToast(`Imported ${count} anime from MAL!`, 'success');
          } catch (e: any) {
              console.error(e);
              showToast(`Import Failed: ${e.message}`, 'error');
          } finally {
              setMalImporting(false);
          }
      };
      reader.readAsText(file);
  };

  const connectAniList = () => {
      const CLIENT_ID = 33401;
      const REDIRECT_URI = "https://anistream-ata1.web.app/auth/anilist/callback";
      const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}`;
      window.location.href = authUrl;
  };

  const connectMAL = async () => {
      try {
          const redirectUri = `${window.location.origin}/auth/mal/callback`;
          const url = await malService.getLoginUrl(redirectUri);
          window.location.href = url;
      } catch (e) {
          showToast("Failed to initiate MAL connection", "error");
      }
  };

  const toggleQuickAction = (action: 'list' | 'favorite' | 'share' | 'planning' | 'completed') => {
      const current = settings.quickActions || ['list', 'favorite'];
      let updated;
      if (current.includes(action)) {
          updated = current.filter(a => a !== action);
      } else {
          updated = [...current, action];
      }
      updateSettings({ quickActions: updated });
  };

  const saveYoutubeKey = () => {
      updateSettings({ youtubeApiKey: ytKeyInput });
      showToast("YouTube API Key Saved!", "success");
  };

  const extractThemeFromImage = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const img = new Image();
              img.src = ev.target?.result as string;
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = 1; canvas.height = 1;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      ctx.drawImage(img, 0, 0, 1, 1);
                      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                      updateSettings({ accentColor: hex, backgroundImage: img.src });
                      showToast("Theme extracted from image!", "success");
                  }
              };
          };
          reader.readAsDataURL(file);
      }
  };

  const tabs = [
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'player', label: 'Player', icon: Monitor },
      { id: 'reader', label: 'Reader', icon: BookOpen },
      { id: 'integrations', label: 'Integrations', icon: LinkIcon },
      { id: 'localization', label: 'Localization', icon: Globe },
      { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
      { id: 'privacy', label: 'Privacy', icon: Shield },
      { id: 'parental', label: 'Parental', icon: Lock },
      { id: 'data', label: 'Data & Sync', icon: Database },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <h1 className="text-3xl font-display font-bold">Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 flex-shrink-0 overflow-x-auto md:overflow-visible flex md:block pb-2 md:pb-0 space-x-2 md:space-x-0 md:space-y-2">
              {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'bg-primary text-white shadow-lg' 
                        : 'bg-dark-800 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                      <tab.icon className="w-5 h-5" />
                      {tab.label}
                  </button>
              ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-dark-800 p-6 md:p-8 rounded-2xl border border-white/5 min-h-[500px]">
              
              {/* APPEARANCE TAB */}
              {activeTab === 'appearance' && (
                  <div className="space-y-8 animate-fadeIn">
                      <h2 className="text-2xl font-bold mb-6">Appearance</h2>
                      
                      {/* Theme Presets */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Theme Shop</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {Object.keys(PRESETS).map(name => (
                                  <button
                                    key={name}
                                    onClick={() => applyPreset(name)}
                                    className="relative group overflow-hidden rounded-xl border border-white/10 hover:border-primary transition-all aspect-square flex flex-col"
                                  >
                                      <div 
                                        className="flex-1 w-full relative" 
                                        style={{ backgroundColor: PRESETS[name as keyof typeof PRESETS].theme === 'dark' ? '#0F172A' : '#F8FAFC' }}
                                      >
                                          <div className="absolute top-2 left-2 w-4 h-4 rounded-full" style={{ backgroundColor: PRESETS[name as keyof typeof PRESETS].accentColor }}></div>
                                      </div>
                                      <div className="p-2 bg-dark-900 text-xs font-bold text-center border-t border-white/5">{name}</div>
                                  </button>
                              ))}
                          </div>
                      </div>

                      <hr className="border-white/5 my-6" />

                      {/* Manual Theme Controls */}
                      <div className="space-y-6">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Custom Mode</label>
                              <div className="grid grid-cols-2 gap-4">
                                  <button onClick={() => updateSettings({ theme: 'dark' })} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${settings.theme === 'dark' ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30'}`}><Moon className="w-6 h-6" /> Dark</button>
                                  <button onClick={() => updateSettings({ theme: 'light' })} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${settings.theme === 'light' ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30'}`}><Sun className="w-6 h-6" /> Light</button>
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Accent Color</label>
                              <div className="flex gap-3 flex-wrap">
                                  {colors.map(c => (
                                      <button key={c} onClick={() => updateSettings({ accentColor: c })} className={`w-10 h-10 rounded-full border-4 transition-transform hover:scale-110 flex items-center justify-center ${settings.accentColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }}>{settings.accentColor === c && <Check className="w-4 h-4 text-white" />}</button>
                                  ))}
                                  <input type="color" value={settings.accentColor} onChange={(e) => updateSettings({ accentColor: e.target.value })} className="w-10 h-10 rounded-full overflow-hidden cursor-pointer" />
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Custom Background URL</label>
                              <input type="text" placeholder="https://..." value={settings.backgroundImage || ''} onChange={(e) => updateSettings({ backgroundImage: e.target.value })} className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-sm focus:border-primary outline-none" />
                          </div>

                          <div className="p-4 bg-dark-900 rounded-xl border border-white/5 border-dashed">
                              <label className="flex flex-col items-center justify-center gap-2 cursor-pointer text-slate-400 hover:text-white">
                                  <ImageIcon className="w-8 h-8" />
                                  <span className="text-sm font-bold">Generate Theme from Image</span>
                                  <span className="text-xs">Upload an image to auto-set background & accent color</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={extractThemeFromImage} />
                              </label>
                          </div>

                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold flex items-center gap-2"><MousePointer className="w-4 h-4"/> Otaku Cursor</div>
                                    <div className="text-xs text-slate-400">Use custom SVG cursor styled with accent color</div>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={settings.customCursor}
                                    onChange={(e) => updateSettings({ customCursor: e.target.checked })}
                                    className="w-5 h-5 accent-primary"
                                />
                          </label>
                      </div>
                  </div>
              )}

              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                  <div className="space-y-8 animate-fadeIn">
                      <h2 className="text-2xl font-bold mb-6">Dashboard & UI</h2>
                      <div className="space-y-4">
                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold">Trending Section</div>
                                    <div className="text-xs text-slate-400">Show trending anime on home</div>
                                </div>
                                <input type="checkbox" checked={settings.dashboard?.showTrending ?? true} onChange={(e) => updateSettings({ dashboard: { ...settings.dashboard, showTrending: e.target.checked } })} className="w-5 h-5 accent-primary" />
                          </label>
                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold">Seasonal Section</div>
                                    <div className="text-xs text-slate-400">Show current season on home</div>
                                </div>
                                <input type="checkbox" checked={settings.dashboard?.showSeasonal ?? true} onChange={(e) => updateSettings({ dashboard: { ...settings.dashboard, showSeasonal: e.target.checked } })} className="w-5 h-5 accent-primary" />
                          </label>
                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold">Recommendations</div>
                                    <div className="text-xs text-slate-400">Show AI recommendations on home</div>
                                </div>
                                <input type="checkbox" checked={settings.dashboard?.showRecommendations ?? true} onChange={(e) => updateSettings({ dashboard: { ...settings.dashboard, showRecommendations: e.target.checked } })} className="w-5 h-5 accent-primary" />
                          </label>
                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold flex items-center gap-2"><Wifi className="w-4 h-4"/> Data Saver</div>
                                    <div className="text-xs text-slate-400">Disable video autoplay and load lower resolution images</div>
                                </div>
                                <input type="checkbox" checked={settings.dataSaver} onChange={(e) => updateSettings({ dataSaver: e.target.checked })} className="w-5 h-5 accent-primary" />
                          </label>
                      </div>

                      <div className="pt-6 border-t border-white/5">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                              <Touchpad className="w-4 h-4"/> Card Long-Press Actions
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                              {[
                                  { id: 'list', label: 'Quick Add (Watching)', icon: Plus },
                                  { id: 'favorite', label: 'Favorite', icon: Plus },
                                  { id: 'share', label: 'Share Link', icon: LinkIcon },
                                  { id: 'planning', label: 'Plan to Watch', icon: Plus },
                                  { id: 'completed', label: 'Mark Completed', icon: Plus },
                              ].map(action => (
                                  <label key={action.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${settings.quickActions?.includes(action.id as any) ? 'bg-primary/20 border-primary text-white' : 'bg-dark-900 border-white/5 text-slate-400 hover:bg-dark-700'}`}>
                                      <input type="checkbox" checked={settings.quickActions?.includes(action.id as any)} onChange={() => toggleQuickAction(action.id as any)} className="hidden" />
                                      {settings.quickActions?.includes(action.id as any) && <Check className="w-4 h-4 text-primary shrink-0" />}
                                      <span className="text-sm font-bold">{action.label}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {/* PLAYER TAB */}
              {activeTab === 'player' && (
                  <div className="space-y-8 animate-fadeIn">
                      <h2 className="text-2xl font-bold mb-6">Video Player</h2>
                      <div className="space-y-6">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Default Quality</label>
                              <div className="flex bg-dark-900 rounded-lg p-1">
                                  {['1080p', '720p', '360p'].map(q => (
                                      <button 
                                        key={q} 
                                        onClick={() => updateSettings({ player: { ...settings.player, defaultQuality: q as any } })}
                                        className={`flex-1 py-2 rounded font-bold text-sm ${settings.player.defaultQuality === q ? 'bg-primary text-white shadow' : 'text-slate-400'}`}
                                      >{q}</button>
                                  ))}
                              </div>
                          </div>
                          
                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold">Auto Play Next</div>
                                    <div className="text-xs text-slate-400">Automatically start next episode</div>
                                </div>
                                <input type="checkbox" checked={settings.player.autoplay} onChange={(e) => updateSettings({ player: { ...settings.player, autoplay: e.target.checked } })} className="w-5 h-5 accent-primary" />
                          </label>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Preferred Audio</label>
                              <div className="flex bg-dark-900 rounded-lg p-1">
                                  <button onClick={() => updateSettings({ player: { ...settings.player, audioLanguage: 'sub' } })} className={`flex-1 py-2 rounded font-bold text-sm ${settings.player.audioLanguage === 'sub' ? 'bg-primary text-white shadow' : 'text-slate-400'}`}>Subtitled</button>
                                  <button onClick={() => updateSettings({ player: { ...settings.player, audioLanguage: 'dub' } })} className={`flex-1 py-2 rounded font-bold text-sm ${settings.player.audioLanguage === 'dub' ? 'bg-primary text-white shadow' : 'text-slate-400'}`}>Dubbed</button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* READER TAB */}
              {activeTab === 'reader' && (
                  <div className="space-y-8 animate-fadeIn">
                      <h2 className="text-2xl font-bold mb-6">Manga Reader</h2>
                      <div className="space-y-6">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reading Direction</label>
                              <div className="grid grid-cols-3 gap-2 bg-dark-900 rounded-lg p-1">
                                  <button onClick={() => updateSettings({ reader: { ...settings.reader, direction: 'ltr' } })} className={`py-2 rounded font-bold text-sm ${settings.reader.direction === 'ltr' ? 'bg-primary text-white shadow' : 'text-slate-400'}`}>Left to Right</button>
                                  <button onClick={() => updateSettings({ reader: { ...settings.reader, direction: 'rtl' } })} className={`py-2 rounded font-bold text-sm ${settings.reader.direction === 'rtl' ? 'bg-primary text-white shadow' : 'text-slate-400'}`}>Right to Left</button>
                                  <button onClick={() => updateSettings({ reader: { ...settings.reader, direction: 'vertical' } })} className={`py-2 rounded font-bold text-sm ${settings.reader.direction === 'vertical' ? 'bg-primary text-white shadow' : 'text-slate-400'}`}>Vertical</button>
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Image Fit</label>
                              <div className="flex bg-dark-900 rounded-lg p-1">
                                  <button onClick={() => updateSettings({ reader: { ...settings.reader, fit: 'width' } })} className={`flex-1 py-2 rounded font-bold text-sm ${settings.reader.fit === 'width' ? 'bg-primary text-white shadow' : 'text-slate-400'}`}>Fit Width</button>
                                  <button onClick={() => updateSettings({ reader: { ...settings.reader, fit: 'height' } })} className={`flex-1 py-2 rounded font-bold text-sm ${settings.reader.fit === 'height' ? 'bg-primary text-white shadow' : 'text-slate-400'}`}>Fit Height</button>
                                  <button onClick={() => updateSettings({ reader: { ...settings.reader, fit: 'contain' } })} className={`flex-1 py-2 rounded font-bold text-sm ${settings.reader.fit === 'contain' ? 'bg-primary text-white shadow' : 'text-slate-400'}`}>Original</button>
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Default Brightness</label>
                              <input 
                                type="range" min="50" max="150" 
                                value={settings.reader.brightness} 
                                onChange={(e) => updateSettings({ reader: { ...settings.reader, brightness: parseInt(e.target.value) } })}
                                className="w-full accent-primary h-2 bg-dark-900 rounded-lg cursor-pointer" 
                              />
                          </div>
                      </div>
                  </div>
              )}

              {/* INTEGRATIONS TAB */}
              {activeTab === 'integrations' && (
                  <div className="space-y-8 animate-fadeIn">
                      <h2 className="text-2xl font-bold mb-6">Integrations</h2>
                      
                      <div className="bg-dark-900 p-6 rounded-xl border border-white/5 flex flex-col items-center text-center">
                          <div className="w-16 h-16 bg-[#02A9FF]/10 rounded-full flex items-center justify-center mb-4 text-[#02A9FF] border border-[#02A9FF]/20"><LinkIcon className="w-8 h-8" /></div>
                          <h3 className="text-xl font-bold mb-2">Connect AniList</h3>
                          <button onClick={connectAniList} className="bg-[#02A9FF] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0290d8] transition-colors shadow-lg">Connect AniList</button>
                      </div>
                      
                      <div className="bg-dark-900 p-6 rounded-xl border border-white/5 flex flex-col items-center text-center">
                          <div className="w-16 h-16 bg-[#2E51A2]/10 rounded-full flex items-center justify-center mb-4 text-[#2E51A2] border border-[#2E51A2]/20"><LinkIcon className="w-8 h-8" /></div>
                          <h3 className="text-xl font-bold mb-2">Connect MyAnimeList</h3>
                          <button onClick={connectMAL} className="bg-[#2E51A2] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#1e3a7a] transition-colors shadow-lg">Connect MyAnimeList</button>
                      </div>

                      {/* YouTube API Config */}
                      <div className="bg-dark-900 p-6 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-red-600 rounded-lg text-white"><Youtube className="w-6 h-6" /></div>
                              <div>
                                  <h3 className="font-bold">YouTube API</h3>
                                  <p className="text-xs text-slate-400">Provide your own API Key to restore video search.</p>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <input 
                                value={ytKeyInput} 
                                onChange={(e) => setYtKeyInput(e.target.value)}
                                placeholder="Paste your API Key here..."
                                className="flex-1 bg-dark-800 border border-white/10 rounded-lg px-4 py-2 focus:border-red-500 outline-none text-sm"
                                type="password"
                              />
                              <button onClick={saveYoutubeKey} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold text-sm transition-colors">
                                  Save
                              </button>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2">
                              This key is stored locally in your browser settings.
                          </p>
                      </div>
                  </div>
              )}

              {/* LOCALIZATION TAB */}
              {activeTab === 'localization' && (
                  <div className="space-y-8 animate-fadeIn">
                      <h2 className="text-2xl font-bold mb-6">Language & Region</h2>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">App Language</label>
                          <select 
                            value={settings.language} 
                            onChange={(e) => updateSettings({ language: e.target.value as any })}
                            className="w-full bg-dark-900 border border-white/10 rounded-xl p-4 outline-none focus:border-primary"
                          >
                              <option value="en">English</option>
                              <option value="ar">Arabic (العربية)</option>
                              <option value="es">Spanish (Español)</option>
                              <option value="fr">French (Français)</option>
                              <option value="de">German (Deutsch)</option>
                              <option value="it">Italian (Italiano)</option>
                              <option value="pt">Portuguese (Português)</option>
                              <option value="ru">Russian (Русский)</option>
                              <option value="ja">Japanese (日本語)</option>
                              <option value="zh">Chinese (中文)</option>
                              <option value="ko">Korean (한국어)</option>
                          </select>
                      </div>
                  </div>
              )}

              {/* ACCESSIBILITY TAB */}
              {activeTab === 'accessibility' && (
                  <div className="space-y-8 animate-fadeIn">
                      <h2 className="text-2xl font-bold mb-6">Accessibility</h2>
                      <div className="space-y-4">
                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold flex items-center gap-2"><Eye className="w-4 h-4"/> High Contrast</div>
                                    <div className="text-xs text-slate-400">Increase contrast for better visibility</div>
                                </div>
                                <input type="checkbox" checked={settings.accessibility.highContrast} onChange={(e) => updateSettings({ accessibility: { ...settings.accessibility, highContrast: e.target.checked } })} className="w-5 h-5 accent-primary" />
                          </label>
                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold flex items-center gap-2"><Smartphone className="w-4 h-4"/> Reduced Motion</div>
                                    <div className="text-xs text-slate-400">Disable heavy animations and transitions</div>
                                </div>
                                <input type="checkbox" checked={settings.accessibility.reducedMotion} onChange={(e) => updateSettings({ accessibility: { ...settings.accessibility, reducedMotion: e.target.checked } })} className="w-5 h-5 accent-primary" />
                          </label>
                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold flex items-center gap-2"><Volume2 className="w-4 h-4"/> Screen Reader Optimization</div>
                                    <div className="text-xs text-slate-400">Enhance compatibility with screen readers</div>
                                </div>
                                <input type="checkbox" checked={settings.accessibility.textToSpeech} onChange={(e) => updateSettings({ accessibility: { ...settings.accessibility, textToSpeech: e.target.checked } })} className="w-5 h-5 accent-primary" />
                          </label>
                          
                          <div className="p-4 bg-dark-900 rounded-xl border border-white/5">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Type className="w-4 h-4"/> Font Size Scaling</label>
                              <input 
                                type="range" min="80" max="150" step="10" 
                                value={settings.accessibility.fontSize} 
                                onChange={(e) => updateSettings({ accessibility: { ...settings.accessibility, fontSize: parseInt(e.target.value) } })}
                                className="w-full accent-primary h-2 bg-dark-800 rounded-lg cursor-pointer" 
                              />
                              <div className="flex justify-between text-xs text-slate-400 mt-2">
                                  <span>Tiny</span>
                                  <span>Normal</span>
                                  <span>Large</span>
                                  <span>Huge</span>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* PRIVACY TAB */}
              {activeTab === 'privacy' && (
                  <div className="space-y-8 animate-fadeIn">
                      <h2 className="text-2xl font-bold mb-6">Privacy & Activity</h2>
                      
                      <div className="p-4 bg-dark-900 rounded-xl border border-white/5 mb-6">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Profile Visibility</label>
                          <div className="flex gap-2">
                              {['public', 'friends', 'private'].map(v => (
                                  <button 
                                    key={v}
                                    onClick={() => updateSettings({ privacy: { ...settings.privacy, profileVisibility: v as any } })}
                                    className={`flex-1 py-2 rounded font-bold text-sm capitalize ${settings.privacy.profileVisibility === v ? 'bg-primary text-white shadow' : 'bg-dark-800 text-slate-400'}`}
                                  >
                                      {v}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-4">
                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold">Show Activity Feed</div>
                                    <div className="text-xs text-slate-400">Let others see what you are watching</div>
                                </div>
                                <input type="checkbox" checked={settings.privacy.showActivity} onChange={(e) => updateSettings({ privacy: { ...settings.privacy, showActivity: e.target.checked } })} className="w-5 h-5 accent-primary" />
                          </label>
                          <label className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5 cursor-pointer">
                                <div>
                                    <div className="font-bold">Public Stats</div>
                                    <div className="text-xs text-slate-400">Show analytics on your profile</div>
                                </div>
                                <input type="checkbox" checked={settings.privacy.showStats} onChange={(e) => updateSettings({ privacy: { ...settings.privacy, showStats: e.target.checked } })} className="w-5 h-5 accent-primary" />
                          </label>
                      </div>
                  </div>
              )}

              {/* PARENTAL CONTROL TAB */}
              {activeTab === 'parental' && (
                  <div className="space-y-8 animate-fadeIn">
                      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Lock className="w-6 h-6 text-red-500"/> Parental Controls</h2>
                      
                      <div className="bg-dark-900 p-6 rounded-xl border border-white/5">
                          <h3 className="font-bold mb-4">Content Restrictions</h3>
                          <div className="space-y-4">
                              <label className="flex items-center justify-between p-3 bg-dark-800 rounded-lg border border-white/5 cursor-pointer">
                                    <div>
                                        <div className="font-bold text-red-400">Allow Adult Content</div>
                                        <div className="text-xs text-slate-400">Show 18+ content in search results</div>
                                    </div>
                                    <input type="checkbox" checked={settings.parental.adultContent} onChange={(e) => updateSettings({ parental: { ...settings.parental, adultContent: e.target.checked } })} className="w-5 h-5 accent-red-500" />
                              </label>
                              <label className="flex items-center justify-between p-3 bg-dark-800 rounded-lg border border-white/5 cursor-pointer">
                                    <div>
                                        <div className="font-bold text-blue-400">Spoiler Protection</div>
                                        <div className="text-xs text-slate-400">Blur potential spoilers in feed</div>
                                    </div>
                                    <input type="checkbox" checked={settings.parental.spoilerMode} onChange={(e) => updateSettings({ parental: { ...settings.parental, spoilerMode: e.target.checked } })} className="w-5 h-5 accent-blue-500" />
                              </label>
                          </div>
                      </div>

                      <div className="bg-dark-900 p-6 rounded-xl border border-white/5">
                          <h3 className="font-bold mb-4">Security PIN</h3>
                          <p className="text-xs text-slate-400 mb-4">Set a 4-digit PIN to lock these settings.</p>
                          <div className="flex gap-2">
                              <div className="relative flex-1">
                                  <input 
                                    type={showPin ? "text" : "password"} 
                                    placeholder="Set 4-digit PIN" 
                                    maxLength={4}
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full bg-dark-800 border border-white/10 rounded-lg p-3 pr-10 outline-none focus:border-primary text-center font-mono tracking-widest" 
                                  />
                                  <button onClick={() => setShowPin(!showPin)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
                                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                              </div>
                              <button onClick={setPin} className="px-6 py-2 bg-primary rounded-lg font-bold text-white hover:bg-blue-600 transition-colors">Set</button>
                          </div>
                      </div>
                  </div>
              )}

              {/* DATA TAB */}
              {activeTab === 'data' && (
                  <div className="space-y-8 animate-fadeIn">
                      <h2 className="text-2xl font-bold mb-6">Data Management</h2>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                          <div className="bg-dark-900 p-6 rounded-xl border border-white/5 flex flex-col gap-4">
                              <h3 className="font-bold flex items-center gap-2"><Download className="w-5 h-5 text-green-400" /> Export Data</h3>
                              <p className="text-sm text-slate-400 flex-1">Download a backup of your anime list and preferences as a JSON file.</p>
                              <button onClick={handleExport} disabled={downloading} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold border border-white/10 transition-colors">
                                  {downloading ? 'Exporting...' : 'Export JSON'}
                              </button>
                          </div>

                          <div className="bg-dark-900 p-6 rounded-xl border border-white/5 flex flex-col gap-4">
                              <h3 className="font-bold flex items-center gap-2"><Upload className="w-5 h-5 text-blue-400" /> Import Backup</h3>
                              <p className="text-sm text-slate-400 flex-1">Restore your list from a previous AniStream backup file.</p>
                              <label className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold border border-white/10 transition-colors text-center cursor-pointer">
                                  {importing ? 'Importing...' : 'Select File'}
                                  <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
                              </label>
                          </div>

                          <div className="bg-dark-900 p-6 rounded-xl border border-white/5 flex flex-col gap-4">
                              <h3 className="font-bold flex items-center gap-2"><Database className="w-5 h-5 text-purple-400" /> Import from MAL</h3>
                              <p className="text-sm text-slate-400 flex-1">Import your MyAnimeList XML export file.</p>
                              <label className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold border border-white/10 transition-colors text-center cursor-pointer">
                                  {malImporting ? 'Processing...' : 'Select XML'}
                                  <input type="file" accept=".xml" onChange={handleMalImport} className="hidden" disabled={malImporting} />
                              </label>
                          </div>

                          <div className="bg-dark-900 p-6 rounded-xl border border-white/5 flex flex-col gap-4 border-red-500/20">
                              <h3 className="font-bold flex items-center gap-2 text-red-400"><Trash2 className="w-5 h-5" /> Danger Zone</h3>
                              <p className="text-sm text-slate-400 flex-1">Reset all local settings to default. Data on cloud remains safe.</p>
                              <button onClick={() => { if(confirm("Reset local settings?")) resetSettings(); }} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold border border-red-500/20 transition-colors">
                                  Reset Settings
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Settings;
