import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Cube, type CubePieceState } from "@/components/cube/Cube";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Progress — Shufflow" },
      { name: "description", content: "See separate Pieces become meaningful progress." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const t = useT();
  const flows = useAppStore((state) => state.flows);
  const stats = useAppStore((state) => state.stats);
  const flow = [...flows].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const entries = Object.entries(stats);
  const focusMinutes =
    Math.round(flow?.actualMinutesSpent ?? 0) +
    entries.reduce((total, [, value]) => total + value.focusMinutes, 0);
  const tasksCompleted = flows.reduce(
    (total, item) => total + item.tasks.filter((task) => task.status === "completed").length,
    0,
  );

  const pieces: CubePieceState[] =
    flow?.tasks.slice(0, 8).map((task) => ({
      id: task.id,
      done: task.status === "completed",
      kind: task.status === "completed" ? "completed" : "active",
      label: task.title,
    })) ?? [];
  while (pieces.length < 8) {
    pieces.push({
      id: `progress-empty-${pieces.length}`,
      done: false,
      kind: "empty",
      label: t("empty_piece_create"),
    });
  }

  const completed = flow?.tasks.filter((task) => task.status === "completed").length ?? 0;
  const remaining = (flow?.tasks.length ?? 0) - completed;

  return (
    <div className="flow-progress-page">
      <AppHeader back title={t("progress")} showNav={false} />
      {flow ? (
        <main>
          <p>{t("flow_cube_label")}</p>
          <h1>{flow.title}</h1>
          <div className="flow-progress-page__cube">
            <Cube mode="assembly" size={210} pieces={pieces} explode={0.08} />
          </div>
          <strong>{flow.progress}%</strong>
          <span>
            {completed} {t("pieces_completed")} · {remaining} {t("remaining")}
          </span>
          <p className="flow-progress-page__statement">{t("progress_statement")}</p>
          <Link to="/flows/$flowId" params={{ flowId: flow.id }}>
            {t("continue_flow")}
          </Link>
          <details>
            <summary>{t("supporting_metrics")}</summary>
            <dl>
              <div>
                <dt>{t("actual_time")}</dt>
                <dd>{focusMinutes}m</dd>
              </div>
              <div>
                <dt>{t("tasks_done")}</dt>
                <dd>{tasksCompleted}</dd>
              </div>
              <div>
                <dt>{t("sessions_count")}</dt>
                <dd>{flow.sessions?.length ?? 0}</dd>
              </div>
              <div>
                <dt>{t("shuffles")}</dt>
                <dd>—</dd>
              </div>
            </dl>
          </details>
        </main>
      ) : (
        <p className="p-8 text-center text-muted-foreground">{t("no_sessions")}</p>
      )}
    </div>
  );
}
