
import React, { useState, useEffect, useRef } from 'react';
import { firebaseService } from '../services/firebase';
import { externalService } from '../services/external';
import { ChatMessage } from '../types';
import { Send, Users, ShieldAlert, MessageCircle, Hash, Smile, X } from 'lucide-react';
import { MentionInput } from '../components/Layout';

const ROOMS = [
    { id: 'general', label: 'General', desc: 'Chill chat about anything.', icon: MessageCircle },
    { id: 'spoilers', label: 'Spoilers', desc: 'Discuss plot twists freely.', icon: ShieldAlert },
    { id: 'recommendations', label: 'Recommendations', desc: 'Find your next watch.', icon: Users },
];

const GlobalChat: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  
  const auth = firebaseService.getAuthInstance();
  const user = auth.currentUser;

  useEffect(() => {
      const unsub = firebaseService.subscribeToGlobalChat(currentRoom, (msgs) => {
          setMessages(msgs);
          setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return () => unsub();
  }, [currentRoom]);

  const handleSend = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!user || !newMessage.trim()) return;

      try {
          await firebaseService.sendGlobalMessage(currentRoom, {
              userId: user.uid,
              userName: user.displayName || 'Anonymous',
              content: newMessage,
              timestamp: Date.now(),
              type: 'text',
              avatar: user.photoURL || undefined
          });
          setNewMessage('');
      } catch (e) {
          console.error(e);
      }
  };

  const sendReaction = async (category: any) => {
      setShowReactions(false);
      const gif = await externalService.getReaction(category);
      if (gif && user) {
          await firebaseService.sendGlobalMessage(currentRoom, {
              userId: user.uid,
              userName: user.displayName || 'Anonymous',
              content: gif.url, // Stores URL as content
              timestamp: Date.now(),
              type: 'system', // Using 'system' type loosely here to denote non-text, or ideally add 'image' to types
              avatar: user.photoURL || undefined
          });
      }
  };

  // Helper to check if content is image URL
  const isImageUrl = (url: string) => {
      return url.match(/\.(jpeg|jpg|gif|png)$/) != null;
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-fadeIn">
        {/* Rooms Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 flex md:block overflow-x-auto space-x-2 md:space-x-0 md:space-y-2 pb-2 md:pb-0">
            <h2 className="text-xl font-bold mb-4 px-2 hidden md:block">Chat Rooms</h2>
            {ROOMS.map(room => (
                <button
                    key={room.id}
                    onClick={() => setCurrentRoom(room.id)}
                    className={`flex-shrink-0 md:w-full text-left p-3 md:p-4 rounded-xl flex items-center gap-3 transition-colors ${
                        currentRoom === room.id 
                        ? 'bg-primary text-white shadow-lg' 
                        : 'bg-dark-800 text-slate-400 hover:bg-dark-700'
                    }`}
                >
                    <div className={`p-2 rounded-lg ${currentRoom === room.id ? 'bg-white/20' : 'bg-dark-900'}`}>
                        <room.icon className="w-5 h-5" />
                    </div>
                    <div className="hidden md:block">
                        <div className="font-bold text-sm">{room.label}</div>
                        <div className={`text-xs ${currentRoom === room.id ? 'text-blue-100' : 'text-slate-500'}`}>{room.desc}</div>
                    </div>
                    {/* Mobile Label */}
                    <span className="md:hidden font-bold text-sm">{room.label}</span>
                </button>
            ))}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-dark-800 rounded-2xl border border-white/5 overflow-hidden relative">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-dark-900/50">
                <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-lg capitalize">{currentRoom}</h3>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Live
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map(msg => {
                    const isMe = user && msg.userId === user.uid;
                    const isImg = isImageUrl(msg.content);

                    return (
                        <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden shrink-0 border border-white/10">
                                {msg.avatar ? (
                                    <img src={msg.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold">{msg.userName[0]}</div>
                                )}
                            </div>
                            <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-300">{msg.userName}</span>
                                    <span className="text-[10px] text-slate-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className={`p-3 rounded-xl text-sm ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-dark-900 text-slate-200 rounded-tl-none border border-white/5'}`}>
                                    {isImg ? (
                                        <img src={msg.content} alt="Reaction" className="max-w-xs rounded-lg" />
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={chatBottomRef} />
            </div>

            {/* Reaction Selector */}
            {showReactions && (
                <div className="absolute bottom-20 right-4 bg-dark-900 border border-white/10 rounded-xl p-2 shadow-xl grid grid-cols-4 gap-2 z-10 animate-slideUp">
                    {['hug', 'kiss', 'pat', 'smile', 'wave', 'cry', 'dance', 'smug'].map((reaction) => (
                        <button 
                            key={reaction}
                            onClick={() => sendReaction(reaction)}
                            className="p-2 hover:bg-white/10 rounded-lg text-xs font-bold capitalize text-slate-300"
                        >
                            {reaction}
                        </button>
                    ))}
                </div>
            )}

            <div className="p-4 bg-dark-900/50 border-t border-white/5">
                {user ? (
                    <form onSubmit={handleSend} className="flex gap-2">
                        <button 
                            type="button"
                            onClick={() => setShowReactions(!showReactions)}
                            className={`p-3 rounded-xl transition-colors ${showReactions ? 'bg-pink-500 text-white' : 'bg-dark-800 text-slate-400 hover:text-white'}`}
                        >
                            <Smile className="w-5 h-5" />
                        </button>
                        <MentionInput 
                            value={newMessage} 
                            onChange={setNewMessage} 
                            placeholder={`Message #${currentRoom}...`}
                            className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors"
                            singleLine
                            onSubmit={() => handleSend()}
                        />
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim()}
                            className="p-3 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                ) : (
                    <div className="text-center text-slate-500 text-sm py-2">
                        Please login to chat.
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default GlobalChat;
