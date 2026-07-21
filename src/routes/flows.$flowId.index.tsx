import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Loader2, Pencil, Play, Plus, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { ThemeApplier } from "@/components/ThemeApplier";
import { StepEditor } from "@/components/StepEditor";
import { Cube, type CubePieceState } from "@/components/cube/Cube";
import { getLang, useT } from "@/lib/i18n";
import { colorForFlow, uid } from "@/lib/utils-flow";
import { breakdownTask, recommendNextTask } from "@/lib/ai.functions";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/flows/$flowId/")({
  head: () => ({ meta: [{ title: "Flow — Shufflow" }] }),
  component: FlowOverview,
});

function FlowOverview() {
  const { flowId } = useParams({ from: "/flows/$flowId/" });
  const navigate = useNavigate();
  const t = useT();
  const flow = useAppStore((state) => state.flows.find((item) => item.id === flowId));
  const hydrated = useAppStore((state) => state.hydrated);
  const upsertFlow = useAppStore((state) => state.upsertFlow);
  const renameFlow = useAppStore((state) => state.renameFlow);
  const defaultDifficulty = useAppStore((state) => state.settings.defaultDifficulty);
  const defaultDetailLevel = useAppStore((state) => state.settings.defaultDetailLevel ?? 3);
  const breakdown = useServerFn(breakdownTask);
  const recommendNext = useServerFn(recommendNextTask);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [breakdownPhase, setBreakdownPhase] = useState<"idle" | "separating" | "settling">("idle");
  const [recommendation, setRecommendation] = useState<{
    taskId: string;
    nextStep: string;
    reason: string;
  } | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [renamingFlow, setRenamingFlow] = useState(false);
  const [flowNameDraft, setFlowNameDraft] = useState("");
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepTitleDraft, setStepTitleDraft] = useState("");
  const [stepDescriptionDraft, setStepDescriptionDraft] = useState("");
  const [stepDurationDraft, setStepDurationDraft] = useState(10);
  const [addingStep, setAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDescription, setNewStepDescription] = useState("");
  const [newStepDuration, setNewStepDuration] = useState(10);
  const [regeneratingTask, setRegeneratingTask] = useState(false);

  useEffect(() => {
    if (breakdownPhase !== "settling") return;
    const timer = window.setTimeout(() => setBreakdownPhase("idle"), 520);
    return () => window.clearTimeout(timer);
  }, [breakdownPhase]);

  const pieces = useMemo<CubePieceState[]>(() => {
    if (!flow) return [];
    const tasks = flow.tasks.length > 8 ? flow.tasks.slice(0, 7) : flow.tasks.slice(0, 8);
    const mapped: CubePieceState[] = tasks.map((task) => {
      const completed = task.steps.filter((step) => step.isCompleted).length;
      return {
        id: task.id,
        done: task.status === "completed",
        active: task.status === "in-progress",
        kind: task.status === "completed" ? ("completed" as const) : ("active" as const),
        label: `${task.title} — ${completed} of ${task.steps.length} Steps complete`,
        progress: task.steps.length ? completed / task.steps.length : 0,
        selected: selectedId === task.id,
        icon: task.status === "completed" ? <Check className="size-5" /> : undefined,
      };
    });
    if (flow.tasks.length > 8) {
      mapped.push({
        id: "aggregate",
        done: false,
        kind: "aggregate",
        label: `${flow.tasks.length - 7} more Pieces`,
        selected: selectedId === "aggregate",
        icon: `+${flow.tasks.length - 7}`,
      });
    }
    while (mapped.length < 8) {
      const slot = mapped.length + 1;
      mapped.push({
        id: `potential-${slot}`,
        done: false,
        kind: "empty",
        label: t("create_piece_label"),
        selected: selectedId === `potential-${slot}`,
        icon: <Plus className="size-5" />,
      });
    }
    return mapped;
  }, [flow, selectedId, t]);

  useEffect(() => {
    if (!flow) return;
    const unfinished = flow.tasks.filter((task) => task.status !== "completed");
    if (!unfinished.length) {
      setRecommendation(null);
      return;
    }
    const fallbackTask = unfinished.find((task) => task.id === selectedId) ?? unfinished[0];
    const fallbackStep =
      fallbackTask.steps.find((step) => !step.isCompleted)?.title ?? fallbackTask.title;
    let cancelled = false;
    setRecommendationLoading(true);
    void recommendNext({
      data: {
        flowTitle: flow.title,
        currentTaskId:
          flow.tasks.find((task) => task.id === selectedId)?.id ??
          flow.tasks.find((task) => task.status === "in-progress")?.id,
        tasks: flow.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          steps: task.steps.map((step) => ({ title: step.title, completed: step.isCompleted })),
        })),
        previousSessions: (flow.sessions ?? [])
          .slice(-5)
          .map((session) => ({ minutes: session.minutes, timestamp: session.ts })),
        lang: getLang(),
      },
    })
      .then((result) => {
        if (!cancelled) setRecommendation(result);
      })
      .catch(() => {
        if (!cancelled)
          setRecommendation({
            taskId: fallbackTask.id,
            nextStep: fallbackStep,
            reason: t("recommendation_fallback_reason"),
          });
      })
      .finally(() => {
        if (!cancelled) setRecommendationLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Reconsider only when the Flow changes, not while the user explores Pieces.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow?.id, flow?.updatedAt]);

  if (!hydrated) {
    return <ObjectLoading />;
  }

  if (!flow) {
    return <p className="p-8 text-center text-muted-foreground">{t("flow_not_found")}</p>;
  }

  const selectedTask = flow.tasks.find((task) => task.id === selectedId) ?? null;
  const selectedPiece = pieces.find((piece) => piece.id === selectedId) ?? null;
  const creatingPiece = selectedPiece?.kind === "empty";
  const accent = colorForFlow(flow);

  const startTaskById = (taskId: string) => {
    const task = flow.tasks.find((item) => item.id === taskId);
    if (!task || task.status === "completed") return;
    sessionStorage.setItem("startTaskId", task.id);
    sessionStorage.setItem("shufflow:start-immediately", flow.id);
    navigate({ to: "/flows/$flowId/run", params: { flowId: flow.id } });
  };

  const selectPiece = (id: string) => {
    const candidateTask = flow.tasks.find((item) => item.id === id);
    if (selectedId === id && candidateTask) {
      startTaskById(id);
      return;
    }
    setEditingTaskId(null);
    setExpandedStepId(null);
    setEditingStepId(null);
    setSelectedId(id);
  };

  const beginEditingTask = () => {
    if (!selectedTask) return;
    setEditTitle(selectedTask.title);
    setEditingTaskId(selectedTask.id);
  };

  const saveTaskEdits = () => {
    if (!selectedTask || editingTaskId !== selectedTask.id || !editTitle.trim()) return;
    const current = useAppStore.getState().flows.find((item) => item.id === flow.id);
    if (!current) return;
    upsertFlow({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === selectedTask.id
          ? {
              ...task,
              title: editTitle.trim(),
            }
          : task,
      ),
      updatedAt: Date.now(),
    });
    setEditingTaskId(null);
  };

  const updateSelectedTask = (transform: (task: Task) => Task) => {
    if (!selectedTask) return;
    const current = useAppStore.getState().flows.find((item) => item.id === flow.id);
    if (!current) return;
    const tasks = current.tasks.map((task) =>
      task.id === selectedTask.id ? transform(task) : task,
    );
    const completedTasks = tasks.filter((task) => task.status === "completed").length;
    upsertFlow({
      ...current,
      tasks,
      totalDurationMinutes: tasks.reduce(
        (flowTotal, task) =>
          flowTotal + task.steps.reduce((taskTotal, step) => taskTotal + step.durationMinutes, 0),
        0,
      ),
      progress: tasks.length ? completedTasks / tasks.length : 0,
      updatedAt: Date.now(),
    });
  };

  const beginEditingStep = (stepId: string) => {
    const target = selectedTask?.steps.find((step) => step.id === stepId);
    if (!target) return;
    setStepTitleDraft(target.title);
    setStepDescriptionDraft(target.description ?? "");
    setStepDurationDraft(target.durationMinutes);
    setEditingStepId(stepId);
  };

  const saveStepEdits = () => {
    if (!editingStepId || !stepTitleDraft.trim()) return;
    updateSelectedTask((task) => ({
      ...task,
      steps: task.steps.map((step) =>
        step.id === editingStepId
          ? {
              ...step,
              title: stepTitleDraft.trim(),
              description: stepDescriptionDraft.trim() || undefined,
              durationMinutes: Math.max(1, Math.round(stepDurationDraft)),
            }
          : step,
      ),
    }));
    setEditingStepId(null);
  };

  const moveStep = (stepId: string, delta: -1 | 1) => {
    updateSelectedTask((task) => {
      const from = task.steps.findIndex((step) => step.id === stepId);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= task.steps.length) return task;
      const steps = [...task.steps];
      const [moved] = steps.splice(from, 1);
      steps.splice(to, 0, moved);
      return { ...task, steps };
    });
  };

  const deleteStep = (stepId: string) => {
    updateSelectedTask((task) => ({
      ...task,
      steps: task.steps.filter((step) => step.id !== stepId),
    }));
    setExpandedStepId(null);
    setEditingStepId(null);
  };

  const toggleStepComplete = (stepId: string) => {
    updateSelectedTask((task) => {
      const steps = task.steps.map((step) =>
        step.id === stepId ? { ...step, isCompleted: !step.isCompleted } : step,
      );
      const allComplete = steps.length > 0 && steps.every((step) => step.isCompleted);
      return {
        ...task,
        steps,
        status: allComplete ? "completed" : task.status === "completed" ? "pending" : task.status,
      };
    });
  };

  const addStep = () => {
    if (!newStepTitle.trim()) return;
    const stepId = uid();
    updateSelectedTask((task) => ({
      ...task,
      status: task.status === "completed" ? "pending" : task.status,
      steps: [
        ...task.steps,
        {
          id: stepId,
          title: newStepTitle.trim(),
          description: newStepDescription.trim() || undefined,
          durationMinutes: Math.max(1, Math.round(newStepDuration)),
          isCompleted: false,
        },
      ],
    }));
    setNewStepTitle("");
    setNewStepDescription("");
    setNewStepDuration(10);
    setAddingStep(false);
    setExpandedStepId(stepId);
  };

  const regenerateSteps = async () => {
    if (!selectedTask || regeneratingTask) return;
    setRegeneratingTask(true);
    try {
      const result = await breakdown({
        data: {
          title: selectedTask.title,
          difficulty: selectedTask.difficulty ?? defaultDifficulty,
          detailLevel: defaultDetailLevel,
          lang: getLang(),
        },
      });
      updateSelectedTask((task) => ({
        ...task,
        emoji: result.emoji || task.emoji,
        steps: result.steps.map((step) => ({
          id: uid(),
          title: step.title,
          description: step.description,
          durationMinutes: step.durationMinutes,
          isCompleted: false,
        })),
      }));
      setExpandedStepId(null);
    } catch {
      toast.error(t("ai_failed_keep_steps"));
    } finally {
      setRegeneratingTask(false);
    }
  };

  const createTaskInPiece = async () => {
    const title = draftTitle.trim();
    if (!title || breakdownPhase !== "idle") return;
    setBreakdownPhase("separating");
    const taskId = uid();
    try {
      const result = await breakdown({
        data: {
          title,
          difficulty: defaultDifficulty,
          detailLevel: defaultDetailLevel,
          lang: getLang(),
        },
      });
      const task: Task = {
        id: taskId,
        title,
        emoji: result.emoji || "◆",
        status: "pending",
        priority: "normal",
        difficulty: defaultDifficulty,
        steps: result.steps.map((step) => ({
          id: uid(),
          title: step.title,
          description: step.description,
          durationMinutes: step.durationMinutes,
          isCompleted: false,
        })),
        isRecurring: false,
        recurrence: { kind: "one-time" },
      };
      const current = useAppStore.getState().flows.find((item) => item.id === flow.id);
      if (!current) return;
      upsertFlow({
        ...current,
        tasks: [...current.tasks, task],
        totalDurationMinutes:
          current.totalDurationMinutes +
          task.steps.reduce((total, step) => total + step.durationMinutes, 0),
        updatedAt: Date.now(),
      });
      setDraftTitle("");
      setSelectedId(taskId);
      setBreakdownPhase("settling");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "AI failed";
      if (message === "RATE_LIMIT") toast.error(t("too_many_requests"));
      else if (message === "PAYMENT_REQUIRED") toast.error(t("ai_credits_out"));
      else toast.error(t("ai_failed"));

      const fallback: Task = {
        id: taskId,
        title,
        emoji: "◆",
        status: "pending",
        priority: "normal",
        difficulty: defaultDifficulty,
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
      const current = useAppStore.getState().flows.find((item) => item.id === flow.id);
      if (current) {
        upsertFlow({
          ...current,
          tasks: [...current.tasks, fallback],
          totalDurationMinutes: current.totalDurationMinutes + 28,
          updatedAt: Date.now(),
        });
        setSelectedId(taskId);
      }
      setDraftTitle("");
      setBreakdownPhase("settling");
    }
  };

  return (
    <div className="flow-overview" data-accent={accent}>
      <ThemeApplier override={accent} />
      <AppHeader back title={t("flow_overview")} showNav={false} />
      <main>
        <header className="flow-overview__intro">
          <p>{t("flow_cube_label")}</p>
          {renamingFlow ? (
            <form
              className="flow-overview__rename"
              onSubmit={(event) => {
                event.preventDefault();
                const nextName = flowNameDraft.trim();
                if (!nextName) return;
                renameFlow(flow.id, nextName);
                setRenamingFlow(false);
              }}
            >
              <input
                autoFocus
                value={flowNameDraft}
                onChange={(event) => setFlowNameDraft(event.target.value)}
                aria-label={t("flow_title_label")}
              />
              <button type="submit" aria-label={t("save_changes")}>
                <Check className="size-5" />
              </button>
            </form>
          ) : (
            <button
              className="flow-overview__name"
              onClick={() => {
                setFlowNameDraft(flow.title);
                setRenamingFlow(true);
              }}
              aria-label={`${t("edit")} ${flow.title}`}
            >
              <h1>{flow.title}</h1>
              <Pencil className="size-4" />
            </button>
          )}
        </header>

        <section className="flow-overview__map" aria-label={t("flow_task_map")}>
          <Cube
            mode="assembly"
            size={220}
            pieces={pieces}
            explode={0.18}
            onPieceClick={selectPiece}
          />
        </section>

        <section className="selected-piece-panel" aria-live="polite" key={selectedId ?? "next"}>
          {creatingPiece ? (
            breakdownPhase === "separating" ? (
              <div className="piece-decomposition" role="status">
                <div className="piece-decomposition__object" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="selected-piece-panel__eyebrow">{t("breaking_into_steps")}</div>
                <h2>{draftTitle}</h2>
                <p>{t("break_down_hint")}</p>
              </div>
            ) : (
              <form
                className="piece-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createTaskInPiece();
                }}
              >
                <div className="selected-piece-panel__eyebrow">{t("new_piece")}</div>
                <h2>{t("task_capture_prompt")}</h2>
                <label className="sr-only" htmlFor="piece-task-title">
                  {t("task_capture_prompt")}
                </label>
                <input
                  id="piece-task-title"
                  autoFocus
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder={t("small_win_placeholder")}
                />
                <button className="piece-primary" type="submit" disabled={!draftTitle.trim()}>
                  {breakdownPhase === "settling" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {t("break_down")}
                </button>
              </form>
            )
          ) : selectedPiece?.kind === "aggregate" ? (
            <>
              <div className="selected-piece-panel__eyebrow">{t("more_pieces")}</div>
              <h2>{selectedPiece.label}</h2>
              <Link
                className="piece-secondary"
                to="/flows/$flowId/edit"
                params={{ flowId: flow.id }}
              >
                {t("open_task_workspace")} <ArrowRight className="size-4" />
              </Link>
            </>
          ) : selectedTask ? (
            <>
              <div className="selected-piece-panel__eyebrow">
                {selectedTask.status === "completed" ? t("completed_piece") : t("selected_piece")}
              </div>
              {editingTaskId === selectedTask.id ? (
                <input
                  className="task-piece-title-input"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  aria-label={t("task_label")}
                />
              ) : (
                <h2>{selectedTask.title}</h2>
              )}
              <p>
                {selectedTask.steps.filter((step) => step.isCompleted).length} {t("of")}{" "}
                {selectedTask.steps.length} {t("steps")}
              </p>
              {editingTaskId === selectedTask.id ? (
                <div className="task-piece-step-editor">
                  <StepEditor
                    steps={selectedTask.steps}
                    onChange={(steps) =>
                      updateSelectedTask((task) => ({
                        ...task,
                        status:
                          task.status === "completed" && steps.some((step) => !step.isCompleted)
                            ? "pending"
                            : task.status,
                        steps,
                      }))
                    }
                  />
                </div>
              ) : (
                <div className="task-piece-subpieces" aria-label={t("steps")}>
                  {selectedTask.steps.map((step, index) => (
                    <button
                      type="button"
                      key={step.id}
                      className={`task-subpiece ${step.isCompleted ? "is-completed" : ""} ${expandedStepId === step.id ? "is-expanded" : ""}`}
                      onClick={() =>
                        setExpandedStepId((current) => (current === step.id ? null : step.id))
                      }
                    >
                      <span>{step.isCompleted ? "✓" : index + 1}</span>
                      <strong>{step.title}</strong>
                    </button>
                  ))}
                </div>
              )}
              {editingTaskId !== selectedTask.id &&
                expandedStepId &&
                (() => {
                  const expandedStep = selectedTask.steps.find(
                    (step) => step.id === expandedStepId,
                  );
                  if (!expandedStep) return null;
                  const position = selectedTask.steps.findIndex(
                    (step) => step.id === expandedStep.id,
                  );
                  return (
                    <div className="step-piece-expanded">
                      {editingStepId === expandedStep.id ? (
                        <>
                          <input
                            value={stepTitleDraft}
                            onChange={(event) => setStepTitleDraft(event.target.value)}
                            aria-label={t("step_title")}
                          />
                          <textarea
                            value={stepDescriptionDraft}
                            onChange={(event) => setStepDescriptionDraft(event.target.value)}
                            placeholder={t("step_description_placeholder")}
                            aria-label={t("step_description")}
                          />
                          <label className="step-piece-expanded__duration">
                            <span>{t("step_duration")}</span>
                            <input
                              type="number"
                              min="1"
                              max="240"
                              value={stepDurationDraft}
                              onChange={(event) => setStepDurationDraft(Number(event.target.value))}
                            />
                            <span>{t("minutes")}</span>
                          </label>
                          <div className="step-piece-expanded__actions">
                            <button
                              onClick={() => moveStep(expandedStep.id, -1)}
                              disabled={position === 0}
                            >
                              ↑ {t("move_up")}
                            </button>
                            <button
                              onClick={() => moveStep(expandedStep.id, 1)}
                              disabled={position === selectedTask.steps.length - 1}
                            >
                              ↓ {t("move_down")}
                            </button>
                            <button
                              onClick={() => deleteStep(expandedStep.id)}
                              disabled={selectedTask.steps.length === 1}
                            >
                              {t("delete")}
                            </button>
                            <button className="is-primary" onClick={saveStepEdits}>
                              {t("save_changes")}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <strong>{expandedStep.title}</strong>
                          <p>{expandedStep.description || t("step_description_empty")}</p>
                          <div className="step-piece-expanded__meta">
                            <span>
                              {expandedStep.durationMinutes} {t("minutes")}
                            </span>
                            <button onClick={() => toggleStepComplete(expandedStep.id)}>
                              <Check className="size-3.5" />
                              {expandedStep.isCompleted ? t("mark_incomplete") : t("mark_complete")}
                            </button>
                            <button onClick={() => beginEditingStep(expandedStep.id)}>
                              <Pencil className="size-3.5" /> {t("edit")}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              {editingTaskId !== selectedTask.id &&
                (addingStep ? (
                  <form
                    className="step-piece-composer"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addStep();
                    }}
                  >
                    <input
                      autoFocus
                      value={newStepTitle}
                      onChange={(event) => setNewStepTitle(event.target.value)}
                      placeholder={t("new_step")}
                      aria-label={t("step_title")}
                    />
                    <textarea
                      value={newStepDescription}
                      onChange={(event) => setNewStepDescription(event.target.value)}
                      placeholder={t("step_description_placeholder")}
                      aria-label={t("step_description")}
                    />
                    <label className="step-piece-expanded__duration">
                      <span>{t("step_duration")}</span>
                      <input
                        type="number"
                        min="1"
                        max="240"
                        value={newStepDuration}
                        onChange={(event) => setNewStepDuration(Number(event.target.value))}
                      />
                      <span>{t("minutes")}</span>
                    </label>
                    <div className="step-piece-expanded__actions">
                      <button type="button" onClick={() => setAddingStep(false)}>
                        {t("cancel")}
                      </button>
                      <button className="is-primary" type="submit" disabled={!newStepTitle.trim()}>
                        <Plus className="size-3.5" /> {t("add_step")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button className="step-piece-add" onClick={() => setAddingStep(true)}>
                    <Plus className="size-3.5" /> {t("add_step")}
                  </button>
                ))}
              <div className="selected-piece-panel__actions">
                {editingTaskId === selectedTask.id ? (
                  <button className="piece-primary" onClick={saveTaskEdits}>
                    <Check className="size-4" /> {t("save_changes")}
                  </button>
                ) : (
                  <button className="piece-edit-action" onClick={beginEditingTask}>
                    <Pencil className="size-3.5" /> {t("edit")}
                  </button>
                )}
                {selectedTask.status !== "completed" && editingTaskId !== selectedTask.id && (
                  <button
                    className="piece-primary piece-primary--commit"
                    onClick={() => startTaskById(selectedTask.id)}
                  >
                    <Play className="size-4 fill-current" /> {t("continue_piece")}
                  </button>
                )}
                {editingTaskId !== selectedTask.id && (
                  <button
                    className="piece-edit-action"
                    onClick={() => void regenerateSteps()}
                    disabled={regeneratingTask}
                  >
                    {regeneratingTask ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    {t("regenerate_steps")}
                  </button>
                )}
              </div>
            </>
          ) : recommendationLoading ? (
            <div className="piece-recommendation-loading" role="status">
              <Loader2 className="size-4 animate-spin" /> {t("choosing_next")}
            </div>
          ) : recommendation ? (
            <button
              type="button"
              className="piece-recommendation"
              onClick={() => setSelectedId(recommendation.taskId)}
            >
              <span className="selected-piece-panel__eyebrow">
                <Sparkles className="size-3.5" /> {t("try_this_next")}
              </span>
              <strong>{recommendation.nextStep}</strong>
              <ArrowRight className="size-4" aria-hidden="true" />
              <small>{recommendation.reason}</small>
            </button>
          ) : (
            <button
              className="piece-recommendation"
              onClick={() =>
                setSelectedId(pieces.find((piece) => piece.kind === "empty")?.id ?? null)
              }
            >
              <span className="selected-piece-panel__eyebrow">{t("new_piece")}</span>
              <strong>{t("task_capture_prompt")}</strong>
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </section>

        <nav className="flow-overview__quiet-nav">
          <Link to="/stats">{t("progress")}</Link>
          <Link to="/flows/$flowId/edit" params={{ flowId: flow.id }}>
            {t("task_workspace")}
          </Link>
        </nav>
      </main>
    </div>
  );
}

function ObjectLoading() {
  return (
    <div className="object-loading" role="status" aria-label="Loading Flow">
      <span />
    </div>
  );
}
