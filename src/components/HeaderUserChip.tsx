import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { getMe } from "@/lib/functions/users.functions";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";

export function HeaderUserChip() {
  const { isAuthenticated, loading } = useIsAuthenticated();
  const fetchMe = useServerFn(getMe);
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    enabled: isAuthenticated,
  });

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className="inline-flex items-center gap-2 rounded-full bg-[var(--leaf)] text-primary-foreground px-4 min-h-12 md:min-h-9 text-sm font-semibold hover:opacity-90 transition-opacity"
        aria-label="Sign in"
      >
        <LogIn className="size-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  if (!me) {
    return (
      <Link
        to="/profile"
        className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 min-h-12 md:min-h-9 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        aria-label="Set up your profile"
      >
        Set up profile
      </Link>
    );
  }
  const label = me.discord_display_name ?? me.name;

  return (
    <Link
      to="/profile"
      className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-muted transition-colors min-h-12 md:min-h-9"
      aria-label="Your profile"
    >
      <span
        className="grid place-items-center size-9 md:size-7 rounded-full text-xs font-bold text-white shrink-0"
        style={{ backgroundColor: me.avatar_color }}
      >
        {(label[0] ?? "?").toUpperCase()}
      </span>
      <span className="text-sm font-medium truncate max-w-[140px] hidden sm:inline">{label}</span>
    </Link>
  );
}
