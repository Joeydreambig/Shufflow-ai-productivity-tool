import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  History,
  Home,
  Pause,
  Play,
  Settings as SettingsIcon,
  SkipForward,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import type { Flow, ShuffleMode, Step, Task } from "@/lib/types";
import { colorForFlow, computeFlowProgress } from "@/lib/utils-flow";
import { Cube, type CubePieceState } from "@/components/cube/Cube";
import { SwipeSurface } from "@/components/SwipeSurface";
import { ThemeApplier } from "@/components/ThemeApplier";
import { useT, getLang } from "@/lib/i18n";
import {
  sessionSummary,
  shuffleReason as shuffleReasonFn,
  summarizeProgress,
  workLifeBalance,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/flows/$flowId/run")({
  head: () => ({
    meta: [
      { title: "Focus session — Shufflow" },
      { name: "description", content: "A guided focus session with chime and shuffle." },
    ],
  }),
  component: RunPage,
});

type Phase = "running" | "summary";

function RunPage() {
  const { flowId } = useParams({ from: "/flows/$flowId/run" });
  const navigate = useNavigate();
  const t = useT();

  const flows = useAppStore((s) => s.flows);
  const hydrated = useAppStore((s) => s.hydrated);
  const settings = useAppStore((s) => s.settings);
  const setStep = useAppStore((s) => s.setStep);
  const setTask = useAppStore((s) => s.setTask);
  const recompute = useAppStore((s) => s.recomputeFlow);
  const logSession = useAppStore((s) => s.logSession);

  const flow = flows.find((f) => f.id === flowId);
  const accent = flow ? colorForFlow(flow) : null;

  const [phase, setPhase] = useState<Phase>("running");
  const chimeMin = settings.defaultChimeMinutes;
  const [sessionMetrics, setSessionMetrics] = useState<{
    focusMin: number;
    stepsDone: string[];
    shuffles: number;
    chimes: number;
    tasksDone: number;
    flowDone: boolean;
  }>({ focusMin: 0, stepsDone: [], shuffles: 0, chimes: 0, tasksDone: 0, flowDone: false });

  if (!hydrated) {
    return (
      <div className="object-loading" role="status" aria-label="Loading Flow">
        <span />
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t("flow_not_found")}</p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="mt-4 h-11 px-5 rounded-2xl bg-brand text-brand-foreground"
        >
          {t("back_home")}
        </button>
      </div>
    );
  }

  return (
    <div data-accent={accent ?? undefined}>
      <ThemeApplier override={accent} />
      {phase === "summary" && (
        <SummaryView
          flow={flow}
          metrics={sessionMetrics}
          onHome={() => navigate({ to: "/" })}
          onContinue={() => setPhase("running")}
        />
      )}
      {phase === "running" && (
        <RunEngine
          flow={flow}
          chimeMin={chimeMin}
          setStep={setStep}
          setTask={setTask}
          recompute={recompute}
          logSession={logSession}
          onComplete={(m) => {
            setSessionMetrics(m);
            setPhase("summary");
          }}
          onExit={(m) => {
            setSessionMetrics(m);
            setPhase("summary");
          }}
        />
      )}
    </div>
  );
}

interface SessionMetrics {
  focusMin: number;
  stepsDone: string[];
  shuffles: number;
  chimes: number;
  tasksDone: number;
  flowDone: boolean;
}

type TaskHistoryEntry = {
  flowId: string;
  taskId: string;
  stepId: string;
  remaining: number;
  paused: boolean;
};

const TASK_HISTORY_KEY = "shufflow:run-task-history";

