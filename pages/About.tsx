
import React from 'react';
import { Info, Shield, FileText, Mail, MessageSquare, Heart, Users } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn py-8">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-tr from-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <Heart className="w-8 h-8 text-white fill-current" />
        </div>
        <h1 className="text-4xl font-display font-bold">About AniStream</h1>
        <p className="text-slate-400 text-lg">Your ultimate anime discovery and tracking platform.</p>
      </div>

      <div className="bg-dark-800 rounded-3xl border border-white/5 p-8 space-y-10">
        {/* Description */}
        <section className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3"><Info className="text-primary w-6 h-6"/> Our Mission</h2>
            <p className="text-slate-300 leading-relaxed text-lg">
                AniStream is designed to be the most comprehensive and immersive anime companion app. 
                We combine real-time tracking, social features, and advanced AI recommendations to create a unique experience for otaku worldwide.
                Powered by AniList and Google Gemini AI.
            </p>
        </section>

        <hr className="border-white/5" />

        {/* Privacy & Terms */}
        <div className="grid md:grid-cols-2 gap-8">
            <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="text-green-400 w-5 h-5"/> Privacy Policy</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                    We value your privacy. AniStream collects minimal data required for authentication and list synchronization via Firebase and AniList. 
                    We do not sell your personal data to third parties. All personal data is encrypted and stored securely.
                </p>
                <button className="text-primary text-sm font-bold hover:underline">Read Full Policy</button>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-400 w-5 h-5"/> Terms of Service</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                    By using AniStream, you agree to our community guidelines. Be respectful in discussions, do not post illegal content, and ensure all uploaded media complies with copyright laws.
                </p>
                <button className="text-primary text-sm font-bold hover:underline">Read Terms</button>
            </section>
        </div>

        <hr className="border-white/5" />

        {/* Contact & Feedback */}
        <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3"><Users className="text-pink-400 w-6 h-6"/> Community & Support</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-dark-900 p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold mb-2 text-lg">Join the Community</h3>
                        <p className="text-slate-400 text-sm mb-4">Chat with developers, suggest features, and meet other fans.</p>
                    </div>
                    <a 
                        href="https://discord.gg/cRKHwzeN2" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-white bg-[#5865F2] hover:bg-[#4752C4] px-4 py-3 rounded-xl transition-colors font-bold text-center shadow-lg"
                    >
                        Join us in Discord
                    </a>
                </div>

                <div className="bg-dark-900 p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold mb-2 text-lg">Send Feedback</h3>
                        <p className="text-slate-400 text-sm mb-4">Found a bug or have a feature request? Let us know!</p>
                    </div>
                    <button 
                        data-tally-open="obD0Lx" 
                        data-tally-width="480" 
                        data-tally-overlay="1" 
                        data-tally-emoji-text="👋" 
                        data-tally-emoji-animation="wave"
                        className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <MessageSquare className="w-4 h-4" /> Open Feedback Form
                    </button>
                </div>
            </div>
        </section>

        <div className="text-center pt-4">
            <p className="text-xs text-slate-600">
                AniStream v2.0.0 &copy; {new Date().getFullYear()} All Rights Reserved.
            </p>
        </div>
      </div>
    </div>
  );
};

export default About;
