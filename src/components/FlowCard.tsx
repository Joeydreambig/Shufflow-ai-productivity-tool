import { Link } from "@tanstack/react-router";
import { Play, Trash2 } from "lucide-react";
import type { Flow } from "@/lib/types";
import { colorForFlow, flowTags } from "@/lib/utils-flow";
import { useT } from "@/lib/i18n";

interface Props {
  flow: Flow;
  onDelete: () => void;
}

export function FlowCard({ flow, onDelete }: Props) {
  const t = useT();
  const allSteps = flow.tasks.flatMap((tk) => tk.steps);
  const wins = allSteps.filter((s) => s.isCompleted).length;
  const tags = flowTags(flow);
  const totalMin = flow.totalDurationMinutes;
  const accent = colorForFlow(flow);

  return (
    <div
      data-accent={accent}
      className="group relative rounded-3xl bg-card shadow-soft border border-border/60 p-5 transition hover:shadow-md"
    >
      <Link
        to="/flows/$flowId"
        params={{ flowId: flow.id }}
        className="flex items-start gap-3 outline-none"
      >
        <div className="size-12 rounded-2xl bg-brand-soft grid place-items-center text-2xl shrink-0">
          {flow.emoji || "✨"}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight break-words">{flow.title}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((x) => (
              <span
                key={x}
                className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5"
              >
                {t(x)}
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {wins}/{allSteps.length || 0} {t("wins")}
        </span>
        <span>·</span>
        <span>{totalMin}m</span>
      </div>

      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-brand transition-all" style={{ width: `${flow.progress}%` }} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Link
          to="/flows/$flowId/run"
          params={{ flowId: flow.id }}
          className="flex-1 h-11 rounded-2xl bg-brand text-brand-foreground font-medium grid place-items-center hover:opacity-90 transition"
        >
          <span className="inline-flex items-center gap-2">
            <Play className="size-4 fill-current" /> {t("play")}
          </span>
        </Link>
        <Link
          to="/flows/$flowId/edit"
          params={{ flowId: flow.id }}
          className="h-11 px-4 rounded-2xl bg-muted text-foreground font-medium grid place-items-center hover:bg-muted/70 transition"
        >
          {t("edit")}
        </Link>
        <button
          onClick={onDelete}
          className="size-11 rounded-2xl bg-muted hover:bg-destructive/10 hover:text-destructive grid place-items-center transition"
          aria-label={t("delete")}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
