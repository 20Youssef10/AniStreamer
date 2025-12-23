import React, { useEffect, useState } from 'react';
import { firebaseService } from '../services/firebase';
import { AppNotification } from '../types';
import { Bell, Check, Trash2, X, BellOff } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, userId }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    
    useEffect(() => {
        if (userId) {
            const unsub = firebaseService.subscribeToNotifications(userId, (data) => {
                setNotifications(data);
            });
            // Request permission on open if needed
            if (isOpen) {
                firebaseService.requestNotificationPermission(userId);
            }
            return () => unsub();
        }
    }, [userId, isOpen]);

    const handleRead = async (id: string) => {
        await firebaseService.markNotificationRead(userId, id);
    };

    const handleClearAll = async () => {
        await firebaseService.clearAllNotifications(userId);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden" onClick={onClose} />
            <div className={`fixed top-16 right-0 md:right-4 w-full md:w-96 max-h-[80vh] z-[70] bg-dark-800 border border-white/10 rounded-b-2xl md:rounded-2xl shadow-2xl flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-y-0' : '-translate-y-full md:translate-y-0 md:opacity-0 pointer-events-none'}`}>
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-dark-900/50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        <h3 className="font-bold">Notifications</h3>
                        {notifications.filter(n => !n.read).length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                                {notifications.filter(n => !n.read).length} New
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {notifications.length > 0 && (
                            <button onClick={handleClearAll} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-white/10" title="Mark all read">
                                <Check className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-white/10">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <BellOff className="w-12 h-12 mb-2 opacity-20" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div 
                                key={n.id} 
                                className={`p-3 rounded-xl border transition-colors flex gap-3 ${n.read ? 'bg-dark-900/50 border-transparent opacity-60' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                onClick={() => !n.read && handleRead(n.id)}
                            >
                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-slate-700' : 'bg-primary'}`} />
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-bold truncate ${n.read ? 'text-slate-400' : 'text-white'}`}>{n.title}</h4>
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">{n.body}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-slate-600">{new Date(n.timestamp).toLocaleDateString()}</span>
                                        {n.link && (
                                            <Link to={n.link} onClick={onClose} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20">
                                                View
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

export default NotificationPanel;