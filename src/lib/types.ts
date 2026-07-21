export type Priority = "quick" | "normal" | "focused";
export type Difficulty = "easy" | "medium" | "hard";
export type TaskStatus = "pending" | "in-progress" | "completed";
export type FlowStatus = "active" | "completed";
export type AccentColor = "indigo" | "emerald" | "sky" | "rose" | "amber" | "violet";
export type Language = "en" | "zh";
export type ShuffleMode = "this-flow" | "mixer" | "world" | "ai";
export type Recurrence =
  | { kind: "one-time" }
  | { kind: "daily" }
  | { kind: "weekly"; weekdays: number[] }
  | { kind: "interval"; days: number };

export interface Step {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  isCompleted: boolean;
}

export interface ResumeContext {
  header: string;
  bullets: string[];
  generatedAt: number;
}

export interface RunSessionContext {
  taskId: string;
  stepId: string;
  remainingSeconds: number;
  paused: boolean;
  savedAt: number;
}

export interface Task {
  id: string;
  title: string;
  emoji: string;
  status: TaskStatus;
  priority: Priority;
  difficulty?: Difficulty;
  steps: Step[];
  resumeContext?: ResumeContext;
  isRecurring: boolean;
  recurrence: Recurrence;
  nextAvailableDate?: string;
  lastCompletedAt?: number;
}

export interface Flow {
  id: string;
  title: string;
  emoji: string;
  tags: string[];
  tasks: Task[];
  totalDurationMinutes: number;
  progress: number;
  isRecurring: boolean;
  status: FlowStatus;
  color?: AccentColor;
  /** Cumulative real focus minutes spent across sessions */
  actualMinutesSpent?: number;
  /** Number of times this flow has been fully completed */
  completionCount?: number;
  /** Recent focus sessions for this flow (newest last) */
  sessions?: { ts: number; minutes: number }[];
  /** Exact position of the most recent unfinished focus session */
  lastSessionContext?: RunSessionContext;
  createdAt: number;
  updatedAt: number;
}

export interface DayStats {
  tasksCompleted: number;
  focusMinutes: number;
}
export type DailyStats = Record<string, DayStats>;

export interface Settings {
  accentColor: AccentColor;
  defaultChimeMinutes: number;
  skipIntervalSetup: boolean;
  language: Language | null;
  onboardingSeen: boolean;
  shuffleMode: ShuffleMode | null;
  defaultDetailLevel: number; // 1..5 (legacy)
  defaultDifficulty: Difficulty;
}

export interface AppData {
  flows: Flow[];
  stats: DailyStats;
  settings: Settings;
}
