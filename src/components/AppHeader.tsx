import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { useT } from "@/lib/i18n";

interface Props {
  back?: boolean;
  title?: string;
  showNav?: boolean;
}

export function AppHeader({ back, title, showNav = true }: Props) {
  const router = useRouter();
  const t = useT();
  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-3">
      <div className="flex items-center gap-2 min-w-0">
        {back ? (
          <button
            onClick={() => router.history.back()}
            className="size-10 -ml-2 rounded-full grid place-items-center hover:bg-muted transition"
            aria-label={t("back")}
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        {title ? (
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        ) : (
          <Link to="/" className="text-lg font-semibold tracking-tight">
            {t("app_name")}
          </Link>
        )}
      </div>
      {showNav ? (
        <nav className="flex items-center gap-1">
          <Link
            to="/stats"
            className="size-10 rounded-full grid place-items-center hover:bg-muted transition"
            aria-label={t("stats")}
          >
            <BarChart3 className="size-5" />
          </Link>
          <Link
            to="/settings"
            className="size-10 rounded-full grid place-items-center hover:bg-muted transition"
            aria-label={t("settings")}
          >
            <SettingsIcon className="size-5" />
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
