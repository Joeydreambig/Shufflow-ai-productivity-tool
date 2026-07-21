import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AccentColor,
  AppData,
  DailyStats,
  Flow,
  Language,
  Settings,
  ShuffleMode,
  Step,
  Task,
  RunSessionContext,
} from "./types";
import { computeFlowProgress, refreshRecurring, todayKey, totalDuration } from "./utils-flow";

const defaultSettings: Settings = {
  accentColor: "indigo",
  defaultChimeMinutes: 20,
  skipIntervalSetup: false,
  language: null,
  onboardingSeen: false,
  shuffleMode: null,
  defaultDetailLevel: 3,
  defaultDifficulty: "medium",
};

interface State extends AppData {
  hydrated: boolean;
  bootstrap: () => void;
  upsertFlow: (flow: Flow) => void;
  renameFlow: (flowId: string, title: string) => void;
  deleteFlow: (id: string) => void;
  setStep: (flowId: string, taskId: string, stepId: string, patch: Partial<Step>) => void;
  setTask: (flowId: string, taskId: string, patch: Partial<Task>) => void;
  recomputeFlow: (flowId: string) => void;
  logSession: (focusMinutes: number, completedTask: boolean) => void;
  addFlowMinutes: (flowId: string, minutes: number) => void;
  bumpFlowCompletion: (flowId: string) => void;
  saveRunContext: (flowId: string, context?: RunSessionContext) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setAccent: (c: AccentColor) => void;
  setLanguage: (l: Language) => void;
  setShuffleMode: (m: ShuffleMode) => void;
  reset: () => void;
}

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      flows: [],
      stats: {} as DailyStats,
      settings: defaultSettings,
      hydrated: false,

      bootstrap: () => {
        const flows = refreshRecurring(get().flows);
        // Migrate settings with new fields
        const settings = { ...defaultSettings, ...get().settings };
        set({ flows, settings, hydrated: true });
      },

      upsertFlow: (flow) =>
        set((s) => {
          const idx = s.flows.findIndex((f) => f.id === flow.id);
          const next = { ...flow, updatedAt: Date.now() };
          const { progress } = computeFlowProgress(next);
          next.progress = progress;
          next.totalDurationMinutes = totalDuration(next);
          const flows =
            idx >= 0 ? s.flows.map((f, i) => (i === idx ? next : f)) : [next, ...s.flows];
          return { flows };
        }),

      renameFlow: (flowId, title) =>
        set((s) => ({
          flows: s.flows.map((flow) =>
            flow.id === flowId ? { ...flow, title, updatedAt: Date.now() } : flow,
          ),
        })),

      deleteFlow: (id) => set((s) => ({ flows: s.flows.filter((f) => f.id !== id) })),

      setStep: (flowId, taskId, stepId, patch) =>
        set((s) => ({
          flows: s.flows.map((f) => {
            if (f.id !== flowId) return f;
            const next = {
              ...f,
              tasks: f.tasks.map((t) =>
                t.id !== taskId
                  ? t
                  : {
                      ...t,
                      steps: t.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)),
                    },
              ),
              updatedAt: Date.now(),
            };
            const { progress } = computeFlowProgress(next);
            return { ...next, progress, totalDurationMinutes: totalDuration(next) };
          }),
        })),

      setTask: (flowId, taskId, patch) =>
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id !== flowId
              ? f
              : { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) },
          ),
        })),

      recomputeFlow: (flowId) =>
        set((s) => ({
          flows: s.flows.map((f) => {
            if (f.id !== flowId) return f;
            const { progress } = computeFlowProgress(f);
            const allDone = f.tasks.length > 0 && f.tasks.every((t) => t.status === "completed");
            return {
              ...f,
              progress,
              totalDurationMinutes: totalDuration(f),
              status: allDone && !f.isRecurring ? "completed" : "active",
              updatedAt: Date.now(),
            };
          }),
        })),

      logSession: (focusMinutes, completedTask) =>
        set((s) => {
          const k = todayKey();
          const prev = s.stats[k] ?? { tasksCompleted: 0, focusMinutes: 0 };
          return {
            stats: {
              ...s.stats,
              [k]: {
                tasksCompleted: prev.tasksCompleted + (completedTask ? 1 : 0),
                focusMinutes: prev.focusMinutes + Math.max(0, Math.round(focusMinutes)),
              },
            },
          };
        }),

      addFlowMinutes: (flowId, minutes) =>
        set((s) => ({
          flows: s.flows.map((f) => {
            if (f.id !== flowId) return f;
            const m = Math.max(0, minutes);
            if (m < 0.05) return f;
            const sessions = [...(f.sessions ?? []), { ts: Date.now(), minutes: m }].slice(-50);
            return {
              ...f,
              actualMinutesSpent: (f.actualMinutesSpent ?? 0) + m,
              sessions,
            };
          }),
        })),

      bumpFlowCompletion: (flowId) =>
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === flowId ? { ...f, completionCount: (f.completionCount ?? 0) + 1 } : f,
          ),
        })),

      saveRunContext: (flowId, context) =>
        set((s) => ({
          flows: s.flows.map((f) =>
            f.id === flowId ? { ...f, lastSessionContext: context, updatedAt: Date.now() } : f,
          ),
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setAccent: (c) => set((s) => ({ settings: { ...s.settings, accentColor: c } })),
      setLanguage: (l) => set((s) => ({ settings: { ...s.settings, language: l } })),
      setShuffleMode: (m) => set((s) => ({ settings: { ...s.settings, shuffleMode: m } })),

      reset: () => set({ flows: [], stats: {}, settings: defaultSettings }),
    }),
    {
      name: "shufflow:v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as never),
      ),
      partialize: (s) => ({ flows: s.flows, stats: s.stats, settings: s.settings }),
      onRehydrateStorage: () => (state) => {
        queueMicrotask(() => state?.bootstrap());
      },
    },
  ),
);
