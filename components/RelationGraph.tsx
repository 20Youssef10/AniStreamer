
import React from 'react';
import { Anime } from '../types';
import { Link } from 'react-router-dom';
import LazyImage from './LazyImage';
import { Network, X } from 'lucide-react';

interface RelationGraphProps {
    anime: Anime;
    onClose: () => void;
}

const RelationGraph: React.FC<RelationGraphProps> = ({ anime, onClose }) => {
    const relations = anime.relations?.edges || [];
    
    // Simple radial layout logic
    const centerX = 50;
    const centerY = 50;
    const radius = 35; // % of container

    return (
        <div className="fixed inset-0 z-[100] bg-dark-900/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-50">
                <X className="w-6 h-6" />
            </button>

            <div className="relative w-full max-w-4xl aspect-square md:aspect-video bg-dark-800 rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex items-center justify-center">
                <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                    <h3 className="font-bold flex items-center gap-2"><Network className="w-4 h-4 text-primary" /> Relation Web</h3>
                    <p className="text-xs text-slate-400">Visualizing the {anime.title.romaji} universe</p>
                </div>

                {/* SVG Lines Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {relations.map((edge, i) => {
                        const angle = (i / relations.length) * 2 * Math.PI;
                        return (
                            <line 
                                key={i}
                                x1="50%" y1="50%"
                                x2={`${50 + 35 * Math.cos(angle)}%`}
                                y2={`${50 + 35 * Math.sin(angle)}%`}
                                stroke="#334155"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                            />
                        );
                    })}
                </svg>

                {/* Center Node (Current Anime) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                    <div className="w-24 h-36 rounded-xl overflow-hidden border-4 border-primary shadow-[0_0_30px_rgba(59,130,246,0.4)] relative group">
                        <LazyImage src={anime.coverImage.large} alt={anime.title.romaji} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center font-bold text-xs text-white">Current</div>
                    </div>
                </div>

                {/* Satellite Nodes */}
                {relations.map((edge, i) => {
                    const angle = (i / relations.length) * 2 * Math.PI;
                    const top = 50 + 35 * Math.sin(angle);
                    const left = 50 + 35 * Math.cos(angle);

                    return (
                        <Link 
                            key={i}
                            to={`/${edge.node.type.toLowerCase()}/${edge.node.id}`}
                            onClick={onClose}
                            className="absolute z-20 flex flex-col items-center group w-20 md:w-24 transition-transform hover:scale-110 hover:z-30"
                            style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)' }}
                        >
                            <div className="w-16 h-24 md:w-20 md:h-28 rounded-lg overflow-hidden border-2 border-white/20 group-hover:border-white shadow-lg relative bg-dark-900">
                                <LazyImage src={edge.node.coverImage.medium} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] md:text-[10px] text-center py-1 text-white truncate px-1">
                                    {edge.relationType.replace(/_/g, ' ')}
                                </div>
                            </div>
                            <div className="mt-1 bg-black/60 px-2 py-0.5 rounded text-[8px] md:text-[10px] text-white font-bold max-w-full truncate backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-6">
                                {edge.node.title.romaji}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default RelationGraph;
