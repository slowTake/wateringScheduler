import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Leaf, Bell, Sprout, Users, Trophy } from "lucide-react";
import { useState } from "react";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/lib/functions/notifications.functions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatDistanceToNow } from "date-fns";
import { HeaderUserChip } from "@/components/HeaderUserChip";

const tabs = [
  { to: "/", label: "Dashboard", icon: Sprout, exact: true },
  { to: "/people", label: "People", icon: Users, exact: false },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, exact: false },
] as const;

import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";

export function Header() {
  const { isAuthenticated } = useIsAuthenticated();
  const fetchNotifs = useServerFn(listNotifications);
  const markRead = useServerFn(markAllNotificationsRead);
  const { data: notifs = [], refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifs(),
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });
  const unread = notifs.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);

  const notifSheet = (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o && unread > 0) markRead().then(() => refetch());
      }}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full size-12 md:size-10">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 grid place-items-center size-5 rounded-full bg-[var(--clay)] text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle> Campus notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 overflow-y-auto">
          {notifs.length === 0 && <p className="text-sm text-muted-foreground">All caught up 🌱</p>}
          {notifs.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl p-3 border ${
                n.read ? "bg-muted/40" : "bg-[var(--mint)]/30 border-[var(--mint)]"
              }`}
            >
              <p className="text-sm font-medium">{n.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-background/70 border-b border-border/60">
      {/* Row 1: brand + actions */}
      <div className="container mx-auto flex justify-between items-center w-full gap-3 px-4 md:px-6 py-3">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-lg shrink-0"
          aria-label="Sprout Squad home"
        >
          <span className="grid place-items-center size-10 rounded-2xl bg-[var(--leaf)] text-primary-foreground shadow-sm">
            <Leaf className="size-5" />
          </span>
          <span className="hidden min-[380px]:inline">Sprout&nbsp;Squad</span>
        </Link>

        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {isAuthenticated && notifSheet}
          <HeaderUserChip />
        </div>
      </div>

      {/* Row 2: tabs */}
      <nav className="container mx-auto flex items-center w-full gap-6 px-4 md:px-6 overflow-x-auto">
        {tabs.map(({ to, label, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            aria-label={label}
            className="relative inline-flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap data-[status=active]:text-foreground min-h-12 px-1 group"
          >
            <span>{label}</span>
            <span className="pointer-events-none absolute left-1 right-1 bottom-0 h-0.5 rounded-full bg-[var(--leaf)] opacity-0 group-data-[status=active]:opacity-100" />
          </Link>
        ))}
      </nav>
    </header>
  );
}
