import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { getMe } from "@/lib/functions/users.functions";
import { listUsersPublic } from "@/lib/functions/plants-public.functions";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";

export const Route = createFileRoute("/people")({
  head: () => ({
    meta: [
      { title: "People — Sprout Squad" },
      {
        name: "description",
        content: "See the campus rotation and who's currently available.",
      },
    ],
  }),
  component: PeoplePage,
});

type PlantUser = {
  id: string;
  name: string;
  avatar_color: string;
  is_available: boolean;
  discord_display_name: string | null;
};

function PeoplePage() {
  const { isAuthenticated } = useIsAuthenticated();
  const fetchUsers = useServerFn(listUsersPublic);
  const fetchMe = useServerFn(getMe);
  const [search, setSearch] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
  });
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    enabled: isAuthenticated,
  });

  const term = search.trim().toLowerCase();
  const filtered = (users as PlantUser[]).filter((u) => {
    if (!term) return true;
    const handle = (u.discord_display_name ?? u.name).toLowerCase();
    return handle.includes(term) || u.name.toLowerCase().includes(term);
  });
  const available = filtered.filter((u) => u.is_available);
  const unavailable = filtered.filter((u) => !u.is_available);

  return (
    <div>
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8 max-w-3xl">
        <div>
          <h1 className="text-3xl font-extrabold">Campus</h1>
          <p className="text-muted-foreground mt-1">
            Everyone in the watering rotation. Edit your own availability from your profile.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or handle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-full min-h-12"
          />
        </div>

        <PeopleSection
          title="Available"
          accent="leaf"
          people={available}
          meId={me?.id ?? null}
          emptyText="Nobody is available right now."
        />
        <PeopleSection
          title="Unavailable"
          accent="muted"
          people={unavailable}
          meId={me?.id ?? null}
          emptyText="Everyone is available 🌱"
        />
      </main>
    </div>
  );
}

function PeopleSection({
  title,
  accent,
  people,
  meId,
  emptyText,
}: {
  title: string;
  accent: "leaf" | "muted";
  people: PlantUser[];
  meId: string | null;
  emptyText: string;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <span className="text-sm text-muted-foreground">({people.length})</span>
      </div>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-2xl border border-dashed p-6 text-center">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {people.map((u) => {
            const handle = u.discord_display_name ?? u.name;
            const isMe = u.id === meId;
            return (
              <li
                key={u.id}
                className={`flex items-center gap-3 rounded-2xl border border-border/60 p-3 ${
                  accent === "leaf" ? "bg-card" : "bg-muted/40"
                }`}
              >
                <span
                  className="grid place-items-center size-10 rounded-full text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: u.avatar_color }}
                >
                  {u.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {u.name}
                    {isMe && (
                      <span className="ml-2 text-xs font-semibold text-[var(--leaf)]">(you)</span>
                    )}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-medium text-[var(--leaf)] bg-[var(--mint)]/40 rounded-full px-2 py-0.5 max-w-full truncate">
                    <span aria-hidden>🎮</span>
                    <span className="truncate">{handle}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
