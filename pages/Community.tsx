
import React, { useEffect, useState } from 'react';
import { firebaseService } from '../services/firebase';
import { Club, ChatMessage } from '../types';
import { Users, UserPlus, MessageCircle, Plus, Hash, X, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { MentionInput } from '../components/Layout';

const Community: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [activeClub, setActiveClub] = useState<Club | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  
  // Create Form
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [newClubTags, setNewClubTags] = useState('');

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  
  const { showToast } = useToast();
  const auth = firebaseService.getAuthInstance();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchClubs = async () => {
      const data = await firebaseService.getClubs();
      setClubs(data);
    };
    fetchClubs();
  }, [activeClub]); // Re-fetch on view change

  useEffect(() => {
      if (activeClub) {
          const unsub = firebaseService.subscribeToClubChat(activeClub.id, setMessages);
          return () => unsub();
      }
  }, [activeClub]);

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return showToast("Login required", "error");
      
      try {
          await firebaseService.createClub({
              name: newClubName,
              description: newClubDesc,
              ownerId: user.uid,
              tags: newClubTags.split(',').map(t => t.trim()).filter(Boolean)
          });
          setShowCreate(false);
          showToast("Club Created!", "success");
          // Refresh list
          const data = await firebaseService.getClubs();
          setClubs(data);
      } catch (e) {
          showToast("Failed to create club", "error");
      }
  };

  const sendMessage = async (e?: React.FormEvent) => {
      if(e) e.preventDefault();
      if(!user || !activeClub || !msgInput.trim()) return;
      
      await firebaseService.sendClubMessage(activeClub.id, {
          userId: user.uid,
          userName: user.displayName || 'Member',
          content: msgInput,
          timestamp: Date.now(),
          type: 'text',
          avatar: user.photoURL || undefined
      });
      setMsgInput('');
  };

  if (activeClub) {
      return (
          <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex bg-dark-800 rounded-2xl border border-white/5 overflow-hidden animate-fadeIn">
              {/* Sidebar */}
              <div className="w-64 bg-dark-900 border-r border-white/5 flex flex-col">
                  <div className="p-4 border-b border-white/5">
                      <button onClick={() => setActiveClub(null)} className="text-xs text-slate-400 hover:text-white mb-2">&larr; Back to Discovery</button>
                      <h2 className="font-bold text-lg truncate">{activeClub.name}</h2>
                      <div className="text-xs text-slate-500">{activeClub.memberCount} members</div>
                  </div>
                  <div className="p-2 space-y-1 flex-1">
                      <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Channels</div>
                      <div className="bg-white/5 text-white px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer">
                          <Hash className="w-4 h-4 text-slate-400" /> general
                      </div>
                      <div className="text-slate-400 hover:bg-white/5 px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer">
                          <Hash className="w-4 h-4 text-slate-400" /> spoilers
                      </div>
                  </div>
              </div>

              {/* Chat */}
              <div className="flex-1 flex flex-col bg-dark-800">
                  <div className="p-4 border-b border-white/5 font-bold flex items-center gap-2">
                      <Hash className="w-5 h-5 text-slate-400" /> general
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {messages.map(msg => (
                          <div key={msg.id} className="flex gap-3 group hover:bg-white/5 p-2 -mx-2 rounded">
                              <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0">
                                  {msg.avatar ? <img src={msg.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold">{msg.userName[0]}</div>}
                              </div>
                              <div>
                                  <div className="flex items-baseline gap-2">
                                      <span className="font-bold text-white text-sm">{msg.userName}</span>
                                      <span className="text-[10px] text-slate-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-slate-300 text-sm">{msg.content}</p>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-4 bg-dark-900 border-t border-white/5">
                      <form onSubmit={sendMessage} className="flex gap-2">
                          <MentionInput 
                            value={msgInput} 
                            onChange={setMsgInput} 
                            placeholder={`Message #${activeClub.name}`} 
                            className="flex-1 bg-dark-800 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-primary text-sm"
                            singleLine
                            onSubmit={() => sendMessage()}
                          />
                          <button type="submit" className="p-2 bg-primary rounded-lg text-white"><Send className="w-4 h-4" /></button>
                      </form>
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center max-w-2xl mx-auto py-8">
        <h1 className="text-4xl font-display font-bold mb-4">Communities</h1>
        <p className="text-slate-400">Find your squad. Discuss theories, ship couples, and share art.</p>
        <button 
            onClick={() => setShowCreate(true)}
            className="mt-6 px-6 py-3 bg-primary rounded-xl font-bold text-white shadow-lg hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
        >
            <Plus className="w-5 h-5" /> Create Community
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map(club => (
          <div key={club.id} className="bg-dark-800 p-6 rounded-2xl border border-white/5 hover:border-primary/50 transition-colors group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Users className="w-6 h-6" />
              </div>
              <span className="bg-dark-900 text-xs px-2 py-1 rounded text-slate-400 border border-white/10">
                {club.memberCount} members
              </span>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors relative z-10">{club.name}</h3>
            <p className="text-slate-400 text-sm mb-4 line-clamp-2 relative z-10">{club.description}</p>
            <div className="flex flex-wrap gap-2 mb-6 relative z-10">
              {club.tags.map((tag, i) => (
                <span key={i} className="text-xs bg-white/5 px-2 py-1 rounded border border-white/5 text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
            <button 
                onClick={() => setActiveClub(club)}
                className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors relative z-10"
            >
              <MessageCircle className="w-4 h-4" /> Open Chat
            </button>
          </div>
        ))}
      </div>

      {showCreate && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-dark-800 w-full max-w-md p-6 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-xl">Create Community</h3>
                      <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-slate-400"/></button>
                  </div>
                  <form onSubmit={handleCreate} className="space-y-4">
                      <input 
                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 outline-none focus:border-primary"
                        placeholder="Community Name"
                        value={newClubName} onChange={e => setNewClubName(e.target.value)} required
                      />
                      <textarea 
                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 outline-none focus:border-primary h-24"
                        placeholder="Description"
                        value={newClubDesc} onChange={e => setNewClubDesc(e.target.value)} required
                      />
                      <input 
                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 outline-none focus:border-primary"
                        placeholder="Tags (comma separated)"
                        value={newClubTags} onChange={e => setNewClubTags(e.target.value)}
                      />
                      <button type="submit" className="w-full bg-primary py-3 rounded-lg font-bold text-white">Create</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Community;
