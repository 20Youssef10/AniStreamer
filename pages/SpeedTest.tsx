
import React, { useState } from 'react';
import { Wifi, Download, Upload, Play, RefreshCw } from 'lucide-react';

const SpeedTest: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'running' | 'complete'>('idle');
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [ping, setPing] = useState(0);

    const runTest = async () => {
        setStatus('running');
        setDownloadSpeed(0);
        setPing(0);

        // Ping Test
        const start = Date.now();
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
        const end = Date.now();
        setPing(end - start);

        // Download Test (Simulated with a small image file fetch repeatedly or larger dummy file)
        const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Snake_River_%285mb%29.jpg'; 
        const startTime = Date.now();
        const response = await fetch(imageUrl + '?t=' + startTime);
        const blob = await response.blob();
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        const sizeInBits = blob.size * 8;
        const speedBps = sizeInBits / duration;
        const speedMbps = speedBps / (1024 * 1024);
        
        setDownloadSpeed(speedMbps);
        setStatus('complete');
    };

    return (
        <div className="max-w-2xl mx-auto py-12 text-center animate-fadeIn space-y-8">
            <h1 className="text-4xl font-display font-bold">Network Check</h1>
            <p className="text-slate-400">Ensure your connection is ready for 4K streaming.</p>

            <div className="bg-dark-800 rounded-3xl border border-white/5 p-12 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <Wifi className="w-64 h-64 text-slate-500" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="text-6xl font-mono font-bold text-primary">
                        {status === 'running' ? <span className="animate-pulse">...</span> : downloadSpeed.toFixed(1)}
                        <span className="text-xl text-slate-500 ml-2">Mbps</span>
                    </div>

                    <div className="flex justify-center gap-12 text-slate-300">
                        <div className="flex flex-col items-center">
                            <span className="text-xs uppercase font-bold text-slate-500 mb-1">Ping</span>
                            <span className="font-mono text-xl">{ping > 0 ? `${ping}ms` : '--'}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs uppercase font-bold text-slate-500 mb-1">Jitter</span>
                            <span className="font-mono text-xl">--</span>
                        </div>
                    </div>

                    {status === 'idle' || status === 'complete' ? (
                        <button 
                            onClick={runTest}
                            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
                        >
                            {status === 'complete' ? <><RefreshCw className="w-4 h-4"/> Test Again</> : <><Play className="w-4 h-4"/> Start Test</>}
                        </button>
                    ) : (
                        <div className="text-slate-400 text-sm animate-pulse">Testing connection...</div>
                    )}
                </div>
            </div>

            {status === 'complete' && (
                <div className={`p-4 rounded-xl border ${downloadSpeed > 15 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                    {downloadSpeed > 15 
                        ? "Great! Your connection is fast enough for 1080p streaming." 
                        : "Your connection might buffer on high quality. Try 720p or lower."}
                </div>
            )}
        </div>
    );
};

export default SpeedTest;
