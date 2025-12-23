
import React, { useEffect, useState } from 'react';
import { anilistService } from '../services/anilist';
import { firebaseService } from '../services/firebase';
import { ForumThread, NewsArticle } from '../types';
import { Newspaper, MessageCircle, Eye, Calendar, Plus, X, Upload, Check } from 'lucide-react';
import LazyImage from '../components/LazyImage';
import { useToast } from '../context/ToastContext';

// Unified News Item for display
interface NewsItem {
    id: string | number;
    title: string;
    summary: string;
    body?: string; // Add body for full reading
    image: string;
    category: string;
    source: 'ANILIST' | 'INTERNAL';
    authorName: string;
    authorAvatar: string;
    createdAt: number;
    url?: string; // For external links
}

const News: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  
  // Submission Form
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState('ANIME');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();
  const auth = firebaseService.getAuthInstance();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const [forumThreads, internalNews] = await Promise.all([
            anilistService.getForumThreads(5), // Anime & Manga
            firebaseService.getPublishedNews(20)
        ]);

        const externalItems: NewsItem[] = forumThreads.map(t => ({
            id: t.id,
            title: t.title,
            summary: t.body.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
            body: t.body, // Store full body
            image: t.mediaCategories?.[0]?.coverImage.large || 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1-OquNCNB6srGe.jpg',
            category: 'COMMUNITY',
            source: 'ANILIST',
            authorName: t.user.name,
            authorAvatar: t.user.avatar.medium,
            createdAt: t.createdAt,
            url: `https://anilist.co/forum/thread/${t.id}`
        }));

        const internalItems: NewsItem[] = internalNews.map(n => ({
            id: n.id,
            title: n.title,
            summary: n.summary,
            body: n.body,
            image: n.image,
            category: n.category,
            source: 'INTERNAL',
            authorName: n.author.name,
            authorAvatar: n.author.avatar,
            createdAt: n.createdAt
        }));

        // Merge and sort
        const merged = [...internalItems, ...externalItems].sort((a,b) => b.createdAt - a.createdAt);
        setNews(merged);

      } catch (e) {
        console.error(e);
        showToast("Failed to load news", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return showToast("Login required", "error");
      if (!title || !summary || !body || !image) return showToast("All fields required", "error");

      setSubmitting(true);
      try {
          await firebaseService.submitNews({
              title,
              summary,
              body,
              image,
              category,
              author: {
                  uid: user.uid,
                  name: user.displayName || 'Anonymous',
                  avatar: user.photoURL || ''
              },
              status: 'PENDING',
              createdAt: Date.now(),
              views: 0
          });
          showToast("Article submitted for review!", "success");
          setShowSubmit(false);
          setTitle(''); setSummary(''); setBody(''); setImage('');
      } catch (e) {
          showToast("Submission failed", "error");
      } finally {
          setSubmitting(false);
      }
  };

  const categories = ['ANIME', 'MANGA', 'INDUSTRY', 'COMMUNITY'];
  const featured = news[0];
  const rest = news.slice(1);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* Header / Hero */}
      <div className="flex justify-between items-end border-b border-white/10 pb-6">
          <div>
              <h1 className="text-4xl font-display font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg text-white">
                      <Newspaper className="w-8 h-8" />
                  </div>
                  AniStream News
              </h1>
              <p className="text-slate-400 mt-2">The latest from Japan and our community.</p>
          </div>
          {user && (
              <button 
                onClick={() => setShowSubmit(true)}
                className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2 shadow-lg"
              >
                  <Plus className="w-5 h-5" /> Submit News
              </button>
          )}
      </div>

      {loading ? (
          <div className="text-center py-20 text-slate-500">Loading headlines...</div>
      ) : (
          <div className="space-y-12">
              {/* Featured Article */}
              {featured && (
                  <div 
                    onClick={() => setSelectedArticle(featured)}
                    className="relative w-full aspect-[21/9] md:aspect-[21/8] bg-dark-800 rounded-3xl overflow-hidden group cursor-pointer shadow-2xl border border-white/5"
                  >
                      <LazyImage src={featured.image} alt={featured.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-8">
                          <div className="flex items-center gap-2 mb-3">
                              <span className="bg-orange-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">{featured.category}</span>
                              <span className="text-slate-300 text-xs font-bold">{new Date(featured.createdAt * 1000).toLocaleDateString()}</span>
                          </div>
                          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4 drop-shadow-lg max-w-4xl">{featured.title}</h2>
                          <p className="text-slate-200 text-lg max-w-2xl line-clamp-2 drop-shadow-md">{featured.summary}</p>
                      </div>
                  </div>
              )}

              {/* Latest News Grid */}
              <div>
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      <span className="w-2 h-8 bg-orange-500 rounded-full"></span> Latest Stories
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {rest.map(item => (
                          <div key={item.id} onClick={() => setSelectedArticle(item)} className="group bg-dark-800 rounded-2xl overflow-hidden border border-white/5 hover:border-orange-500/50 transition-colors flex flex-col h-full cursor-pointer">
                              <div className="aspect-video overflow-hidden relative">
                                  <LazyImage src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-orange-400 border border-white/10 uppercase">
                                      {item.category}
                                  </div>
                              </div>
                              <div className="p-6 flex flex-col flex-1">
                                  <h4 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-orange-400 transition-colors">{item.title}</h4>
                                  <p className="text-slate-400 text-sm line-clamp-3 mb-6 flex-1">{item.summary}</p>
                                  <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                      <img src={item.authorAvatar} alt="" className="w-8 h-8 rounded-full bg-slate-700" />
                                      <div className="flex-1">
                                          <div className="text-xs font-bold text-white">{item.authorName}</div>
                                          <div className="text-[10px] text-slate-500">{new Date(item.createdAt * 1000).toLocaleDateString()}</div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Article Reading Modal */}
      {selectedArticle && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex justify-center overflow-y-auto custom-scrollbar backdrop-blur-lg">
              <div className="w-full max-w-4xl min-h-screen bg-dark-900 border-x border-white/5 shadow-2xl relative">
                  <button 
                    onClick={() => setSelectedArticle(null)}
                    className="fixed top-6 right-6 p-3 bg-black/50 hover:bg-white/10 rounded-full text-white backdrop-blur-md z-50 transition-colors border border-white/10"
                  >
                      <X className="w-6 h-6" />
                  </button>

                  <div className="w-full aspect-[21/9] relative">
                      <LazyImage src={selectedArticle.image} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-900 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                          <div className="flex items-center gap-3 mb-4">
                              <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{selectedArticle.category}</span>
                              <span className="text-slate-300 text-sm font-medium">{new Date(selectedArticle.createdAt * 1000).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                          <h1 className="text-3xl md:text-5xl font-display font-black text-white leading-tight drop-shadow-lg">{selectedArticle.title}</h1>
                      </div>
                  </div>

                  <div className="p-8 md:p-12">
                      <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-8">
                          <img src={selectedArticle.authorAvatar} className="w-12 h-12 rounded-full border-2 border-white/10" alt={selectedArticle.authorName} />
                          <div>
                              <div className="text-white font-bold">{selectedArticle.authorName}</div>
                              <div className="text-slate-500 text-xs uppercase tracking-widest">Author</div>
                          </div>
                      </div>

                      <div 
                        className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed news-content"
                        dangerouslySetInnerHTML={{ __html: selectedArticle.body || selectedArticle.summary }}
                      />
                  </div>
              </div>
          </div>
      )}

      {/* Submission Modal */}
      {showSubmit && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-dark-800 w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-dark-900/50 rounded-t-2xl">
                      <h3 className="text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-orange-500"/> Submit Article</h3>
                      <button onClick={() => setShowSubmit(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 outline-none focus:border-orange-500">
                                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Image URL</label>
                              <input value={image} onChange={e => setImage(e.target.value)} placeholder="https://..." className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 outline-none focus:border-orange-500" />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Headline Title</label>
                          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Catchy title..." className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 font-bold text-lg outline-none focus:border-orange-500" />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Short Summary</label>
                          <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Brief overview for the card preview..." className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 h-20 resize-none outline-none focus:border-orange-500" />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Content (HTML supported)</label>
                          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your article here..." className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 h-64 outline-none focus:border-orange-500 font-mono text-sm" />
                      </div>
                  </div>
                  <div className="p-6 border-t border-white/10 bg-dark-900/50 rounded-b-2xl">
                      <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                          {submitting ? 'Submitting...' : <><Check className="w-5 h-5" /> Submit for Review</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default News;
