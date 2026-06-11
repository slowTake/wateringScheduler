import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { createPlant } from "@/lib/functions/plants.functions";
import { listUsers } from "@/lib/functions/users.functions";
import { Header } from "@/components/Header";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const usersQO = queryOptions({ queryKey: ["users"], queryFn: () => listUsers() });

export const Route = createFileRoute("/_authenticated/plants/new")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Add a plant — Sprout Squad" },
      { name: "description", content: "Add a new plant to the campus watering rotation." },
    ],
  }),
  component: NewPlant,
});

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  image_url: z.string().trim().url().max(500),
  watering_interval_days: z.number().int().min(1).max(15),
  assigned_user_id: z.string().uuid().nullable(),
});

function NewPlant() {
  const { data: users } = useSuspenseQuery(usersQO);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(createPlant);

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [interval, setInterval] = useState(7);
  const [assignee, setAssignee] = useState<string>(users[0]?.id ?? "");

  const m = useMutation({
    mutationFn: (d: z.infer<typeof schema>) => fn({ data: d }),
    onSuccess: (p) => {
      toast.success(`${p.name} added 🌱`);
      qc.invalidateQueries({ queryKey: ["plants"] });
      navigate({ to: "/plants/$plantId", params: { plantId: p.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      name,
      image_url: image,
      watering_interval_days: interval,
      assigned_user_id: assignee || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    m.mutate(parsed.data);
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <h1 className="text-3xl font-extrabold mb-1">Add a plant</h1>
        <p className="text-muted-foreground mb-6">Welcome a new green friend to the rotation.</p>

        <form
          onSubmit={submit}
          className="space-y-5 rounded-3xl bg-card border border-border/60 p-6 shadow-sm"
        >
          <div>
            <Label htmlFor="np-name">Plant name</Label>
            <Input
              id="np-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Bobby the Monstera"
            />
          </div>
          <div>
            <Label>Photo</Label>
            <ImageUpload value={image} onChange={setImage} />
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <Label>Watering interval</Label>
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
            />
          </div>
          <div>
            <Label>First assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a housemate" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={m.isPending}>
            {m.isPending ? "Planting…" : "Add plant 🌱"}
          </Button>
        </form>
      </main>
    </div>
  );
}
