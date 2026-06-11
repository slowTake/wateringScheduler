import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPlantsPublic, listUsersPublic } from "@/lib/functions/plants-public.functions";
import { Header } from "@/components/Header";
import { PlantCard } from "@/components/PlantCard";
import { computeStatus } from "@/lib/plants";

const plantsQO = queryOptions({
  queryKey: ["plants"],
  queryFn: () => listPlantsPublic(),
  refetchInterval: 60_000,
});
const usersQO = queryOptions({
  queryKey: ["users"],
  queryFn: () => listUsersPublic(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sprout Squad — Shared campus plant care" },
      {
        name: "description",
        content:
          "A cozy way to share watering duties with your campus. See every plant, take your turn, never forget.",
      },
      { property: "og:title", content: "Sprout Squad — Shared campus plant care" },
      {
        property: "og:description",
        content: "Share watering duties with your campus. Rotation, reminders, and a friendly UI.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(plantsQO);
    context.queryClient.ensureQueryData(usersQO);
  },
  component: Landing,
});

function Landing() {
  const { data: plants } = useSuspenseQuery(plantsQO);
  const { data: users } = useSuspenseQuery(usersQO);

  const dueToday = plants.filter((p) => ["overdue", "due_today"].includes(computeStatus(p)));
  const dueAssignees = users.filter((u) => dueToday.some((p) => p.assigned_user_id === u.id));

  return (
    <div>
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-10">
        {dueAssignees.length > 0 && (
          <section className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-foreground">Watering today:</span>
            <div className="flex -space-x-2">
              {dueAssignees.map((u) => (
                <span
                  key={u.id}
                  title={u.name}
                  className="grid place-items-center size-9 rounded-full text-sm font-bold text-white ring-2 ring-card"
                  style={{ backgroundColor: u.avatar_color }}
                >
                  {u.name[0]}
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-2xl font-bold">All plants</h2>
            <span className="text-sm text-muted-foreground">{plants.length} in the rotation</span>
          </div>
          {plants.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
              No plants yet — add your first one!
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {plants.map((p) => (
                <PlantCard key={p.id} plant={p} users={users} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
