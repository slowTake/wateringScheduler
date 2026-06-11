import { Link } from "@tanstack/react-router";
import { Sprout, Users, Trophy } from "lucide-react";

const tabs = [
  { to: "/", label: "Dashboard", icon: Sprout, exact: true },
  { to: "/people", label: "People", icon: Users, exact: false },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, exact: false },
] as const;

export function TabNav() {
  return (
    <nav className="border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="container mx-auto flex items-center gap-1 px-4 overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="group relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap data-[status=active]:text-[var(--leaf)]"
          >
            <Icon className="size-4" />
            {label}
            <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-[var(--leaf)] opacity-0 group-data-[status=active]:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </nav>
  );
}
