import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Shufflow's shared 3D cube — the app's persistent visual anchor.
 *
 * Modes:
 *  - "idle"       gentle drift + drag to spin, no gesture target
 *  - "start"      drag to fill a ring, calls onStart when charged
 *  - "assembly"   shows N sub-pieces (2×2×2 up to 8) with per-piece done state
 *
 * Pure CSS 3D — no three.js. Rotation is written directly to a DOM ref via rAF
 * for smoothness (no per-frame React re-render).
 */

export type CubeMode = "idle" | "start" | "assembly";

export interface CubePieceState {
  id: string;
  done: boolean;
  active?: boolean;
  kind?: "active" | "completed" | "empty" | "aggregate";
  label?: string;
  progress?: number;
  selected?: boolean;
  icon?: ReactNode;
}

interface Props {
  variant?: "create-flow" | "start-session";
  mode?: CubeMode;
  size?: number;
  pieces?: CubePieceState[]; // required for "assembly"
  onStart?: () => void; // "start" mode
  hint?: string;
  chargeLabel?: string;
  readyLabel?: string;
  fallbackLabel?: string;
  onPieceClick?: (id: string) => void;
  /** Remaining energy from 0..1. Used by the same Cube as a focus hourglass. */
  energy?: number;
  centerContent?: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** For "assembly": how much to explode pieces apart (0 = whole cube, 1 = fully scattered) */
  explode?: number;
  className?: string;
  framePadding?: number;
  interactive?: boolean;
}

const CHARGE_TARGET = 360;

export function Cube({
  variant,
  mode = "idle",
  size = 168,
  pieces = [],
  onStart,
  hint,
  chargeLabel,
  readyLabel,
  fallbackLabel,
  onPieceClick,
  energy = 1,
  centerContent,
  onSwipeLeft,
  onSwipeRight,
  explode = 0,
  className,
  framePadding,
  interactive = true,
}: Props) {
  const [chargePct, setChargePct] = useState(0);
  const [ready, setReady] = useState(false);
  const cubeRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const rotationRef = useRef({ x: -22, y: -34 });
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const draggingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const swipeOriginRef = useRef<{ x: number; y: number } | null>(null);
  const chargeRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const startTimerRef = useRef<number | null>(null);

  const trigger = () => {
    if (startedRef.current || mode !== "start") return;
    startedRef.current = true;
    navigator.vibrate?.(30);
    startTimerRef.current = window.setTimeout(() => onStart?.(), 320);
  };

  const writeVisuals = useCallback(() => {
    rafRef.current = null;
    if (cubeRef.current) {
      cubeRef.current.style.transform = `rotateX(${rotationRef.current.x}deg) rotateY(${rotationRef.current.y}deg)`;
    }
  }, []);

  const scheduleVisuals = useCallback(() => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(writeVisuals);
  }, [writeVisuals]);

  const addRotation = (dx: number, dy: number) => {
    rotationRef.current.x -= dy * 0.6;
    rotationRef.current.y += dx * 0.6;
    scheduleVisuals();
    if (mode !== "start") return;
    const mag = Math.hypot(dx, dy) * 0.6;
    chargeRef.current = Math.min(CHARGE_TARGET, chargeRef.current + mag);
    const pct = Math.min(1, chargeRef.current / CHARGE_TARGET);
    ringRef.current?.style.setProperty("stroke-dashoffset", String(c * (1 - pct)));
    const nextPct = Math.round(pct * 100);
    setChargePct((current) =>
      nextPct === 100 || Math.abs(nextPct - current) >= 10 ? nextPct : current,
    );
    if (pct >= 1 && !ready) {
      setReady(true);
      setTimeout(trigger, 350);
    }
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = "none";
    draggingRef.current = true;
    dragDistanceRef.current = 0;
    lastRef.current = { x: e.clientX, y: e.clientY };
    swipeOriginRef.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !lastRef.current) return;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    dragDistanceRef.current += Math.hypot(dx, dy);
    lastRef.current = { x: e.clientX, y: e.clientY };
    addRotation(dx, dy);
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const origin = swipeOriginRef.current;
    const dx = origin ? e.clientX - origin.x : 0;
    const dy = origin ? e.clientY - origin.y : 0;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    e.currentTarget.style.transition = "transform 0.15s ease-out";
    draggingRef.current = false;
    lastRef.current = null;
    swipeOriginRef.current = null;
    if (mode !== "start" && Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      navigator.vibrate?.(18);
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
  };

  // Gentle idle drift
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (!draggingRef.current && !startedRef.current) {
        rotationRef.current.y += dt * 0.008;
        scheduleVisuals();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scheduleVisuals]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current);
    },
    [],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (mode === "start" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      trigger();
      return;
    }
    const step = 24;
    if (e.key === "ArrowLeft") addRotation(-step, 0);
    if (e.key === "ArrowRight") addRotation(step, 0);
    if (e.key === "ArrowUp") addRotation(0, -step);
    if (e.key === "ArrowDown") addRotation(0, step);
  };

  const ringSize = size + (framePadding ?? (variant === "start-session" ? 42 : 120));
  const r = (ringSize - 12) / 2;
  const c = 2 * Math.PI * r;

  const cubeInner =
    pieces.length > 0 ? (
      <Assembly
        size={size}
        pieces={pieces}
        explode={explode}
        onPieceClick={onPieceClick}
        canActivate={() => dragDistanceRef.current < 8}
      />
    ) : (
      <SolidCube size={size} ready={ready} energy={energy} />
    );

  return (
    <div className={`flex flex-col items-center select-none ${className ?? ""}`}>
      <div
        className="relative grid place-items-center"
        style={{ width: ringSize, height: ringSize, perspective: 900 }}
      >
        {mode === "start" && (
          <svg
            width={ringSize}
            height={ringSize}
            className="absolute inset-0 -rotate-90 pointer-events-none"
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              stroke="var(--muted)"
              strokeWidth={4}
              fill="none"
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              stroke="var(--brand)"
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={c}
              ref={ringRef}
              strokeDashoffset={c}
              style={{ transition: "stroke-dashoffset 0.25s ease-out" }}
            />
          </svg>
        )}

        <div
          ref={cubeRef}
          role={mode === "start" ? "button" : undefined}
          tabIndex={mode === "start" ? 0 : -1}
          aria-label={hint}
          onKeyDown={interactive ? onKey : undefined}
          onPointerDown={interactive ? onDown : undefined}
          onPointerMove={interactive ? onMove : undefined}
          onPointerUp={interactive ? onUp : undefined}
          onPointerCancel={interactive ? onUp : undefined}
          onDoubleClick={interactive && mode === "start" ? trigger : undefined}
          className={`relative touch-none outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-full ${
            interactive && mode === "start"
              ? "cursor-grab active:cursor-grabbing"
              : interactive
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-default"
          }`}
          style={{
            width: size,
            height: size,
            transformStyle: "preserve-3d",
            transform: "rotateX(-22deg) rotateY(-34deg)",
            transition: "transform 0.15s ease-out",
          }}
        >
          {cubeInner}
        </div>
        {centerContent && <div className="cube-center-content">{centerContent}</div>}
      </div>

      {mode === "start" && (
        <>
          <p className="mt-6 text-sm text-muted-foreground text-center max-w-[18rem]">
            {ready ? readyLabel : hint}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground tabular-nums">
            {chargePct}% · {chargeLabel}
          </p>
          {fallbackLabel && (
            <button
              type="button"
              onClick={trigger}
              className="mt-2 min-h-11 px-3 text-xs text-muted-foreground underline underline-offset-4 focus-visible:text-foreground"
            >
              {fallbackLabel}
            </button>
          )}
        </>
      )}
      {mode !== "start" && hint && (
        <p className="mt-6 text-sm text-muted-foreground text-center max-w-[18rem]">{hint}</p>
      )}
    </div>
  );
}

