import { motion } from "motion/react";

interface CompanionAvatarProps {
  mood: 'happy' | 'neutral' | 'cheeky' | 'panic' | 'sleepy';
  aiNote?: string;
}

export default function CompanionAvatar({ mood, aiNote }: CompanionAvatarProps) {
  const getMoodConfig = () => {
    switch (mood) {
      case 'happy':
        return {
          color: 'from-emerald-400 to-teal-500',
          glow: 'rgba(16, 185, 129, 0.4)',
          expression: 'smiling',
          quote: "Status: ON TRACK. You're actually doing stuff. I'm impressed... for now.",
          faceSvg: (
            <svg className="w-16 h-16 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M12 18.75V16.5m-3 2.25h6M9 9h.008v.008H9V9zm6 0h.008v.008H15V9z" />
            </svg>
          )
        };
      case 'panic':
        return {
          color: 'from-rose-500 to-red-600',
          glow: 'rgba(239, 68, 68, 0.5)',
          expression: 'panic',
          quote: "Status: HELP! Procrastination levels are at 100%. Put the coffee down and START NOW!",
          faceSvg: (
            <svg className="w-16 h-16 text-rose-200 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        };
      case 'cheeky':
        return {
          color: 'from-amber-400 to-orange-500',
          glow: 'rgba(245, 158, 11, 0.4)',
          expression: 'smirk',
          quote: "Status: PROCRASTINATING. Fascinating study of human delay. What's the plan here?",
          faceSvg: (
            <svg className="w-16 h-16 text-amber-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15h7.5M9 9h.008v.008H9V9zm6 0h.008v.008H15V9zm-3.375 2.25h.75" />
            </svg>
          )
        };
      case 'sleepy':
        return {
          color: 'from-indigo-400 to-purple-600',
          glow: 'rgba(129, 140, 248, 0.3)',
          expression: 'sleepy',
          quote: "Status: STANDBY. No tasks left. I'm going to take a nap. Wake me when you've got ambitions.",
          faceSvg: (
            <svg className="w-16 h-16 text-indigo-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m3.75-3v16.5" />
            </svg>
          )
        };
      case 'neutral':
      default:
        return {
          color: 'from-blue-500 to-indigo-600',
          glow: 'rgba(59, 130, 246, 0.4)',
          expression: 'observing',
          quote: "Status: COMPANION ONLINE. Waiting for you to input a task. I'm watching you closely.",
          faceSvg: (
            <svg className="w-16 h-16 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644M21.964 11.678a1.012 1.012 0 010 .644M12 18.75a6.75 6.75 0 110-13.5 6.75 6.75 0 010 13.5z" />
            </svg>
          )
        };
    }
  };

  const config = getMoodConfig();

  return (
    <div id="companion-avatar" className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden shadow-sm">
      {/* Animated Avatar Body */}
      <motion.div 
        animate={{ 
          y: mood === 'panic' ? [0, -6, 0, -4, 0] : [0, -4, 0],
          rotate: mood === 'cheeky' ? [0, 2, -2, 0] : 0
        }}
        transition={{ 
          repeat: Infinity, 
          duration: mood === 'panic' ? 1.5 : 3, 
          ease: "easeInOut" 
        }}
        className={`w-24 h-24 rounded-full bg-gradient-to-br ${config.color} p-1 flex items-center justify-center shadow-md relative shrink-0 border border-white/10`}
      >
        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
          {config.faceSvg}
        </div>

        {/* Dynamic Badge */}
        <span className="absolute -bottom-1 -right-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-100 border border-slate-700">
          COACH
        </span>
      </motion.div>

      {/* Speech & AI notes block */}
      <div className="flex-1 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
          <span className="font-display text-lg font-bold text-slate-900">Orderly AI</span>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded border border-slate-200 uppercase">
            Active Coach
          </span>
        </div>
        
        <p className="text-slate-600 text-sm font-medium italic leading-relaxed mb-2.5">
          "{config.quote}"
        </p>

        {aiNote && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs bg-slate-50 text-slate-700 p-2.5 rounded-xl border border-slate-200 font-sans flex items-start gap-2"
          >
            <span className="text-blue-600 font-bold shrink-0">AI SUGGESTIONS:</span>
            <span>{aiNote}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
