import { useAppStore } from "./store";
import type { AppData, Flow, Step, Task } from "./types";

export const DEMO_FLOW_ID = "demo-thesis-flow";
export const DEMO_TASK_TITLE = "Write the validation methodology chapter";
export const DEMO_STORAGE_BACKUP = "shufflow:demo-backup:v1";

export const DEMO_DECOMPOSITION = [
  "Define the validation objectives",
  "Describe the case selection approach",
  "Specify the participant sampling strategy",
  "Select validity and reliability measures",
  "Draft the analysis plan",
  "Review the section for methodological consistency",
] as const;

function step(id: string, title: string, durationMinutes = 8, isCompleted = false): Step {
  return { id, title, durationMinutes, isCompleted };
}

function task(id: string, title: string, steps: Step[], emoji = "◆"): Task {
  return {
    id,
    title,
    emoji,
    status: steps.every((item) => item.isCompleted) ? "completed" : "pending",
    priority: "normal",
    difficulty: "medium",
    steps,
    isRecurring: false,
    recurrence: { kind: "one-time" },
  };
}

export function createDemoFlow(): Flow {
  const now = Date.now();
  return {
    id: DEMO_FLOW_ID,
    title: "Finish PhD thesis chapter",
    emoji: "◇",
    tags: ["Demo"],
    tasks: [
      task(
        "demo-clean-data",
        "Clean and summarise validation data",
        [
          step("demo-missing-values", "Check missing values", 6),
          step("demo-group-labels", "Confirm participant group labels", 5),
          step("demo-stats", "Generate descriptive statistics", 10),
          step("demo-review-values", "Review unexpected values", 7),
        ],
        "◈",
      ),
      task(
        "demo-literature",
        "Tighten the validation literature bridge",
        [
          step("demo-lit-map", "Map the two strongest supporting studies", 8, true),
          step("demo-lit-bridge", "Draft the transition into methodology", 9, true),
        ],
        "✓",
      ),
    ],
    totalDurationMinutes: 45,
    progress: 33,
    isRecurring: false,
    status: "active",
    color: "violet",
    actualMinutesSpent: 18,
    completionCount: 0,
    sessions: [{ ts: now - 86_400_000, minutes: 18 }],
    createdAt: now - 172_800_000,
    updatedAt: now,
  };
}

function createDemoCompanionFlows(): Flow[] {
  const now = Date.now();
  return [
    {
      id: "demo-conference-flow",
      title: "Conference presentation",
      emoji: "◇",
      tags: ["Demo"],
      tasks: [
        task(
          "demo-presentation-story",
          "Shape the presentation story",
          [
            step("demo-story-result", "Choose the strongest result", 8, true),
            step("demo-story-arc", "Draft the three-part story arc", 10),
            step("demo-story-slides", "Map results to slides", 12),
          ],
          "◈",
        ),
      ],
      totalDurationMinutes: 30,
      progress: 33,
      isRecurring: false,
      status: "active",
      color: "sky",
      actualMinutesSpent: 8,
      completionCount: 0,
      sessions: [{ ts: now - 172_800_000, minutes: 8 }],
      createdAt: now - 259_200_000,
      updatedAt: now - 3_600_000,
    },
    {
      id: "demo-personal-flow",
      title: "Personal reset",
      emoji: "◇",
      tags: ["Demo"],
      tasks: [
        task(
          "demo-weekend-plan",
          "Plan a restorative weekend",
          [
            step("demo-weekend-space", "Protect one quiet morning", 5, true),
            step("demo-weekend-outside", "Choose one outdoor activity", 6),
            step("demo-weekend-friend", "Message one friend", 4),
          ],
          "◈",
        ),
      ],
      totalDurationMinutes: 15,
      progress: 33,
      isRecurring: false,
      status: "active",
      color: "emerald",
      actualMinutesSpent: 5,
      completionCount: 0,
      sessions: [{ ts: now - 259_200_000, minutes: 5 }],
      createdAt: now - 345_600_000,
      updatedAt: now - 7_200_000,
    },
  ];
}

export function isDemoMode() {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get("demo") === "true" ||
    sessionStorage.getItem("shufflow:demo-active") === "true"
  );
}

export function resetDemoState() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(DEMO_STORAGE_BACKUP)) {
    const ordinary = localStorage.getItem("shufflow:v1");
    if (ordinary) localStorage.setItem(DEMO_STORAGE_BACKUP, ordinary);
  }
  sessionStorage.setItem("shufflow:demo-active", "true");
  sessionStorage.removeItem("startTaskId");
  sessionStorage.removeItem("shufflow:start-immediately");
  localStorage.removeItem("shufflow:gesture-hint-seen");
  const data: AppData = {
    flows: [createDemoFlow(), ...createDemoCompanionFlows()],
    stats: {},
    settings: {
      ...useAppStore.getState().settings,
      language: "en",
      onboardingSeen: true,
      shuffleMode: "this-flow",
      skipIntervalSetup: true,
      defaultChimeMinutes: 20,
    },
  };
  useAppStore.setState({ ...data, hydrated: true });
}

export function restoreOrdinaryState() {
  if (typeof window === "undefined") return false;
  const backup = localStorage.getItem(DEMO_STORAGE_BACKUP);
  if (!backup) return false;
  localStorage.setItem("shufflow:v1", backup);
  localStorage.removeItem(DEMO_STORAGE_BACKUP);
  sessionStorage.removeItem("shufflow:demo-active");
  window.location.assign("/");
  return true;
}