/* ---------------- Solid single cube ---------------- */
function SolidCube({ size, ready, energy }: { size: number; ready: boolean; energy: number }) {
  return (
    <>
      {(["front", "back", "right", "left", "top", "bottom"] as const).map((face) => (
        <Face key={face} face={face} size={size} ready={ready} energy={energy} />
      ))}
    </>
  );
}

function Face({
  face,
  size,
  ready,
  energy,
}: {
  face: "front" | "back" | "right" | "left" | "top" | "bottom";
  size: number;
  ready: boolean;
  energy: number;
}) {
  const half = size / 2;
  const transforms: Record<string, string> = {
    front: `translateZ(${half}px)`,
    back: `rotateY(180deg) translateZ(${half}px)`,
    right: `rotateY(90deg) translateZ(${half}px)`,
    left: `rotateY(-90deg) translateZ(${half}px)`,
    top: `rotateX(90deg) translateZ(${half}px)`,
    bottom: `rotateX(-90deg) translateZ(${half}px)`,
  };
  const fill = Math.round(Math.max(0, Math.min(1, energy)) * 100);
  return (
    <div
      className="absolute inset-0 rounded-3xl border border-white/30"
      style={{
        transform: transforms[face],
        background: `linear-gradient(to top, color-mix(in oklab, var(--brand) 82%, transparent) 0 ${fill}%, color-mix(in oklab, var(--brand) 7%, transparent) ${fill}% 100%), linear-gradient(140deg, color-mix(in oklab, var(--brand) 30%, white), color-mix(in oklab, var(--brand) 8%, transparent))`,
        boxShadow: ready
          ? "0 0 30px color-mix(in oklab, var(--brand) 70%, transparent), inset 0 0 40px rgba(255,255,255,0.15)"
          : "inset 0 0 30px rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.15)",
        backfaceVisibility: "hidden",
        pointerEvents: "none",
      }}
    />
  );
}

