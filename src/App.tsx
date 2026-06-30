import React, { useState, useEffect, useRef } from "react";
import { 
  AlarmClock, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Brain, 
  Trash2, 
  Plus, 
  CornerDownRight, 
  MessageSquare, 
  Settings, 
  RotateCcw, 
  Volume2, 
  Bell, 
  User, 
  ListPlus, 
  Zap, 
  Mic, 
  MicOff, 
  CheckSquare, 
  Square, 
  ChevronRight, 
  AlertTriangle,
  Play,
  Pause,
  X,
  XCircle,
  HelpCircle,
  Menu
} from "lucide-react";
import { Task, SmartNotification, DailyReview } from "./types";
import NLUInput from "./components/NLUInput";
import FocusControlModal, { FocusHistoryItem } from "./components/FocusControlModal";

// Web Audio API beep synthesizer for non-blocking browser alerts
function playAlarmSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    // Sassy space alarm tune (arpeggio)
    const now = audioCtx.currentTime;
    oscillator.frequency.setValueAtTime(880, now); // A5
    oscillator.frequency.setValueAtTime(1046.5, now + 0.1); // C6
    oscillator.frequency.setValueAtTime(1318.5, now + 0.2); // E6
    oscillator.frequency.setValueAtTime(1760, now + 0.3); // A6
    
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    oscillator.start(now);
    oscillator.stop(now + 0.6);
  } catch (err) {
    console.error("Audio Synthesis error: ", err);
  }
}

