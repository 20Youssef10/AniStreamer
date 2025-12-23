
import React from 'react';
import { firebaseService } from '../services/firebase';
import { Sparkles, Lock, Check, CreditCard } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface PremiumGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const PremiumGuard: React.FC<PremiumGuardProps> = ({ children, fallback }) => {
    const auth = firebaseService.getAuthInstance();
    const user = auth.currentUser;
    const { showToast } = useToast();
    const [isPremium, setIsPremium] = React.useState(false);

    React.useEffect(() => {
        if (user) {
            firebaseService.getUserData(user.uid).then(profile => setIsPremium(profile?.isPremium || false));
        }
    }, [user]);

    const handleUpgrade = () => {
        if (!user) { showToast("Please login first.", "error"); return; }
        
        // Lemon Squeezy Integration (Production Example)
        // In reality, you'd use their SDK or window.createLemonSqueezy()
        const checkoutUrl = `https://anistream.lemonsqueezy.com/checkout/buy/pro-plan?user_id=${user.uid}`;
        
        // Open Lemon Squeezy Checkout overlay or new tab
        const win = window.open(checkoutUrl, '_blank');
        
        showToast("Opening secure checkout...", "info");
        
        // Listen for success (Simulation for this environment)
        const check = setInterval(async () => {
            if (win?.closed) {
                clearInterval(check);
                const updated = await firebaseService.getUserData(user.uid);
                if (updated?.isPremium) setIsPremium(true);
            }
        }, 3000);
    };

    if (isPremium) return <>{children}</>;

    return (
        <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-3xl border border-white/10 text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Lock className="w-10 h-10 text-white" />
            </div>
            <div>
                <h2 className="text-3xl font-bold text-white">Unlock AniStream Pro</h2>
                <p className="text-slate-300 mt-2">Get AI features, offline manga, and priority streaming.</p>
            </div>
            <button 
                onClick={handleUpgrade}
                className="px-8 py-4 bg-white text-dark-900 font-bold rounded-xl shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
                <CreditCard className="w-5 h-5" /> Subscribe with Lemon Squeezy
            </button>
            <p className="text-[10px] text-slate-500">Secure payments powered by Lemon Squeezy (Merchant of Record)</p>
        </div>
    );
};

export default PremiumGuard;
