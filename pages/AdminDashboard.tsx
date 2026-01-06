
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
  History, Info, Download, Upload, List, UserCheck, UserX, MessageCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';
import LazyImage from '../components/LazyImage';

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
                const merged = { ...translations };
                if (data) {
                    for (const lang in data) {
                        if (!merged[lang as Language]) merged[lang as Language] = {} as any;
                        Object.assign(merged[lang as Language], data[lang]);
                    }
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

    const checkPermission = (perm: AdminPermission) => {
        return currentUserRole.isMaster || (currentUserRole.permissions && currentUserRole.permissions.includes(perm));
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

    // Content Management
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

    const handleMakeAdmin = async (userId: string, currentStatus: boolean) => {
        if (!currentUserRole.isMaster && !checkPermission('MANAGE_ROLES')) return showToast("Permission Denied", "error");
        try {
            if (currentStatus) await firebaseService.removeAdmin(userId);
            else await firebaseService.makeAdmin(userId);
            showToast(`Permissions updated for ${userId}`, "success");
            const fetchedUsers = await firebaseService.getAllUsers();
            setUsers(fetchedUsers);
        } catch (e) { showToast("Update failed", "error"); }
    };

    const handleBanUser = async (userId: string, isBanned: boolean) => {
        if (!checkPermission('MODERATE_COMMUNITY')) return showToast("Permission Denied", "error");
        try {
            await firebaseService.banUser(userId, !isBanned);
            showToast(`User status updated`, "success");
            const fetchedUsers = await firebaseService.getAllUsers();
            setUsers(fetchedUsers);
        } catch (e) { showToast("Update failed", "error"); }
    };

    const handleSendSupportReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkPermission('HANDLE_SUPPORT')) return showToast("Permission Denied", "error");
        if (!activeChatId || !replyText.trim()) return;
        try {
            await firebaseService.sendSupportMessage(activeChatId, replyText, true);
            setReplyText('');
            showToast("Response sent", "success");
        } catch (e) { showToast("Failed to send reply", "error"); }
    };

    const sendBroadcast = async () => {
        if (!checkPermission('MANAGE_SYSTEM')) return showToast("Permission Denied", "error");
        if (!broadcastForm.title || !broadcastForm.body) return;
        setSendingBroadcast(true);
        try {
            await firebaseService.broadcastNotification({
                title: broadcastForm.title,
                body: broadcastForm.body,
                link: broadcastForm.link || undefined
            });
            showToast(`Broadcast delivered`, "success");
            setBroadcastForm({ title: '', body: '', link: '' });
        } catch (e) { showToast("Broadcast delivery failed", "error"); } finally { setSendingBroadcast(false); }
    };

    const handleNewsAction = async (articleId: string, status: 'PUBLISHED' | 'REJECTED') => {
        if (!checkPermission('MANAGE_NEWS')) return showToast("Permission Denied", "error");
        try {
            await firebaseService.updateNewsStatus(articleId, status);
            showToast(`Article status set to ${status}`, "success");
            const pending = await firebaseService.getPendingNews();
            setPendingNews(pending);
        } catch (e) { showToast("Action failed", "error"); }
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
        } catch (e) { showToast("Moderation protocol failed", "error"); }
    };

    const handleUpdateTranslation = (key: string, value: string) => {
        setLocales((prev: any) => ({
            ...prev,
            [selectedLang]: { ...prev[selectedLang], [key]: value }
        }));
    };

    const saveLocalization = async () => {
        if (!checkPermission('MANAGE_SYSTEM')) return showToast("Permission Denied", "error");
        try {
            await firebaseService.saveTranslations(locales);
            setTranslations(locales);
            showToast("Translations saved successfully", "success");
        } catch (e) { showToast("Failed to save translations", "error"); }
    };

    const addNewKey = () => {
        if (!newKey.trim()) return;
        setLocales((prev: any) => ({
            ...prev,
            [selectedLang]: { ...prev[selectedLang], [newKey.trim()]: newValue || newKey }
        }));
        setNewKey('');
        setNewValue('');
    };

    const filteredUsers = users.filter(u => 
        u.username?.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

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

            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-white/5">
                {accessibleTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-black shadow-lg scale-105' : 'bg-dark-800 text-slate-400 hover:text-white hover:bg-dark-700'}`}>
                        <tab.icon className="w-5 h-5" /> {tab.label}
                        {tab.count !== undefined && tab.count > 0 && <span className="bg-red-500 text-white text-[10px] px-2 rounded-full animate-bounce">{tab.count}</span>}
                    </button>
                ))}
            </div>

            {/* USERS TAB */}
            {activeTab === 'users' && (checkPermission('MANAGE_USERS') || checkPermission('MODERATE_COMMUNITY') || currentUserRole.isMaster) && (
                <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 shadow-2xl animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold flex items-center gap-3"><Users className="w-6 h-6 text-blue-400" /> User Database</h3>
                        <div className="relative">
                            <input 
                                value={userSearch} 
                                onChange={e => setUserSearch(e.target.value)} 
                                placeholder="Search by name, email..." 
                                className="bg-dark-900 border border-white/10 rounded-lg p-3 pl-10 w-64 focus:border-blue-500 outline-none"
                            />
                            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-slate-500 text-xs uppercase border-b border-white/5">
                                    <th className="p-4">User</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Stats</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map(u => (
                                    <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-dark-700 overflow-hidden">
                                                {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full font-bold">{u.displayName[0]}</div>}
                                            </div>
                                            <div>
                                                <div className="font-bold">{u.displayName}</div>
                                                <div className="text-xs text-slate-500">{u.email}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {u.isAdmin ? <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold border border-yellow-500/30">ADMIN</span> : <span className="text-slate-400 text-sm">User</span>}
                                        </td>
                                        <td className="p-4">
                                            {u.isBanned ? <span className="text-red-500 text-xs font-bold">BANNED</span> : <span className="text-green-400 text-xs">Active</span>}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-slate-400">Lvl {u.level} • {u.xp} XP</div>
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            {(currentUserRole.isMaster || checkPermission('MANAGE_ROLES')) && (
                                                <button onClick={() => handleMakeAdmin(u.uid, !!u.isAdmin)} className="p-2 bg-dark-900 rounded hover:bg-white/10" title="Toggle Admin">
                                                    {u.isAdmin ? <Shield className="w-4 h-4 text-yellow-400" /> : <Shield className="w-4 h-4 text-slate-600" />}
                                                </button>
                                            )}
                                            {checkPermission('MODERATE_COMMUNITY') && (
                                                <button onClick={() => handleBanUser(u.uid, !!u.isBanned)} className="p-2 bg-dark-900 rounded hover:bg-red-500/20" title="Ban/Unban">
                                                    {u.isBanned ? <UserCheck className="w-4 h-4 text-green-400" /> : <Ban className="w-4 h-4 text-red-400" />}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SUPPORT TAB */}
            {activeTab === 'support' && (checkPermission('HANDLE_SUPPORT') || currentUserRole.isMaster) && (
                <div className="grid md:grid-cols-3 gap-6 h-[600px] animate-fadeIn">
                    <div className="bg-dark-800 rounded-3xl border border-white/5 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/5 font-bold text-lg flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-green-400" /> Inquiries
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {supportChats.map(chat => (
                                <button 
                                    key={chat.id} 
                                    onClick={() => setActiveChatId(chat.id)}
                                    className={`w-full text-left p-4 rounded-xl transition-all ${activeChatId === chat.id ? 'bg-primary text-white' : 'hover:bg-white/5 text-slate-300'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm truncate w-24">{chat.id.slice(0, 8)}...</span>
                                        {chat.hasUnreadAdmin && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                                    </div>
                                    <div className="text-xs opacity-70 truncate">{chat.lastMessage}</div>
                                    <div className="text-[10px] opacity-50 mt-1">{new Date(chat.updatedAt).toLocaleDateString()}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="md:col-span-2 bg-dark-800 rounded-3xl border border-white/5 flex flex-col overflow-hidden">
                        {activeChatId ? (
                            <>
                                <div className="p-6 border-b border-white/5 font-bold bg-dark-900/50">
                                    Chat with {activeChatId}
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                    {chatMessages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-3 rounded-xl text-sm ${msg.isAdmin ? 'bg-primary text-white rounded-tr-none' : 'bg-dark-900 border border-white/10 rounded-tl-none'}`}>
                                                {msg.text}
                                                <div className="text-[10px] opacity-50 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleSendSupportReply} className="p-4 border-t border-white/5 flex gap-2 bg-dark-900/50">
                                    <input value={replyText} onChange={e => setReplyText(e.target.value)} className="flex-1 bg-dark-800 border border-white/10 rounded-lg p-3 text-sm focus:border-primary outline-none" placeholder="Type reply..." />
                                    <button type="submit" className="p-3 bg-primary rounded-lg text-white hover:bg-blue-600"><Send className="w-4 h-4" /></button>
                                </form>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">Select a chat to view</div>
                        )}
                    </div>
                </div>
            )}

            {/* SYSTEM CONFIG TAB */}
            {activeTab === 'sys_config' && (checkPermission('MANAGE_SYSTEM') || currentUserRole.isMaster) && (
                <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 shadow-2xl animate-fadeIn space-y-8">
                    <h3 className="text-2xl font-bold flex items-center gap-3 mb-6"><Settings className="w-6 h-6 text-slate-400"/> Core Configuration</h3>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-dark-900 p-6 rounded-2xl border border-white/5">
                                <h4 className="font-bold mb-4 text-red-400 uppercase text-xs tracking-widest">Emergency Controls</h4>
                                <label className="flex items-center justify-between cursor-pointer mb-4">
                                    <span className="font-bold">Maintenance Mode</span>
                                    <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                                        <input type="checkbox" checked={sysConfig.maintenanceMode} onChange={e => setSysConfig({...sysConfig, maintenanceMode: e.target.checked})} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                                        <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${sysConfig.maintenanceMode ? 'bg-red-500' : 'bg-gray-700'}`}></label>
                                    </div>
                                </label>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="font-bold">Allow Registrations</span>
                                    <input type="checkbox" checked={sysConfig.allowRegistrations} onChange={e => setSysConfig({...sysConfig, allowRegistrations: e.target.checked})} className="w-5 h-5 accent-green-500"/>
                                </label>
                            </div>

                            <div className="bg-dark-900 p-6 rounded-2xl border border-white/5">
                                <h4 className="font-bold mb-4 text-purple-400 uppercase text-xs tracking-widest">AI Matrix</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Gemini API Key</label>
                                        <input type="password" value={sysConfig.geminiApiKey} onChange={e => setSysConfig({...sysConfig, geminiApiKey: e.target.value})} className="w-full bg-dark-800 border border-white/10 rounded-lg p-3 text-sm font-mono text-green-400"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Default Model</label>
                                        <select value={sysConfig.defaultModel} onChange={e => setSysConfig({...sysConfig, defaultModel: e.target.value})} className="w-full bg-dark-800 border border-white/10 rounded-lg p-3 text-sm">
                                            <option value="gemini-3-flash-preview">Flash (Fast)</option>
                                            <option value="gemini-3-pro-preview">Pro (Reasoning)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-dark-900 p-6 rounded-2xl border border-white/5">
                                <h4 className="font-bold mb-4 text-blue-400 uppercase text-xs tracking-widest">Global Announcements</h4>
                                <textarea 
                                    value={sysConfig.globalAnnouncement} 
                                    onChange={e => setSysConfig({...sysConfig, globalAnnouncement: e.target.value})}
                                    className="w-full bg-dark-800 border border-white/10 rounded-xl p-4 h-32 text-sm focus:border-blue-500 outline-none resize-none"
                                    placeholder="Message displayed on all user dashboards..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BROADCAST TAB */}
            {activeTab === 'broadcast' && (checkPermission('MANAGE_SYSTEM') || currentUserRole.isMaster) && (
                <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 shadow-2xl animate-fadeIn max-w-2xl mx-auto">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-3"><Radio className="w-6 h-6 text-green-400" /> System Broadcast</h3>
                    <div className="space-y-4">
                        <input value={broadcastForm.title} onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})} placeholder="Title" className="w-full bg-dark-900 border border-white/10 rounded-xl p-4 font-bold outline-none focus:border-green-500" />
                        <textarea value={broadcastForm.body} onChange={e => setBroadcastForm({...broadcastForm, body: e.target.value})} placeholder="Message body..." className="w-full bg-dark-900 border border-white/10 rounded-xl p-4 h-32 outline-none focus:border-green-500 resize-none" />
                        <input value={broadcastForm.link} onChange={e => setBroadcastForm({...broadcastForm, link: e.target.value})} placeholder="Optional Link (e.g. /anime/1)" className="w-full bg-dark-900 border border-white/10 rounded-xl p-4 text-sm font-mono outline-none focus:border-green-500" />
                        
                        <div className="bg-dark-900 p-4 rounded-xl border border-white/5 mt-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Preview</h4>
                            <div className="bg-dark-800 p-4 rounded-xl border border-white/10 flex gap-3">
                                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center"><Bell className="w-5 h-5 text-white" /></div>
                                <div>
                                    <div className="font-bold">{broadcastForm.title || 'Notification Title'}</div>
                                    <div className="text-sm text-slate-400">{broadcastForm.body || 'Message content will appear here...'}</div>
                                </div>
                            </div>
                        </div>

                        <button onClick={sendBroadcast} disabled={!broadcastForm.title || !broadcastForm.body || sendingBroadcast} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2">
                            {sendingBroadcast ? <RefreshCw className="animate-spin w-5 h-5"/> : <Send className="w-5 h-5"/>} Send Broadcast
                        </button>
                    </div>
                </div>
            )}

            {/* NEWSROOM TAB */}
            {activeTab === 'newsroom' && (checkPermission('MANAGE_NEWS') || currentUserRole.isMaster) && (
                <div className="space-y-6 animate-fadeIn">
                    <h3 className="text-2xl font-bold flex items-center gap-3"><Newspaper className="w-6 h-6 text-orange-400" /> Editorial Queue</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingNews.length === 0 ? <div className="col-span-full text-center py-12 text-slate-500">No pending articles.</div> : pendingNews.map(news => (
                            <div key={news.id} className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                                <div className="h-40 relative">
                                    <LazyImage src={news.image} alt={news.title} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded shadow">{news.category}</div>
                                </div>
                                <div className="p-4 flex-1">
                                    <h4 className="font-bold text-lg mb-2 line-clamp-2">{news.title}</h4>
                                    <p className="text-sm text-slate-400 line-clamp-3 mb-4">{news.summary}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                        <span>By {news.author.name}</span> • <span>{new Date(news.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleNewsAction(news.id, 'PUBLISHED')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold text-sm">Approve</button>
                                        <button onClick={() => handleNewsAction(news.id, 'REJECTED')} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold text-sm">Reject</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODERATION TAB */}
            {activeTab === 'moderation' && (checkPermission('MODERATE_COMMUNITY') || currentUserRole.isMaster) && (
                <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 shadow-2xl animate-fadeIn">
                    <h3 className="text-2xl font-bold flex items-center gap-3 mb-6"><AlertTriangle className="w-6 h-6 text-red-500" /> Flagged Content</h3>
                    <div className="space-y-4">
                        {flaggedPosts.length === 0 ? <div className="text-center py-12 text-slate-500">Clean records. No flags detected.</div> : flaggedPosts.map((post, i) => (
                            <div key={i} className="bg-dark-900 p-4 rounded-xl border border-red-500/20 flex gap-4">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-red-400 text-sm">Flagged Reason: {post.flagReason || 'User Report'}</span>
                                        <span className="text-xs text-slate-500">{post.userName} • {new Date(post.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-300 bg-black/20 p-3 rounded-lg text-sm">{post.content}</p>
                                </div>
                                <div className="flex flex-col gap-2 justify-center">
                                    <button onClick={() => handleModeration(post.id, 'delete', post.animeId)} className="p-2 bg-red-600 text-white rounded hover:bg-red-700" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleModeration(post.id, 'ignore', post.animeId)} className="p-2 bg-dark-700 text-slate-300 rounded hover:bg-dark-600" title="Dismiss"><CheckCircle className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ECONOMY TAB */}
            {activeTab === 'economy' && (checkPermission('MANAGE_SYSTEM') || currentUserRole.isMaster) && (
                <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 shadow-2xl animate-fadeIn max-w-2xl mx-auto">
                    <h3 className="text-2xl font-bold flex items-center gap-3 mb-6"><Coins className="w-6 h-6 text-yellow-400" /> XP Economy</h3>
                    <div className="space-y-4">
                        {Object.keys(xpRewards).map((key) => (
                            <div key={key} className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-white/5">
                                <span className="font-bold capitalize text-slate-300">{key.replace(/([A-Z])/g, ' $1').trim()} Reward</span>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        value={(xpRewards as any)[key]} 
                                        onChange={e => setXpRewards({...xpRewards, [key]: parseInt(e.target.value)})}
                                        className="w-20 bg-dark-800 border border-white/10 rounded-lg p-2 text-center font-bold text-yellow-400 focus:border-yellow-500 outline-none"
                                    />
                                    <span className="text-xs font-bold text-slate-500">XP</span>
                                </div>
                            </div>
                        ))}
                        <button onClick={handleSaveSystemConfig} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-xl shadow-lg mt-4">Save Economy Settings</button>
                    </div>
                </div>
            )}

            {/* AI CONTROL TAB */}
            {activeTab === 'ai_control' && (checkPermission('MANAGE_SYSTEM') || currentUserRole.isMaster) && (
                <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 shadow-2xl animate-fadeIn">
                    <h3 className="text-2xl font-bold flex items-center gap-3 mb-6"><BrainCircuit className="w-6 h-6 text-purple-400" /> AI Governance</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="font-bold text-xs uppercase text-slate-500">Rate Limiting</h4>
                            <div className="flex justify-between items-center p-4 bg-dark-900 rounded-xl border border-white/5">
                                <span>Base Daily Requests</span>
                                <input type="number" value={aiLimits.baseDailyRequests} onChange={e => setAiLimits({...aiLimits, baseDailyRequests: parseInt(e.target.value)})} className="w-20 bg-dark-800 border border-white/10 rounded-lg p-2 text-center text-purple-400"/>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-dark-900 rounded-xl border border-white/5">
                                <span>Requests Per Level</span>
                                <input type="number" value={aiLimits.requestsPerLevel} onChange={e => setAiLimits({...aiLimits, requestsPerLevel: parseInt(e.target.value)})} className="w-20 bg-dark-800 border border-white/10 rounded-lg p-2 text-center text-purple-400"/>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-dark-900 rounded-xl border border-white/5">
                                <span>Max Daily Cap</span>
                                <input type="number" value={aiLimits.maxDailyRequests} onChange={e => setAiLimits({...aiLimits, maxDailyRequests: parseInt(e.target.value)})} className="w-20 bg-dark-800 border border-white/10 rounded-lg p-2 text-center text-purple-400"/>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold text-xs uppercase text-slate-500">Personality Core</h4>
                            <textarea 
                                value={sysConfig.aiSystemInstruction}
                                onChange={e => setSysConfig({...sysConfig, aiSystemInstruction: e.target.value})}
                                placeholder="Global System Instruction for AI Assistant..."
                                className="w-full h-48 bg-dark-900 border border-white/10 rounded-xl p-4 text-sm font-mono focus:border-purple-500 outline-none resize-none"
                            />
                        </div>
                    </div>
                    <button onClick={handleSaveSystemConfig} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg mt-6">Update AI Matrix</button>
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
