import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getPlant,
  waterPlant,
  pushBackPlant,
  updatePlant,
  deletePlant,
} from "@/lib/functions/plants.functions";
import { listUsers } from "@/lib/functions/users.functions";
import { Header } from "@/components/Header";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { computeStatus, countdownLabel, statusLabel, statusToneClasses } from "@/lib/plants";
import { ArrowLeft, Droplet, Pencil, Trash2, MoonStar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const plantQO = (id: string) =>
  queryOptions({
    queryKey: ["plant", id],
    queryFn: () => getPlant({ data: { id } }),
    refetchInterval: 60_000,
  });
const usersQO = queryOptions({ queryKey: ["users"], queryFn: () => listUsers() });

export const Route = createFileRoute("/_authenticated/plants/$plantId")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Plant — Sprout Squad` },
      { name: "description", content: `Watering schedule and history for plant ${params.plantId}` },
    ],
  }),
  component: PlantDetail,
  errorComponent: ({ error }) => (
    <div>
      <Header />
      <div className="container mx-auto p-8">
        <p className="text-destructive">{error.message}</p>
        <Button asChild className="mt-4">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </div>
  ),
});

function PlantDetail() {
  const { plantId } = Route.useParams();
  const { data } = useSuspenseQuery(plantQO(plantId));
  const { data: users } = useSuspenseQuery(usersQO);
  const { plant, events } = data;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const status = computeStatus(plant);
  const tone = statusToneClasses(status);
  const assignee = users.find((u) => u.id === plant.assigned_user_id);
  const lastBy = users.find((u) => u.id === plant.last_watered_by_user_id);

  // local interval slider state (the draggable scale 0-15)
  const [interval, setInterval] = useState<number>(plant.watering_interval_days);
  useEffect(() => setInterval(plant.watering_interval_days), [plant.watering_interval_days]);

  const water = useServerFn(waterPlant);
  const push = useServerFn(pushBackPlant);
  const update = useServerFn(updatePlant);
  const del = useServerFn(deletePlant);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["plant", plantId] });
    qc.invalidateQueries({ queryKey: ["plants"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const waterM = useMutation({
    mutationFn: () =>
      water({
        data: {
          plant_id: plant.id,
          interval_days: interval,
        },
      }),
    onSuccess: () => {
      toast.success(`Watered ${plant.name} 💧`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [pushDays, setPushDays] = useState(3);
  const [pushNote, setPushNote] = useState("");
  const [pushOpen, setPushOpen] = useState(false);
  const pushM = useMutation({
    mutationFn: () =>
      push({
        data: {
          plant_id: plant.id,
          push_days: pushDays,
          note: pushNote || undefined,
        },
      }),
    onSuccess: () => {
      toast.success(`Pushed back ${pushDays} day${pushDays === 1 ? "" : "s"}`);
      setPushOpen(false);
      setPushNote("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(plant.name);
  const [editImg, setEditImg] = useState(plant.image_url);
  const [editLocation, setEditLocation] = useState(
    (plant as { location?: string | null }).location ?? "",
  );
  useEffect(() => {
    setEditName(plant.name);
    setEditImg(plant.image_url);
    setEditLocation((plant as { location?: string | null }).location ?? "");
  }, [plant.name, plant.image_url, (plant as { location?: string | null }).location]);

  const editM = useMutation({
    mutationFn: (patch: {
      name?: string;
      image_url?: string;
      watering_interval_days?: number;
      location?: string | null;
    }) => update({ data: { id: plant.id, ...patch } }),
    onSuccess: (_d, vars) => {
      if (vars.watering_interval_days === undefined) {
        toast.success("Plant updated");
        setEditOpen(false);
      } else {
        toast.success(
          `Interval set to ${vars.watering_interval_days} day${vars.watering_interval_days === 1 ? "" : "s"}`,
        );
      }
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: () => del({ data: { id: plant.id } }),
    onSuccess: () => {
      toast.success("Plant removed");
      navigate({ to: "/" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" /> All plants
        </Link>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="rounded-3xl overflow-hidden bg-card border border-border/60 shadow-sm">
            <div className="aspect-square bg-muted">
              <img src={plant.image_url} alt={plant.name} className="size-full object-cover" />
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone} ${
                    status === "overdue" ? "animate-pulse" : ""
                  }`}
                >
                  {statusLabel(status)}
                </span>
                <h1 className="mt-2 text-3xl md:text-4xl font-extrabold">{plant.name}</h1>
                {(plant as { location?: string | null }).location ? (
                  <p className="mt-1 text-base text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {(plant as { location?: string | null }).location}
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Pencil className="size-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit plant</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={80}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Location</label>
                        <Input
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          maxLength={120}
                          placeholder="e.g. Science Library, 2nd Floor"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Photo</label>
                        <ImageUpload value={editImg} onChange={setEditImg} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() =>
                          editM.mutate({
                            name: editName,
                            image_url: editImg,
                            location: editLocation.trim() ? editLocation.trim() : null,
                          })
                        }
                        disabled={editM.isPending}
                      >
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {plant.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete the plant and its watering history. This can't be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => delM.mutate()}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="rounded-3xl bg-card border border-border/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Next watering
                  </p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    <Droplet className="size-5 text-[var(--leaf)]" /> {countdownLabel(plant)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Whose turn
                  </p>
                  {assignee ? (
                    <p className="font-bold flex items-center gap-2 justify-end">
                      <span
                        className="grid place-items-center size-6 rounded-full text-xs text-white"
                        style={{ backgroundColor: assignee.avatar_color }}
                      >
                        {assignee.name[0]}
                      </span>
                      {assignee.name}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-sm font-semibold">Watering interval</label>
                  <span className="text-sm tabular-nums font-bold text-[var(--leaf)]">
                    {interval} day{interval === 1 ? "" : "s"}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={15}
                  step={1}
                  value={[interval]}
                  onValueChange={([v]) => setInterval(v)}
                  onValueCommit={([v]) => {
                    if (v !== plant.watering_interval_days) {
                      editM.mutate({ watering_interval_days: v });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Drag to set how long until the next watering. Saved automatically.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="lg"
                  className="flex-1 rounded-full min-h-14 text-base"
                  onClick={() => waterM.mutate()}
                  disabled={waterM.isPending}
                >
                  I watered it
                </Button>
                <Dialog open={pushOpen} onOpenChange={setPushOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="lg" className="flex-1 rounded-full min-h-14 text-base">
                      Still moist
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Push watering back</DialogTitle>
                      <DialogDescription>
                        The plant is still moist — delay the next watering.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-baseline mb-1">
                          <label className="text-sm font-semibold">Push by</label>
                          <span className="text-sm tabular-nums font-bold">
                            {pushDays} day{pushDays === 1 ? "" : "s"}
                          </span>
                        </div>
                        <Slider
                          min={1}
                          max={7}
                          step={1}
                          value={[pushDays]}
                          onValueChange={([v]) => setPushDays(v)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">Note (optional)</label>
                        <Textarea
                          value={pushNote}
                          onChange={(e) => setPushNote(e.target.value)}
                          maxLength={200}
                          placeholder="Soil still felt damp"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => pushM.mutate()} disabled={pushM.isPending}>
                        Push back
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="rounded-3xl bg-card/70 border border-border/60 p-5 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Moisture:</span>{" "}
                <span className="font-semibold capitalize">{plant.moisture_status}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Last watered:</span>{" "}
                <span className="font-semibold">
                  {plant.last_watered_date
                    ? `${formatDistanceToNow(new Date(plant.last_watered_date), { addSuffix: true })}${lastBy ? ` by ${lastBy.name}` : ""}`
                    : "never"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-bold mb-3">History</h2>
          <div className="space-y-2">
            {events.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
            {events.map((e) => {
              const u = users.find((x) => x.id === e.user_id);
              return (
                <div
                  key={e.id}
                  className="flex items-start gap-3 rounded-2xl bg-card border border-border/60 p-3"
                >
                  <span
                    className="grid place-items-center size-8 rounded-full text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: u?.avatar_color ?? "#999" }}
                  >
                    {u?.name?.[0] ?? "?"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{u?.name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{e.action.replace("_", " ")}</span>
                      {e.note ? <> — {e.note}</> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
