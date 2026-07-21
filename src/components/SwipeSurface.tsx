import { useRef, type PointerEvent, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  directionRatio?: number;
  strictDistance?: boolean;
  ignoreInteractiveTargets?: boolean;
  blockParentSwipe?: boolean;
};

export function SwipeSurface({
  children,
  className,
  ariaLabel,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 72,
  directionRatio = 1.2,
  strictDistance = false,
  ignoreInteractiveTargets = false,
  blockParentSwipe = false,
}: Props) {
  const start = useRef<{ x: number; y: number; at: number; pointerId: number } | null>(null);
  const node = useRef<HTMLDivElement | null>(null);
  const locked = useRef<"horizontal" | "vertical" | null>(null);

  const reset = (target?: HTMLDivElement, pointerId?: number) => {
    if (target && pointerId !== undefined && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    if (node.current) {
      node.current.style.transform = "";
      node.current.style.transition = "transform 180ms cubic-bezier(.2,.8,.2,1)";
    }
    start.current = null;
    locked.current = null;
  };

  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (
      ignoreInteractiveTargets &&
      (event.target as HTMLElement).closest(
        "button, a, input, textarea, select, summary, [role='button'], [data-swipe-ignore]",
      )
    )
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.transition = "none";
    start.current = {
      x: event.clientX,
      y: event.clientY,
      at: performance.now(),
      pointerId: event.pointerId,
    };
    locked.current = null;
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const origin = start.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (!locked.current && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
      locked.current = Math.abs(dx) > Math.abs(dy) * directionRatio ? "horizontal" : "vertical";
    }
    if (locked.current === "vertical" && (onSwipeUp || onSwipeDown)) {
      event.preventDefault();
      event.stopPropagation();
      const resisted = Math.sign(dy) * Math.min(Math.abs(dy), 132);
      event.currentTarget.style.transform = `translate3d(0,${resisted}px,0) rotate(${dy * 0.025}deg)`;
      return;
    }
    if (locked.current === "horizontal" && (onSwipeLeft || onSwipeRight)) {
      event.preventDefault();
      event.stopPropagation();
      const resisted = Math.sign(dx) * Math.min(Math.abs(dx), 132);
      event.currentTarget.style.transform = `translate3d(${resisted}px,0,0)`;
    }
  };

  const up = (event: PointerEvent<HTMLDivElement>) => {
    const origin = start.current;
    if (!origin || origin.pointerId !== event.pointerId)
      return reset(event.currentTarget, event.pointerId);
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    const direction = locked.current;
    const distance = direction === "vertical" ? Math.abs(dy) : Math.abs(dx);
    const velocity = distance / Math.max(1, performance.now() - origin.at);
    const commit = distance >= threshold || (!strictDistance && distance >= 36 && velocity > 0.55);
    event.stopPropagation();
    reset(event.currentTarget, event.pointerId);
    if (!commit) return;
    if (direction === "horizontal") {
      if (dx < 0) onSwipeLeft?.();
      if (dx > 0) onSwipeRight?.();
    }
    if (direction === "vertical") {
      if (dy < 0) onSwipeUp?.();
      if (dy > 0) onSwipeDown?.();
    }
  };

  return (
    <div
      ref={node}
      className={className}
      aria-label={ariaLabel}
      data-swipe-ignore={blockParentSwipe || undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={(event) => reset(event.currentTarget, event.pointerId)}
      style={{ touchAction: onSwipeUp || onSwipeDown ? "none" : "pan-y" }}
    >
      {children}
    </div>
  );
}
