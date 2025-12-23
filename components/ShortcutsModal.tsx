
import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
    onClose: () => void;
}

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
    const shortcuts = [
        { key: 'Space / K', desc: 'Play / Pause Video' },
        { key: 'F', desc: 'Toggle Fullscreen' },
        { key: 'M', desc: 'Mute Audio' },
        { key: 'Left / Right', desc: 'Seek 5 Seconds' },
        { key: '?', desc: 'Show This Menu' },
        { key: 'Up, Up, Down...', desc: '???' } // Easter egg hint
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="bg-dark-800 w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X className="w-6 h-6" />
                </button>
                
                <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                    <Command className="w-6 h-6 text-primary" /> Keyboard Shortcuts
                </h2>

                <div className="space-y-2">
                    {shortcuts.map((sc, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-dark-900 rounded-lg border border-white/5">
                            <span className="text-slate-300 font-bold">{sc.desc}</span>
                            <code className="bg-white/10 px-2 py-1 rounded text-xs font-mono text-primary font-bold">{sc.key}</code>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ShortcutsModal;