/* ---------------- Assembly of sub-cubes ---------------- */
function Assembly({
  size,
  pieces,
  explode,
  onPieceClick,
  canActivate,
}: {
  size: number;
  pieces: CubePieceState[];
  explode: number;
  onPieceClick?: (id: string) => void;
  canActivate: () => boolean;
}) {
  const shown = pieces.slice(0, 8);
  const slots: CubePieceState[] = shown;

  const cell = size / 2;
  const gap = cell * 0.05 + explode * cell * 0.9; // grow apart on explode
  const offsets: [number, number, number][] = [
    [-1, -1, -1],
    [1, -1, -1],
    [-1, 1, -1],
    [1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [-1, 1, 1],
    [1, 1, 1],
  ];

  return (
    <>
      {slots.map((p, i) => {
        const [ox, oy, oz] = offsets[i];
        const tx = (ox * (cell + gap - cell)) / 2 + (ox * gap) / 2;
        const ty = (oy * gap) / 2;
        const tz = (oz * gap) / 2;
        // position sub-cube center in the parent's coord system
        const cx = (ox * cell) / 2 + tx;
        const cy = (oy * cell) / 2 + ty;
        const cz = (oz * cell) / 2 + tz;
        return (
          <SubCube
            key={p?.id ?? `slot-${i}`}
            cell={cell}
            x={cx}
            y={cy}
            z={cz}
            piece={p}
            onClick={onPieceClick ? () => canActivate() && onPieceClick(p.id) : undefined}
          />
        );
      })}
    </>
  );
}

function SubCube({
  cell,
  x,
  y,
  z,
  piece,
  onClick,
}: {
  cell: number;
  x: number;
  y: number;
  z: number;
  piece: CubePieceState;
  onClick?: () => void;
}) {
  const half = cell / 2;
  const faces = ["front", "back", "right", "left", "top", "bottom"] as const;
  const transforms: Record<string, string> = {
    front: `translateZ(${half}px)`,
    back: `rotateY(180deg) translateZ(${half}px)`,
    right: `rotateY(90deg) translateZ(${half}px)`,
    left: `rotateY(-90deg) translateZ(${half}px)`,
    top: `rotateX(90deg) translateZ(${half}px)`,
    bottom: `rotateX(-90deg) translateZ(${half}px)`,
  };
  const done = piece?.done;
  const active = piece?.active;
  const empty = piece.kind === "empty";
  const completed = piece?.kind === "completed" || done;

  const bg = empty
    ? "linear-gradient(140deg, color-mix(in oklab, var(--brand) 9%, transparent), color-mix(in oklab, var(--brand) 2%, transparent))"
    : completed
      ? "linear-gradient(140deg, color-mix(in oklab, var(--brand) 60%, white), color-mix(in oklab, var(--brand) 40%, transparent))"
      : active
        ? "linear-gradient(140deg, color-mix(in oklab, var(--brand) 100%, white), color-mix(in oklab, var(--brand) 70%, black))"
        : "linear-gradient(140deg, color-mix(in oklab, var(--brand) 80%, white), color-mix(in oklab, var(--brand) 50%, transparent) 60%, color-mix(in oklab, var(--brand) 85%, black))";

  const wrapStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: cell,
    height: cell,
    marginLeft: -half,
    marginTop: -half,
    transformStyle: "preserve-3d",
    transform: `translate3d(${x}px, ${y}px, ${z + (piece.selected ? cell * 0.42 : 0)}px) scale(${piece.selected ? 1.08 : 1})`,
    transition: "transform 420ms cubic-bezier(.2,.8,.2,1), opacity 300ms, filter 300ms",
    opacity: empty ? 0.58 : 1,
    cursor: onClick ? "pointer" : "default",
    filter: piece?.selected
      ? "drop-shadow(0 0 10px color-mix(in oklab, var(--brand) 70%, transparent))"
      : undefined,
  };

  return (
    <button
      type="button"
      className="cube-object-piece"
      style={wrapStyle}
      onClick={onClick}
      aria-label={piece.label}
      aria-pressed={piece.selected || undefined}
    >
      {faces.map((face) => (
        <div
          key={face}
          className="absolute inset-0 rounded-[10px] border border-white/25 grid place-items-center"
          style={{
            transform: transforms[face],
            background: bg,
            borderColor: empty ? "color-mix(in oklab, var(--brand) 34%, transparent)" : undefined,
            boxShadow: empty
              ? "inset 0 0 12px color-mix(in oklab, var(--brand) 10%, transparent), 0 3px 8px rgba(0,0,0,0.04)"
              : active
                ? "0 0 20px color-mix(in oklab, var(--brand) 60%, transparent), inset 0 0 18px rgba(255,255,255,0.18)"
                : "inset 0 0 12px rgba(255,255,255,0.12), 0 4px 10px rgba(0,0,0,0.14)",
            backfaceVisibility: "hidden",
            color: "white",
          }}
        >
          {face === "front" ? (
            <div className="text-lg opacity-90 pointer-events-none font-semibold">
              {piece?.icon ?? (empty ? "+" : completed ? "✓" : null)}
            </div>
          ) : null}
        </div>
      ))}
    </button>
  );
}
