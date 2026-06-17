import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Droplet, MapPin, Pencil, ArrowLeft } from "lucide-react";
import { getPlantPublic } from "@/lib/functions/plants-public.functions";
import { Header } from "@/components/Header";
import { computeStatus, countdownLabel, statusLabel, statusToneClasses } from "@/lib/plants";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";

const plantQO = (plantId: string) =>
  queryOptions({
    queryKey: ["plant-public", plantId],
    queryFn: () => getPlantPublic({ data: { id: plantId } }),
  });

export const Route = createFileRoute("/plant/$plantId")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(plantQO(params.plantId));
    if (!data) throw notFound();
    return { plantName: data.plant.name, imageUrl: data.plant.image_url };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.plantName} — Sprout Squad` },
          {
            name: "description",
            content: `See watering status and whose turn it is for ${loaderData.plantName}.`,
          },
          { property: "og:title", content: `${loaderData.plantName} — Sprout Squad` },
          {
            property: "og:description",
            content: `See watering status and whose turn it is for ${loaderData.plantName}.`,
          },
          { property: "og:image", content: loaderData.imageUrl },
          { name: "twitter:image", content: loaderData.imageUrl },
        ]
      : [{ title: "Plant — Sprout Squad" }],
  }),
  component: PlantPublicPage,
  notFoundComponent: PlantNotFound,
});

function PlantNotFound() {
  return (
    <div>
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-md text-center">
        <h1 className="text-2xl font-bold">Plant not found</h1>
        <p className="text-muted-foreground mt-2">
          This plant may have been removed from the rotation.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--leaf)] text-primary-foreground px-5 min-h-12 font-semibold"
        >
          <ArrowLeft className="size-4" />
          Back to all plants
        </Link>
      </main>
    </div>
  );
}

function PlantPublicPage() {
  const { plantId } = Route.useParams();
  const { isAuthenticated } = useIsAuthenticated();
  const { data } = useSuspenseQuery(plantQO(plantId));

  if (!data) return <PlantNotFound />;
  const { plant, assignee } = data;
  const status = computeStatus(plant);
  const tone = statusToneClasses(status);
  const turnLabel = assignee?.discord_display_name ?? assignee?.name ?? null;

  return (
    <div>
      <Header />
      <main className="container mx-auto px-4 py-6 md:py-10 max-w-xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          All plants
        </Link>

        <article className="overflow-hidden rounded-3xl bg-card border border-border/60 shadow-sm">
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img src={plant.image_url} alt={plant.name} className="size-full object-cover" />
            <span
              className={`absolute top-4 left-4 inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold backdrop-blur-md shadow-sm ${tone}`}
            >
              {statusLabel(status)}
            </span>
          </div>

          <div className="p-5 md:p-6 space-y-5">
            <div>
              <h1 className="text-3xl font-extrabold leading-tight">{plant.name}</h1>
              {plant.location && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  {plant.location}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sky)]/30 text-sky-900 px-3 py-1.5 text-sm font-semibold">
                <Droplet className="size-4" />
                {countdownLabel(plant)}
              </span>
              <span className="text-sm text-muted-foreground">
                Every {plant.watering_interval_days} day
                {plant.watering_interval_days === 1 ? "" : "s"}
              </span>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Whose turn
              </p>
              {assignee ? (
                <div className="mt-2 flex items-center gap-3">
                  <span
                    className="grid place-items-center size-10 rounded-full text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: assignee.avatar_color }}
                  >
                    {assignee.name[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{turnLabel}</p>
                    <p className="text-xs text-muted-foreground">Up next in the rotation</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Unassigned</p>
              )}
            </div>

            {isAuthenticated ? (
              <Link
                to="/plants/$plantId"
                params={{ plantId: plant.id }}
                className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-[var(--leaf)] text-primary-foreground px-5 min-h-12 font-semibold hover:opacity-90 transition-opacity"
              >
                <Pencil className="size-4" />
                Open full editor
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full rounded-full border border-[var(--leaf)] text-[var(--leaf)] px-5 min-h-12 font-semibold hover:bg-[var(--mint)]/30 transition-colors"
              >
                Sign in to water this plant
              </Link>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}
