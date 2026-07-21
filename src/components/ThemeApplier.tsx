import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

interface Props {
  /** Optional override for current page (e.g. flow color on Run/Detail) */
  override?: string | null;
}

export function ThemeApplier({ override }: Props = {}) {
  const accent = useAppStore((s) => s.settings.accentColor);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-accent", override || accent);
    return () => {
      document.documentElement.setAttribute("data-accent", accent);
    };
  }, [accent, override]);
  return null;
}
