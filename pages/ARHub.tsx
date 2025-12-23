import React, { useState, useRef, useEffect } from 'react';
import { Box, Layers, Zap, Camera, X } from 'lucide-react';

const ARHub: React.FC = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
              setCameraActive(true);
          }
      } catch (e) {
          alert("Camera permission denied or not available on this device.");
      }
  };

  const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(t => t.stop());
          videoRef.current.srcObject = null;
      }
      setCameraActive(false);
  };

  useEffect(() => {
      return () => stopCamera();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn text-center py-12">
        <div className="space-y-4">
            <h1 className="text-5xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                Virtual Collection
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Step into the future. View your favorite characters in Augmented Reality and explore virtual anime spaces.
            </p>
        </div>

        {/* 3D Model / Camera View */}
        <div className="relative w-full max-w-lg mx-auto aspect-square bg-dark-800 rounded-3xl border border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-2xl group transition-colors">
            
            {cameraActive ? (
                <>
                    <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
                    <button onClick={stopCamera} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full z-20">
                        <X className="w-6 h-6" />
                    </button>
                    {/* Overlay 3D Object on Camera */}
                    <div className="relative z-10 w-48 h-48 preserve-3d animate-[spin_10s_linear_infinite]">
                        <div className="absolute inset-0 bg-blue-500/50 border border-blue-400 translate-z-16"></div>
                        <div className="absolute inset-0 bg-blue-500/50 border border-blue-400 -translate-z-16"></div>
                        <div className="absolute inset-0 bg-purple-500/50 border border-purple-400 rotate-y-90 translate-z-16"></div>
                        <div className="absolute inset-0 bg-purple-500/50 border border-purple-400 rotate-y-90 -translate-z-16"></div>
                        <div className="absolute inset-0 bg-pink-500/50 border border-pink-400 rotate-x-90 translate-z-16"></div>
                        <div className="absolute inset-0 bg-pink-500/50 border border-pink-400 rotate-x-90 -translate-z-16"></div>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center text-white font-bold drop-shadow-md">
                        AR Mode Active
                    </div>
                </>
            ) : (
                <>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    {/* Simulated 3D Cube using CSS */}
                    <div className="w-32 h-32 relative preserve-3d animate-[spin_10s_linear_infinite]">
                        <div className="absolute inset-0 bg-blue-500/50 border border-blue-400 translate-z-16"></div>
                        <div className="absolute inset-0 bg-blue-500/50 border border-blue-400 -translate-z-16"></div>
                        <div className="absolute inset-0 bg-purple-500/50 border border-purple-400 rotate-y-90 translate-z-16"></div>
                        <div className="absolute inset-0 bg-purple-500/50 border border-purple-400 rotate-y-90 -translate-z-16"></div>
                        <div className="absolute inset-0 bg-pink-500/50 border border-pink-400 rotate-x-90 translate-z-16"></div>
                        <div className="absolute inset-0 bg-pink-500/50 border border-pink-400 rotate-x-90 -translate-z-16"></div>
                    </div>
                    
                    <div className="mt-12 z-10">
                        <button 
                            onClick={startCamera}
                            className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            <Camera className="w-5 h-5" /> Launch AR Experience
                        </button>
                    </div>
                </>
            )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
                <Box className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">Character Figures</h3>
                <p className="text-slate-400 text-sm">Scan physical cards to unlock digital 3D figures of your favorite characters.</p>
            </div>
            <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
                <Layers className="w-8 h-8 text-purple-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">Virtual Room</h3>
                <p className="text-slate-400 text-sm">Decorate your personal virtual space with posters and items earned by watching anime.</p>
            </div>
             <div className="bg-dark-800 p-6 rounded-2xl border border-white/5">
                <Zap className="w-8 h-8 text-yellow-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">VR Watch Party</h3>
                <p className="text-slate-400 text-sm">Join friends in a virtual theater environment with synchronized playback.</p>
            </div>
        </div>
        
        <style>{`
            .preserve-3d { transform-style: preserve-3d; }
            .translate-z-16 { transform: translateZ(64px); }
            .-translate-z-16 { transform: translateZ(-64px); }
            .rotate-y-90 { transform: rotateY(90deg); }
            .rotate-x-90 { transform: rotateX(90deg); }
        `}</style>
    </div>
  );
};

export default ARHub;