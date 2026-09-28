import React, { useState } from 'react';
import { Mail, Bell, ArrowRight, CheckCircle, ChevronRight, Sparkles, Rocket } from 'lucide-react';

/**
 * HOME COMPONENT
 * The main landing dashboard. Features a custom interactive video player for tutorials,
 * a newsletter subscription form, and a roadmap of future updates.
 */
const Home = ({ userEmail }) => {
  // --- UI STATE ---
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false); // Controls the success UI for the newsletter
  
  // --- VIDEO PLAYER STATE ---
  const [activeVideo, setActiveVideo] = useState('0-0'); // Tracks which tutorial video is currently playing
  const [regOpen, setRegOpen] = useState(true); // Toggles the accordion menu for Registration videos

  /**
   * HANDLER: NEWSLETTER SUBSCRIPTION
   * Simulates a subscription action and shows a temporary success message.
   */
  const handleSubscribe = (e) => {
    e.preventDefault();
    setSubscribed(true);
    // Reset the success state after 3 seconds
    setTimeout(() => setSubscribed(false), 3000);
  };

  // --- VIDEO DICTIONARY ---
  // Maps specific IDs to video metadata and source files
  const videoData = {
    '0-0': { title: 'Registration', sub: 'Email Account', src: '/videos/SIGNUP_MAIL.mp4' },
    '0-1': { title: 'Registration', sub: '2 Online Platforms', src: '/videos/SignUp_Platform.mp4' },
    '1': { title: 'Login', sub: 'Secure Authentication', src: '/videos/LOG_IN.mp4' },
    '2': { title: 'Bank Export', sub: 'Download Bank Statements', src: '/videos/DATA EXPORT.mp4' },
    '3': { title: 'Data Sync', sub: 'Train the Neural Engine', src: '/videos/DATA IMPORT.mp4' }
  };

  const currentVid = videoData[activeVideo];

  // Static list of upcoming features for the roadmap card
  const futureUpdates = [
    { text: 'Predictive model upgrade' },
    { text: 'Addition of more banks' },
    { text: 'Live data via bank APIs' },
    { text: 'Enable report printing' }
  ];

  return (
    <div className="w-full h-full flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700 overflow-y-auto no-scrollbar pr-2 lg:pr-4 pb-[100px] lg:pb-8">
      
      {/* --- 1. HERO / WELCOME SECTION --- */}
      <div className="flex flex-col gap-1 md:gap-2 shrink-0">
        <h1 className="text-2xl md:text-3xl font-mono font-bold text-white tracking-tight">
          Welcome back, <span className="text-blue-400">{userEmail || 'User'}</span>
        </h1>
        <p className="text-slate-400 text-xs md:text-sm font-bold tracking-wider">
          Here is what's coming to your financial dashboard. Watch the guide below to master the system.
        </p>
      </div>

      {/* --- 2. VIDEO & NEON MENU SECTION --- */}
      <div className="flex flex-col-reverse lg:flex-row gap-4 md:gap-6 shrink-0 w-full min-h-[300px] lg:min-h-[420px]">
        
        {/* LEFT: REAL VIDEO PLAYER WITH NATIVE CONTROLS */}
        <div className="w-full lg:w-[70%] bg-black border border-white/10 rounded-[24px] md:rounded-[32px] shadow-2xl relative overflow-hidden group flex-shrink-0 min-h-[250px] md:min-h-[300px] lg:min-h-0">
          
          {/* HTML5 Video Element */}
          <video
            key={currentVid.src} // Forcing re-render when source changes
            src={currentVid.src}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            autoPlay
            muted
            loop
            playsInline
            controls // Enables native play/pause/fullscreen OS controls
          />
          
          {/* Video Title Overlay (Appears on Hover, like YouTube) */}
          <div className="absolute top-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-b from-slate-950/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <h3 className="text-lg md:text-2xl font-bold text-white mb-1 uppercase tracking-widest drop-shadow-lg">
                {currentVid.title}
              </h3>
              <p className="text-[10px] md:text-xs text-blue-400 font-bold uppercase tracking-[0.2em] drop-shadow-md">
                {currentVid.sub}
              </p>
          </div>
        </div>

        {/* RIGHT: FUTURISTIC NEON MENU FOR VIDEO SELECTION */}
        <div className="w-full lg:w-[30%] bg-white/[0.02] border border-white/5 rounded-[24px] md:rounded-[32px] p-4 md:p-6 flex flex-col gap-2 shadow-2xl shrink-0">
          
          <div className="flex items-center gap-3 mb-4 px-2">
             <h3 className="text-sm md:text-base font-bold uppercase tracking-widest text-white">Instructions</h3>
          </div>
          
          <div className="flex flex-col gap-1 w-full flex-1">
            
            {/* Accordion Menu: Registration */}
            <div className="flex flex-col">
              <button 
                onClick={() => setRegOpen(!regOpen)}
                className="w-full text-left px-3 py-2 md:py-3 transition-all duration-300 flex items-center justify-between group rounded-lg text-slate-500 hover:text-slate-300"
              >
                <span className="text-[10px] md:text-[11px] font-bold tracking-widest uppercase transition-all duration-300 decoration-1 underline-offset-4 group-hover:underline">
                  Registration
                </span>
                <ChevronRight size={14} className={`transition-transform duration-300 opacity-50 ${regOpen ? 'rotate-90' : ''}`} />
              </button>
              
              <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-500 pl-4 border-l border-white/5 ml-4 ${regOpen ? 'max-h-40 opacity-100 py-1' : 'max-h-0 opacity-0 py-0'}`}>
                {['Email Account', '2 Online Platforms'].map((subTitle, idx) => {
                  const vidId = `0-${idx}`;
                  const isActive = activeVideo === vidId;
                  return (
                    <button 
                      key={vidId}
                      onClick={() => setActiveVideo(vidId)}
                      className={`w-full text-left px-3 py-2 transition-all duration-300 flex items-center justify-between group rounded-lg
                        ${isActive ? 'text-white bg-white/[0.02]' : 'text-slate-500 hover:text-slate-300'}
                      `}
                    >
                      <span className={`text-[9px] md:text-[10px] font-bold tracking-widest uppercase transition-all duration-300 decoration-1 underline-offset-4 group-hover:underline
                        ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] text-blue-400 underline' : ''}
                      `}>
                        {subTitle}
                      </span>
                      {isActive && <ChevronRight size={14} className="animate-pulse opacity-50 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Standard Menu Items */}
            {['Login', 'Bank Export', 'Data Sync'].map((title, idx) => {
              const vidId = `${idx + 1}`;
              const isActive = activeVideo === vidId;
              return (
                <button 
                  key={vidId}
                  onClick={() => setActiveVideo(vidId)}
                  className={`w-full text-left px-3 py-2 md:py-3 transition-all duration-300 flex items-center justify-between group rounded-lg
                    ${isActive ? 'text-white bg-white/[0.02]' : 'text-slate-500 hover:text-slate-300'}
                  `}
                >
                  <span className={`text-[10px] md:text-[11px] font-bold tracking-widest uppercase transition-all duration-300 decoration-1 underline-offset-4 group-hover:underline
                    ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] text-blue-400 underline' : ''}
                  `}>
                    {title}
                  </span>
                  {isActive && <ChevronRight size={14} className="animate-pulse opacity-50 text-blue-400" />}
                </button>
              );
            })}

          </div>
        </div>
      </div>

      {/* --- 3. GRID: NEWSLETTER & FUTURE UPDATES --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 w-full shrink-0 flex-1 min-h-[250px] pb-10">
        
        {/* NEWSLETTER CARD */}
        <div className="bg-gradient-to-br from-blue-900/10 to-slate-900 border border-white/10 rounded-[24px] md:rounded-[32px] p-6 md:p-8 flex flex-col justify-center relative overflow-hidden w-full h-full min-h-[250px]">
            <div className="absolute top-0 right-0 p-6 opacity-10">
                <Mail size={100} className="md:w-[120px] md:h-[120px]" />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
                        <Bell size={20} className="md:w-6 md:h-6" />
                    </div>
                    <h3 className="text-sm md:text-base font-bold uppercase tracking-widest text-white">Weekly Insights</h3>
                </div>
                
                <p className="text-slate-400 text-[10px] md:text-xs mb-6 max-w-[250px] md:max-w-xs font-bold tracking-wider leading-relaxed">
                    GET AI-DRIVEN FINANCIAL FORECASTS AND MARKET UPDATES DELIVERED DIRECTLY TO YOUR INBOX.
                </p>

                {subscribed ? (
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20">
                        <CheckCircle size={18} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide">Subscribed!</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubscribe} className="flex flex-col md:flex-row gap-3">
                        <input 
                            type="email" 
                            placeholder="NAME@EXAMPLE.COM" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-xs md:text-sm text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-600 font-bold uppercase"
                            required
                        />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] md:text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20 shrink-0">
                            Subscribe <ArrowRight size={14} />
                        </button>
                    </form>
                )}
            </div>
        </div>

        {/* FUTURE UPDATES CARD */}
        <div className="bg-gradient-to-br from-blue-900/10 to-slate-900 border border-white/10 rounded-[24px] md:rounded-[32px] p-6 md:p-8 flex flex-col justify-start w-full h-full min-h-[250px] relative overflow-hidden">
             
             <div className="absolute top-0 right-0 p-6 opacity-10">
                <Rocket size={100} className="md:w-[120px] md:h-[120px]" />
             </div>

             <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
                        <Sparkles size={20} className="md:w-6 md:h-6" />
                    </div>
                    <h3 className="text-sm md:text-base font-bold uppercase tracking-widest text-white">Future Updates</h3>
                 </div>
                 
                 <div className="space-y-4 lg:space-y-5">
                     {futureUpdates.map((update, idx) => (
                         <div key={idx} className="flex items-center gap-3 group cursor-default">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 group-hover:bg-blue-400 transition-colors"></div>
                             <span className="text-[10px] md:text-[11px] text-slate-400 font-bold group-hover:text-white transition-colors leading-tight uppercase tracking-widest">
                               {update.text}
                             </span>
                         </div>
                     ))}
                 </div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default Home;