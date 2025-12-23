
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { anilistService } from '../services/anilist';
import { Staff } from '../types';
import LazyImage from '../components/LazyImage';
import { Briefcase, Mic } from 'lucide-react';

const StaffDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [staff, setStaff] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'voice' | 'production'>('voice');

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
        try {
            const data = await anilistService.getStaffDetails(parseInt(id));
            setStaff(data);
            // Default to production if no voice acting roles
            if (data.characterMedia?.edges.length === 0 && data.staffMedia?.edges.length > 0) {
                setActiveTab('production');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    fetch();
  }, [id]);

  if (loading || !staff) return <div className="p-10 text-center">Loading Staff...</div>;

  return (
    <div className="animate-fadeIn pb-12">
         <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/4 space-y-4">
                <LazyImage src={staff.image.large} alt={staff.name.full} className="w-full rounded-2xl shadow-xl" />
                <div className="bg-dark-800 p-4 rounded-xl border border-white/5 space-y-3">
                    <h3 className="font-bold border-b border-white/5 pb-2">Information</h3>
                    {staff.age && <div className="flex justify-between text-sm"><span className="text-slate-400">Age</span><span>{staff.age}</span></div>}
                    {staff.gender && <div className="flex justify-between text-sm"><span className="text-slate-400">Gender</span><span>{staff.gender}</span></div>}
                    {staff.homeTown && <div className="flex justify-between text-sm"><span className="text-slate-400">Hometown</span><span className="text-right">{staff.homeTown}</span></div>}
                </div>
            </div>

            <div className="flex-1 space-y-8">
                 <div>
                    <h1 className="text-4xl font-display font-bold">{staff.name.full}</h1>
                    <h2 className="text-xl text-slate-400 italic mb-4">{staff.name.native}</h2>
                    <div className="prose prose-invert max-w-none text-slate-300 bg-dark-800/50 p-6 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                        {staff.description || 'No biography available.'}
                    </div>
                </div>

                <div>
                    <div className="flex gap-4 border-b border-white/10 mb-6">
                         {staff.characterMedia?.edges.length > 0 && (
                            <button 
                                onClick={() => setActiveTab('voice')}
                                className={`pb-2 flex items-center gap-2 font-bold transition-colors border-b-2 ${activeTab === 'voice' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}
                            >
                                <Mic className="w-5 h-5" /> Voice Acting Roles
                            </button>
                         )}
                         {staff.staffMedia?.edges.length > 0 && (
                            <button 
                                onClick={() => setActiveTab('production')}
                                className={`pb-2 flex items-center gap-2 font-bold transition-colors border-b-2 ${activeTab === 'production' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}
                            >
                                <Briefcase className="w-5 h-5" /> Production Roles
                            </button>
                         )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeTab === 'voice' && staff.characterMedia?.edges.map((edge: any, i: number) => (
                             <div key={i} className="bg-dark-800 p-3 rounded-xl border border-white/5 flex gap-4 hover:border-white/20 transition-colors items-center">
                                <Link to={`/anime/${edge.node.id}`} className="shrink-0 w-12 h-16">
                                    <LazyImage src={edge.node.coverImage.medium} alt="" className="w-full h-full object-cover rounded" />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/anime/${edge.node.id}`} className="font-bold text-sm line-clamp-1 hover:text-primary transition-colors">
                                        {edge.node.title.english || edge.node.title.romaji}
                                    </Link>
                                    <div className="text-xs text-slate-400">{edge.node.seasonYear}</div>
                                </div>
                                
                                {edge.characters && edge.characters.length > 0 && (
                                    <Link to={`/character/${edge.characters[0].id}`} className="flex items-center gap-3 pl-3 border-l border-white/10">
                                        <div className="text-right hidden sm:block">
                                            <div className="text-xs font-bold text-slate-200">{edge.characters[0].name.full}</div>
                                            <div className="text-[10px] text-primary">{edge.characterRole}</div>
                                        </div>
                                        <img src={edge.characters[0].image.medium} alt="" className="w-10 h-10 rounded-full object-cover" />
                                    </Link>
                                )}
                            </div>
                        ))}

                        {activeTab === 'production' && staff.staffMedia?.edges.map((edge: any, i: number) => (
                            <div key={i} className="bg-dark-800 p-3 rounded-xl border border-white/5 flex gap-4 hover:border-white/20 transition-colors items-center">
                                <Link to={`/anime/${edge.node.id}`} className="shrink-0 w-12 h-16">
                                    <LazyImage src={edge.node.coverImage.medium} alt="" className="w-full h-full object-cover rounded" />
                                </Link>
                                <div className="flex-1">
                                    <Link to={`/anime/${edge.node.id}`} className="font-bold text-sm line-clamp-1 hover:text-primary transition-colors">
                                        {edge.node.title.english || edge.node.title.romaji}
                                    </Link>
                                    <div className="text-xs text-primary mt-1">{edge.staffRole}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
         </div>
    </div>
  );
};

export default StaffDetails;
