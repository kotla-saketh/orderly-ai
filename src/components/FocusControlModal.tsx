import React, { useState } from "react";
import { 
  X, 
  Zap, 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  CheckCircle2, 
  History, 
  Clock, 
  Sparkles,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { Task } from "../types";

export interface FocusHistoryItem {
  id: string;
  taskName: string;
  duration: number; // minutes completed
  timestamp: string; // ISO date string
}

interface FocusControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null; // the task chosen to work on
  onStartFocus: (task: Task, duration: number, sessions: number) => void;
  
  // Active state from parent App.tsx
  activeFocusTask: Task | null;
  focusTimerSeconds: number;
  isFocusTimerActive: boolean;
  isBreakActive: boolean;
  breakTimerSeconds: number;
  isBreakTimerActive: boolean;
  isBreakPromptActive: boolean;
  
  // Handler controls
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onCompleteSessionManual: () => void;
  onSelectBreak: (minutes: number) => void;
  onSkipBreak: () => void;
  
  focusHistory: FocusHistoryItem[];
  onClearHistory: () => void;
}

export default function FocusControlModal({
  isOpen,
  onClose,
  task,
  onStartFocus,
  activeFocusTask,
  focusTimerSeconds,
  isFocusTimerActive,
  isBreakActive,
  breakTimerSeconds,
  isBreakTimerActive,
  isBreakPromptActive,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onCompleteSessionManual,
  onSelectBreak,
  onSkipBreak,
  focusHistory,
  onClearHistory
}: FocusControlModalProps) {
  
  // Local state for setup
  const [sessionDuration, setSessionDuration] = useState<string>("25");
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [numSessions, setNumSessions] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Initialize form with task values if any
  const getSelectedDuration = () => {
    if (sessionDuration === "custom") {
      const parsed = parseInt(customMinutes);
      return isNaN(parsed) || parsed <= 0 ? 25 : parsed;
    }
    return parseInt(sessionDuration);
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    
    const finalDuration = getSelectedDuration();
    if (finalDuration > 180) {
      setError("Focus duration cannot exceed 180 minutes.");
      return;
    }
    
    setError(null);
    onStartFocus(task, finalDuration, numSessions);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Determine current focus view state
  // We are either:
  // 1. Setting up (activeFocusTask is null or activeFocusTask.id !== task.id)
  // 2. Ticking/Paused Active Focus Session (activeFocusTask is current task, isBreakActive is false, isBreakPromptActive is false)
  // 3. Prompting for Break (isBreakPromptActive is true)
  // 4. In Break Timer (isBreakActive is true)
  
  const isCurrentlyWorkingOnThis = activeFocusTask && task && activeFocusTask.id === task.id;
  const isSetupMode = !isCurrentlyWorkingOnThis;

  const totalSessions = activeFocusTask?.totalSessions || numSessions || 1;
  const completedSessions = activeFocusTask?.completedSessions || 0;
  const progressPercent = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] md:h-[600px] animate-in fade-in zoom-in-95 duration-200">
        
        {/* LEFT WORKSPACE / TIMER PANEL */}
        <div className="flex-1 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-xs font-mono uppercase tracking-widest text-indigo-600 font-bold">
                {isSetupMode ? "Focus Setup" : isBreakActive ? "Rest & Recover" : "Session Timer"}
              </span>
            </div>
            <button 
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-black hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MAIN CONFIG OR TIMER CONTENT */}
          <div className="flex-1 flex flex-col justify-center py-4">
            
            {/* CASE 1: FOCUS SETUP MODE */}
            {isSetupMode && task && (
              <form onSubmit={handleSetupSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{task.name}</h3>
                  <p className="text-xs text-slate-500">
                    Bypass procrastination instantly. Customize your focus blocks and session rounds below.
                  </p>
                </div>

                {/* Session Duration Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 font-sans">
                    Choose Focus Session Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "5", label: "5 min" },
                      { value: "10", label: "10 min" },
                      { value: "15", label: "15 min" },
                      { value: "25", label: "25 min" },
                      { value: "45", label: "45 min" },
                      { value: "custom", label: "Custom..." }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSessionDuration(opt.value);
                          setError(null);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          sessionDuration === opt.value
                            ? "bg-black text-white border-black shadow-sm scale-102"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Minutes Input if selected */}
                {sessionDuration === "custom" && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-1 font-sans">
                      Custom Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      placeholder="e.g. 50"
                      value={customMinutes}
                      onChange={(e) => {
                        setCustomMinutes(e.target.value);
                        setError(null);
                      }}
                      required
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans font-medium"
                    />
                  </div>
                )}

                {/* Number of Sessions */}
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 font-sans">
                    Number of focus sessions
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNumSessions(num)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          numSessions === num
                            ? "bg-black text-white border-black shadow-sm scale-102"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {num} {num === 1 ? "Session" : "Sessions"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview text */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>
                    Focus Target: <span className="text-black font-bold">{getSelectedDuration()} min</span> ×{" "}
                    <span className="text-black font-bold">{numSessions} rounds</span>
                  </span>
                </div>

                {error && (
                  <p className="text-xs text-rose-600 font-medium font-sans">{error}</p>
                )}

                {/* Buttons: Start Task */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                  >
                    <Play className="w-4 h-4 text-white fill-white" />
                    Start Task
                  </button>
                </div>
              </form>
            )}

            {/* CASE 2: ACTIVE BREAK PROMPT (Take a break?) */}
            {!isSetupMode && isBreakPromptActive && (
              <div className="space-y-5 text-center py-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100 shadow-sm animate-bounce">
                  <Coffee className="w-8 h-8 text-amber-500" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Focus block completed!</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    You made stellar progress on <span className="font-semibold text-slate-800">"{activeFocusTask?.name}"</span>. Would you like to take a break before the next round?
                  </p>
                </div>

                {/* Session Progress info */}
                <div className="max-w-xs mx-auto bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>{activeFocusTask?.name}</span>
                    <span>{completedSessions} of {totalSessions} completed</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Break Options */}
                <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                  <button
                    onClick={() => onSelectBreak(2)}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Coffee className="w-3.5 h-3.5 text-slate-400" />
                    2 min break
                  </button>
                  <button
                    onClick={() => onSelectBreak(5)}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Coffee className="w-3.5 h-3.5 text-slate-400" />
                    5 min break
                  </button>
                  <button
                    onClick={onSkipBreak}
                    className="bg-black hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
                  >
                    Skip break (Back to Work)
                  </button>
                </div>
              </div>
            )}

            {/* CASE 3: TICKING BREAK TIMER */}
            {!isSetupMode && !isBreakPromptActive && isBreakActive && (
              <div className="space-y-6 text-center py-4">
                <div className="relative w-40 h-40 mx-auto flex items-center justify-center bg-amber-50 rounded-full border border-amber-100 shadow-inner">
                  <div className="absolute inset-2 border-2 border-dashed border-amber-200 rounded-full animate-spin [animation-duration:10s]"></div>
                  <div className="text-center z-10">
                    <span className="block text-3xl font-black text-amber-800 font-mono tracking-tight">
                      {formatTime(breakTimerSeconds)}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 font-mono mt-0.5 block">
                      Resting...
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Resting period active</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Take your eyes off the screen. Breathe in deep and relax.
                  </p>
                </div>

                <div className="flex justify-center gap-2">
                  <button
                    onClick={onSkipBreak}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors"
                  >
                    Skip Break
                  </button>
                </div>
              </div>
            )}

            {/* CASE 4: ACTIVE TICKING/PAUSED FOCUS TIMER */}
            {!isSetupMode && !isBreakPromptActive && !isBreakActive && activeFocusTask && (
              <div className="space-y-5 text-center py-2 animate-in fade-in duration-300">
                <h3 className="text-md font-bold text-slate-950 px-4 line-clamp-1">{activeFocusTask.name}</h3>
                
                {/* Visual Circle Clock HUD */}
                <div className="relative w-44 h-44 mx-auto flex items-center justify-center bg-slate-950 rounded-full shadow-xl border-4 border-slate-900 group">
                  <div className={`absolute inset-3 border border-slate-800 rounded-full ${isFocusTimerActive ? "animate-pulse" : ""}`}></div>
                  <div className="text-center z-10">
                    <span className="block text-3xl font-black text-white font-mono tracking-tight leading-none">
                      {formatTime(focusTimerSeconds)}
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 font-mono mt-1.5 block">
                      {isFocusTimerActive ? "Focusing" : "Paused"}
                    </span>
                  </div>
                </div>

                {/* Progress bar info */}
                <div className="max-w-xs mx-auto bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1 font-sans">
                    <span>Focus Progress</span>
                    <span>Session {completedSessions + 1} of {totalSessions}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1.5">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-500" 
                      style={{ width: `${Math.max(5, Math.round(((completedSessions) / totalSessions) * 100))}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {progressPercent}% of total sprint sessions complete
                  </span>
                </div>

                {/* Interactive Controls Buttons */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={onResetTimer}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                    title="Reset Focus Timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {isFocusTimerActive ? (
                    <button
                      onClick={onPauseTimer}
                      className="px-6 py-3 bg-black hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-98"
                    >
                      <Pause className="w-4 h-4 text-white fill-white" />
                      Pause Timer
                    </button>
                  ) : (
                    <button
                      onClick={onStartTimer}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-98"
                    >
                      <Play className="w-4 h-4 text-white fill-white animate-pulse" />
                      Start Focus Timer
                    </button>
                  )}

                  <button
                    onClick={onCompleteSessionManual}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all"
                    title="Fast Forward/Complete Focus Session"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer branding */}
          <div className="text-center pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>ORDERLY SPRINT WORKSPACE</span>
          </div>
        </div>

        {/* RIGHT FOCUS HISTORY HUD PANEL */}
        <div className="w-full md:w-64 bg-slate-50 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-3 flex items-center gap-1.5 font-mono">
              <History className="w-3.5 h-3.5 text-slate-400" />
              Focus History
            </h3>
            <p className="text-[11px] text-slate-400 leading-normal mb-4">
              Real-time records of today's completed sprints. Consistent execution builds habit.
            </p>

            {/* List focus completions */}
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {focusHistory.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white/50 p-4">
                  <Clock className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-[11px] text-slate-400 font-medium">No sessions logged yet.</p>
                  <p className="text-[9px] text-slate-400/80 mt-0.5">Your accomplishments will be tracked here.</p>
                </div>
              ) : (
                focusHistory.map((item) => (
                  <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-xs">
                    <div className="font-semibold text-xs text-slate-900 line-clamp-2 leading-tight mb-1">
                      {item.taskName}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400">
                      <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {item.duration} min
                      </span>
                      <span>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {focusHistory.length > 0 && (
            <button
              onClick={onClearHistory}
              className="w-full text-slate-400 hover:text-rose-600 text-[10px] font-mono uppercase tracking-wider font-bold py-2 border border-slate-200 hover:border-rose-100 bg-white hover:bg-rose-50/50 rounded-xl mt-4 transition-colors"
            >
              Clear Log History
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
