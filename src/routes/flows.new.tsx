import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Play, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { breakdownTask } from "@/lib/ai.functions";
import { useAppStore } from "@/lib/store";
import type { Difficulty, Flow, Priority, Recurrence, Task } from "@/lib/types";
import { colorForFlow, uid } from "@/lib/utils-flow";
import { AppHeader } from "@/components/AppHeader";
import { StepEditor } from "@/components/StepEditor";
import { ThemeApplier } from "@/components/ThemeApplier";
import { useT, getLang } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/flows/new")({
  head: () => ({
    meta: [
      { title: "New flow — Shufflow" },
      { name: "description", content: "Turn a goal into a tiny series of focused wins." },
    ],
  }),
  component: () => <CreateOrEdit mode="new" />,
});

export function CreateOrEdit({ mode }: { mode: "new" | "edit" }) {
  const t = useT();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { flowId?: string };
  const upsert = useAppStore((s) => s.upsertFlow);
  const existing = useAppStore((s) => s.flows.find((f) => f.id === params.flowId));
  const defaultDifficulty = useAppStore((s) => s.settings.defaultDifficulty);
  const defaultDetailLevel = useAppStore((s) => s.settings.defaultDetailLevel ?? 3);
  const breakdown = useServerFn(breakdownTask);

  const [flow, setFlow] = useState<Flow>(() => existing ?? blankFlow());
  const [draftTitle, setDraftTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [composerDifficulty, setComposerDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [composerDetail, setComposerDetail] = useState<number>(defaultDetailLevel);
  const [composerPriority, setComposerPriority] = useState<Priority>("normal");
  const [lastAddedTaskId, setLastAddedTaskId] = useState<string | null>(null);
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const taskInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("shufflow:selected-empty-piece")) {
      sessionStorage.removeItem("shufflow:selected-empty-piece");
      requestAnimationFrame(() => taskInputRef.current?.focus());
    }
  }, []);

  // Auto-save when editing
  useEffect(() => {
    if (mode !== "edit" || !existing) return;
    const tm = setTimeout(() => upsert(flow), 400);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, mode]);

  const addTask = async () => {
    const title = draftTitle.trim();
    if (!title) return;
    setLoading(true);
    const newId = uid();
    setLastAddedTaskId(newId);
    try {
      const res = await breakdown({
        data: {
          title,
          difficulty: composerDifficulty,
          detailLevel: composerDetail,
          lang: getLang(),
        },
      });
      const task: Task = {
        id: newId,
        title,
        emoji: res.emoji || "✨",
        status: "pending",
        priority: composerPriority,
        difficulty: composerDifficulty,
        steps: res.steps.map((s) => ({
          id: uid(),
          title: s.title,
          description: s.description,
          durationMinutes: s.durationMinutes,
          isCompleted: false,
        })),
        isRecurring: false,
        recurrence: { kind: "one-time" },
      };
      setFlow((f) => ({
        ...f,
        emoji: f.emoji && f.emoji !== "✨" ? f.emoji : res.emoji || "✨",
        tasks: [...f.tasks, task],
      }));
      setDraftTitle("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "AI failed";
      if (msg === "RATE_LIMIT") toast.error(t("too_many_requests"));
      else if (msg === "PAYMENT_REQUIRED") toast.error(t("ai_credits_out"));
      else toast.error(t("ai_failed"));
      const task: Task = {
        id: newId,
        title,
        emoji: "✨",
        status: "pending",
        priority: composerPriority,
        difficulty: composerDifficulty,
        steps: [
          {
            id: uid(),
            title: t("fallback_step_outcome"),
            description: t("fallback_step_outcome_description"),
            durationMinutes: 8,
            isCompleted: false,
          },
          {
            id: uid(),
            title: t("fallback_step_small_part"),
            description: t("fallback_step_small_part_description"),
            durationMinutes: 12,
            isCompleted: false,
          },
          {
            id: uid(),
            title: t("fallback_step_review"),
            description: t("fallback_step_review_description"),
            durationMinutes: 8,
            isCompleted: false,
          },
        ],
        isRecurring: false,
        recurrence: { kind: "one-time" },
      };
      setFlow((f) => ({ ...f, tasks: [...f.tasks, task] }));
      setDraftTitle("");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        const node = taskRefs.current.get(newId);
        node?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  };

  const totalMin = useMemo(
    () => flow.tasks.reduce((a, tk) => a + tk.steps.reduce((b, s) => b + s.durationMinutes, 0), 0),
    [flow.tasks],
  );

  const accent = colorForFlow(flow);

  const canStart = flow.tasks.some(
    (task) => task.status !== "completed" && task.steps.some((step) => !step.isCompleted),
  );

  const startSession = () => {
    upsert(flow);
    if (lastAddedTaskId) sessionStorage.setItem("startTaskId", lastAddedTaskId);
    sessionStorage.setItem("shufflow:start-immediately", flow.id);
    navigate({ to: "/flows/$flowId/run", params: { flowId: flow.id } });
  };

  return (
    <div className="flow-workspace" data-accent={accent}>
      <ThemeApplier override={accent} />
      <AppHeader back title={mode === "new" ? t("new_flow") : t("edit_flow")} showNav={false} />

      <div className="flow-workspace__content">
        <label className="flow-workspace__title-label">{t("flow_title_label")}</label>
        <input
          value={flow.title}
          onChange={(e) => setFlow((f) => ({ ...f, title: e.target.value }))}
          placeholder={t("flow_title_placeholder")}
          className="flow-workspace__title"
        />
        <p className="flow-workspace__prompt">{t("task_capture_prompt")}</p>

        <div className="task-capture">
          <label className="sr-only" htmlFor="task-capture-input">
            {t("task_capture_prompt")}
          </label>
          <input
            id="task-capture-input"
            ref={taskInputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && addTask()}
            placeholder={t("small_win_placeholder")}
          />
          <button onClick={addTask} disabled={loading || !draftTitle.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : t("break_down")}
          </button>
        </div>
        <p className="task-capture__hint" role={loading ? "status" : undefined}>
          {loading ? t("breaking_into_steps") : t("break_down_hint")}
        </p>

        {flow.tasks.length > 0 && (
          <>
            <div className="space-y-4">
              {flow.tasks
                .filter((tk) => tk.status !== "completed")
                .map((tk, index) => (
                  <div
                    key={tk.id}
                    ref={(el) => {
                      if (el) taskRefs.current.set(tk.id, el);
                      else taskRefs.current.delete(tk.id);
                    }}
                  >
                    <TaskBlock
                      task={tk}
                      index={index}
                      highlighted={tk.id === lastAddedTaskId}
                      onChange={(patch) =>
                        setFlow((f) => ({
                          ...f,
                          tasks: f.tasks.map((x) => (x.id === tk.id ? { ...x, ...patch } : x)),
                        }))
                      }
                      onDelete={() =>
                        setFlow((f) => ({ ...f, tasks: f.tasks.filter((x) => x.id !== tk.id) }))
                      }
                    />
                  </div>
                ))}
            </div>
            <CompletedSection
              tasks={flow.tasks.filter((tk) => tk.status === "completed")}
              onReopen={(id) =>
                setFlow((f) => ({
                  ...f,
                  tasks: f.tasks.map((x) =>
                    x.id === id
                      ? {
                          ...x,
                          status: "pending",
                          lastCompletedAt: undefined,
                          steps: x.steps.map((s) => ({ ...s, isCompleted: false })),
                        }
                      : x,
                  ),
                }))
              }
              onDelete={(id) =>
                setFlow((f) => ({ ...f, tasks: f.tasks.filter((x) => x.id !== id) }))
              }
            />
          </>
        )}

        {flow.tasks.length > 0 && (
          <details className="workspace-options flow-piece-options">
            <summary>{t("flow_options")}</summary>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("repeat_daily")}</span>
                <Switch
                  on={flow.isRecurring}
                  onChange={(v) => {
                    setFlow((f) => ({
                      ...f,
                      isRecurring: v,
                      tasks: f.tasks.map((tk) => {
                        if (v && tk.recurrence.kind === "one-time") {
                          return { ...tk, isRecurring: true, recurrence: { kind: "daily" } };
                        }
                        if (!v && tk.recurrence.kind === "daily") {
                          return { ...tk, isRecurring: false, recurrence: { kind: "one-time" } };
                        }
                        return tk;
                      }),
                    }));
                  }}
                />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {t("total_time")}: <span className="font-medium text-foreground">{totalMin}m</span>
              </div>
            </div>
          </details>
        )}
      </div>

      {canStart && (
        <aside className="workspace-direct-start">
          <div>
            <span>
              <Sparkles className="size-3.5" /> {t("recommended_first")}
            </span>
            <strong>
              {
                (
                  flow.tasks.find((task) => task.id === lastAddedTaskId) ??
                  flow.tasks.find((task) => task.status !== "completed")
                )?.steps.find((step) => !step.isCompleted)?.title
              }
            </strong>
          </div>
          <button type="button" onClick={startSession}>
            <Play className="size-4 fill-current" /> {t("start_recommended")}
          </button>
        </aside>
      )}

      {/* Advanced task defaults remain available without competing with task capture. */}
      <details className="workspace-options">
        <summary>{t("task_defaults")}</summary>
        <div>
          <div className="mb-3">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("difficulty")}
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setComposerDifficulty(d)}
                  className={`h-10 rounded-xl text-sm font-medium transition ${
                    composerDifficulty === d
                      ? "bg-brand text-brand-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {t(`difficulty_${d}`)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{t("difficulty_hint")}</p>
          </div>
          <div className="mb-3">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("breakdown_detail")}
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(
                [
                  { v: 1, k: "detail_chunky" },
                  { v: 3, k: "detail_balanced" },
                  { v: 5, k: "detail_micro" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setComposerDetail(opt.v)}
                  className={`h-10 rounded-xl text-sm font-medium transition ${
                    composerDetail === opt.v
                      ? "bg-brand text-brand-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {t(opt.k)}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("priority_label")}
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {[
                { v: "quick" as Priority, sub: "priority_low_sub" },
                { v: "normal" as Priority, sub: "priority_med_sub" },
                { v: "focused" as Priority, sub: "priority_high_sub" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setComposerPriority(opt.v)}
                  className={`h-12 rounded-xl text-[11px] font-medium leading-tight transition flex flex-col items-center justify-center px-1 ${
                    composerPriority === opt.v
                      ? "bg-brand text-brand-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  <span>{t(opt.v)}</span>
                  <span className="text-[10px] opacity-70">{t(opt.sub)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function blankFlow(): Flow {
  return {
    id: uid(),
    title: "",
    emoji: "✨",
    tags: [],
    tasks: [],
    totalDurationMinutes: 0,
    progress: 0,
    isRecurring: false,
    status: "active",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function TaskBlock({
  task,
  index,
  highlighted,
  onChange,
  onDelete,
}: {
  task: Task;
  index: number;
  highlighted: boolean;
  onChange: (p: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const priorities: Priority[] = ["quick", "normal", "focused"];
  const recOptions: { label: string; value: Recurrence }[] = [
    { label: t("one_time"), value: { kind: "one-time" } },
    { label: t("daily"), value: { kind: "daily" } },
    { label: t("every_2d"), value: { kind: "interval", days: 2 } },
    { label: t("weekly"), value: { kind: "weekly", weekdays: [1] } },
  ];
  return (
    <details
      className={`task-breakdown ${task.status === "in-progress" ? "is-active" : ""}`}
      open={index === 0 || highlighted}
    >
      <summary>
        <span className="task-breakdown__number">
          {t("task_label")} {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <input
            value={task.title}
            onChange={(e) => onChange({ title: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="task-breakdown__title"
          />
          <span className="task-breakdown__count">
            {task.steps.length} {t("steps")}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          {t("remove")}
        </button>
      </summary>

      <div className="task-breakdown__body">
        <div className="task-steps">
          <StepEditor steps={task.steps} onChange={(steps) => onChange({ steps })} />
        </div>

        <details className="task-piece-options">
          <summary>{t("piece_options")}</summary>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {priorities.map((p) => (
              <button
                key={p}
                onClick={() => onChange({ priority: p })}
                className={`text-xs px-3 h-8 rounded-full font-medium ${
                  task.priority === p
                    ? "bg-brand text-brand-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {t(p)}
              </button>
            ))}
            <span className="w-px bg-border mx-1" />
            {recOptions.map((r) => (
              <button
                key={r.label}
                onClick={() =>
                  onChange({
                    isRecurring: r.value.kind !== "one-time",
                    recurrence: r.value,
                  })
                }
                className={`text-xs px-3 h-8 rounded-full font-medium ${
                  task.recurrence.kind === r.value.kind
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">
              {t("difficulty")}
            </span>
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => onChange({ difficulty: d })}
                className={`text-xs px-3 h-7 rounded-full font-medium ${
                  (task.difficulty ?? "medium") === d
                    ? "bg-brand-soft text-brand"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {t(`difficulty_${d}`)}
              </button>
            ))}
          </div>
        </details>
      </div>
    </details>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full p-0.5 transition ${on ? "bg-brand" : "bg-muted"}`}
      aria-pressed={on}
    >
      <span
        className={`block size-5 rounded-full bg-card shadow transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function CompletedSection({
  tasks,
  onReopen,
  onDelete,
}: {
  tasks: Task[];
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;
  return (
    <div className="mt-4 rounded-3xl bg-card border border-border/60 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 h-12 text-sm font-medium"
      >
        <span className="inline-flex items-center gap-2">
          <span className="text-muted-foreground">{t("completed_section")}</span>
          <span className="size-5 rounded-full bg-muted text-[10px] grid place-items-center tabular-nums">
            {tasks.length}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <ul className="divide-y divide-border/60">
          {tasks.map((tk) => (
            <li key={tk.id} className="px-4 py-3 flex items-center gap-3">
              <span className="text-xl">{tk.emoji}</span>
              <span className="flex-1 text-sm line-through text-muted-foreground break-words">
                {tk.title}
              </span>
              <button
                onClick={() => onReopen(tk.id)}
                className="h-8 px-3 rounded-full bg-muted text-xs font-medium"
              >
                {t("reopen")}
              </button>
              <button
                onClick={() => onDelete(tk.id)}
                className="text-xs text-muted-foreground hover:text-destructive"
                aria-label={t("remove")}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