function readTaskHistory(): TaskHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(sessionStorage.getItem(TASK_HISTORY_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/* ---------- Run engine ---------- */
function RunEngine({
  flow,
  chimeMin,
  setStep,
  setTask,
  recompute,
  logSession,
  onComplete,
  onExit,
}: {
  flow: Flow;
  chimeMin: number;
  setStep: (fId: string, tId: string, sId: string, p: Partial<Step>) => void;
  setTask: (fId: string, tId: string, p: Partial<Task>) => void;
  recompute: (fId: string) => void;
  logSession: (m: number, completedTask: boolean) => void;
  onComplete: (m: SessionMetrics) => void;
  onExit: (m: SessionMetrics) => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const setShuffleMode = useAppStore((s) => s.setShuffleMode);
  const addFlowMinutes = useAppStore((s) => s.addFlowMinutes);
  const bumpFlowCompletion = useAppStore((s) => s.bumpFlowCompletion);
  const saveRunContext = useAppStore((s) => s.saveRunContext);

  // start task — honor sessionStorage hint from flow detail
  const initial = useMemo(() => {
    if (typeof window !== "undefined") {
      const want = sessionStorage.getItem("startTaskId");
      if (want) {
        sessionStorage.removeItem("startTaskId");
        const task = flow.tasks.find((tk) => tk.id === want && tk.status !== "completed");
        const saved = flow.lastSessionContext;
        const savedStep = task?.steps.find(
          (candidate) => candidate.id === saved?.stepId && !candidate.isCompleted,
        );
        if (task && saved?.taskId === task.id && savedStep) {
          return {
            taskId: task.id,
            stepId: savedStep.id,
            remaining: saved.remainingSeconds,
            paused: saved.paused,
          };
        }
        const step = task?.steps.find((s) => !s.isCompleted);
        if (task && step) return { taskId: task.id, stepId: step.id, paused: false };
      }
    }
    const saved = flow.lastSessionContext;
    const savedTask = flow.tasks.find(
      (candidate) => candidate.id === saved?.taskId && candidate.status !== "completed",
    );
    const savedStep = savedTask?.steps.find(
      (candidate) => candidate.id === saved?.stepId && !candidate.isCompleted,
    );
    if (saved && savedTask && savedStep) {
      return {
        taskId: savedTask.id,
        stepId: savedStep.id,
        remaining: saved.remainingSeconds,
        paused: saved.paused,
      };
    }
    const first = firstActive(flow);
    return first ? { ...first, paused: false } : null;
  }, [flow]);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(initial?.taskId ?? null);
  const [activeStepId, setActiveStepId] = useState<string | null>(initial?.stepId ?? null);

  const summarize = useServerFn(summarizeProgress);
  const reasonFn = useServerFn(shuffleReasonFn);
  const balanceFn = useServerFn(workLifeBalance);

  const task = flow.tasks.find((tk) => tk.id === activeTaskId) ?? null;
  const step = task?.steps.find((s) => s.id === activeStepId) ?? null;

  const [paused, setPaused] = useState(initial?.paused ?? false);
  const [remaining, setRemaining] = useState(() =>
    initial?.remaining !== undefined ? initial.remaining : step ? step.durationMinutes * 60 : 0,
  );
  const total = step ? step.durationMinutes * 60 : 0;

  // metrics
  const metricsRef = useRef<SessionMetrics>({
    focusMin: 0,
    stepsDone: [],
    shuffles: 0,
    chimes: 0,
    tasksDone: 0,
    flowDone: false,
  });
  const easyDoneRef = useRef<number>(0);
  const focusAccRef = useRef<number>(0);
  const lastChimeRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());
  const [chimeRemaining, setChimeRemaining] = useState<number>(chimeMin * 60);

  // history of step transitions for undo
  const historyRef = useRef<{ taskId: string; stepId: string; remaining: number }[]>([]);
  const taskHistoryRef = useRef<TaskHistoryEntry[]>(readTaskHistory());
  const restoreTaskStateRef = useRef<{ stepId: string; remaining: number; paused: boolean } | null>(
    null,
  );
  const sessionPositionRef = useRef({
    taskId: activeTaskId,
    stepId: activeStepId,
    remaining,
    paused,
  });
  const sessionFinishedRef = useRef(false);
  sessionPositionRef.current = { taskId: activeTaskId, stepId: activeStepId, remaining, paused };

  const persistTaskHistory = useCallback(() => {
    sessionStorage.setItem(TASK_HISTORY_KEY, JSON.stringify(taskHistoryRef.current));
  }, []);

  const persistRunPosition = useCallback(() => {
    const position = sessionPositionRef.current;
    if (sessionFinishedRef.current || !position.taskId || !position.stepId) return;
    saveRunContext(flow.id, {
      taskId: position.taskId,
      stepId: position.stepId,
      remainingSeconds: Math.round(position.remaining),
      paused: position.paused,
      savedAt: Date.now(),
    });
  }, [flow.id, saveRunContext]);

  useEffect(() => {
    const persist = () => persistRunPosition();
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [persistRunPosition]);

  // Overtime: timer keeps running past zero; prompt user once.
  const [overtimeOpen, setOvertimeOpen] = useState(false);
  const overtimeShownRef = useRef<string | null>(null);

  // Reset timer on step change
  useEffect(() => {
    const restore = restoreTaskStateRef.current;
    if (restore && restore.stepId === step?.id) {
      restoreTaskStateRef.current = null;
      setRemaining(restore.remaining);
      setPaused(restore.paused);
      setOvertimeOpen(false);
      return;
    }
    setRemaining(step ? step.durationMinutes * 60 : 0);
    setPaused(false);
    setOvertimeOpen(false);
  }, [activeStepId, step]);

  // Timer
  useEffect(() => {
    if (paused || !step) return;
    lastTickRef.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      focusAccRef.current += dt;
      lastChimeRef.current += dt;
      const remainTilChime = chimeMin * 60 - lastChimeRef.current;
      setChimeRemaining(Math.max(0, Math.round(remainTilChime)));
      if (remainTilChime <= 0) {
        lastChimeRef.current = 0;
        metricsRef.current.chimes += 1;
        chime();
        toast(`${t("chime_toast_title")} · ${Math.round(focusAccRef.current / 60)}m`, {
          description: t("chime_toast_sub"),
          duration: 5000,
        });
      }
      setRemaining((r) => {
        const nr = r - dt;
        // Trigger overtime prompt the first time we cross zero on this step
        if (r > 0 && nr <= 0 && step && overtimeShownRef.current !== step.id) {
          overtimeShownRef.current = step.id;
          setOvertimeOpen(true);
          chime();
        }
        return nr;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [paused, step, chimeMin, t]);

  // Resume briefing
  const [briefing, setBriefing] = useState<{ header: string; bullets: string[] } | null>(null);
  useEffect(() => {
    if (task?.resumeContext && task.status === "in-progress") {
      setBriefing(task.resumeContext);
    }
  }, [task?.id, task?.status, task?.resumeContext]);

  // Pre-fetched shuffle target
  const preparedRef = useRef<{
    flowId: string;
    taskId: string;
    reason?: string;
  } | null>(null);
  const [shuffleNotice, setShuffleNotice] = useState<{ task: string; step: string } | null>(null);
  const allFlowsState = useAppStore((s) => s.flows);
  const prepareNext = useCallback(
    async (overrideMode?: ShuffleMode) => {
      if (!task) return;
      const mode = overrideMode ?? settings.shuffleMode ?? "this-flow";
      preparedRef.current = null;
      const ranked = rankCandidates(allFlowsState, flow, task, mode, easyDoneRef.current).slice(
        0,
        8,
      );
      if (!ranked.length) return;
      try {
        const result = await balanceFn({
          data: {
            current: task.title,
            currentDifficulty: task.difficulty,
            candidates: ranked.map((candidate) => ({
              id: `${candidate.flowId}::${candidate.taskId}`,
              title: candidate.task.title,
              priority: candidate.task.priority,
              difficulty: candidate.task.difficulty,
              nextStepMinutes: candidate.step.durationMinutes,
            })),
            lang: getLang(),
          },
        });
        const chosen = result.picks[0];
        const [flowId, taskId] = chosen.taskId.split("::");
        if (
          ranked.some((candidate) => candidate.flowId === flowId && candidate.taskId === taskId)
        ) {
          preparedRef.current = { flowId, taskId, reason: chosen.reason };
          return;
        }
      } catch {
        /* fall through to a safe local recommendation */
      }
      const fallback = ranked[0];
      let reason: string | undefined;
      try {
        const result = await reasonFn({
          data: { from: task.title, to: fallback.task.title, lang: getLang() },
        });
        reason = result.reason;
      } catch {
        /* local explanation is added when the gesture completes */
      }
      preparedRef.current = {
        flowId: fallback.flowId,
        taskId: fallback.taskId,
        reason,
      };
    },
    [task, settings.shuffleMode, allFlowsState, flow, balanceFn, reasonFn],
  );

  useEffect(() => {
    void prepareNext();
  }, [prepareNext]);

  // Helper: flush accumulated focus time to flow + metrics
  const flushFocus = useCallback(() => {
    const m = focusAccRef.current / 60;
    if (m > 0) {
      metricsRef.current.focusMin += m;
      addFlowMinutes(flow.id, m);
    }
    focusAccRef.current = 0;
  }, [addFlowMinutes, flow.id]);

  /* Transition helper */
  const switchTo = useCallback(
    async (toFlowId: string, toTaskId: string, reason?: string) => {
      if (task && task.status === "in-progress") {
        const completed = task.steps.filter((s) => s.isCompleted).map((s) => s.title);
        try {
          const sum = await summarize({
            data: { taskTitle: task.title, completedSteps: completed, lang: getLang() },
          });
          setTask(flow.id, task.id, { resumeContext: { ...sum, generatedAt: Date.now() } });
        } catch {
          /* ignore */
        }
      }
      flushFocus();
      logSession(0, false);
      metricsRef.current.shuffles += 1;

      const targetFlow = useAppStore.getState().flows.find((f) => f.id === toFlowId);
      const targetTask = targetFlow?.tasks.find((tk) => tk.id === toTaskId);
      const targetStep = targetTask?.steps.find((candidateStep) => !candidateStep.isCompleted);
      if (targetTask && targetStep) {
        setShuffleNotice({ task: targetTask.title, step: targetStep.title });
        window.setTimeout(() => setShuffleNotice(null), 5200);
      }
      if (reason && targetTask) {
        toast(`${t("shuffled_to")} ${targetTask.title}`, {
          description: reason,
          icon: "🎲",
          duration: 6000,
        });
      } else if (targetTask) {
        toast(`${t("shuffled_to")} ${targetTask.title}`, { icon: "🎲" });
      }

      if (targetTask && targetStep) {
        taskHistoryRef.current.push({
          flowId: flow.id,
          taskId: task!.id,
          stepId: step!.id,
          remaining: Math.round(remaining),
          paused,
        });
        persistTaskHistory();
      }

      if (toFlowId !== flow.id) {
        persistRunPosition();
        window.location.assign(`/flows/${toFlowId}/run`);
        return;
      }
      const nextStep = targetTask?.steps.find((s) => !s.isCompleted);
      if (nextStep) {
        historyRef.current.push({
          taskId: task!.id,
          stepId: step!.id,
          remaining: Math.round(remaining),
        });
        setActiveTaskId(toTaskId);
        setActiveStepId(nextStep.id);
      }
    },
    [
      task,
      flow.id,
      summarize,
      setTask,
      logSession,
      flushFocus,
      t,
      remaining,
      step,
      paused,
      persistRunPosition,
      persistTaskHistory,
    ],
  );

  // Shuffle action
  const [showModeMenu, setShowModeMenu] = useState(false);

  const triggerShuffle = useCallback(async () => {
    const mode = settings.shuffleMode ?? "this-flow";
    const localReason = () => {
      if (mode === "this-flow") return t("reason_this_flow");
      if (mode === "mixer") return t("reason_mixer");
      if (mode === "world") return t("reason_world");
      return t("reason_quick");
    };
    const cand = preparedRef.current;
    if (cand) {
      preparedRef.current = null;
      await switchTo(cand.flowId, cand.taskId, cand.reason ?? localReason());
      void prepareNext();
      return;
    }
    // live fallback
    if (mode === "ai") {
      const ranked = rankCandidates(allFlowsState, flow, task!, "world", easyDoneRef.current);
      if (!ranked.length) return toast.error(t("no_others"));
      const topRanked = ranked.slice(0, 8);
      const candidates = topRanked.map((r) => ({
        id: `${r.flowId}::${r.taskId}`,
        title: r.task.title,
        priority: r.task.priority,
        difficulty: r.task.difficulty,
        nextStepMinutes: r.step.durationMinutes,
      }));
      try {
        const res = await balanceFn({
          data: {
            current: task!.title,
            currentDifficulty: task!.difficulty,
            candidates,
            lang: getLang(),
          },
        });
        const chosen = res.picks[Math.floor(Math.random() * res.picks.length)];
        const [fId, tId] = chosen.taskId.split("::");
        await switchTo(fId, tId, chosen.reason ?? localReason());
      } catch {
        const fallback = pickCandidate(allFlowsState, flow, task!, "world", easyDoneRef.current);
        if (fallback) await switchTo(fallback.flowId, fallback.taskId, localReason());
      }
    } else {
      const c = pickCandidate(allFlowsState, flow, task!, mode, easyDoneRef.current);
      if (!c) return toast.error(t("no_others"));
      await switchTo(c.flowId, c.taskId, localReason());
    }
    void prepareNext();
  }, [settings.shuffleMode, switchTo, prepareNext, balanceFn, allFlowsState, flow, task, t]);

  const returnPreviousTask = useCallback(() => {
    const previous = taskHistoryRef.current.pop();
    if (!previous) {
      toast(t("no_previous_task"));
      return;
    }
    persistTaskHistory();
    flushFocus();
    if (previous.flowId !== flow.id) {
      sessionStorage.setItem("startTaskId", previous.taskId);
      window.location.assign(`/flows/${previous.flowId}/run`);
      return;
    }
    restoreTaskStateRef.current = {
      stepId: previous.stepId,
      remaining: previous.remaining,
      paused: previous.paused,
    };
    setActiveTaskId(previous.taskId);
    setActiveStepId(previous.stepId);
  }, [flow.id, flushFocus, persistTaskHistory, t]);

  const markStepDone = useCallback(() => {
    if (!task || !step) return;
    metricsRef.current.stepsDone.push(step.title);
    setStep(flow.id, task.id, step.id, { isCompleted: true });
    if (task.status === "pending") setTask(flow.id, task.id, { status: "in-progress" });
    const idx = task.steps.findIndex((s) => s.id === step.id);
    const next = task.steps.slice(idx + 1).find((s) => !s.isCompleted);
    if (next) {
      historyRef.current.push({ taskId: task.id, stepId: step.id, remaining: 0 });
      setActiveStepId(next.id);
    } else {
      const nextTaskInfo = nextActiveAfter(flow, task.id);
      setTask(flow.id, task.id, {
        status: "completed",
        lastCompletedAt: Date.now(),
        nextAvailableDate: task.isRecurring ? nextDate(task) : undefined,
      });
      metricsRef.current.tasksDone += 1;
      if (task.difficulty === "easy") easyDoneRef.current += 1;
      flushFocus();
      logSession(0, true);
      recompute(flow.id);
      if (nextTaskInfo) {
        historyRef.current.push({ taskId: task.id, stepId: step.id, remaining: 0 });
        setActiveTaskId(nextTaskInfo.taskId);
        setActiveStepId(nextTaskInfo.stepId);
        toast.success(t("win_unlocked"));
      } else {
        metricsRef.current.flowDone = true;
        sessionFinishedRef.current = true;
        saveRunContext(flow.id, undefined);
        bumpFlowCompletion(flow.id);
        toast.success(t("flow_complete"));
        onComplete({ ...metricsRef.current });
      }
    }
  }, [
    task,
    step,
    flow,
    setStep,
    setTask,
    recompute,
    logSession,
    flushFocus,
    bumpFlowCompletion,
    saveRunContext,
    onComplete,
    t,
  ]);

  const [completingStep, setCompletingStep] = useState(false);
  const placeStep = useCallback(() => {
    if (completingStep) return;
    setCompletingStep(true);
    navigator.vibrate?.(24);
    window.setTimeout(() => {
      markStepDone();
      setCompletingStep(false);
    }, 420);
  }, [completingStep, markStepDone]);

  // Skip with undo
  const [skippedSnapshot, setSkippedSnapshot] = useState<{
    taskId: string;
    stepId: string;
    remaining: number;
  } | null>(null);
  const skip = () => {
    if (!task || !step) return;
    const snap = { taskId: task.id, stepId: step.id, remaining: Math.round(remaining) };
    const idx = task.steps.findIndex((s) => s.id === step.id);
    const nextInTask = [...task.steps.slice(idx + 1), ...task.steps.slice(0, idx)].find(
      (candidate) => !candidate.isCompleted && candidate.id !== step.id,
    );
    const taskIndex = flow.tasks.findIndex((candidate) => candidate.id === task.id);
    const nextTask = [...flow.tasks.slice(taskIndex + 1), ...flow.tasks.slice(0, taskIndex)].find(
      (candidate) =>
        candidate.status !== "completed" &&
        candidate.steps.some((candidateStep) => !candidateStep.isCompleted),
    );
    const nextTaskStep = nextTask?.steps.find((candidate) => !candidate.isCompleted);
    if (!nextInTask && !nextTaskStep) {
      toast.error(t("no_others"));
      return;
    }
    if (nextInTask) {
      setActiveStepId(nextInTask.id);
    } else if (nextTask && nextTaskStep) {
      setActiveTaskId(nextTask.id);
      setActiveStepId(nextTaskStep.id);
    }
    setSkippedSnapshot(snap);
    historyRef.current.push(snap);
    toast(t("skip_undo"), {
      action: {
        label: t("back_to_step"),
        onClick: () => undoSkip(snap),
      },
      duration: 6000,
    });
    setTimeout(() => setSkippedSnapshot(null), 6000);
  };
  const undoSkip = (snap: { taskId: string; stepId: string; remaining: number }) => {
    restoreTaskStateRef.current = {
      stepId: snap.stepId,
      remaining: snap.remaining,
      paused,
    };
    setActiveTaskId(snap.taskId);
    setActiveStepId(snap.stepId);
  };

  // Time adjust
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [manualMin, setManualMin] = useState("");
  const adjust = (mins: number) => {
    setRemaining((r) => r + mins * 60);
  };
  const setExact = () => {
    const m = parseInt(manualMin, 10);
    if (!isNaN(m) && m >= 0) {
      setRemaining(m * 60);
    }
    setShowTimeInput(false);
    setManualMin("");
  };

  const handleExit = () => {
    sessionStorage.removeItem(TASK_HISTORY_KEY);
    persistRunPosition();
    flushFocus();
    navigate({ to: "/flows/$flowId", params: { flowId: flow.id } });
  };
  const doExit = () => {
    sessionStorage.removeItem(TASK_HISTORY_KEY);
    persistRunPosition();
    flushFocus();
    onExit({ ...metricsRef.current });
  };

  /* History drawer */
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!task || !step) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t("all_done")}</p>
        <button
          onClick={doExit}
          className="mt-4 h-11 px-5 rounded-2xl bg-brand text-brand-foreground"
        >
          {t("back_home")}
        </button>
      </div>
    );
  }

  const stepNumber = task.steps.findIndex((s) => s.id === step.id) + 1;
  const stepTotal = task.steps.length;
  const energy = remaining < 0 || total <= 0 ? 0 : Math.max(0, Math.min(1, remaining / total));
  const clock = formatClock(remaining);
  return (
    <div className="min-h-screen flex flex-col">
      {briefing && (
        <ResumeBriefingOverlay
          briefing={briefing}
          onClose={() => {
            setBriefing(null);
            if (task) setTask(flow.id, task.id, { resumeContext: undefined });
          }}
        />
      )}

      <header className="run-object-header">
        <button onClick={handleExit} aria-label={t("exit")}>
          <X className="size-5" />
        </button>
        <p>{flow.title}</p>
        <span aria-hidden="true" />
      </header>

      <main>
        <SwipeSurface
          className="run-object-mode"
          ariaLabel={t("run_swipe_hint")}
          onSwipeRight={() => void triggerShuffle()}
          onSwipeLeft={returnPreviousTask}
          threshold={88}
          directionRatio={1.35}
          strictDistance
          ignoreInteractiveTargets
        >
          <div className="run-object-title">
            <p>{t("now")}</p>
            <h1>{task.title}</h1>
          </div>

          <SwipeSurface
            className={`focus-step-piece ${completingStep ? "is-completing" : ""}`}
            ariaLabel={`${step.title}. ${t("step_swipe_hint")}`}
            onSwipeRight={placeStep}
            onSwipeLeft={skip}
            threshold={72}
            directionRatio={1.25}
            strictDistance
            blockParentSwipe
          >
            <span>
              {t("step")} {stepNumber} {t("of")} {stepTotal}
            </span>
            <strong>{step.title}</strong>
          </SwipeSurface>
          <p className="focus-step-piece__hint">{t("step_swipe_hint")}</p>

          <div className="focus-cube" aria-label={`${task.title}, ${clock}`} data-swipe-ignore>
            <Cube
              mode="idle"
              size={168}
              framePadding={32}
              interactive={false}
              className={completingStep ? "is-absorbing-piece" : undefined}
              energy={energy}
              centerContent={
                <div className={`focus-cube__readout ${remaining < 0 ? "is-overtime" : ""}`}>
                  {remaining < 0 && <span>{t("overtime_label")}</span>}
                  <strong>{clock}</strong>
                  {!paused && (
                    <small>
                      {t("next_chime_in")} {formatClock(chimeRemaining)}
                    </small>
                  )}
                </div>
              }
            />
          </div>

          <button
            onClick={() => setPaused((current) => !current)}
            className="focus-cube__pause"
            aria-label={paused ? t("resume") : t("pause")}
          >
            {paused ? (
              <Play className="size-5 fill-current" />
            ) : (
              <Pause className="size-5 fill-current" />
            )}
            <span>{paused ? t("resume") : t("pause")}</span>
          </button>
          <p className="focus-cube__hint">{t("run_swipe_hint")}</p>

          {shuffleNotice && (
            <div className="shuffle-object-suggestion" role="status">
              <span>{t("try_this_instead")}</span>
              <strong>{shuffleNotice.step}</strong>
            </div>
          )}

          <details className="run-object-controls">
            <summary>{t("session_controls")}</summary>
            <div className="run-object-controls__panel">
              <div className="run-object-controls__time">
                <button onClick={() => adjust(-5)}>−5m</button>
                <button onClick={() => adjust(-1)}>−1m</button>
                <button onClick={() => adjust(1)}>+1m</button>
                <button onClick={() => adjust(5)}>+5m</button>
              </div>
              {showTimeInput ? (
                <div className="run-object-controls__exact">
                  <input
                    autoFocus
                    type="number"
                    value={manualMin}
                    onChange={(event) => setManualMin(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && setExact()}
                    placeholder="00"
                  />
                  <span>{t("minutes")}</span>
                  <button onClick={setExact}>✓</button>
                </div>
              ) : (
                <button className="run-object-controls__set" onClick={() => setShowTimeInput(true)}>
                  {t("set_to")}…
                </button>
              )}
              <div className="run-object-controls__actions">
                <button onClick={placeStep}>{t("place_piece")}</button>
                {skippedSnapshot ? (
                  <button
                    onClick={() => {
                      undoSkip(skippedSnapshot);
                      setSkippedSnapshot(null);
                    }}
                  >
                    <Undo2 /> {t("back_to_step")}
                  </button>
                ) : (
                  <button onClick={skip}>
                    <SkipForward /> {t("skip_for_now")}
                  </button>
                )}
                <button onClick={() => setHistoryOpen(true)}>
                  <History /> {t("history")}
                </button>
                <button onClick={() => setShowModeMenu(true)}>
                  <SettingsIcon /> {t("default_shuffle")}
                </button>
              </div>
            </div>
          </details>
        </SwipeSurface>
      </main>

      {showModeMenu && (
        <ShuffleModeDialog
          current={settings.shuffleMode}
          onPick={(m) => {
            setShuffleMode(m);
            setShowModeMenu(false);
            preparedRef.current = null;
            void prepareNext(m);
          }}
          onClose={() => setShowModeMenu(false)}
        />
      )}

      {overtimeOpen && step && (
        <OvertimeDialog
          stepTitle={step.title}
          onKeep={() => setOvertimeOpen(false)}
          onDone={() => {
            setOvertimeOpen(false);
            markStepDone();
          }}
          onSkip={() => {
            setOvertimeOpen(false);
            skip();
          }}
        />
      )}

      {historyOpen && (
        <HistoryDrawer
          flow={flow}
          activeStepId={step.id}
          onClose={() => setHistoryOpen(false)}
          onJump={(tId, sId) => {
            setActiveTaskId(tId);
            setActiveStepId(sId);
            setHistoryOpen(false);
          }}
        />
      )}
    </div>
  );
}

function modeKey(m: ShuffleMode) {
  return `shuffle_mode_${m === "this-flow" ? "this_flow" : m}`;
}

function formatClock(seconds: number) {
  const absolute = Math.max(0, Math.round(Math.abs(seconds)));
  const minutes = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  return `${seconds < 0 ? "+" : ""}${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

/* ---------- Shuffle mode dialog ---------- */
function ShuffleModeDialog({
  firstTime,
  current,
  onPick,
  onClose,
}: {
  firstTime?: boolean;
  current?: ShuffleMode | null;
  onPick: (m: ShuffleMode) => void;
  onClose: () => void;
}) {
  const t = useT();
  const modes: { id: ShuffleMode; key: string; sub: string }[] = [
    { id: "this-flow", key: "shuffle_mode_this_flow", sub: "shuffle_mode_this_flow_sub" },
    { id: "mixer", key: "shuffle_mode_mixer", sub: "shuffle_mode_mixer_sub" },
    { id: "world", key: "shuffle_mode_world", sub: "shuffle_mode_world_sub" },
    { id: "ai", key: "shuffle_mode_ai", sub: "shuffle_mode_ai_sub" },
  ];
  return (
    <div
      className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl mx-auto bg-card rounded-t-3xl p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">{t("shuffle_pick_mode")}</h3>
          <button
            onClick={onClose}
            className="size-8 grid place-items-center rounded-full hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        {firstTime && (
          <p className="text-xs text-muted-foreground mb-3">{t("shuffle_pick_mode_sub")}</p>
        )}
        <div className="space-y-2 mt-2">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              className={`w-full text-left rounded-2xl p-4 transition ${
                current === m.id ? "bg-brand-soft" : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <p className="font-semibold">{t(m.key)}</p>
              <p className="text-xs text-muted-foreground">{t(m.sub)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OvertimeDialog({
  stepTitle,
  onKeep,
  onDone,
  onSkip,
}: {
  stepTitle: string;
  onKeep: () => void;
  onDone: () => void;
  onSkip: () => void;
}) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-6"
      onClick={onKeep}
    >
      <div
        className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-wide text-destructive font-semibold">
          {t("overtime_label")}
        </p>
        <h3 className="mt-1 text-lg font-semibold break-words">{t("overtime_title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground break-words">"{stepTitle}"</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("overtime_body")}</p>
        <div className="mt-5 space-y-2">
          <button
            onClick={onKeep}
            className="w-full h-12 rounded-2xl bg-brand text-brand-foreground font-semibold"
          >
            {t("overtime_keep")}
          </button>
          <button onClick={onDone} className="w-full h-12 rounded-2xl bg-muted font-medium">
            {t("overtime_done")}
          </button>
          <button onClick={onSkip} className="w-full h-10 text-sm text-muted-foreground">
            {t("overtime_skip")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Resume Briefing ---------- */
function ResumeBriefingOverlay({
  briefing,
  onClose,
}: {
  briefing: { header: string; bullets: string[] };
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in">
      <Sparkles className="size-8 text-brand" />
      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
        {t("resume_briefing")}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-center">{briefing.header}</h2>
      <ul className="mt-6 space-y-2 max-w-sm">
        {briefing.bullets.map((b, i) => (
          <li key={i} className="text-sm flex gap-2">
            <span className="text-brand">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onClose}
        className="mt-8 h-12 px-6 rounded-2xl bg-brand text-brand-foreground font-semibold"
      >
        {t("continue")}
      </button>
    </div>
  );
}

/* ---------- History Drawer ---------- */
function HistoryDrawer({
  flow,
  activeStepId,
  onClose,
  onJump,
}: {
  flow: Flow;
  activeStepId: string;
  onClose: () => void;
  onJump: (taskId: string, stepId: string) => void;
}) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        className="h-full w-80 max-w-full bg-card p-5 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t("session_label")}</h3>
          <button
            onClick={onClose}
            className="size-8 grid place-items-center rounded-full hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4">
          <section className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              {t("recent_sessions")}
            </p>
            {flow.sessions?.length ? (
              <ul className="space-y-2">
                {flow.sessions
                  .slice(-5)
                  .reverse()
                  .map((session) => (
                    <li
                      key={session.ts}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span>{new Date(session.ts).toLocaleString()}</span>
                      <strong className="tabular-nums">
                        {Math.max(0.1, Math.round(session.minutes * 10) / 10)} {t("minutes")}
                      </strong>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{t("no_sessions_yet")}</p>
            )}
          </section>
          {flow.tasks.map((tk) => (
            <div key={tk.id}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 break-words">
                {tk.emoji} {tk.title}
              </p>
              <ul className="space-y-1">
                {tk.steps.map((s, i) => (
                  <li key={s.id}>
                    <button
                      onClick={() => onJump(tk.id, s.id)}
                      className={`w-full text-left text-sm rounded-xl px-3 py-2 flex items-center gap-2 ${
                        s.id === activeStepId
                          ? "bg-brand text-brand-foreground"
                          : s.isCompleted
                            ? "bg-muted/40 text-muted-foreground line-through"
                            : "hover:bg-muted/40"
                      }`}
                    >
                      <span className="text-[10px] font-semibold tabular-nums w-4 text-center">
                        {i + 1}
                      </span>
                      <span className="flex-1 break-words">{s.title}</span>
                      <span className="text-xs tabular-nums">{s.durationMinutes}m</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Summary ---------- */
function SummaryView({
  flow,
  metrics,
  onHome,
  onContinue,
}: {
  flow: Flow;
  metrics: SessionMetrics;
  onHome: () => void;
  onContinue: () => void;
}) {
  const t = useT();
  const fresh = useAppStore.getState().flows.find((f) => f.id === flow.id) ?? flow;
  const { progress } = computeFlowProgress(fresh);
  const nextActive = firstActive(fresh);
  const completedTasks = fresh.tasks.filter((task) => task.status === "completed").length;
  const summaryPieces: CubePieceState[] = fresh.tasks.slice(0, 8).map((task) => ({
    id: task.id,
    done: task.status === "completed",
    kind: task.status === "completed" ? "completed" : "active",
    label: task.title,
  }));
  while (summaryPieces.length < 8) {
    summaryPieces.push({
      id: `summary-empty-${summaryPieces.length}`,
      done: false,
      kind: "empty",
      label: "Empty Piece",
    });
  }
  const summarize = useServerFn(sessionSummary);
  const [line, setLine] = useState<string>("");

  useEffect(() => {
    summarize({
      data: {
        flowTitle: flow.title,
        stepsDone: metrics.stepsDone,
        shuffles: metrics.shuffles,
        focusMinutes: Math.round(metrics.focusMin),
        lang: getLang(),
      },
    })
      .then((r) => setLine(r.line))
      .catch(() => setLine(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="progress-reconstruction">
      <p>{t("session_summary")}</p>
      <h1 className="text-2xl font-semibold mt-1 break-words">{fresh.title}</h1>
      <div className="progress-reconstruction__cube">
        <Cube mode="assembly" size={190} pieces={summaryPieces} explode={0.12} />
      </div>
      <strong>{progress}%</strong>
      <span>
        {completedTasks} {t("pieces_completed")} · {fresh.tasks.length - completedTasks}{" "}
        {t("remaining")}
      </span>

      <details className="progress-reconstruction__metrics">
        <summary>{t("session_summary")}</summary>
        <div className="grid grid-cols-2 gap-2">
          <Mini label={t("time_focused")} value={`${Math.round(metrics.focusMin)}m`} />
          <Mini label={t("steps_done")} value={`${metrics.stepsDone.length}`} />
          <Mini label={t("tasks_done")} value={`${metrics.tasksDone}`} />
          <Mini label={t("shuffles")} value={`${metrics.shuffles}`} />
        </div>
      </details>

      {line && <p className="mt-6 text-sm text-foreground/80 max-w-xs italic">"{line}"</p>}

      <div className="progress-reconstruction__actions">
        {nextActive ? (
          <button
            onClick={onContinue}
            className="w-full h-14 rounded-2xl bg-brand text-brand-foreground font-semibold inline-flex items-center justify-center gap-2"
          >
            <Play className="size-5 fill-current" /> {t("continue_flow")}
          </button>
        ) : null}
        <button
          onClick={onHome}
          className="w-full h-14 rounded-2xl bg-muted font-medium inline-flex items-center justify-center gap-2"
        >
          <Home className="size-5" /> {t("back_home")}
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function firstActive(flow: Flow): { taskId: string; stepId: string } | null {
  for (const tk of flow.tasks) {
    if (tk.status === "completed") continue;
    const s = tk.steps.find((x) => !x.isCompleted);
    if (s) return { taskId: tk.id, stepId: s.id };
  }
  return null;
}
function nextActiveAfter(
  flow: Flow,
  completedTaskId: string,
): { taskId: string; stepId: string } | null {
  const idx = flow.tasks.findIndex((tk) => tk.id === completedTaskId);
  for (let i = idx + 1; i < flow.tasks.length; i++) {
    const tk = flow.tasks[i];
    if (tk.status === "completed") continue;
    const s = tk.steps.find((x) => !x.isCompleted);
    if (s) return { taskId: tk.id, stepId: s.id };
  }
  return null;
}

function pickPool(
  allFlows: Flow[],
  currentFlow: Flow,
  currentTask: Task,
  mode: ShuffleMode,
): { flowId: string; taskId: string }[] {
  if (mode === "this-flow") {
    return currentFlow.tasks
      .filter((tk) => tk.id !== currentTask.id && tk.status !== "completed")
      .map((tk) => ({ flowId: currentFlow.id, taskId: tk.id }));
  }
  // mixer / world / ai => all flows except current task
  return allFlows.flatMap((f) =>
    f.tasks
      .filter(
        (tk) => !(f.id === currentFlow.id && tk.id === currentTask.id) && tk.status !== "completed",
      )
      .map((tk) => ({ flowId: f.id, taskId: tk.id })),
  );
}

interface Ranked {
  flowId: string;
  taskId: string;
  task: Task;
  step: Step;
  score: number;
}

function rankCandidates(
  allFlows: Flow[],
  currentFlow: Flow,
  currentTask: Task,
  mode: ShuffleMode,
  easyDone: number,
): Ranked[] {
  const pool = pickPool(allFlows, currentFlow, currentTask, mode);
  const items = pool
    .map(({ flowId, taskId }) => {
      const f = allFlows.find((x) => x.id === flowId);
      const tk = f?.tasks.find((x) => x.id === taskId);
      const s = tk?.steps.find((x) => !x.isCompleted);
      return tk && s ? { flowId, taskId, task: tk, step: s } : null;
    })
    .filter((x): x is { flowId: string; taskId: string; task: Task; step: Step } => !!x);
  if (!items.length) return [];

  const priorityRaw = (tk: Task) =>
    tk.priority === "quick" ? 0 : tk.priority === "focused" ? 2 : 1;

  const recoverMatrix: Record<string, Record<string, number>> = {
    hard: { easy: 1.0, medium: 0.5, hard: -0.4 },
    medium: { easy: 0.3, medium: 0, hard: -0.2 },
    easy: { easy: -0.3, medium: 0.3, hard: 0 },
  };
  const cur = currentTask.difficulty;
  const recoverRaw = (tk: Task) => {
    const cd = tk.difficulty;
    if (!cur || !cd) return 0;
    let v = recoverMatrix[cur]?.[cd] ?? 0;
    // Anti easy-loop guard
    if (easyDone >= 2) {
      if (cd === "easy") v -= 0.5;
      else if (cd === "medium") v += 0.4;
    }
    return v;
  };
  const durationFitRaw = (m: number) => (m > 25 ? 0 : Math.max(0, 1 - Math.abs(m - 12) / 20));
  const recencyRaw = (last?: number) => {
    if (!last) return 72;
    const h = (Date.now() - last) / 3600000;
    return Math.min(72, Math.max(0, h));
  };

  const raw = items.map((it) => ({
    ...it,
    pRaw: priorityRaw(it.task),
    rRaw: recoverRaw(it.task),
    dRaw: durationFitRaw(it.step.durationMinutes),
    aRaw: recencyRaw(it.task.lastCompletedAt),
  }));

  const rMin = Math.min(...raw.map((r) => r.rRaw));
  const rMax = Math.max(...raw.map((r) => r.rRaw));
  const rRange = rMax - rMin;

  return raw
    .map((r) => {
      const pN = r.pRaw / 2;
      const rN = rRange === 0 ? 0.5 : (r.rRaw - rMin) / rRange;
      const dN = r.dRaw;
      const aN = r.aRaw / 72;
      const score = 0.3 * pN + 0.3 * rN + 0.25 * dN + 0.15 * aN + Math.random() * 0.05;
      return { flowId: r.flowId, taskId: r.taskId, task: r.task, step: r.step, score };
    })
    .sort((a, b) => b.score - a.score);
}

function pickCandidate(
  allFlows: Flow[],
  currentFlow: Flow,
  currentTask: Task,
  mode: ShuffleMode,
  easyDone = 0,
): { flowId: string; taskId: string } | null {
  const ranked = rankCandidates(allFlows, currentFlow, currentTask, mode, easyDone);
  if (!ranked.length) return null;
  const top = ranked.slice(0, 3);
  // weighted pick by score (shift so all positive)
  const minS = Math.min(...top.map((r) => r.score));
  const weights = top.map((r) => r.score - minS + 0.01);
  const total = weights.reduce((a, b) => a + b, 0);
  let pick = Math.random() * total;
  for (let i = 0; i < top.length; i++) {
    pick -= weights[i];
    if (pick <= 0) return { flowId: top[i].flowId, taskId: top[i].taskId };
  }
  return { flowId: top[0].flowId, taskId: top[0].taskId };
}

function nextDate(task: Task): string | undefined {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  if (task.recurrence.kind === "interval")
    d.setDate(d.getDate() + Math.max(0, task.recurrence.days - 1));
  return d.toISOString().slice(0, 10);
}

let audioCtx: AudioContext | null = null;
function chime() {
  try {
    if (typeof window === "undefined") return;
    audioCtx =
      audioCtx ??
      new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.08;
    master.connect(ctx.destination);

    // Bell layer — soft two-tone sine (gentle major third)
    const bellGain = ctx.createGain();
    bellGain.gain.setValueAtTime(0, now);
    bellGain.gain.linearRampToValueAtTime(0.9, now + 0.08);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    bellGain.connect(master);
    [528, 660].forEach((freq) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(bellGain);
      o.start(now);
      o.stop(now + 1.7);
    });

    // White-noise layer — low-passed, fades in then out
    const noiseDur = 1.2;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    filter.Q.value = 0.7;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.2);
    noiseGain.gain.linearRampToValueAtTime(0, now + noiseDur);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(now);
    noise.stop(now + noiseDur + 0.05);
  } catch {
    /* ignore */
  }
}
