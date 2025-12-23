
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Coffee, Zap } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { firebaseService } from '../services/firebase';

const Pomodoro: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const timerRef = useRef<number | null>(null);
  const { showToast } = useToast();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
      setMode(newMode);
      setIsActive(false);
      setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsActive(false);
      
      // Completion Logic
      if (mode === 'focus') {
          showToast("Focus Session Complete! +50 XP", "success");
          const auth = firebaseService.getAuthInstance();
          if (auth.currentUser) {
              firebaseService.awardXP(auth.currentUser.uid, 50);
          }
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{});
          switchMode('break');
      } else {
          showToast("Break over! Back to work.", "info");
          switchMode('focus');
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  return (
    <div className="max-w-2xl mx-auto py-12 text-center animate-fadeIn">
        <h1 className="text-4xl font-display font-bold mb-2">Focus Dojo</h1>
        <p className="text-slate-400 mb-8">Study with Lo-Fi beats and anime aesthetics.</p>

        <div className="relative bg-dark-800 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            {/* Background Video/Image Placeholder */}
            <div className="absolute inset-0 opacity-30">
                <img 
                    src={mode === 'focus' ? "https://i.pinimg.com/originals/f9/ba/92/f9ba926f743c3327685d038222a0a2df.gif" : "https://media1.tenor.com/m/Xn8e9k7gKNcAAAAC/anime-lofi.gif"} 
                    alt="Lofi" 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-dark-900/60"></div>
            </div>

            <div className="relative z-10 p-12">
                <div className="flex justify-center gap-4 mb-8">
                    <button 
                        onClick={() => switchMode('focus')}
                        className={`px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all ${mode === 'focus' ? 'bg-primary text-white' : 'bg-white/10 text-slate-300'}`}
                    >
                        <Zap className="w-4 h-4" /> Focus
                    </button>
                    <button 
                        onClick={() => switchMode('break')}
                        className={`px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all ${mode === 'break' ? 'bg-green-500 text-white' : 'bg-white/10 text-slate-300'}`}
                    >
                        <Coffee className="w-4 h-4" /> Break
                    </button>
                </div>

                <div className="text-8xl font-mono font-bold text-white mb-8 tracking-wider drop-shadow-lg">
                    {formatTime(timeLeft)}
                </div>

                <div className="flex justify-center gap-6">
                    <button 
                        onClick={toggleTimer}
                        className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                    >
                        {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                    </button>
                    <button 
                        onClick={resetTimer}
                        className="w-16 h-16 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <RotateCcw className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>

        <div className="mt-8 p-4 bg-dark-800 rounded-xl border border-white/5 inline-block">
            <p className="text-sm text-slate-400">Pro Tip: Complete a session to earn XP.</p>
        </div>
    </div>
  );
};

export default Pomodoro;
