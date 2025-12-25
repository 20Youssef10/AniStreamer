
import React, { useEffect, useState, useRef } from 'react';
import { otakuService } from '../services/otaku';

interface DanmakuItem {
    id: number;
    text: string;
    color: string;
    top: number;
    speed: number;
}

interface DanmakuLayerProps {
    active: boolean;
}

const DanmakuLayer: React.FC<DanmakuLayerProps> = ({ active }) => {
    const [comments, setComments] = useState<DanmakuItem[]>([]);
    const intervalRef = useRef<any>(null);

    useEffect(() => {
        if (active) {
            intervalRef.current = setInterval(() => {
                const comment = otakuService.getDanmakuComment();
                const newId = Date.now() + Math.random();
                
                setComments(prev => {
                    // Cleanup old comments to prevent memory leak
                    const filtered = prev.filter(c => c.id > Date.now() - 15000); 
                    return [...filtered, { ...comment, id: newId }];
                });

            }, 800); // New comment every 800ms
        } else {
            clearInterval(intervalRef.current);
            setComments([]);
        }

        return () => clearInterval(intervalRef.current);
    }, [active]);

    if (!active) return null;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
            {comments.map(c => (
                <div
                    key={c.id}
                    className="absolute whitespace-nowrap text-xl font-bold drop-shadow-md animate-danmaku"
                    style={{
                        top: `${c.top}%`,
                        color: c.color,
                        textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                        animationDuration: `${c.speed}s`,
                        right: '-100%' // Start off-screen right
                    }}
                >
                    {c.text}
                </div>
            ))}
            <style>{`
                @keyframes danmaku {
                    from { transform: translateX(100vw); }
                    to { transform: translateX(-200vw); }
                }
                .animate-danmaku {
                    animation-name: danmaku;
                    animation-timing-function: linear;
                    will-change: transform;
                }
            `}</style>
        </div>
    );
};

export default DanmakuLayer;