// Initial mockup tasks to ensure the dashboard feels complete from the first load
const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    name: "Q4 Growth Strategy Analysis",
    deadline: new Date().toISOString().split("T")[0], // Today
    exactTime: "18:00",
    alarmTime: new Date(Date.now() + 60 * 1000).toISOString(), // Alarm in 1 minute
    completed: false,
    completedAt: null,
    priority: "urgent",
    steps: [
      { id: "step-1-1", text: "Export Q3 financial reports", completed: true },
      { id: "step-1-2", text: "Validate statistical forecasting models", completed: false },
      { id: "step-1-3", text: "Compile slides for executive review", completed: false }
    ],
    ignoredCount: 1,
    quickStartMode: false,
    quickStartTimerSeconds: null,
    createdAt: new Date().toISOString(),
    aiNote: "The deadline is screaming at you today. Get Step 2 validated, then build the slide deck!",
    focusDuration: 25,
    totalSessions: 3,
    completedSessions: 1
  },
  {
    id: "task-2",
    name: "Client Brand Identity Concept",
    deadline: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
    exactTime: "11:00",
    alarmTime: null,
    completed: false,
    completedAt: null,
    priority: "high",
    steps: [
      { id: "step-2-1", text: "Research main competitor brand identities", completed: false },
      { id: "step-2-2", text: "Sketch 3 distinct logo layout options", completed: false },
      { id: "step-2-3", text: "Draft style guides and visual rules", completed: false }
    ],
    ignoredCount: 0,
    quickStartMode: false,
    quickStartTimerSeconds: null,
    createdAt: new Date().toISOString(),
    aiNote: "High creative overhead! Don't push this to the last minute or you'll design something mediocre.",
    focusDuration: 15,
    totalSessions: 2,
    completedSessions: 0
  }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [activeView, setActiveView] = useState<"dashboard" | "calendar" | "insights">("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);

  // Manual Form States
  const [manualName, setManualName] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("12:00");
  const [manualAlarmMinutesBefore, setManualAlarmMinutesBefore] = useState("15");
  const [manualCustomReminderTime, setManualCustomReminderTime] = useState("");
  const [manualAllowSnooze, setManualAllowSnooze] = useState(true);
  const [manualMaxSnoozeCount, setManualMaxSnoozeCount] = useState<'1' | '3' | '5' | 'unlimited'>('3');
  const [manualSnoozeDuration, setManualSnoozeDuration] = useState<'5' | '10' | '15' | '30'>('10');
  const [manualAlertType, setManualAlertType] = useState<'sound' | 'vibrate' | 'sound + vibrate' | 'silent'>('sound + vibrate');
  const [manualRepeatedAlert, setManualRepeatedAlert] = useState<'once' | '2' | '5' | 'until_complete'>('once');
  const [manualAiSteps, setManualAiSteps] = useState<{ text: string; completed: boolean }[]>([]);
  const [isGeneratingAiPlan, setIsGeneratingAiPlan] = useState(false);
  const [planningMode, setPlanningMode] = useState<"ai" | "manual">("ai");
  const [formSteps, setFormSteps] = useState<{ id: string; text: string }[]>([]);

  // Daily review modal
  const [dailyReview, setDailyReview] = useState<DailyReview | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  // Alarm firing modal state
  const [alarmFiringTask, setAlarmFiringTask] = useState<Task | null>(null);

  // Manual Form Sprint Configuration States
  const [manualFocusDuration, setManualFocusDuration] = useState<string>("25");
  const [manualFocusCustom, setManualFocusCustom] = useState<string>("");
  const [manualSessions, setManualSessions] = useState<number>(1);

  // Active Focus timer states
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);
  const [focusTimerSeconds, setFocusTimerSeconds] = useState<number>(1500); // 25 minutes (1500 seconds)
  const [isFocusTimerActive, setIsFocusTimerActive] = useState<boolean>(false);
  
  // Break timer states
  const [isBreakActive, setIsBreakActive] = useState<boolean>(false);
  const [breakTimerSeconds, setBreakTimerSeconds] = useState<number>(0);
  const [isBreakTimerActive, setIsBreakTimerActive] = useState<boolean>(false);
  const [isBreakPromptActive, setIsBreakPromptActive] = useState<boolean>(false);

  // Focus history states
  const [focusHistory, setFocusHistory] = useState<FocusHistoryItem[]>([]);
  const [showFocusModal, setShowFocusModal] = useState<boolean>(false);
  const [focusSetupTask, setFocusSetupTask] = useState<Task | null>(null);

  // Time state for the top-right digital clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Speech helper state
  const [isVoiceActiveManual, setIsVoiceActiveManual] = useState(false);

  // Real completion streak & week tracker
  const getWeekDaysActivity = () => {
    const today = new Date();
    const day = today.getDay();
    const dayIndex = day === 0 ? 6 : day - 1; // Monday = 0, Tuesday = 1, ..., Sunday = 6
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayIndex);

    const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
    
    const completedTasks = tasks.filter(t => t.completed && t.completedAt);
    
    const getLocalDateString = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const date = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${date}`;
    };

    const completedDatesSet = new Set<string>();
    completedTasks.forEach(t => {
      if (t.completedAt) {
        completedDatesSet.add(getLocalDateString(new Date(t.completedAt)));
      }
    });

    const activityList = weekdays.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dStr = getLocalDateString(d);
      const isCompleted = completedDatesSet.has(dStr);
      return {
        label,
        dateString: dStr,
        isCompleted
      };
    });

    return activityList;
  };

  const getRealCurrentStreak = () => {
    const completedTasks = tasks.filter(t => t.completed && t.completedAt);
    if (completedTasks.length === 0) return 0;
    
    const today = new Date();
    const getLocalDateString = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const date = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${date}`;
    };

    const completedDatesSet = new Set<string>();
    completedTasks.forEach(t => {
      if (t.completedAt) {
        completedDatesSet.add(getLocalDateString(new Date(t.completedAt)));
      }
    });

    const todayStr = getLocalDateString(today);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const isTodayCompleted = completedDatesSet.has(todayStr);
    const isYesterdayCompleted = completedDatesSet.has(yesterdayStr);

    if (!isTodayCompleted && !isYesterdayCompleted) {
      return 0;
    }

    let checkDate = new Date(today);
    if (!isTodayCompleted && isYesterdayCompleted) {
      checkDate = new Date(yesterday);
    }

    let streak = 0;
    while (true) {
      const checkStr = getLocalDateString(checkDate);
      if (completedDatesSet.has(checkStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  // Load and Save Local Storage
  useEffect(() => {
    // Rule 10: Clear old saved data
    const keysToRemove = ["streak", "weeklyStreak", "streakDays", "demoStreak", "mockData"];
    keysToRemove.forEach(key => localStorage.removeItem(key));

    const storedTasks = localStorage.getItem("orderly_tasks") || localStorage.getItem("lifepilot_tasks");
    const storedNotifs = localStorage.getItem("orderly_notifs") || localStorage.getItem("lifepilot_notifs");
    
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    } else {
      setTasks(INITIAL_TASKS);
      localStorage.setItem("orderly_tasks", JSON.stringify(INITIAL_TASKS));
    }

    if (storedNotifs) {
      setNotifications(JSON.parse(storedNotifs));
    } else {
      const welcomeNotif: SmartNotification = {
        id: "notif-welcome",
        title: "Orderly AI Activated",
        message: "Hello! I am your companion. I monitor your deadlines and nudge you when procrastination strikes.",
        type: "success",
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications([welcomeNotif]);
    }

    const storedHistory = localStorage.getItem("orderly_focus_history");
    if (storedHistory) {
      setFocusHistory(JSON.parse(storedHistory));
    }
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem("orderly_tasks", JSON.stringify(tasks));
    }
  }, [tasks]);

  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem("orderly_notifs", JSON.stringify(notifications));
    }
  }, [notifications]);

  // Clock tick & Alarm monitoring & Countdown updating
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // 1. Monitor active alarms
      tasks.forEach((task) => {
        if (!task.completed && task.alarmTime) {
          const alarmDate = new Date(task.alarmTime);
          // Trigger alarm if current time matches or has passed the alarm, and not already triggered
          if (now >= alarmDate) {
            triggerAlarm(task);
          }
        }
      });

      // 2. Active Focus Timer tick
      if (isFocusTimerActive && activeFocusTask) {
        setFocusTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsFocusTimerActive(false);
            // End Focus session
            setTimeout(() => {
              handleCompleteFocusSessionAuto();
            }, 10);
            return 0;
          }
          return prev - 1;
        });
      }

      // 3. Active Break Timer tick
      if (isBreakTimerActive && isBreakActive) {
        setBreakTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsBreakTimerActive(false);
            setIsBreakActive(false);
            setTimeout(() => {
              addNotification(
                "Break Completed!",
                "Your break is over. Get ready to focus again!",
                "info",
                activeFocusTask?.id
              );
            }, 10);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks, isFocusTimerActive, activeFocusTask, isBreakActive, isBreakTimerActive]);

  const addNotification = (title: string, message: string, type: SmartNotification['type'], taskId?: string) => {
    const newNotif: SmartNotification = {
      id: "notif-" + Date.now(),
      taskId,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    // Trigger audio effect
    playAlarmSound();
  };

  const triggerAlarm = (task: Task) => {
    // Open the firing alarm interface
    setAlarmFiringTask(task);
    playAlarmSound();

    // Remove alarm time from task so it doesn't loop fire
    setTasks(prev => 
      prev.map(t => t.id === task.id ? { ...t, alarmTime: null } : t)
    );

    addNotification(
      "Task Alarm Triggered",
      `Time to focus! "${task.name}" is due soon. No more stalling!`,
      "alarm",
      task.id
    );
  };

  // NLU input parsed tasks handling
  const handleNLUTasksParsed = async (parsedTasks: Array<{ name: string; deadline: string; exactTime: string; alarmTime: string | null }>) => {
    setIsProcessing(true);
    const newTasks: Task[] = [];

    for (const pt of parsedTasks) {
      // For each task, call our server-side breakdown API to get actionable steps and priority
      try {
        const res = await fetch("/api/tasks/breakdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pt.name,
            deadline: pt.deadline,
            exactTime: pt.exactTime,
            currentTime: new Date().toISOString()
          })
        });

        if (res.ok) {
          const breakdownData = await res.json();
          newTasks.push({
            id: "task-" + Math.random().toString(36).substr(2, 9),
            name: pt.name,
            deadline: pt.deadline,
            exactTime: pt.exactTime,
            alarmTime: pt.alarmTime,
            completed: false,
            completedAt: null,
            priority: breakdownData.priority as any,
            steps: breakdownData.steps.map((s: any, idx: number) => ({
              id: `step-${Date.now()}-${idx}`,
              text: s.text,
              completed: false
            })),
            ignoredCount: 0,
            quickStartMode: false,
            quickStartTimerSeconds: null,
            createdAt: new Date().toISOString(),
            aiNote: breakdownData.aiNote
          });
        }
      } catch (err) {
        console.error("Error breaking down parsed task: ", err);
      }
    }

    if (newTasks.length > 0) {
      setTasks(prev => [...newTasks, ...prev]);
      addNotification(
        "Tasks Automatically Prepared",
        `Created ${newTasks.length} highly actionable tasks with breakdown and dynamic priority.`,
        "success"
      );
    }
    setIsProcessing(false);
  };

  // Generate actionable steps with Gemini prior to submitting task
  const handleGenerateAiPlan = async () => {
    if (!manualName.trim()) {
      alert("Please enter a task name first.");
      return;
    }
    setIsGeneratingAiPlan(true);
    try {
      const res = await fetch("/api/tasks/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualName,
          deadline: manualDate || new Date().toISOString().split("T")[0],
          exactTime: manualTime || "12:00",
          currentTime: new Date().toISOString()
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.steps && Array.isArray(data.steps)) {
          const loadedSteps = data.steps.map((s: any, idx: number) => ({
            id: `step-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            text: s.text
          }));
          setFormSteps(loadedSteps);
          setManualAiSteps(data.steps.map((s: any) => ({
            text: s.text,
            completed: false
          })));
        }
      } else {
        alert("Unable to reach AI planning server. Try typing a direct task.");
      }
    } catch (err) {
      console.error("AI Plan Error:", err);
    } finally {
      setIsGeneratingAiPlan(false);
    }
  };

  // Manual creation form
  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualDate) return;

    setIsProcessing(true);
    let calculatedAlarmTime: string | null = null;
    
    if (manualAlarmMinutesBefore === "custom") {
      if (manualCustomReminderTime) {
        calculatedAlarmTime = new Date(manualCustomReminderTime).toISOString();
      }
    } else if (manualAlarmMinutesBefore) {
      const minutes = parseInt(manualAlarmMinutesBefore);
      if (!isNaN(minutes)) {
        const deadlineDate = new Date(`${manualDate}T${manualTime}:00`);
        const alarmDate = new Date(deadlineDate.getTime() - minutes * 60 * 1000);
        calculatedAlarmTime = alarmDate.toISOString();
      }
    }

    try {
      let data = { priority: "medium", steps: [] as any[], aiNote: "Let's accomplish this task with simple focus!" };
      
      if (planningMode === "manual") {
        // Option B: Manual Custom Steps
        const customSteps = formSteps.filter(s => s.text.trim() !== "");
        data.steps = customSteps;
        data.aiNote = "Your custom plan is set. Let's make it happen!";
        
        // Simple priority calculation based on deadline proximity
        const deadlineDate = new Date(`${manualDate}T${manualTime}:00`);
        const diffMs = deadlineDate.getTime() - Date.now();
        const diffHours = diffMs / (1000 * 60 * 60);
        data.priority = diffHours < 4 ? "urgent" : diffHours < 12 ? "high" : "medium";
      } else {
        // Option A: AI Generated Steps
        // If they edited the formSteps, use those!
        const nonCompletedFormSteps = formSteps.filter(s => s.text.trim() !== "");
        if (nonCompletedFormSteps.length > 0) {
          data.steps = nonCompletedFormSteps;
          const deadlineDate = new Date(`${manualDate}T${manualTime}:00`);
          const diffMs = deadlineDate.getTime() - Date.now();
          const diffHours = diffMs / (1000 * 60 * 60);
          data.priority = diffHours < 4 ? "urgent" : diffHours < 12 ? "high" : "medium";
        } else {
          const res = await fetch("/api/tasks/breakdown", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: manualName,
              deadline: manualDate,
              exactTime: manualTime,
              currentTime: new Date().toISOString()
            })
          });

          if (res.ok) {
            data = await res.json();
          }
        }
      }

      const duration = manualFocusDuration === "custom" 
        ? (parseInt(manualFocusCustom) || 25) 
        : parseInt(manualFocusDuration);

      const newTask: Task = {
        id: "task-" + Math.random().toString(36).substr(2, 9),
        name: manualName,
        deadline: manualDate,
        exactTime: manualTime,
        alarmTime: calculatedAlarmTime,
        completed: false,
        completedAt: null,
        priority: (data.priority || "medium") as any,
        steps: (data.steps && data.steps.length > 0)
          ? data.steps.map((s: any, idx: number) => ({
              id: `step-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
              text: s.text,
              completed: false
            }))
          : [
              { id: `step-${Date.now()}-1`, text: "Get started on the task", completed: false }
            ],
        ignoredCount: 0,
        quickStartMode: false,
        quickStartTimerSeconds: null,
        createdAt: new Date().toISOString(),
        aiNote: data.aiNote || "Let's work together to complete this step-by-step.",
        alarmMinutesBefore: manualAlarmMinutesBefore,
        customAlarmTime: manualCustomReminderTime,
        allowSnooze: manualAllowSnooze,
        maxSnoozeCount: manualMaxSnoozeCount,
        snoozeDuration: manualSnoozeDuration,
        alertType: manualAlertType,
        repeatedAlert: manualRepeatedAlert,
        focusDuration: duration,
        totalSessions: manualSessions,
        completedSessions: 0
      };

      setTasks(prev => [newTask, ...prev]);
      addNotification(
        "Task Created",
        `Created "${manualName}" with your customized focus session and alert setup.`,
        "success",
        newTask.id
      );

      // Reset form
      setManualName("");
      setManualDate("");
      setManualTime("12:00");
      setManualAlarmMinutesBefore("15");
      setManualCustomReminderTime("");
      setManualAllowSnooze(true);
      setManualFocusDuration("25");
      setManualFocusCustom("");
      setManualSessions(1);
      setManualMaxSnoozeCount("3");
      setManualSnoozeDuration("10");
      setManualAlertType("sound + vibrate");
      setManualRepeatedAlert("once");
      setManualAiSteps([]);
      setPlanningMode("ai");
      setFormSteps([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step check toggling
  const toggleStepCompleted = (taskId: string, stepId: string) => {
    setTasks(prev => 
      prev.map(task => {
        if (task.id === taskId) {
          const updatedSteps = task.steps.map(step => 
            step.id === stepId ? { ...step, completed: !step.completed } : step
          );
          
          // If all steps completed, automatically mark the main task as complete!
          const allDone = updatedSteps.length > 0 && updatedSteps.every(s => s.completed);
          
          return {
            ...task,
            steps: updatedSteps,
            completed: allDone,
            completedAt: allDone ? new Date().toISOString() : null
          };
        }
        return task;
      })
    );
  };

  // Complete entire task
  const toggleTaskCompleted = (taskId: string) => {
    setTasks(prev => 
      prev.map(task => {
        if (task.id === taskId) {
          const newStatus = !task.completed;
          return {
            ...task,
            completed: newStatus,
            completedAt: newStatus ? new Date().toISOString() : null,
            steps: task.steps.map(s => ({ ...s, completed: newStatus }))
          };
        }
        return task;
      })
    );
  };

  // Delete Task
  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    addNotification("Task Deleted", "Removed task and archived references.", "info");
  };

  // Snooze or Ignore a fired task alarm (Triggers ADAPTIVE AI Behavior!)
  const handleIgnoreOrSnooze = async (task: Task) => {
    setAlarmFiringTask(null);
    setIsProcessing(true);

    const updatedIgnoredCount = task.ignoredCount + 1;

    try {
      // Request active intervention from Gemini server adapt API
      const res = await fetch("/api/tasks/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: { ...task, ignoredCount: updatedIgnoredCount },
          currentTime: new Date().toISOString()
        })
      });

      if (res.ok) {
        const adaptation = await res.json();
        
        setTasks(prev => 
          prev.map(t => {
            if (t.id === task.id) {
              return {
                ...t,
                ignoredCount: updatedIgnoredCount,
                priority: adaptation.priority,
                quickStartMode: adaptation.quickStartMode,
                aiNote: adaptation.aiNote
              };
            }
            return t;
          })
        );

        // Create the contextual notification
        addNotification(
          "AI Intervened: Strategy Shift",
          adaptation.suggestedMessage || `Procrastination detected. Action simplified.`,
          "critic",
          task.id
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Focus Mode Workspace Setup
  const openFocusWorkspace = (task: Task) => {
    setFocusSetupTask(task);
    setShowFocusModal(true);
    setAlarmFiringTask(null);
  };

  // Setup active focus session for a task
  const handleStartFocusWorkspace = (task: Task, duration: number, sessions: number) => {
    // 1. Update task settings in state
    const updatedTask = {
      ...task,
      focusDuration: duration,
      totalSessions: sessions,
      completedSessions: 0
    };
    
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    
    // 2. Set active focus states
    setActiveFocusTask(updatedTask);
    setFocusTimerSeconds(duration * 60);
    setIsFocusTimerActive(false); // Do NOT start timer automatically (Requirement 6!)
    setIsBreakActive(false);
    setIsBreakTimerActive(false);
    setIsBreakPromptActive(false);

    // 3. Add notification
    addNotification(
      "Focus Block Created",
      `Choose "Start Focus Timer" to begin working on "${task.name}".`,
      "info",
      task.id
    );
  };

  const handleStartTimer = () => {
    setIsFocusTimerActive(true);
  };

  const handlePauseTimer = () => {
    setIsFocusTimerActive(false);
  };

  const handleResetTimer = () => {
    if (activeFocusTask) {
      const mins = activeFocusTask.focusDuration || 25;
      setFocusTimerSeconds(mins * 60);
      setIsFocusTimerActive(false);
    }
  };

  // Helper to complete a focus session
  const executeCompleteSession = (task: Task) => {
    const duration = task.focusDuration || 25;
    
    // Save to focus history log
    const historyItem: FocusHistoryItem = {
      id: "hist-" + Date.now(),
      taskName: task.name,
      duration: duration,
      timestamp: new Date().toISOString()
    };
    
    const updatedHistory = [historyItem, ...focusHistory];
    setFocusHistory(updatedHistory);
    localStorage.setItem("orderly_focus_history", JSON.stringify(updatedHistory));

    // Update task completion details
    const nextCompleted = (task.completedSessions || 0) + 1;
    const total = task.totalSessions || 1;
    
    setTasks(prev => prev.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          completedSessions: nextCompleted
        };
      }
      return t;
    }));

    // Sync current active task state
    setActiveFocusTask(prev => prev && prev.id === task.id ? {
      ...prev,
      completedSessions: nextCompleted
    } : prev);

    // Trigger Success Notification (Requirement 8!)
    addNotification(
      "Focus Block Finished!",
      "Focus session completed. Great progress.",
      "success",
      task.id
    );

    // Stop ticking
    setIsFocusTimerActive(false);

    // Trigger Break choice
    setIsBreakPromptActive(true);
  };

  // Manual Fast Forward / Complete Focus Session
  const handleCompleteSessionManual = () => {
    if (activeFocusTask) {
      executeCompleteSession(activeFocusTask);
    }
  };

  // Auto completed when clock hits 0
  const handleCompleteFocusSessionAuto = () => {
    if (activeFocusTask) {
      executeCompleteSession(activeFocusTask);
    }
  };

  // Configure break
  const handleSelectBreak = (minutes: number) => {
    setIsBreakPromptActive(false);
    setIsBreakActive(true);
    setBreakTimerSeconds(minutes * 60);
    setIsBreakTimerActive(true);
    
    addNotification(
      "Break Started",
      `Take a breath. Rest timer active for ${minutes} minutes.`,
      "info",
      activeFocusTask?.id
    );
  };

  // Skip rest break
  const handleSkipBreak = () => {
    setIsBreakPromptActive(false);
    setIsBreakActive(false);
    setIsBreakTimerActive(false);
    
    if (activeFocusTask) {
      const duration = activeFocusTask.focusDuration || 25;
      setFocusTimerSeconds(duration * 60);
      setIsFocusTimerActive(false); // Start paused
    }
  };

  const handleClearFocusHistory = () => {
    setFocusHistory([]);
    localStorage.removeItem("orderly_focus_history");
  };

  // End of Day Review Call
  const generateDailyReview = async () => {
    setIsReviewLoading(true);
    setDailyReview(null);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: tasks,
          currentTime: new Date().toISOString()
        })
      });

      if (res.ok) {
        const data = await res.json();
        const completedCount = tasks.filter(t => t.completed).length;
        const pendingCount = tasks.filter(t => !t.completed).length;
        
        // Count delayed tasks where deadline is passed
        const todayStr = new Date().toISOString().split("T")[0];
        const delayedCount = tasks.filter(t => !t.completed && t.deadline < todayStr).length;

        setDailyReview({
          date: todayStr,
          completedCount,
          delayedCount,
          pendingCount,
          critique: data.critique,
          planTomorrow: data.planTomorrow,
          generatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReviewLoading(false);
    }
  };

  // Calculate live countdown timer string
  const getCountdownString = (task: Task) => {
    if (task.completed) return "Completed";

    const deadlineDate = new Date(`${task.deadline}T${task.exactTime}:00`);
    const diffMs = deadlineDate.getTime() - currentTime.getTime();

    if (diffMs <= 0) {
      return "Overdue!";
    }

    const diffSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSecs / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    const seconds = diffSecs % 60;

    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes}m`;
    }

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Determine current overall pilot/avatar mood based on remaining tasks status
  const getOverallPilotMood = () => {
    const active = tasks.filter(t => !t.completed);
    if (active.length === 0) return 'sleepy';

    const hasUrgentOverdue = active.some(t => {
      const deadlineDate = new Date(`${t.deadline}T${t.exactTime}:00`);
      return t.priority === 'urgent' || (deadlineDate.getTime() - currentTime.getTime() < 7200000); // less than 2 hours
    });

    if (hasUrgentOverdue) return 'panic';

    const highIgnored = active.some(t => t.ignoredCount >= 2);
    if (highIgnored) return 'cheeky';

    const completedToday = tasks.filter(t => t.completed).length;
    if (completedToday > 0) return 'happy';

    return 'neutral';
  };

  // Calculate overall metrics
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter tasks based on view columns
  const todayString = currentTime.toISOString().split("T")[0];
  const tomorrowObj = new Date(currentTime.getTime() + 86400000);
  const tomorrowString = tomorrowObj.toISOString().split("T")[0];

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const todayTasks = filteredTasks.filter(t => t.deadline === todayString);
  const tomorrowTasks = filteredTasks.filter(t => t.deadline === tomorrowString);
  const upcomingTasks = filteredTasks.filter(t => t.deadline !== todayString && t.deadline !== tomorrowString);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] flex flex-col md:flex-row font-sans selection:bg-blue-100 relative">
      
      {/* Mobile Top Header (hidden on desktop) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
          </div>
          <div>
            <span className="font-bold text-base tracking-tight block">Orderly AI</span>
            <span className="text-[9px] text-indigo-600 font-mono tracking-widest uppercase block -mt-0.5">Personal Assistant</span>
          </div>
        </div>
        
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-black hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer Overlay & Content */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-350"
          ></div>
          
          {/* Drawer content */}
          <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 border-r border-slate-100 z-10 transition-transform duration-300 transform translate-x-0">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                </div>
                <span className="font-bold text-lg text-slate-900 font-sans">Menu</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-2 flex-1">
              <button 
                onClick={() => {
                  setActiveView("dashboard");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-3.5 rounded-xl flex items-center gap-3.5 font-semibold text-sm transition-all text-left ${
                  activeView === "dashboard" ? "bg-slate-100 text-black font-bold" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeView === "dashboard" ? "bg-blue-600" : "bg-transparent"}`}></span>
                Dashboard Grid
              </button>
              
              <button 
                onClick={() => {
                  setActiveView("calendar");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-3.5 rounded-xl flex items-center gap-3.5 font-semibold text-sm transition-all text-left ${
                  activeView === "calendar" ? "bg-slate-100 text-black font-bold" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeView === "calendar" ? "bg-blue-600" : "bg-transparent"}`}></span>
                Calendar Planner
              </button>

              <button 
                onClick={() => {
                  setActiveView("insights");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-3.5 rounded-xl flex items-center gap-3.5 font-semibold text-sm transition-all text-left ${
                  activeView === "insights" ? "bg-slate-100 text-black font-bold" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeView === "insights" ? "bg-blue-600" : "bg-transparent"}`}></span>
                Daily AI Review
              </button>
            </nav>

            {/* Real-time System Status HUD in mobile drawer */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/60 mt-auto">
              <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Assistant Active
              </p>
              <p className="text-xs text-blue-900 leading-relaxed font-mono">
                Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-xs text-blue-950 mt-1 leading-normal font-sans">
                Monitoring <span className="font-bold">{tasks.filter(t => !t.completed).length}</span> active tasks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. SIDEBAR Navigation (Visible on desktop only) */}
      <aside className="hidden md:flex md:w-64 bg-white md:border-r border-slate-200 flex-col p-6 shrink-0 z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight block">Orderly AI</span>
            <span className="text-[10px] text-indigo-600 font-mono tracking-widest uppercase">Personal Assistant</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <button 
            onClick={() => setActiveView("dashboard")}
            className={`p-3 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all text-left whitespace-nowrap ${
              activeView === "dashboard" ? "bg-slate-100 text-black" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeView === "dashboard" ? "bg-blue-600" : "bg-transparent"}`}></span>
            Dashboard Grid
          </button>
          
          <button 
            onClick={() => setActiveView("calendar")}
            className={`p-3 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all text-left whitespace-nowrap ${
              activeView === "calendar" ? "bg-slate-100 text-black" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeView === "calendar" ? "bg-blue-600" : "bg-transparent"}`}></span>
            Calendar Planner
          </button>

          <button 
            onClick={() => setActiveView("insights")}
            className={`p-3 rounded-xl flex items-center gap-3 font-semibold text-sm transition-all text-left whitespace-nowrap ${
              activeView === "insights" ? "bg-slate-100 text-black" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeView === "insights" ? "bg-blue-600" : "bg-transparent"}`}></span>
            Daily AI Review
          </button>
        </nav>

        {/* Real-time System Status HUD */}
        <div className="mt-auto p-4 bg-blue-50/50 rounded-2xl border border-blue-100/60">
          <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Assistant Active
          </p>
          <p className="text-xs text-blue-900 leading-relaxed font-mono">
            Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs text-blue-950 mt-1 leading-normal font-sans">
            Monitoring <span className="font-bold">{tasks.filter(t => !t.completed).length}</span> active deadlines.
          </p>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-light tracking-tight">
              Good day, <span className="font-semibold text-slate-900">User.</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              You completed <span className="font-semibold text-black">{completedCount}</span> out of <span className="font-semibold">{totalCount}</span> tasks today. Keep piloting.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Direct Focus Session Indicator */}
            {activeFocusTask && (isFocusTimerActive || isBreakTimerActive || isBreakPromptActive) && (
              <div 
                onClick={() => openFocusWorkspace(activeFocusTask)}
                className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-3 border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors animate-pulse"
                title="Click to open Focus Workspace Controls"
              >
                {isBreakActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-mono">Rest/Break: {Math.floor(breakTimerSeconds / 60)}:{(breakTimerSeconds % 60).toString().padStart(2, '0')}</span>
                  </>
                ) : isBreakPromptActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span className="text-xs font-sans font-semibold">Take a break?</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span className="text-xs font-mono">
                      Session Timer: {Math.floor(focusTimerSeconds / 60)}:{(focusTimerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent opening modal
                        setIsFocusTimerActive(false);
                      }} 
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                      title="Pause Session Timer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
            
            <button 
              onClick={() => {
                const modal = document.getElementById("manual-task-modal");
                if (modal) modal.style.display = "flex";
              }}
              className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Manual Add
            </button>
          </div>
        </header>



        {/* 3. NLU PARSER COMPONENT */}
        <div className="mb-8">
          <NLUInput 
            onTasksParsed={handleNLUTasksParsed} 
            isProcessing={isProcessing} 
            setIsProcessing={setIsProcessing} 
          />
        </div>

        {/* 4. VIEW RENDERING CONTENT */}
        {activeView === "dashboard" && (
          <div className="space-y-8">
            
            {/* QUICK STATS ROWS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Daily Progress */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Daily Completion</span>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-3xl font-extrabold">{progressPercent}%</span>
                    <span className="text-xs text-green-600 font-bold mb-1">
                      {completedCount} of {totalCount} done
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4">
                  <div className="bg-black h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>

              {/* Next Upcoming Alarm */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm col-span-1 lg:col-span-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Next Reminder</span>
                  {tasks.filter(t => !t.completed && t.alarmTime).length > 0 ? (
                    (() => {
                      const sorted = [...tasks]
                        .filter(t => !t.completed && t.alarmTime)
                        .sort((a, b) => new Date(a.alarmTime!).getTime() - new Date(b.alarmTime!).getTime());
                      const next = sorted[0];
                      return (
                        <div className="mt-2">
                          <p className="text-base font-semibold text-slate-900 line-clamp-1 flex items-center gap-2">
                            <AlarmClock className="w-4 h-4 text-blue-600 animate-bounce" />
                            {next.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Triggers at {new Date(next.alarmTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(next.alarmTime!).toLocaleDateString()})
                          </p>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-slate-500 mt-2">No alarms configured for remaining items.</p>
                  )}
                </div>
                <div className="mt-2 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md self-start font-mono">
                  TASK LIST: {tasks.filter(t => !t.completed).length} items
                </div>
              </div>

              {/* Streak Counter */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-amber-200 hover:shadow-md transition-all duration-350">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-amber-500/10 transition-colors duration-350"></div>
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-mono">Streak History</span>
                    <span className="text-[9px] bg-amber-100/70 text-amber-800 border border-amber-200/50 font-black px-2 py-0.5 rounded-full font-sans uppercase tracking-wider">
                      Activity Tracker
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shadow-sm group-hover:scale-110 group-hover:bg-amber-100 transition-all duration-300">
                      <Zap className="w-5.5 h-5.5 text-amber-500 fill-amber-500" />
                    </div>
                    <div>
                      <span className="text-xl font-extrabold font-sans tracking-tight block text-slate-900">
                        Current Streak: {getRealCurrentStreak()} {getRealCurrentStreak() === 1 ? "Day" : "Days"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono -mt-0.5 block">Consistent productivity</span>
                    </div>
                  </div>
                </div>
                
                {/* Visual weekly streak tracker circles */}
                <div className="mt-4 pt-3.5 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider font-mono block mb-2">Weekly Activity</span>
                  <div className="flex justify-between items-center gap-1.5">
                    {getWeekDaysActivity().map((day, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-[10px] font-bold text-slate-400 font-sans">{day.label}</span>
                        <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center text-[11px] font-black transition-all duration-300 ${
                          day.isCompleted 
                            ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30 scale-110" 
                            : "bg-slate-50 text-slate-400 border border-slate-200 font-sans hover:bg-slate-100"
                        }`}>
                          {day.isCompleted ? "✓" : "○"}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-3.5 font-medium font-sans flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Activity tracks completed tasks only.
                  </p>
                </div>
              </div>

            </div>

            {/* MAIN TASKS LIST & BREAKDOWN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Task Cards Column */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs uppercase tracking-widest font-bold text-slate-400">All Tasks</h2>
                  
                  {/* Search Bar */}
                  <input 
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono w-48"
                  />
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 font-mono text-sm">
                    No matching tasks found. Use Voice input or manual creation above.
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const borderClass = task.priority === 'urgent' 
                      ? 'minimal-border-urgent' 
                      : task.priority === 'high' 
                        ? 'minimal-border-high' 
                        : task.priority === 'medium'
                          ? 'minimal-border-medium'
                          : 'minimal-border-low';

                    const priorityBadgeColor = task.priority === 'urgent'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : task.priority === 'high'
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : task.priority === 'medium'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200';

                    const doneSteps = task.steps.filter(s => s.completed).length;
                    const totalSteps = task.steps.length;
                    const stepProgress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

                    return (
                      <div 
                        key={task.id} 
                        className={`bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all ${borderClass} ${task.completed ? 'opacity-70' : ''}`}
                      >
                        {/* Header details */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                          <div className="flex items-start gap-3">
                            <button 
                              onClick={() => toggleTaskCompleted(task.id)}
                              className="mt-0.5 text-slate-400 hover:text-black transition-colors shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-black" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-black" />
                              )}
                            </button>
                            <div>
                              <h3 className={`font-semibold text-lg text-slate-900 leading-tight ${task.completed ? 'line-through text-slate-400' : ''}`}>
                                {task.name}
                              </h3>
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${priorityBadgeColor}`}>
                                  {task.priority} Priority
                                </span>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                  {task.deadline} at {task.exactTime}
                                </span>
                                {task.alarmTime && (
                                  <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded">
                                    <AlarmClock className="w-3.5 h-3.5" />
                                    Alarm set
                                  </span>
                                )}
                              </div>
                              
                              {/* Focus mode progress display */}
                              {!task.completed && (
                                <div className="mt-2.5 bg-slate-50 border border-slate-100 p-2 rounded-xl flex items-center justify-between gap-4 max-w-sm">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-mono">Focus Progress</span>
                                    <span className="text-[11px] text-slate-600 font-semibold mt-0.5">
                                      Session {task.completedSessions || 0} of {task.totalSessions || 1} completed
                                    </span>
                                  </div>
                                  <div className="flex-1 max-w-[100px]">
                                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-indigo-600 h-full transition-all duration-300" 
                                        style={{ width: `${task.totalSessions ? Math.round(((task.completedSessions || 0) / task.totalSessions) * 100) : 0}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-[9px] text-slate-400 text-right block mt-0.5 font-mono">
                                      {task.totalSessions ? Math.round(((task.completedSessions || 0) / task.totalSessions) * 100) : 0}% Progress
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Countdown display */}
                          <div className="text-left sm:text-right shrink-0 bg-slate-50 p-2.5 rounded-2xl border border-slate-150 min-w-[120px]">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Time Left</p>
                            <p className={`font-mono text-base font-bold ${task.priority === 'urgent' && !task.completed ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
                              {getCountdownString(task)}
                            </p>
                          </div>
                        </div>

                        {/* Steps Checklist Breakdown */}
                        {task.steps.length > 0 && (
                          <div className="mt-4 pl-8 space-y-2.5 border-l border-slate-100">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Action Breakdown</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {task.steps.map((step) => (
                                <button
                                  key={step.id}
                                  onClick={() => toggleStepCompleted(task.id, step.id)}
                                  className={`text-left p-2.5 rounded-xl border text-xs flex items-start gap-2 transition-all ${
                                    step.completed
                                      ? "bg-slate-50 border-slate-200 text-slate-400 line-through"
                                      : "bg-white hover:bg-slate-50 border-slate-250 text-slate-800 font-medium shadow-sm"
                                  }`}
                                >
                                  <span className="mt-0.5">
                                    {step.completed ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-black shrink-0" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    )}
                                  </span>
                                  <span className="line-clamp-2 leading-relaxed">{step.text}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Strategic controls footer */}
                        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-xs italic text-indigo-600 font-mono flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5" />
                            AI Coach: {task.aiNote}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => openFocusWorkspace(task)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-sm transition-all"
                            >
                              <Zap className="w-3 h-3 text-amber-300" />
                              Start Working
                            </button>
                            <button
                              onClick={() => {
                                // Manual intervention / adaptation trigger
                                handleIgnoreOrSnooze(task);
                              }}
                              className="text-xs text-slate-400 hover:text-indigo-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
                              title="Trigger manual priority adaptation audit"
                            >
                              Snooze/Audit
                            </button>
                            <button 
                              onClick={() => deleteTask(task.id)}
                              className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Side Panels - Active Notifications & Actionable Alarms */}
              <div className="space-y-6">
                
                {/* 1. Contextual AI Smart Notifications Stream */}
                <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-col min-h-[380px]">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400 animate-pulse" />
                      <h3 className="font-display font-semibold text-sm">Contextual Notifications</h3>
                    </div>
                    <span className="text-[10px] bg-indigo-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-tight">
                      {notifications.filter(n => !n.read).length} new
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[320px] pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-12 italic">No contextual notifications logged.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-3 rounded-xl border text-xs relative ${
                            notif.type === 'critic' 
                              ? 'bg-rose-950/40 border-rose-900/50 text-rose-200' 
                              : notif.type === 'alarm'
                                ? 'bg-amber-950/40 border-amber-900/50 text-amber-200'
                                : notif.type === 'success'
                                  ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-200'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between mb-0.5">
                            <span>{notif.title}</span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="leading-relaxed text-slate-300">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <button 
                    onClick={() => setNotifications([])} 
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-xs font-semibold mt-3 transition-colors"
                  >
                    Clear Stream
                  </button>
                </div>

                {/* 2. Tactical Focus Sprint Card */}
                <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Focus Mode
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal mb-3">
                    Bypass procrastination instantly with a laser focus block. Select any task to quick start focus mode.
                  </p>
                  
                  {tasks.filter(t => !t.completed).length > 0 ? (
                    <select 
                      onChange={(e) => {
                        const task = tasks.find(t => t.id === e.target.value);
                        if (task) openFocusWorkspace(task);
                        e.target.value = ""; // Reset dropdown after selecting
                      }}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700 font-mono focus:outline-none"
                    >
                      <option value="">Select task...</option>
                      {tasks.filter(t => !t.completed).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No pending tasks for Focus Mode.</p>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}

        {/* CALENDAR VIEW */}
        {activeView === "calendar" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Chronological Deadline Planner</h2>
                <p className="text-slate-500 text-sm mt-0.5">Tasks synchronized in order of due dates.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Today */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-[520px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900 font-display flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    Today
                  </h3>
                  <span className="text-xs font-mono text-slate-400 font-bold">{todayTasks.length} items</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {todayTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-20">No tasks due today.</p>
                  ) : (
                    todayTasks.map(t => (
                      <div key={t.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-150 relative">
                        <div className="font-semibold text-sm mb-1.5 text-slate-900 line-clamp-2">{t.name}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-700">{t.exactTime}</span>
                          <span className="font-bold text-slate-700 capitalize">{t.priority}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tomorrow */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-[520px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900 font-display flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    Tomorrow
                  </h3>
                  <span className="text-xs font-mono text-slate-400 font-bold">{tomorrowTasks.length} items</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {tomorrowTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-20">No tasks due tomorrow.</p>
                  ) : (
                    tomorrowTasks.map(t => (
                      <div key={t.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-150 relative">
                        <div className="font-semibold text-sm mb-1.5 text-slate-900 line-clamp-2">{t.name}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-700">{t.exactTime}</span>
                          <span className="font-bold text-slate-700 capitalize">{t.priority}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-[520px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900 font-display flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    Upcoming Deadlines
                  </h3>
                  <span className="text-xs font-mono text-slate-400 font-bold">{upcomingTasks.length} items</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {upcomingTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-20">No upcoming items beyond tomorrow.</p>
                  ) : (
                    upcomingTasks.map(t => (
                      <div key={t.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-150 relative">
                        <div className="font-semibold text-sm mb-1 text-slate-900 line-clamp-2">{t.name}</div>
                        <div className="text-[10px] text-slate-400 mb-1.5 font-mono">{t.deadline} at {t.exactTime}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-bold text-slate-700 capitalize">{t.priority}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* INSIGHTS / DAILY AI REVIEW VIEW */}
        {activeView === "insights" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <h2 className="text-xl font-bold mb-1">Daily AI Task Review</h2>
              <p className="text-slate-500 text-sm mb-4">
                Orderly AI automatically critiques your daily focus, logs delayed tasks, and compiles an optimal plan for tomorrow.
              </p>

              <button 
                onClick={generateDailyReview}
                disabled={isReviewLoading}
                className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 flex items-center gap-2 shadow-sm"
              >
                <Brain className="w-4 h-4 animate-pulse" />
                {isReviewLoading ? "Consulting AI Assistant..." : "Conduct End-of-Day Review Now"}
              </button>
            </div>

            {dailyReview && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Score panel */}
                <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col justify-between min-h-[250px]">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest block mb-2">Completion Metrics</span>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                        <span className="text-slate-400">Successfully Completed:</span>
                        <span className="font-bold text-emerald-400 text-base">{dailyReview.completedCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                        <span className="text-slate-400">Delayed / Overdue:</span>
                        <span className="font-bold text-rose-400 text-base">{dailyReview.delayedCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Pending Trailing:</span>
                        <span className="font-bold text-blue-400 text-base">{dailyReview.pendingCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-slate-500 font-mono mt-4">
                    Generated: {new Date(dailyReview.generatedAt).toLocaleTimeString()}
                  </div>
                </div>

                {/* Sassy critique */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl md:col-span-2 shadow-sm">
                  <span className="text-[10px] text-indigo-600 font-mono tracking-widest font-bold uppercase block mb-1">AI Task Review</span>
                  <h3 className="font-display font-bold text-lg text-slate-900 mb-3">AI Assistant Evaluation</h3>
                  <p className="text-slate-700 text-sm leading-relaxed italic bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                    "{dailyReview.critique}"
                  </p>

                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-6 mb-3 font-mono">Suggested Protocol for Tomorrow</h4>
                  <ul className="space-y-2">
                    {dailyReview.planTomorrow.map((p, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* 5. MANUAL CREATE TASK MODAL */}
      <div 
        id="manual-task-modal" 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
        style={{ display: "none" }}
      >
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
          <button 
            type="button"
            onClick={() => {
              const modal = document.getElementById("manual-task-modal");
              if (modal) modal.style.display = "none";
            }}
            className="absolute top-4 right-4 text-slate-400 hover:text-black"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-bold text-slate-900 mb-1">Create Task</h2>
          <p className="text-xs text-slate-500 mb-4">Add a new task. Use AI to generate an actionable plan if desired.</p>

          <form onSubmit={(e) => {
            handleManualCreate(e);
            const modal = document.getElementById("manual-task-modal");
            if (modal) modal.style.display = "none";
          }} className="space-y-4">
            
            {/* Task Name */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Task Name</label>
              <input 
                type="text"
                placeholder="e.g. Prepare for chemistry exam"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                required
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            {/* Due Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Due Date</label>
                <input 
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  required
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Due Time</label>
                <input 
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  required
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>
            </div>

            {/* Task Planning Mode */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1.5 font-sans">Task Planning Mode</label>
              <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setPlanningMode("ai");
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    planningMode === "ai" 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  AI Generated Steps
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlanningMode("manual");
                    if (formSteps.length === 0) {
                      setFormSteps([{ id: `step-${Date.now()}-0`, text: "" }]);
                    }
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    planningMode === "manual" 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Manual Custom Steps
                </button>
              </div>
            </div>

            {/* Action Plan / Steps container */}
            <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/50 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-indigo-900 font-sans">Action Plan Breakdown</span>
                {planningMode === "ai" && (
                  <button
                    type="button"
                    onClick={handleGenerateAiPlan}
                    disabled={isGeneratingAiPlan || !manualName.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGeneratingAiPlan ? "Planning..." : "AI Plan"}
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {formSteps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-xs">
                    <span className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0">
                      {idx + 1}
                    </span>
                    <input 
                      type="text"
                      placeholder={`Step ${idx + 1} description`}
                      value={step.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormSteps(prev => prev.map(s => s.id === step.id ? { ...s, text: val } : s));
                      }}
                      className="w-full text-xs bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-slate-800 placeholder-slate-400 font-sans font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormSteps(prev => prev.filter(s => s.id !== step.id));
                      }}
                      className="text-slate-400 hover:text-rose-500 p-0.5"
                      title="Delete Step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {formSteps.length === 0 && (
                  <p className="text-xs text-slate-500 leading-normal py-1">
                    {planningMode === "ai" 
                      ? "Click the AI Plan button above to generate a list of actionable steps automatically."
                      : "No steps added yet. Click '+ Add Step' below to add a step."}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormSteps(prev => [...prev, { id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, text: "" }]);
                }}
                className="w-full py-1.5 border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-white text-indigo-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Step
              </button>
            </div>

            {/* Focus Session & Rounds Settings */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Focus Session Duration</label>
                <select 
                  value={manualFocusDuration}
                  onChange={(e) => setManualFocusDuration(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
                >
                  <option value="5">5 min</option>
                  <option value="10">10 min</option>
                  <option value="15">15 min</option>
                  <option value="25">25 min</option>
                  <option value="45">45 min</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Number of Sessions</label>
                <select 
                  value={manualSessions}
                  onChange={(e) => setManualSessions(parseInt(e.target.value))}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
                >
                  <option value={1}>1 session</option>
                  <option value={2}>2 sessions</option>
                  <option value={3}>3 sessions</option>
                  <option value={4}>4 sessions</option>
                </select>
              </div>
            </div>

            {manualFocusDuration === "custom" && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Custom Duration (minutes)</label>
                <input 
                  type="number"
                  min="1"
                  max="180"
                  placeholder="e.g. 25"
                  value={manualFocusCustom}
                  onChange={(e) => setManualFocusCustom(e.target.value)}
                  required
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans font-medium"
                />
              </div>
            )}

            {/* Alarm Settings */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Alarm Settings</label>
                <select 
                  value={manualAlarmMinutesBefore}
                  onChange={(e) => setManualAlarmMinutesBefore(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
                >
                  <option value="5">5 min before</option>
                  <option value="15">15 min before</option>
                  <option value="30">30 min before</option>
                  <option value="60">1 hour before</option>
                  <option value="custom">custom reminder time</option>
                </select>
              </div>

              {manualAlarmMinutesBefore === "custom" && (
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Custom Reminder Time</label>
                  <input 
                    type="datetime-local"
                    value={manualCustomReminderTime}
                    onChange={(e) => setManualCustomReminderTime(e.target.value)}
                    required
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              )}
            </div>

            {/* Snooze Settings Row */}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Snooze Settings</label>
                <select
                  value={manualAllowSnooze ? "on" : "off"}
                  onChange={(e) => setManualAllowSnooze(e.target.value === "on")}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
                >
                  <option value="on">allow snooze on</option>
                  <option value="off">allow snooze off</option>
                </select>
              </div>

              {manualAllowSnooze && (
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Max Snooze Count</label>
                  <select
                    value={manualMaxSnoozeCount}
                    onChange={(e) => setManualMaxSnoozeCount(e.target.value as any)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
                  >
                    <option value="1">1</option>
                    <option value="3">3</option>
                    <option value="5">5</option>
                    <option value="unlimited">unlimited</option>
                  </select>
                </div>
              )}
            </div>

            {/* Snooze Duration & Alert Type Row */}
            <div className="grid grid-cols-2 gap-3">
              {manualAllowSnooze && (
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Snooze Duration</label>
                  <select
                    value={manualSnoozeDuration}
                    onChange={(e) => setManualSnoozeDuration(e.target.value as any)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
                  >
                    <option value="5">5 min</option>
                    <option value="10">10 min</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Alert Type</label>
                <select
                  value={manualAlertType}
                  onChange={(e) => setManualAlertType(e.target.value as any)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
                >
                  <option value="sound">sound</option>
                  <option value="vibrate">vibrate</option>
                  <option value="sound + vibrate">sound + vibrate</option>
                  <option value="silent">silent notification</option>
                </select>
              </div>
            </div>

            {/* Repeated Alert */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 font-sans">Repeated Alert</label>
              <select
                value={manualRepeatedAlert}
                onChange={(e) => setManualRepeatedAlert(e.target.value as any)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 font-sans"
              >
                <option value="once">ring once</option>
                <option value="2">repeat every 2 minutes</option>
                <option value="5">repeat every 5 minutes</option>
                <option value="until_complete">repeat until task marked complete</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white font-bold text-sm py-3 rounded-xl hover:bg-slate-800 transition-colors mt-6 shadow-sm"
            >
              Create Task
            </button>
          </form>
        </div>
      </div>

      {/* 6. ALARM TRIGGER MODAL */}
      {alarmFiringTask && (
        <div className="fixed inset-0 bg-red-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-red-200 shadow-2xl w-full max-w-lg p-8 text-center relative overflow-hidden">
            
            {/* Visual emergency light */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />

            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlarmClock className="w-8 h-8 text-red-600 animate-bounce" />
            </div>

            <span className="text-[10px] uppercase tracking-widest font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
              Task Deadline Reminder
            </span>

            <h2 className="text-2xl font-bold text-slate-900 mt-4 mb-2">{alarmFiringTask.name}</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              You are scheduled to accomplish this today by <span className="font-semibold text-slate-900">{alarmFiringTask.exactTime}</span>. Let's make an immediate strategic move.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => openFocusWorkspace(alarmFiringTask)}
                className="bg-black hover:bg-slate-800 text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                Start Working
              </button>
              
              <button
                onClick={() => handleIgnoreOrSnooze(alarmFiringTask)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-sm py-3.5 rounded-xl"
              >
                Snooze/Ignore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOCUS CONTROL MODAL */}
      <FocusControlModal
        isOpen={showFocusModal}
        onClose={() => setShowFocusModal(false)}
        task={focusSetupTask}
        onStartFocus={handleStartFocusWorkspace}
        activeFocusTask={activeFocusTask}
        focusTimerSeconds={focusTimerSeconds}
        isFocusTimerActive={isFocusTimerActive}
        isBreakActive={isBreakActive}
        breakTimerSeconds={breakTimerSeconds}
        isBreakTimerActive={isBreakTimerActive}
        isBreakPromptActive={isBreakPromptActive}
        onStartTimer={handleStartTimer}
        onPauseTimer={handlePauseTimer}
        onResetTimer={handleResetTimer}
        onCompleteSessionManual={handleCompleteSessionManual}
        onSelectBreak={handleSelectBreak}
        onSkipBreak={handleSkipBreak}
        focusHistory={focusHistory}
        onClearHistory={handleClearFocusHistory}
      />

    </div>
  );
}
