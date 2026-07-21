import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callTool<T>(opts: {
  system: string;
  user: string;
  model?: string;
  toolName: string;
  description: string;
  parameters: Record<string, unknown>;
}): Promise<T> {
  const directOpenAIKey = process.env.OPENAI_API_KEY;
  const key = directOpenAIKey ?? process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI service not configured");
  const endpoint = directOpenAIKey ? "https://api.openai.com/v1/chat/completions" : GATEWAY_URL;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: directOpenAIKey ? "gpt-4.1" : (opts.model ?? "openai/gpt-4.1"),
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: opts.toolName,
            description: opts.description,
            parameters: opts.parameters,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: opts.toolName } },
    }),
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (res.status === 402) throw new Error("PAYMENT_REQUIRED");
  if (!res.ok) {
    const t = await res.text();
    console.error("AI gateway error", res.status, t);
    throw new Error(`AI error ${res.status}`);
  }
  const data = await res.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no tool call");
  return JSON.parse(args) as T;
}

const langInstr = (lang?: string) =>
  lang === "zh"
    ? " 必须只用简体中文回答；引用的任务名也要翻译成中文，不要出现英文字符或拼音。"
    : " Respond ONLY in English. Translate any non-English task names you reference. Do not output any Chinese characters.";

/* ---------- 1) Task breakdown ---------- */
const breakdownInput = z.object({
  title: z.string().min(1).max(200),
  detailLevel: z.number().min(1).max(5).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  lang: z.enum(["en", "zh"]).optional(),
});
const breakdownOutput = z.object({
  emoji: z.string().min(1).max(8),
  steps: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        description: z.string().min(1).max(180),
        durationMinutes: z.number().int().min(2).max(25),
      }),
    )
    .min(3)
    .max(7),
});
export const breakdownTask = createServerFn({ method: "POST" })
  .inputValidator((d) => breakdownInput.parse(d))
  .handler(async ({ data }) => {
    const difficulty = data.difficulty ?? "medium";
    const detail = data.detailLevel ?? 3;
    const durationBand =
      difficulty === "easy" ? "8-15 min" : difficulty === "hard" ? "12-25 min" : "10-20 min";
    const stepCountBand =
      detail <= 1
        ? "3 steps"
        : detail === 2
          ? "3-4 steps"
          : detail === 3
            ? "4-5 steps"
            : detail === 4
              ? "5-6 steps"
              : "6-7 steps";
    const result = await callTool<unknown>({
      model: "openai/gpt-4.1",
      system:
        `You are a productivity coach for someone with ADHD. They benefit from short, concrete, frequent wins. ` +
        `Break the task into ${stepCountBand}, each ${durationBand}. ` +
        `RULES: ` +
        `(a) NEVER let a single step exceed 25 minutes — split it further if needed. ` +
        `(b) The FIRST step must be ≤ 20 minutes — a gentle on-ramp to reduce activation cost. If the natural first step is bigger, split it. ` +
        `(c) Add a ~20% buffer to each duration to absorb focus fluctuations. ` +
        `(d) Prefer more, shorter, concrete steps over fewer long ones. ` +
        `(e) Each step title is ONE specific imperative action, not a vague theme. ` +
        `(f) Give each step one short, practical description that clarifies what done looks like. ` +
        `Pick one fitting emoji.` +
        langInstr(data.lang),
      user: `Task: "${data.title}"\nDifficulty: ${difficulty}\nDetail level: ${detail}/5`,
      toolName: "return_breakdown",
      description: "Return emoji and steps",
      parameters: {
        type: "object",
        properties: {
          emoji: { type: "string" },
          steps: {
            type: "array",
            minItems: 3,
            maxItems: 7,
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                durationMinutes: { type: "integer", minimum: 2, maximum: 25 },
              },
              required: ["title", "description", "durationMinutes"],
              additionalProperties: false,
            },
          },
        },
        required: ["emoji", "steps"],
        additionalProperties: false,
      },
    });
    return breakdownOutput.parse(result);
  });

/* ---------- 2) One next-piece recommendation ---------- */
const recommendationInput = z.object({
  flowTitle: z.string().min(1).max(200),
  currentTaskId: z.string().optional(),
  tasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        status: z.enum(["pending", "in-progress", "completed"]),
        steps: z.array(z.object({ title: z.string(), completed: z.boolean() })),
      }),
    )
    .min(1)
    .max(24),
  previousSessions: z
    .array(z.object({ minutes: z.number().nonnegative(), timestamp: z.number() }))
    .max(5),
  lang: z.enum(["en", "zh"]).optional(),
});

