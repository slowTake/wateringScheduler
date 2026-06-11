import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Sprout Squad" },
      {
        name: "description",
        content: "Watering streaks and campus rankings — coming soon.",
      },
      { property: "og:title", content: "Leaderboard — Sprout Squad" },
      {
        property: "og:description",
        content: "Watering streaks and campus rankings — coming soon.",
      },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  return (
    <div>
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="rounded-3xl border border-dashed bg-card/60 p-10 md:p-14 text-center">
          <div className="mx-auto grid place-items-center size-16 rounded-full bg-[var(--sand)]/40 text-[var(--clay)] mb-4">
            <Trophy className="size-8" />
          </div>
          <h1 className="text-3xl font-extrabold">Leaderboard</h1>
          <p className="text-muted-foreground mt-3">
            Coming soon — we'll start tracking watering streaks, on-time saves, and campus MVP here.
            Nothing tracked yet, so come back later 🌿
          </p>
        </div>
      </main>
    </div>
  );
}
