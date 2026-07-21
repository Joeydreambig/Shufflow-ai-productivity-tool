import type { AccentColor, Flow, Recurrence, Task } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

export function computeFlowProgress(flow: Flow): { progress: number; total: number } {
  const allSteps = flow.tasks.flatMap((t) => t.steps);
  const total = allSteps.length;
  if (!total) return { progress: 0, total: 0 };
  const done = allSteps.filter((s) => s.isCompleted).length;
  return { progress: Math.round((done / total) * 100), total };
}

export function totalDuration(flow: Flow) {
  return flow.tasks.reduce(
    (acc, t) => acc + t.steps.reduce((a, s) => a + (s.durationMinutes || 0), 0),
    0,
  );
}

export function remainingDuration(flow: Flow) {
  return flow.tasks.reduce(
    (acc, t) => acc + t.steps.reduce((a, s) => a + (s.isCompleted ? 0 : s.durationMinutes || 0), 0),
    0,
  );
}

export function spentDuration(flow: Flow) {
  return totalDuration(flow) - remainingDuration(flow);
}

export function nextDateFor(rec: Recurrence, from = new Date()): string | undefined {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  switch (rec.kind) {
    case "one-time":
      return undefined;
    case "daily":
      d.setDate(d.getDate() + 1);
      return todayKey(d);
    case "interval":
      d.setDate(d.getDate() + Math.max(1, rec.days));
      return todayKey(d);
    case "weekly": {
      const wd = rec.weekdays.length ? rec.weekdays : [1];
      for (let i = 1; i <= 8; i++) {
        const cand = new Date(d);
        cand.setDate(cand.getDate() + i);
        if (wd.includes(cand.getDay())) return todayKey(cand);
      }
      return undefined;
    }
  }
}

export function refreshRecurring(flows: Flow[]): Flow[] {
  const today = todayKey();
  return flows.map((f) => {
    let changed = false;
    const tasks = f.tasks.map((t) => {
      if (
        t.isRecurring &&
        t.nextAvailableDate &&
        t.nextAvailableDate <= today &&
        t.status === "completed"
      ) {
        changed = true;
        return {
          ...t,
          status: "pending" as const,
          steps: t.steps.map((s) => ({ ...s, isCompleted: false })),
          resumeContext: undefined,
        };
      }
      return t;
    });
    if (!changed) return f;
    const next: Flow = { ...f, tasks, status: "active" };
    const { progress } = computeFlowProgress(next);
    next.progress = progress;
    next.totalDurationMinutes = totalDuration(next);
    return next;
  });
}

/** Returns i18n keys for tags so callers can localize. */
export function tagsForTask(t: Task): string[] {
  const tags: string[] = [];
  if (t.priority === "focused") tags.push("focused");
  if (t.priority === "quick") tags.push("quick");
  if (t.isRecurring) tags.push("routine");
  return tags;
}

export function flowTags(f: Flow): string[] {
  const set = new Set<string>();
  f.tasks.forEach((t) => tagsForTask(t).forEach((x) => set.add(x)));
  if (f.isRecurring) set.add("routine");
  return [...set];
}

const PALETTE: AccentColor[] = ["indigo", "emerald", "sky", "rose", "amber", "violet"];
export function colorForFlow(f: Flow): AccentColor {
  if (f.color) return f.color;
  let h = 0;
  for (let i = 0; i < f.id.length; i++) h = (h * 31 + f.id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
export const ACCENT_PALETTE = PALETTE;
