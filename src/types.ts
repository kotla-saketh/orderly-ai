export interface Step {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  name: string;
  deadline: string; // ISO Date String (e.g. "2026-06-30")
  exactTime: string; // "HH:MM" (e.g. "20:00")
  alarmTime: string | null; // ISO Date String for alarm trigger (e.g. "2026-06-30T18:00:00.000Z")
  completed: boolean;
  completedAt: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  steps: Step[];
  ignoredCount: number; // Tracks times ignored/snoozed/missed
  quickStartMode: boolean; // True if AI suggests 10-minute focus
  quickStartTimerSeconds: number | null; // 600 seconds focus countdown
  createdAt: string;
  aiNote: string; // Adaptive AI advice/status note
  
  // New user-friendly alarm & snooze configuration
  alarmMinutesBefore?: string; // "5", "15", "30", "60", "custom"
  customAlarmTime?: string; // ISO date string or user string
  allowSnooze?: boolean;
  maxSnoozeCount?: '1' | '3' | '5' | 'unlimited';
  snoozeDuration?: '5' | '10' | '15' | '30';
  alertType?: 'sound' | 'vibrate' | 'sound + vibrate' | 'silent';
  repeatedAlert?: 'once' | '2' | '5' | 'until_complete';
  
  // Sprint settings and tracking
  focusDuration?: number; // duration in minutes
  totalSessions?: number; // total focus rounds/sessions
  completedSessions?: number; // completed focus rounds/sessions
}

export interface SmartNotification {
  id: string;
  taskId?: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'success' | 'alarm' | 'critic';
  timestamp: string;
  read: boolean;
}

export interface DailyReview {
  date: string;
  completedCount: number;
  delayedCount: number;
  pendingCount: number;
  critique: string; // Motivational, sassy critique
  planTomorrow: string[]; // Sequential schedule for tomorrow
  generatedAt: string;
}
