
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebase';
import { anilistService } from '../services/anilist'; 
import { translations, setTranslations, Language } from '../services/i18n';
import { Episode, UserProfile, FeatureLockConfig, NewsArticle, AppBranding, XPRewardsConfig, AILimitsConfig, SupportChat, SupportMessage, AdminPermission } from '../types';
import { 
  ShieldAlert, Users, Film, Book, Activity, Settings, Ban, Sparkles, Save, Trash2, 
  Award, Zap, ToggleLeft, ToggleRight, Lock, Unlock, Key, Cpu, Bell, Layout, 
  AlertTriangle, Eye, EyeOff, Search, Plus, CheckCircle, XCircle, BrainCircuit, 
  ExternalLink, SortAsc, SortDesc, Radio, Newspaper, Edit, Palette, Globe, 
  Coins, TrendingUp, MessageSquare, Send, Crown, Shield, RefreshCw, Layers, 
  History, Info, Download, Upload, List
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { refreshBranding } = useBranding();
    
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sys_config' | 'ui_control' | 'content_ops' | 'ai_control' | 'moderation' | 'broadcast' | 'newsroom' | 'branding' | 'economy' | 'support' | 'localization'>('overview');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalEpisodes: 0, totalReviews: 0, maintenance: false });
    const [loading, setLoading] = useState(true);
    const [currentUserRole, setCurrentUserRole] = useState<{isAdmin: boolean, isMaster: boolean, permissions: AdminPermission[]}>({isAdmin: false, isMaster: false, permissions: []});
    
    // Support Chat State
    const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<SupportMessage[]>([]);
    const [replyText, setReplyText] = useState('');

    // System Config State
    const [sysConfig, setSysConfig] = useState({
        maintenanceMode: false,
        allowRegistrations: true,
        globalAnnouncement: '',
        geminiApiKey: '',
        defaultModel: 'gemini-3-flash-preview',
        aiSystemInstruction: '',
        featureLocks: {} as FeatureLockConfig,
        translationStrategy: 'LOCAL'
    });

    // Content Management State
    const [contentMode, setContentMode] = useState<'ANIME' | 'MANGA'>('ANIME');
    const [searchContentQuery, setSearchContentQuery] = useState('');
    const [contentSearchResults, setContentSearchResults] = useState<any[]>([]);
    const [mediaIdInput, setMediaIdInput] = useState('');
    const [selectedMediaTitle, setSelectedMediaTitle] = useState('');
    const [managedEpisodes, setManagedEpisodes] = useState<any[]>([]);
    const [managedChapters, setManagedChapters] = useState<any[]>([]);
    const [bulkImportMode, setBulkImportMode] = useState(false);
    
    // Anime Form
    const [epForm, setEpForm] = useState({ 
        number: 1, 
        title: '', 
        url: '', 
        type: 'embed', 
        audio: 'sub', 
        language: 'Japanese',
        thumbnail: ''
    });

    const [bulkForm, setBulkForm] = useState({
        start: 1,
        end: 12,
        urlTemplate: '',
        type: 'embed',
        audio: 'sub'
    });
    
    // Manga Form
    const [chForm, setChForm] = useState({ 
        number: 1, 
        title: '', 
        pages: '', 
        language: 'English' 
    }); 

    // Branding, Economy, UI states
    const [brandingConfig, setBrandingConfig] = useState<AppBranding>({ appName: 'AniStream', logoUrl: '/logo.png', loginBackground: '', faviconUrl: '/logo.png' });
    const [xpRewards, setXpRewards] = useState<XPRewardsConfig>({ episode: 50, chapter: 30, comment: 10, gameWin: 100, dailyLogin: 25 });
    const [aiLimits, setAiLimits] = useState<AILimitsConfig>({ baseDailyRequests: 10, requestsPerLevel: 5, maxDailyRequests: 500 });
    const [uiConfig, setUiConfig] = useState({ showTrending: true, showSeasonal: true, heroBannerId: '', heroCustomTitle: '', featuredColor: '#3B82F6' });
    
    const [userSearch, setUserSearch] = useState('');
    const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);
    const [pendingNews, setPendingNews] = useState<NewsArticle[]>([]);
    const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '', link: '' });
    const [sendingBroadcast, setSendingBroadcast] = useState(false);

    // Localization State
    const [locales, setLocales] = useState<any>(translations);
    const [selectedLang, setSelectedLang] = useState<Language>('en');
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    const auth = firebaseService.getAuthInstance();
    const user = auth.currentUser;
    const MASTER_ADMIN_EMAIL = 'youssef2010.mahmoud@gmail.com';

    useEffect(() => {
        const checkAccess = async () => {
            if (!user) { navigate('/'); return; }
            const profile = await firebaseService.getUserData(user.uid);
            const isMaster = user.email === MASTER_ADMIN_EMAIL;
            const isAdmin = profile?.isAdmin || isMaster;

            if (!isAdmin) { showToast("Access Denied", "error"); navigate('/'); return; }
            setCurrentUserRole({ 
                isAdmin, 
                isMaster,
                permissions: profile?.permissions || []
            });
            fetchData();
        };
        checkAccess();
    }, [user]);

    useEffect(() => {
        // Tab-specific data fetching
        if (activeTab === 'moderation') firebaseService.getFlaggedContent().then(setFlaggedPosts);
        if (activeTab === 'newsroom') firebaseService.getPendingNews().then(setPendingNews);
        if (activeTab === 'users') firebaseService.getAllUsers().then(setUsers);
        if (activeTab === 'support') {
            const unsub = firebaseService.subscribeToAllSupportChats(setSupportChats);
            return () => unsub();
        }
        if (activeTab === 'localization') {
            firebaseService.getTranslations().then((data) => {
                // Merge remote data with local defaults for editing
                const merged = { ...translations };
                for (const lang in data) {
                    if (!merged[lang as Language]) merged[lang as Language] = {} as any;
                    Object.assign(merged[lang as Language], data[lang]);
                }
                setLocales(merged);
            });
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeChatId) {
            const unsub = firebaseService.subscribeToSupportChat(activeChatId, setChatMessages);
            firebaseService.markSupportChatRead(activeChatId, true);
            return () => unsub();
        }
    }, [activeChatId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fetchedUsers, s, sys] = await Promise.all([
                firebaseService.getAllUsers(),
                firebaseService.getAdminStats(),
                firebaseService.getSystemConfig()
            ]);
            setUsers(fetchedUsers);
            setStats(s);
            if (sys) {
                setSysConfig(prev => ({ ...prev, ...sys }));
                if (sys.ui) setUiConfig(prev => ({ ...prev, ...sys.ui }));
                if (sys.branding) setBrandingConfig(prev => ({ ...prev, ...sys.branding }));
                if (sys.xpRewards) setXpRewards(prev => ({ ...prev, ...sys.xpRewards }));
                if (sys.aiLimits) setAiLimits(prev => ({ ...prev, ...sys.aiLimits }));
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    // --- RBAC Helper ---
    const checkPermission = (perm: AdminPermission) => {
        return currentUserRole.isMaster || currentUserRole.permissions.includes(perm);
    };

    const handleSaveSystemConfig = async () => {
        if (!checkPermission('MANAGE_SYSTEM')) return showToast("Permission Denied", "error");
        try {
            await firebaseService.updateSystemConfig({
                ...sysConfig,
                ui: uiConfig,
                branding: brandingConfig,
                xpRewards,
                aiLimits
            });
            await refreshBranding();
            showToast("System Configuration Saved", "success");
        } catch (e) { showToast("Failed to save", "error"); }
    };

    // ... (Content Management Logic: searchContent, selectContent, loadContent, handleAddEpisode, handleBulkImport, handleAddChapter, handleDeleteContent - keep same)
    const searchContent = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!searchContentQuery) return;
        setLoading(true);
        try {
            const res = await anilistService.searchAnime({ query: searchContentQuery, type: contentMode, page: 1 });
            setContentSearchResults(res.Page.media);
        } catch(e) { showToast("Search failed", "error"); } finally { setLoading(false); }
    };

    const selectContent = (media: any) => {
        setMediaIdInput(media.id.toString());
        setSelectedMediaTitle(media.title.english || media.title.romaji);
        setContentSearchResults([]);
        setSearchContentQuery('');
        loadContent(media.id);
    };

    const loadContent = async (id: number) => {
        setLoading(true);
        try {
            if (contentMode === 'ANIME') {
                const eps = await firebaseService.getEpisodes(id);
                setManagedEpisodes(eps);
                const maxNum = eps.reduce((max: number, ep: any) => ep.number > max ? ep.number : max, 0);
                setEpForm(prev => ({ ...prev, number: maxNum + 1 }));
            } else {
                firebaseService.subscribeToChapters(id, (chaps: any[]) => {
                    setManagedChapters(chaps);
                    const maxNum = chaps.reduce((max: number, ch: any) => parseInt(ch.chapter) > max ? parseInt(ch.chapter) : max, 0);
                    setChForm(prev => ({ ...prev, number: maxNum + 1 }));
                });
            }
        } catch(e) { console.error(e); } finally { setLoading(false); }
    };

    const handleAddEpisode = async () => {
        if (!checkPermission('MANAGE_CONTENT')) return showToast("Permission Denied", "error");
        if (!mediaIdInput) return showToast("Select Anime ID first", "error");
        try {
            await firebaseService.addEpisode(parseInt(mediaIdInput), {
                number: epForm.number,
                title: epForm.title,
                thumbnail: epForm.thumbnail || undefined,
                sources: [{ name: 'Direct', url: epForm.url, type: epForm.type as any, audio: epForm.audio }],
                language: epForm.language 
            });
            showToast(`Episode ${epForm.number} added`, "success");
            
            // Notify users
            await firebaseService.broadcastNotification({
                title: `New Episode: ${selectedMediaTitle}`,
                body: `Episode ${epForm.number} is now available!`,
                link: `/anime/${mediaIdInput}`
            });

            setEpForm(prev => ({ ...prev, number: prev.number + 1, url: '', title: '', thumbnail: '' }));
        } catch(e) { showToast("Failed to add episode", "error"); }
    };

    const handleBulkImport = async () => {
        if (!checkPermission('MANAGE_CONTENT')) return showToast("Permission Denied", "error");
        if (!mediaIdInput || !bulkForm.urlTemplate) return showToast("Invalid Input", "error");
        setLoading(true);
        try {
            for (let i = bulkForm.start; i <= bulkForm.end; i++) {
                const url = bulkForm.urlTemplate.replace('{{ep}}', i.toString());
                await firebaseService.addEpisode(parseInt(mediaIdInput), {
                    number: i,
                    title: `Episode ${i}`,
                    sources: [{ name: 'Bulk Import', url: url, type: bulkForm.type as any, audio: bulkForm.audio }],
                    language: 'Japanese'
                });
            }
            showToast(`Successfully imported ${bulkForm.end - bulkForm.start + 1} episodes`, "success");
            
            // Notify users
            await firebaseService.broadcastNotification({
                title: `New Episodes: ${selectedMediaTitle}`,
                body: `Episodes ${bulkForm.start}-${bulkForm.end} are now available!`,
                link: `/anime/${mediaIdInput}`
            });

            setBulkImportMode(false);
            loadContent(parseInt(mediaIdInput));
        } catch (e) { showToast("Bulk import failed", "error"); } finally { setLoading(false); }
    };

    const handleAddChapter = async () => {
        if (!checkPermission('MANAGE_CONTENT')) return showToast("Permission Denied", "error");
        if (!mediaIdInput) return showToast("Select Manga ID first", "error");
        try {
            const pages = chForm.pages.split(/[\n,]+/).map(p => p.trim()).filter(p => p.startsWith('http'));
            if (pages.length === 0) return showToast("No valid URLs", "error");
            await firebaseService.addChapter(parseInt(mediaIdInput), {
                chapter: chForm.number.toString(),
                title: chForm.title,
                pages: pages,
                language: chForm.language
            });
            showToast(`Chapter ${chForm.number} added`, "success");

            // Notify users
            await firebaseService.broadcastNotification({
                title: `New Chapter: ${selectedMediaTitle}`,
                body: `Chapter ${chForm.number} is now available!`,
                link: `/manga/${mediaIdInput}`
            });

            setChForm(prev => ({ ...prev, number: prev.number + 1, pages: '', title: '' }));
        } catch(e) { showToast("Failed to add chapter", "error"); }
    };

    const handleDeleteContent = async (id: string) => {
        if (!checkPermission('MANAGE_CONTENT')) return showToast("Permission Denied", "error");
        if (!confirm("Delete this content?")) return;
        try {
            if (contentMode === 'ANIME') await firebaseService.deleteEpisode(parseInt(mediaIdInput), id);
            else await firebaseService.deleteChapter(parseInt(mediaIdInput), id);
            showToast("Deleted", "success");
        } catch (e) { showToast("Delete failed", "error"); }
    };

    // --- Admin Action Handlers (Make Admin, Ban, Support Reply, Broadcast, News, Moderation) - keep same ---
    const handleMakeAdmin = async (userId: string, currentStatus: boolean) => {
        if (!currentUserRole.isMaster && !checkPermission('MANAGE_ROLES')) return showToast("Master Admin Required", "error");
        try {
            if (currentStatus) await firebaseService.removeAdmin(userId);
            else await firebaseService.makeAdmin(userId);
            showToast(`Permissions updated for ${userId}`, "success");
            const fetchedUsers = await firebaseService.getAllUsers();
            setUsers(fetchedUsers);
        } catch (e) {
            showToast("Update failed", "error");
        }
    };

    const handleBanUser = async (userId: string, currentStatus: boolean) => {
        if (!checkPermission('MODERATE_COMMUNITY')) return showToast("Permission Denied", "error");
        try {
            await firebaseService.banUser(userId, !currentStatus);
            showToast(`Compliance status updated for ${userId}`, "success");
            const fetchedUsers = await firebaseService.getAllUsers();
            setUsers(fetchedUsers);
        } catch (e) {
            showToast("Update failed", "error");
        }
    };

    const handleSendSupportReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkPermission('HANDLE_SUPPORT')) return showToast("Permission Denied", "error");
        if (!activeChatId || !replyText.trim()) return;
        try {
            await firebaseService.sendSupportMessage(activeChatId, replyText, true);
            setReplyText('');
            showToast("Response sent", "success");
        } catch (e) {
            showToast("Failed to send reply", "error");
        }
    };

    const sendBroadcast = async () => {
        if (!checkPermission('MANAGE_SYSTEM')) return showToast("Permission Denied", "error");
        if (!broadcastForm.title || !broadcastForm.body) return;
        setSendingBroadcast(true);
        try {
            // Re-using the new helper function
            await firebaseService.broadcastNotification({
                title: broadcastForm.title,
                body: broadcastForm.body,
                link: broadcastForm.link || undefined
            });
            showToast(`Broadcast delivered`, "success");
            setBroadcastForm({ title: '', body: '', link: '' });
        } catch (e) {
            showToast("Broadcast delivery failed", "error");
        } finally {
            setSendingBroadcast(false);
        }
    };

    const handleNewsAction = async (articleId: string, status: 'PUBLISHED' | 'REJECTED') => {
        if (!checkPermission('MANAGE_NEWS')) return showToast("Permission Denied", "error");
        try {
            await firebaseService.updateNewsStatus(articleId, status);
            showToast(`Article status set to ${status}`, "success");
            const pending = await firebaseService.getPendingNews();
            setPendingNews(pending);
        } catch (e) {
            showToast("Action failed", "error");
        }
    };

    const handleModeration = async (postId: string, action: 'delete' | 'ignore', animeId: number | string) => {
        if (!checkPermission('MODERATE_COMMUNITY')) return showToast("Permission Denied", "error");
        try {
            if (action === 'delete') {
                await firebaseService.deleteDiscussionPost(animeId, postId);
                showToast("Content purged from records", "success");
            } else {
                await firebaseService.unflagPost(animeId, postId);
                showToast("Incident dismissed", "success");
            }
            const flagged = await firebaseService.getFlaggedContent();
            setFlaggedPosts(flagged);
        } catch (e) {
            showToast("Moderation protocol failed", "error");
        }
    };

    // --- Localization Handlers ---
    const handleUpdateTranslation = (key: string, value: string) => {
        setLocales((prev: any) => ({
            ...prev,
            [selectedLang]: {
                ...prev[selectedLang],
                [key]: value
            }
        }));
    };

    const saveLocalization = async () => {
        if (!checkPermission('MANAGE_SYSTEM')) return showToast("Permission Denied", "error");
        try {
            await firebaseService.saveTranslations(locales);
            setTranslations(locales); // Update local cache immediately
            showToast("Translations saved successfully", "success");
        } catch (e) {
            showToast("Failed to save translations", "error");
        }
    };

    const addNewKey = () => {
        if (!newKey.trim()) return;
        setLocales((prev: any) => ({
            ...prev,
            [selectedLang]: {
                ...prev[selectedLang],
                [newKey.trim()]: newValue || newKey
            }
        }));
        setNewKey('');
        setNewValue('');
    };

    // Define accessible tabs based on permissions
    const TABS = [
        { id: 'overview', icon: Activity, label: 'Analytics', perm: 'VIEW_ANALYTICS' },
        { id: 'users', icon: Users, label: 'Users', perm: 'MODERATE_COMMUNITY' }, 
        { id: 'support', icon: MessageSquare, label: 'Support', count: supportChats.filter(c => c.hasUnreadAdmin).length, perm: 'HANDLE_SUPPORT' },
        { id: 'content_ops', icon: Film, label: 'Content Ops', perm: 'MANAGE_CONTENT' },
        { id: 'sys_config', icon: Settings, label: 'System', perm: 'MANAGE_SYSTEM' },
        { id: 'localization', icon: Globe, label: 'Localization', perm: 'MANAGE_SYSTEM' },
        { id: 'broadcast', icon: Radio, label: 'Broadcast', perm: 'MANAGE_SYSTEM' },
        { id: 'newsroom', icon: Newspaper, label: 'Newsroom', count: pendingNews.length, perm: 'MANAGE_NEWS' },
        { id: 'moderation', icon: AlertTriangle, label: 'Moderation', count: flaggedPosts.length, perm: 'MODERATE_COMMUNITY' },
        { id: 'branding', icon: Palette, label: 'Visuals', perm: 'MANAGE_SYSTEM' },
        { id: 'economy', icon: Coins, label: 'Economy', perm: 'MANAGE_SYSTEM' },
        { id: 'ai_control', icon: BrainCircuit, label: 'AI Matrix', perm: 'MANAGE_SYSTEM' },
    ];

    const accessibleTabs = TABS.filter(t => !t.perm || checkPermission(t.perm as AdminPermission) || currentUserRole.isMaster);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn text-slate-100 pb-12">
            <div className="bg-gradient-to-r from-red-900/40 to-slate-900 border border-red-500/30 p-8 rounded-3xl mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3"><ShieldAlert className="text-red-500" /> Command Center</h1>
                    <p className="text-slate-400 mt-2">Central Node: Monitoring {brandingConfig.appName}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    {checkPermission('MANAGE_SYSTEM') && (
                        <button onClick={handleSaveSystemConfig} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
                            <Save className="w-4 h-4" /> Commit Changes
                        </button>
                    )}
                    <div className={`px-4 py-2 rounded-full border flex items-center gap-2 text-sm font-black ${sysConfig.maintenanceMode ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-green-500/20 text-green-400 border-green-500/50'}`}>
                        <Activity className="w-4 h-4" /> {sysConfig.maintenanceMode ? 'MAINTENANCE ACTIVE' : 'SYSTEM HEALTHY'}
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-white/5">
                {accessibleTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-black shadow-lg scale-105' : 'bg-dark-800 text-slate-400 hover:text-white hover:bg-dark-700'}`}>
                        <tab.icon className="w-5 h-5" /> {tab.label}
                        {tab.count !== undefined && tab.count > 0 && <span className="bg-red-500 text-white text-[10px] px-2 rounded-full animate-bounce">{tab.count}</span>}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT: LOCALIZATION */}
            {activeTab === 'localization' && (checkPermission('MANAGE_SYSTEM') || currentUserRole.isMaster) && (
                <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 shadow-2xl animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold flex items-center gap-3"><Globe className="w-6 h-6 text-blue-400" /> Language Matrix</h3>
                        <div className="flex items-center gap-2">
                            <select 
                                value={selectedLang} 
                                onChange={(e) => setSelectedLang(e.target.value as any)}
                                className="bg-dark-900 border border-white/10 rounded-lg p-2 text-sm focus:border-primary outline-none"
                            >
                                {Object.keys(translations).map(lang => (
                                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                                ))}
                            </select>
                            <button onClick={saveLocalization} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2">
                                <Save className="w-4 h-4"/> Save All
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-dark-900 p-4 rounded-xl border border-white/5">
                            <h4 className="font-bold mb-4 text-slate-400 uppercase text-xs">Add New Key</h4>
                            <div className="flex gap-2">
                                <input placeholder="Key (e.g. 'about')" value={newKey} onChange={e => setNewKey(e.target.value)} className="flex-1 bg-dark-800 border border-white/10 rounded-lg p-2 text-sm"/>
                                <input placeholder="Value" value={newValue} onChange={e => setNewValue(e.target.value)} className="flex-1 bg-dark-800 border border-white/10 rounded-lg p-2 text-sm"/>
                                <button onClick={addNewKey} disabled={!newKey} className="bg-primary px-4 rounded-lg text-white font-bold"><Plus className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.keys(locales[selectedLang] || {}).map((key) => (
                            <div key={key} className="bg-dark-900 p-4 rounded-xl border border-white/5 group hover:border-primary/50 transition-colors">
                                <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{key}</div>
                                <input 
                                    value={locales[selectedLang][key]} 
                                    onChange={(e) => handleUpdateTranslation(key, e.target.value)}
                                    className="w-full bg-transparent border-b border-white/10 focus:border-primary outline-none py-1 font-medium text-white transition-colors"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: OVERVIEW (Existing) */}
            {activeTab === 'overview' && (checkPermission('VIEW_ANALYTICS') || currentUserRole.isMaster) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
                    {[
                        { label: 'Network Population', val: stats.totalUsers, color: 'text-blue-400', icon: Users },
                        { label: 'Incident Reports', val: flaggedPosts.length, color: 'text-red-400', icon: AlertTriangle },
                        { label: 'Dispatch Pending', val: pendingNews.length, color: 'text-orange-400', icon: Newspaper },
                        { label: 'Active Sessions', val: Math.floor(Math.random() * 50) + 10, color: 'text-green-400', icon: Zap },
                    ].map((card, i) => (
                        <div key={i} className="bg-dark-800 p-6 rounded-3xl border border-white/5 shadow-xl hover:border-primary/20 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-slate-500 uppercase font-black">Live Feed</span>
                            </div>
                            <h3 className="text-slate-400 text-sm font-bold uppercase mb-1">{card.label}</h3>
                            <p className="text-4xl font-black">{card.val.toLocaleString()}</p>
                        </div>
                    ))}
                    
                    <div className="lg:col-span-3 bg-dark-800 p-8 rounded-3xl border border-white/5 shadow-xl">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> System Uptime & Latency</h3>
                        <div className="h-48 bg-dark-900 rounded-2xl border border-white/5 flex items-end gap-2 p-6 overflow-hidden relative">
                            {Array.from({ length: 40 }).map((_, i) => (
                                <div key={i} className="bg-primary/40 w-full rounded-t" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
                            ))}
                            <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-xs font-bold uppercase tracking-widest opacity-30">Realtime Monitoring Active</div>
                        </div>
                    </div>

                    <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 shadow-xl flex flex-col justify-center text-center">
                        <Cpu className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
                        <h3 className="font-bold text-slate-300">Server Node: EU-WEST-1</h3>
                        <p className="text-[10px] text-slate-500 mt-2 uppercase">Load Level: Nominal</p>
                        <div className="w-full bg-dark-900 h-1.5 rounded-full mt-4 overflow-hidden">
                            <div className="bg-green-500 h-full w-[24%]"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: CONTENT OPERATIONS (Existing) */}
            {activeTab === 'content_ops' && (checkPermission('MANAGE_CONTENT') || currentUserRole.isMaster) && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 shadow-2xl">
                        {/* ... Existing Content Ops JSX ... */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-white/5 pb-8">
                            <div>
                                <h3 className="text-2xl font-bold flex items-center gap-3"><Film className="w-6 h-6 text-blue-500" /> Digital Distribution</h3>
                                <p className="text-slate-400 text-sm mt-1">Manage streaming endpoints and manga archives.</p>
                            </div>
                            <div className="flex bg-dark-900 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                                <button onClick={() => { setContentMode('ANIME'); setMediaIdInput(''); }} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${contentMode === 'ANIME' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ANIME</button>
                                <button onClick={() => { setContentMode('MANGA'); setMediaIdInput(''); }} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${contentMode === 'MANGA' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>MANGA</button>
                            </div>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row gap-8">
                            <div className="lg:w-1/3 space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-2"><Search className="w-3 h-3"/> AniList Nexus</label>
                                    <form onSubmit={searchContent} className="relative group">
                                        <div className="absolute inset-0 bg-blue-500/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                        <input value={searchContentQuery} onChange={e => setSearchContentQuery(e.target.value)} placeholder={`Find ${contentMode.toLowerCase()} by title...`} className="w-full bg-dark-900 border border-white/10 rounded-xl p-4 pr-12 relative z-10 focus:border-blue-500 outline-none" />
                                        <button type="submit" className="absolute right-3 top-3.5 p-1.5 bg-blue-600 rounded-lg text-white z-20 transition-transform active:scale-90"><Search className="w-4 h-4" /></button>
                                    </form>
                                    
                                    {contentSearchResults.length > 0 && (
                                        <div className="bg-dark-900 border border-white/10 rounded-2xl mt-4 max-h-[400px] overflow-y-auto shadow-2xl divide-y divide-white/5 animate-slideUp">
                                            {contentSearchResults.map(m => (
                                                <button key={m.id} onClick={() => selectContent(m)} className="w-full text-left p-4 hover:bg-white/5 flex items-center gap-4 group transition-colors">
                                                    <img src={m.coverImage.medium} className="w-12 h-18 object-cover rounded-lg shadow-lg group-hover:scale-105 transition-transform" />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-sm text-white truncate">{m.title.english || m.title.romaji}</div>
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{m.format} • {m.status}</div>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-slate-700 group-hover:text-blue-500 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedMediaTitle && (
                                    <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl animate-fadeIn">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 bg-blue-500 rounded-2xl text-white shadow-lg"><CheckCircle className="w-6 h-6" /></div>
                                            <div>
                                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Active Media</div>
                                                <div className="font-bold text-white truncate max-w-[200px]">{selectedMediaTitle}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-mono text-slate-500 bg-black/30 p-2 rounded text-center">ID_NEXUS: {mediaIdInput}</div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 bg-dark-900/50 rounded-3xl p-8 border border-white/5 min-h-[500px]">
                                {!mediaIdInput ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-6">
                                        <Layers className="w-20 h-20 text-slate-500" />
                                        <div>
                                            <h4 className="text-xl font-bold">Awaiting Target Selection</h4>
                                            <p className="text-sm">Search and select a series from AniList to begin management.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8 animate-fadeIn">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-lg font-black text-slate-300 uppercase tracking-widest">{contentMode === 'ANIME' ? 'Episode' : 'Chapter'} Control Interface</h4>
                                            <button onClick={() => setBulkImportMode(!bulkImportMode)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${bulkImportMode ? 'bg-primary text-white shadow-lg' : 'bg-dark-800 text-slate-500 border border-white/5 hover:text-white'}`}>
                                                {bulkImportMode ? 'EXIT BULK MODE' : 'BULK IMPORT'}
                                            </button>
                                        </div>

                                        {bulkImportMode ? (
                                            <div className="bg-dark-800 p-6 rounded-3xl border border-primary/20 space-y-6 shadow-2xl">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Range Start</label>
                                                        <input type="number" value={bulkForm.start} onChange={e => setBulkForm({...bulkForm, start: parseInt(e.target.value)})} className="w-full bg-dark-900 border border-white/10 rounded-xl p-3" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Range End</label>
                                                        <input type="number" value={bulkForm.end} onChange={e => setBulkForm({...bulkForm, end: parseInt(e.target.value)})} className="w-full bg-dark-900 border border-white/10 rounded-xl p-3" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">URL Template (use {'{{ep}}'} for number)</label>
                                                    <input placeholder="https://provider.com/ep-{{ep}}.mp4" value={bulkForm.urlTemplate} onChange={e => setBulkForm({...bulkForm, urlTemplate: e.target.value})} className="w-full bg-dark-900 border border-white/10 rounded-xl p-4 font-mono text-xs" />
                                                </div>
                                                <button onClick={handleBulkImport} className="w-full bg-primary py-4 rounded-2xl font-black text-white shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">EXECUTE MASS IMPORT</button>
                                            </div>
                                        ) : (
                                            <div className="grid md:grid-cols-2 gap-12">
                                                {/* Single Form */}
                                                <div className="space-y-6">
                                                    {contentMode === 'ANIME' ? (
                                                        <>
                                                            <div className="flex gap-4">
                                                                <div className="w-24">
                                                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Num</label>
                                                                    <input type="number" value={epForm.number} onChange={e => setEpForm({...epForm, number: parseInt(e.target.value)})} className="w-full bg-dark-800 border border-white/10 rounded-xl p-3 text-center font-bold" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Episode Title</label>
                                                                    <input value={epForm.title} onChange={e => setEpForm({...epForm, title: e.target.value})} placeholder="Optional..." className="w-full bg-dark-800 border border-white/10 rounded-xl p-3" />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Stream Endpoint (HLS/Direct/Embed)</label>
                                                                <input value={epForm.url} onChange={e => setEpForm({...epForm, url: e.target.value})} placeholder="https://..." className="w-full bg-dark-800 border border-white/10 rounded-xl p-3 font-mono text-xs" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Thumbnail Overide URL</label>
                                                                <input value={epForm.thumbnail} onChange={e => setEpForm({...epForm, thumbnail: e.target.value})} placeholder="https://..." className="w-full bg-dark-800 border border-white/10 rounded-xl p-3 text-xs" />
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <select value={epForm.type} onChange={e => setEpForm({...epForm, type: e.target.value})} className="bg-dark-800 border border-white/10 rounded-xl p-3 text-xs font-bold">
                                                                    <option value="video">DIRECT</option>
                                                                    <option value="embed">EMBED</option>
                                                                </select>
                                                                <select value={epForm.audio} onChange={e => setEpForm({...epForm, audio: e.target.value})} className="bg-dark-800 border border-white/10 rounded-xl p-3 text-xs font-bold">
                                                                    <option value="sub">SUB</option>
                                                                    <option value="dub">DUB</option>
                                                                </select>
                                                                <input value={epForm.language} onChange={e => setEpForm({...epForm, language: e.target.value})} className="bg-dark-800 border border-white/10 rounded-xl p-3 text-xs font-bold" />
                                                            </div>
                                                            <button onClick={handleAddEpisode} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95">ADD EPISODE</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex gap-4">
                                                                <div className="w-24">
                                                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Chapter #</label>
                                                                    <input type="number" value={chForm.number} onChange={e => setChForm({...chForm, number: parseInt(e.target.value)})} className="w-full bg-dark-800 border border-white/10 rounded-xl p-3 text-center font-bold" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Title</label>
                                                                    <input value={chForm.title} onChange={e => setChForm({...chForm, title: e.target.value})} placeholder="Optional..." className="w-full bg-dark-800 border border-white/10 rounded-xl p-3" />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Image Matrix (Comma/Newline Split)</label>
                                                                <textarea value={chForm.pages} onChange={e => setChForm({...chForm, pages: e.target.value})} placeholder="https://host.com/p1.jpg, https://host.com/p2.jpg..." className="w-full bg-dark-800 border border-white/10 rounded-xl p-3 h-48 text-[10px] font-mono" />
                                                            </div>
                                                            <button onClick={handleAddChapter} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95">INDEX CHAPTER</button>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Content Index */}
                                                <div className="flex flex-col h-full min-h-[400px]">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="text-xs font-black text-slate-500 uppercase">Archive Inventory</h5>
                                                        <span className="text-[10px] bg-dark-800 px-2 rounded-full border border-white/5">
                                                            {contentMode === 'ANIME' ? managedEpisodes.length : managedChapters.length} Items Found
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 bg-black/30 border border-white/5 rounded-3xl overflow-y-auto custom-scrollbar p-2">
                                                        {(contentMode === 'ANIME' ? managedEpisodes : managedChapters).map((item: any) => (
                                                            <div key={item.id} className="flex justify-between items-center p-4 hover:bg-white/5 rounded-2xl group transition-all">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 bg-dark-800 rounded-xl flex items-center justify-center font-black text-xs border border-white/5">
                                                                        {contentMode === 'ANIME' ? item.number : item.chapter}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="font-bold text-sm truncate max-w-[140px]">{item.title || `Entry ${item.number}`}</div>
                                                                        <div className="text-[9px] text-slate-500 uppercase font-black">{contentMode === 'ANIME' ? `${item.sources?.[0]?.audio} • ${item.sources?.[0]?.type}` : `${item.pages?.length} pages`}</div>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => handleDeleteContent(item.id)} className="p-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        ))}
                                                        {(contentMode === 'ANIME' ? managedEpisodes : managedChapters).length === 0 && (
                                                            <div className="h-full flex items-center justify-center text-slate-600 text-xs font-bold uppercase tracking-tighter">No Indexed Records</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Other tabs existing ... */}
            
            {/* BRANDING TAB (Visuals) - Existing */}
            {activeTab === 'branding' && (checkPermission('MANAGE_SYSTEM') || currentUserRole.isMaster) && (
                <div className="bg-dark-800 p-8 rounded-[3rem] border border-white/5 max-w-4xl mx-auto shadow-2xl animate-fadeIn">
                    {/* ... Existing Branding Content ... */}
                    <div className="flex items-center gap-6 mb-10 border-b border-white/5 pb-8">
                        <div className="p-5 bg-pink-500/10 rounded-3xl text-pink-500"><Palette className="w-10 h-10" /></div>
                        <div>
                            <h3 className="text-3xl font-black">Visual Identity</h3>
                            <p className="text-slate-400">Configure app branding, logos, and global UI state.</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-2">Application Name</label>
                                <input value={brandingConfig.appName} onChange={e => setBrandingConfig({...brandingConfig, appName: e.target.value})} className="w-full bg-dark-900 border border-white/10 rounded-2xl p-4 font-black" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-2">Asset Route: Logo</label>
                                <div className="flex gap-4">
                                    <input value={brandingConfig.logoUrl} onChange={e => setBrandingConfig({...brandingConfig, logoUrl: e.target.value})} className="flex-1 bg-dark-900 border border-white/10 rounded-2xl p-4 text-xs font-mono" />
                                    <img src={brandingConfig.logoUrl} className="w-14 h-14 rounded-2xl bg-dark-700 object-cover border border-white/10 shadow-lg"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-2">Background: Login Matrix</label>
                                <input value={brandingConfig.loginBackground} onChange={e => setBrandingConfig({...brandingConfig, loginBackground: e.target.value})} className="w-full bg-dark-900 border border-white/10 rounded-2xl p-4 text-xs font-mono" placeholder="https://..." />
                            </div>
                        </div>

                        <div className="bg-dark-900/50 p-8 rounded-[2rem] border border-white/5 space-y-6">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Layout className="w-4 h-4"/> Interface Switches</h4>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-4 bg-dark-800 rounded-2xl border border-white/5 cursor-pointer hover:bg-dark-700 transition-all">
                                    <span className="font-bold text-sm">Dashboard: Trending</span>
                                    <input type="checkbox" checked={uiConfig.showTrending} onChange={e => setUiConfig({...uiConfig, showTrending: e.target.checked})} className="w-5 h-5 accent-blue-500"/>
                                </label>
                                <label className="flex items-center justify-between p-4 bg-dark-800 rounded-2xl border border-white/5 cursor-pointer hover:bg-dark-700 transition-all">
                                    <span className="font-bold text-sm">Dashboard: Seasonal</span>
                                    <input type="checkbox" checked={uiConfig.showSeasonal} onChange={e => setUiConfig({...uiConfig, showSeasonal: e.target.checked})} className="w-5 h-5 accent-blue-500"/>
                                </label>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-2">Global UI Accent</label>
                                    <div className="flex gap-4 items-center bg-dark-800 p-2 rounded-2xl border border-white/10">
                                        <input type="color" value={uiConfig.featuredColor} onChange={e => setUiConfig({...uiConfig, featuredColor: e.target.value})} className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-none overflow-hidden" />
                                        <input value={uiConfig.featuredColor} onChange={e => setUiConfig({...uiConfig, featuredColor: e.target.value})} className="flex-1 bg-transparent text-sm font-mono uppercase font-black outline-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