const recommendationOutput = z.object({
  taskId: z.string().min(1),
  nextStep: z.string().min(1).max(100),
  reason: z.string().min(1).max(140),
});

export const recommendNextTask = createServerFn({ method: "POST" })
  .inputValidator((data) => recommendationInput.parse(data))
  .handler(async ({ data }) => {
    const result = await callTool<unknown>({
      model: "openai/gpt-4.1",
      system:
        "Choose exactly one helpful next action for this Flow. Consider unfinished work, completed work, the currently selected task, and recent session context. Prefer a concrete unfinished Step with low activation cost and meaningful momentum. Use an exact task id. Return only one recommendation." +
        langInstr(data.lang),
      user:
        `Flow: ${data.flowTitle}\nCurrent task id: ${data.currentTaskId ?? "none"}\n` +
        `Recent sessions: ${data.previousSessions.map((session) => `${session.minutes}m`).join(", ") || "none"}\n` +
        `Tasks:\n${data.tasks
          .map(
            (task) =>
              `- ${task.id} | ${task.status} | ${task.title}\n${task.steps
                .map((step) => `  ${step.completed ? "done" : "todo"}: ${step.title}`)
                .join("\n")}`,
          )
          .join("\n")}`,
      toolName: "return_next_recommendation",
      description: "Return one next task, one concise action, and one short reason",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          nextStep: { type: "string" },
          reason: { type: "string" },
        },
        required: ["taskId", "nextStep", "reason"],
        additionalProperties: false,
      },
    });
    const parsed = recommendationOutput.parse(result);
    const validTask = data.tasks.find(
      (task) => task.id === parsed.taskId && task.status !== "completed",
    );
    if (!validTask) throw new Error("AI returned an unavailable task");
    return parsed;
  });

/* ---------- 3) Resume summary ---------- */
const resumeInput = z.object({
  taskTitle: z.string(),
  completedSteps: z.array(z.string()),
  lang: z.enum(["en", "zh"]).optional(),
});
export const summarizeProgress = createServerFn({ method: "POST" })
  .inputValidator((d) => resumeInput.parse(d))
  .handler(async ({ data }) => {
    return callTool<{ header: string; bullets: string[] }>({
      system:
        "You write short, motivating resume briefings so a user can pick up a paused task. Friendly, focused tone." +
        langInstr(data.lang),
      user: `Task: "${data.taskTitle}"\nAlready done:\n${data.completedSteps.map((s) => "- " + s).join("\n") || "(nothing yet)"}`,
      toolName: "return_summary",
      description: "Return resume briefing",
      parameters: {
        type: "object",
        properties: {
          header: { type: "string" },
          bullets: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
        },
        required: ["header", "bullets"],
        additionalProperties: false,
      },
    });
  });

/* ---------- 3) Shuffle reason ---------- */
const shuffleInput = z.object({
  from: z.string(),
  to: z.string(),
  lang: z.enum(["en", "zh"]).optional(),
});
export const shuffleReason = createServerFn({ method: "POST" })
  .inputValidator((d) => shuffleInput.parse(d))
  .handler(async ({ data }) => {
    const lang = data.lang ?? "en";
    return callTool<{ reason: string }>({
      system:
        "You are a productivity coach. In one short, encouraging sentence (max 14 words), explain why switching tasks is helpful right now." +
        langInstr(lang),
      user: `Language: ${lang}\nFrom: ${data.from}\nTo: ${data.to}`,
      toolName: "return_reason",
      description: "Return short reason",
      parameters: {
        type: "object",
        properties: { reason: { type: "string" } },
        required: ["reason"],
        additionalProperties: false,
      },
    });
  });

