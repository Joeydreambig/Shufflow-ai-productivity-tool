import { useEffect, useState } from "react";
import { ChevronLeft, Dice5, ListChecks, Plus, Play, Sparkles, Timer } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { Language } from "@/lib/types";

export function OnboardingGate() {
  const hydrated = useAppStore((s) => s.hydrated);
  const seen = useAppStore((s) => s.settings.onboardingSeen);
  const lang = useAppStore((s) => s.settings.language);
  if (!hydrated) return null;
  if (seen && lang) return null;
  return <Onboarding />;
}

function Onboarding() {
  const t = useT();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const update = useAppStore((s) => s.updateSettings);
  const lang = useAppStore((s) => s.settings.language);
  // step: 0 = language, 1..4 = demo scenes
  const [i, setI] = useState(lang ? 1 : 0);

  const finish = () => update({ onboardingSeen: true });
  const totalSteps = 6;

  // swipe
  const [touchX, setTouchX] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchX(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX == null || i === 0) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (dx < -40) setI((x) => Math.min(totalSteps - 1, x + 1));
    if (dx > 40) setI((x) => Math.max(1, x - 1));
    setTouchX(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (i === 0) return;
      if (e.key === "ArrowRight") setI((x) => Math.min(totalSteps - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(1, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-background flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* top bar */}
      <div className="flex items-center justify-between px-4 pt-4">
        {i > 1 ? (
          <button
            onClick={() => setI((x) => Math.max(1, x - 1))}
            className="size-9 rounded-full grid place-items-center hover:bg-muted"
            aria-label={t("back_btn")}
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <span className="size-9" />
        )}
        {i > 0 && (
          <button
            onClick={finish}
            className="text-sm text-muted-foreground hover:text-foreground px-3 h-9"
          >
            {t("skip")}
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {i === 0 && (
          <LanguageStep
            onPick={(l) => {
              setLanguage(l);
              setI(1);
            }}
          />
        )}
        {i === 1 && <DemoHome />}
        {i === 2 && <DemoCreate />}
        {i === 3 && <DemoDetail />}
        {i === 4 && <DemoRun />}
        {i === 5 && <DemoShuffle />}
      </div>

      {/* footer */}
      {i > 0 && (
        <div className="px-6 pb-8">
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {[1, 2, 3, 4, 5].map((idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-6 bg-brand" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => {
              if (i === totalSteps - 1) finish();
              else setI((x) => x + 1);
            }}
            className="w-full h-14 rounded-2xl bg-brand text-brand-foreground font-semibold"
          >
            {i === totalSteps - 1 ? t("get_started") : t("next")}
          </button>
        </div>
      )}
    </div>
  );
}

/* -------- Language step with value prop -------- */
function LanguageStep({ onPick }: { onPick: (l: Language) => void }) {
  const t = useT();
  return (
    <div className="w-full max-w-sm text-center">
      <div className="size-16 mx-auto rounded-3xl bg-brand-soft grid place-items-center text-3xl">
        🎲
      </div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Shufflow</h1>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("welcome_tagline")}</p>

      <ul className="mt-6 grid grid-cols-3 gap-2 text-center">
        <ValueProp icon={<ListChecks className="size-4" />} label={t("vp_breakdown")} />
        <ValueProp icon={<Timer className="size-4" />} label={t("vp_timer")} />
        <ValueProp icon={<Dice5 className="size-4" />} label={t("vp_shuffle")} />
      </ul>

      <p className="mt-8 text-xs uppercase tracking-wide text-muted-foreground">
        {t("pick_language")}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["en", "zh"] as Language[]).map((l) => (
          <button
            key={l}
            onClick={() => onPick(l)}
            className="h-14 rounded-2xl border border-border bg-card hover:bg-muted/50 font-medium"
          >
            {l === "en" ? "English" : "中文"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ValueProp({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="rounded-2xl bg-card border border-border/60 p-3 flex flex-col items-center gap-1.5">
      <span className="size-8 rounded-full bg-brand-soft text-brand grid place-items-center">
        {icon}
      </span>
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </li>
  );
}

/* -------- Demo scenes (mock UI + callout) -------- */

function SceneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-[2rem] border-4 border-foreground/10 bg-background shadow-soft overflow-hidden">
      {children}
    </div>
  );
}

function Callout({ text, position }: { text: string; position: "top" | "bottom" | "middle" }) {
  const cls =
    position === "top"
      ? "top-4 left-1/2 -translate-x-1/2"
      : position === "middle"
        ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        : "bottom-4 left-1/2 -translate-x-1/2";
  return (
    <div
      className={`absolute ${cls} z-10 bg-foreground text-background text-[11px] font-medium px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap`}
    >
      {text}
    </div>
  );
}

function Pulse({ className }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute rounded-full ring-4 ring-brand/60 animate-ping ${className ?? ""}`}
    />
  );
}

function SceneCaption({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="mt-6 text-center max-w-xs">
      <p className="text-xs uppercase tracking-wide text-brand font-semibold">{step}</p>
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function DemoHome() {
  const t = useT();
  return (
    <div className="flex flex-col items-center">
      <SceneFrame>
        <div className="px-3 pt-4">
          <p className="text-[10px] text-muted-foreground">Shufflow</p>
          <p className="text-sm font-semibold mt-0.5">{t("home_question")}</p>
          <div className="mt-3 inline-flex bg-muted rounded-full p-0.5">
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-card font-medium">
              {t("tab_active")}
            </span>
            <span className="px-2 py-0.5 text-[10px] rounded-full text-muted-foreground">
              {t("tab_finished")}
            </span>
          </div>
          <div className="mt-3 rounded-xl bg-card border border-border/60 p-2.5">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-brand-soft grid place-items-center text-sm">
                ✨
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate">{t("ob_demo_sample_flow")}</p>
                <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-brand" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-3 right-3">
          <div className="relative h-10 rounded-xl bg-brand text-brand-foreground grid place-items-center text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1">
              <Plus className="size-3" /> {t("new_flow")}
            </span>
            <Pulse className="inset-0" />
          </div>
        </div>
        <Callout text={t("ob_demo_tap_here")} position="bottom" />
      </SceneFrame>
      <SceneCaption step="1 / 5" title={t("ob_step1_title")} body={t("ob_step1_body")} />
    </div>
  );
}

function DemoCreate() {
  const t = useT();
  return (
    <div className="flex flex-col items-center">
      <SceneFrame>
        <div className="px-3 pt-4">
          <p className="text-[10px] text-muted-foreground uppercase">{t("flow_title_label")}</p>
          <div className="mt-1 h-7 rounded-lg bg-muted" />
          <div className="mt-3 rounded-xl bg-card border border-border/60 p-2.5">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-md bg-brand-soft grid place-items-center text-xs">
                ✉️
              </div>
              <p className="text-[11px] font-semibold flex-1">{t("ob_demo_sample_task")}</p>
            </div>
            <div className="mt-2 space-y-1">
              <div className="h-2 rounded bg-muted w-3/4" />
              <div className="h-2 rounded bg-muted w-1/2" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-3">
          <div className="relative size-11 rounded-xl bg-foreground text-background grid place-items-center">
            <Plus className="size-5" />
            <Pulse className="inset-0" />
          </div>
        </div>
        <Callout text={t("add_task")} position="bottom" />
      </SceneFrame>
      <SceneCaption step="2 / 5" title={t("ob_step2_title")} body={t("ob_step2_body")} />
    </div>
  );
}

function DemoRun() {
  const t = useT();
  return (
    <div className="flex flex-col items-center">
      <SceneFrame>
        <div className="absolute inset-0 flex flex-col items-center pt-8">
          <div className="relative size-28 rounded-full grid place-items-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" stroke="var(--muted)" strokeWidth="6" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="var(--brand)"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="276"
                strokeDashoffset="80"
              />
            </svg>
            <span className="text-base font-semibold tabular-nums">12:30</span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">{t("next_chime_in")} 04:50</p>
          <div className="mt-3 relative">
            <button className="size-12 rounded-full bg-brand text-brand-foreground grid place-items-center shadow-glow">
              <Play className="size-5 fill-current" />
            </button>
            <Pulse className="inset-0" />
          </div>
          <div className="mt-3 w-[80%] rounded-lg bg-card border border-border/60 p-2 text-[10px]">
            <p className="text-muted-foreground uppercase">{t("now")}</p>
            <p className="font-medium">{t("ob_demo_sample_task")}</p>
          </div>
        </div>
        <Callout text={t("play")} position="bottom" />
      </SceneFrame>
      <SceneCaption step="4 / 5" title={t("ob_step3_title")} body={t("ob_step3_body")} />
    </div>
  );
}

function DemoShuffle() {
  const t = useT();
  return (
    <div className="flex flex-col items-center">
      <SceneFrame>
        <div className="absolute inset-0 flex flex-col items-center pt-8">
          <div className="size-20 rounded-full bg-muted grid place-items-center text-2xl">🎲</div>
          <div className="mt-4 w-[80%] rounded-lg bg-brand-soft border border-brand/30 p-2 text-[10px]">
            <p className="font-semibold flex items-center gap-1">
              <Sparkles className="size-3 text-brand" /> {t("shuffled_to")}
            </p>
            <p className="text-muted-foreground mt-0.5">{t("reason_world")}</p>
          </div>
        </div>
        <div className="absolute bottom-4 left-3 right-3">
          <div className="relative h-10 rounded-xl bg-foreground text-background grid place-items-center text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1">
              <Dice5 className="size-3" /> {t("shuffle")}
            </span>
            <Pulse className="inset-0" />
          </div>
        </div>
        <Callout text={t("shuffle")} position="bottom" />
      </SceneFrame>
      <SceneCaption step="5 / 5" title={t("ob_step4_title")} body={t("ob_step4_body")} />
    </div>
  );
}

function DemoDetail() {
  const t = useT();
  return (
    <div className="flex flex-col items-center">
      <SceneFrame>
        <div className="px-3 pt-5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("breakdown_detail")}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[
              { k: "detail_chunky" },
              { k: "detail_balanced", active: true },
              { k: "detail_micro" },
            ].map((o, idx) => (
              <div
                key={idx}
                className={`h-8 rounded-lg text-[10px] font-medium grid place-items-center ${
                  o.active ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {t(o.k)}
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-lg bg-card border border-border/60 p-1.5 flex items-center gap-1.5"
              >
                <span className="size-4 rounded-full bg-brand-soft text-[8px] grid place-items-center text-brand">
                  {n}
                </span>
                <div className="flex-1 h-1.5 rounded bg-muted" />
                <span className="text-[9px] text-muted-foreground tabular-nums">12m</span>
              </div>
            ))}
          </div>
        </div>
      </SceneFrame>
      <SceneCaption step="3 / 5" title={t("onb_detail_title")} body={t("onb_detail_body")} />
    </div>
  );
}
