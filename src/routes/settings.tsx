import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useAppStore } from "@/lib/store";
import type { AccentColor, Language, ShuffleMode } from "@/lib/types";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Shufflow" },
      { name: "description", content: "Personalize Shufflow." },
    ],
  }),
  component: SettingsPage,
});

const COLORS: { id: AccentColor; label: string }[] = [
  { id: "indigo", label: "Indigo" },
  { id: "emerald", label: "Emerald" },
  { id: "sky", label: "Sky" },
  { id: "rose", label: "Rose" },
  { id: "amber", label: "Amber" },
  { id: "violet", label: "Violet" },
];

function SettingsPage() {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const setAccent = useAppStore((s) => s.setAccent);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setShuffleMode = useAppStore((s) => s.setShuffleMode);
  const update = useAppStore((s) => s.updateSettings);
  const reset = useAppStore((s) => s.reset);

  const modes: { id: ShuffleMode; key: string; sub: string }[] = [
    { id: "this-flow", key: "shuffle_mode_this_flow", sub: "shuffle_mode_this_flow_sub" },
    { id: "mixer", key: "shuffle_mode_mixer", sub: "shuffle_mode_mixer_sub" },
    { id: "world", key: "shuffle_mode_world", sub: "shuffle_mode_world_sub" },
    { id: "ai", key: "shuffle_mode_ai", sub: "shuffle_mode_ai_sub" },
  ];

  return (
    <div className="pb-16">
      <AppHeader back title={t("settings")} showNav={false} />
      <div className="px-5 space-y-6">
        <section className="rounded-3xl bg-card border border-border/60 p-4">
          <h2 className="text-sm font-semibold mb-2">{t("language")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {(["en", "zh"] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`h-11 rounded-2xl border font-medium ${
                  settings.language === l
                    ? "border-brand bg-brand-soft text-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {l === "en" ? "English" : "中文"}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            {t("completion_color")}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setAccent(c.id)}
                data-accent={c.id}
                className={`group rounded-2xl border p-3 flex items-center gap-2 transition ${
                  settings.accentColor === c.id
                    ? "border-brand ring-2 ring-brand/30 bg-brand-soft"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                <span className="size-5 rounded-full bg-brand" />
                <span className="text-sm font-medium">{c.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-card border border-border/60 p-4">
          <h2 className="text-sm font-semibold">{t("default_shuffle")}</h2>
          <div className="mt-3 space-y-1.5">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setShuffleMode(m.id)}
                className={`w-full text-left rounded-xl p-3 transition ${
                  settings.shuffleMode === m.id ? "bg-brand-soft" : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <p className="text-sm font-medium">{t(m.key)}</p>
                <p className="text-xs text-muted-foreground">{t(m.sub)}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-card border border-border/60 p-4">
          <h2 className="text-sm font-semibold">{t("default_chime")}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("default_chime_sub")}</p>
          <div className="mt-3 inline-flex items-center bg-muted rounded-full p-1">
            <button
              className="size-9 grid place-items-center rounded-full hover:bg-card"
              onClick={() =>
                update({ defaultChimeMinutes: Math.max(1, settings.defaultChimeMinutes - 1) })
              }
              aria-label="-1"
            >
              <Minus className="size-4" />
            </button>
            <input
              type="number"
              min={1}
              value={settings.defaultChimeMinutes}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") return;
                const v = parseInt(raw, 10);
                if (!isNaN(v) && v >= 1) update({ defaultChimeMinutes: v });
              }}
              className="w-12 bg-transparent text-sm font-semibold tabular-nums text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={t("minutes")}
            />
            <span className="pr-2 text-xs text-muted-foreground">{t("minutes")}</span>
            <button
              className="size-9 grid place-items-center rounded-full hover:bg-card"
              onClick={() => update({ defaultChimeMinutes: settings.defaultChimeMinutes + 1 })}
              aria-label="+1"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-card border border-border/60 p-4">
          <h2 className="text-sm font-semibold">{t("breakdown_detail")}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("breakdown_detail_sub")}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(
              [
                { v: 1, k: "detail_chunky" },
                { v: 3, k: "detail_balanced" },
                { v: 5, k: "detail_micro" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.v}
                onClick={() => update({ defaultDetailLevel: opt.v })}
                className={`h-11 rounded-xl text-sm font-medium transition ${
                  (settings.defaultDetailLevel ?? 3) === opt.v
                    ? "bg-brand text-brand-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {t(opt.k)}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-card border border-border/60 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t("skip_interval")}</h2>
            <p className="text-xs text-muted-foreground mt-1">{t("skip_interval_sub")}</p>
          </div>
          <Toggle
            on={settings.skipIntervalSetup}
            onChange={(v) => update({ skipIntervalSetup: v })}
          />
        </section>

        <section className="rounded-3xl bg-card border border-border/60 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t("show_onboarding")}</h2>
            <p className="text-xs text-muted-foreground mt-1">{t("show_onboarding_sub")}</p>
          </div>
          <section className="rounded-3xl bg-card border border-border/60 p-4">
            <h2 className="text-sm font-semibold">{t("survey_title")}</h2>
            <p className="text-xs text-muted-foreground mt-1">{t("survey_sub")}</p>
            <a
              href={
                settings.language === "zh"
                  ? "https://imperial.eu.qualtrics.com/jfe/form/SV_a2VehKnCenoRfF4"
                  : "https://imperial.eu.qualtrics.com/jfe/form/SV_8idqMjZhkvHEUQu"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-10 px-4 rounded-full bg-brand text-brand-foreground text-sm font-medium items-center"
            >
              {t("survey_cta")}
            </a>
          </section>

          <button
            onClick={() => {
              update({ onboardingSeen: false });
              toast.success("✓");
            }}
            className="h-9 px-3 rounded-full bg-muted text-sm font-medium"
          >
            {t("start")}
          </button>
        </section>

        <button
          onClick={() => {
            if (confirm(t("reset_confirm"))) {
              reset();
              toast.success(t("cleared"));
            }
          }}
          className="w-full h-12 rounded-2xl bg-muted text-destructive font-medium inline-flex items-center justify-center gap-2 hover:bg-destructive/10"
        >
          <Trash2 className="size-4" /> {t("reset_all")}
        </button>

        <p className="text-center text-xs text-muted-foreground">{t("data_local")}</p>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
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