/* ---------- 4) Work-life balance picks ---------- */
const balInput = z.object({
  current: z.string(),
  currentDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
  candidates: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      priority: z.string(),
      difficulty: z.string().optional(),
      nextStepMinutes: z.number().optional(),
    }),
  ),
  lang: z.enum(["en", "zh"]).optional(),
});
export const workLifeBalance = createServerFn({ method: "POST" })
  .inputValidator((d) => balInput.parse(d))
  .handler(async ({ data }) => {
    const lang = data.lang ?? "en";
    return callTool<{ picks: { taskId: string; reason: string }[] }>({
      system:
        "The user has ADHD. Choose exactly one next task from the candidates that best balances the current task. " +
        "Prefer higher-priority tasks, gentle on-ramps after a hard task, and avoid scheduling another long hard task back-to-back. " +
        "Use the exact ids provided." +
        langInstr(lang),
      user:
        `Language: ${lang}\n` +
        `Current focus: "${data.current}" (difficulty: ${data.currentDifficulty ?? "unknown"})\n` +
        `Candidates:\n${data.candidates
          .map(
            (c) =>
              `- ${c.id} | priority=${c.priority} | difficulty=${c.difficulty ?? "?"} | nextStep=${c.nextStepMinutes ?? "?"}min | ${c.title}`,
          )
          .join("\n")}`,
      toolName: "return_picks",
      description: "Return balanced picks",
      parameters: {
        type: "object",
        properties: {
          picks: {
            type: "array",
            minItems: 1,
            maxItems: 1,
            items: {
              type: "object",
              properties: {
                taskId: { type: "string" },
                reason: { type: "string" },
              },
              required: ["taskId", "reason"],
              additionalProperties: false,
            },
          },
        },
        required: ["picks"],
        additionalProperties: false,
      },
    });
  });

/* ---------- 5) Auto-name flow ---------- */
const nameInput = z.object({
  taskTitles: z.array(z.string()).min(1),
  lang: z.enum(["en", "zh"]).optional(),
});
export const nameFlow = createServerFn({ method: "POST" })
  .inputValidator((d) => nameInput.parse(d))
  .handler(async ({ data }) => {
    return callTool<{ title: string; emoji: string }>({
      system:
        "Suggest a short, punchy flow name (max 4 words) that captures the theme of these tasks. Pick one emoji." +
        langInstr(data.lang),
      user: data.taskTitles.map((t) => "- " + t).join("\n"),
      toolName: "return_name",
      description: "Return short flow name and emoji",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          emoji: { type: "string" },
        },
        required: ["title", "emoji"],
        additionalProperties: false,
      },
    });
  });

/* ---------- 6) Flow summary ---------- */
const flowSumInput = z.object({
  title: z.string(),
  done: z.array(z.string()),
  todo: z.array(z.string()),
  lang: z.enum(["en", "zh"]).optional(),
});
export const flowSummary = createServerFn({ method: "POST" })
  .inputValidator((d) => flowSumInput.parse(d))
  .handler(async ({ data }) => {
    return callTool<{ headline: string; bullets: string[] }>({
      system:
        "You give a short, motivating overview of where a flow stands and 2-3 concrete next-step suggestions. Friendly tone." +
        langInstr(data.lang),
      user: `Flow: "${data.title}"\nDone:\n${data.done.map((x) => "- " + x).join("\n") || "(none)"}\nTo do:\n${data.todo.map((x) => "- " + x).join("\n") || "(none)"}`,
      toolName: "return_overview",
      description: "Return overview",
      parameters: {
        type: "object",
        properties: {
          headline: { type: "string" },
          bullets: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
        },
        required: ["headline", "bullets"],
        additionalProperties: false,
      },
    });
  });

/* ---------- 7) Session summary ---------- */
const sessSumInput = z.object({
  flowTitle: z.string(),
  stepsDone: z.array(z.string()),
  shuffles: z.number(),
  focusMinutes: z.number(),
  lang: z.enum(["en", "zh"]).optional(),
});
export const sessionSummary = createServerFn({ method: "POST" })
  .inputValidator((d) => sessSumInput.parse(d))
  .handler(async ({ data }) => {
    return callTool<{ line: string }>({
      system:
        "Write one short, encouraging sentence (max 18 words) that recaps a focus session." +
        langInstr(data.lang),
      user: `Flow: ${data.flowTitle}\nFocus: ${data.focusMinutes}m, ${data.stepsDone.length} steps, ${data.shuffles} shuffles.\nRecent steps:\n${data.stepsDone
        .slice(-5)
        .map((s) => "- " + s)
        .join("\n")}`,
      toolName: "return_line",
      description: "Return one-line recap",
      parameters: {
        type: "object",
        properties: { line: { type: "string" } },
        required: ["line"],
        additionalProperties: false,
      },
    });
  });
