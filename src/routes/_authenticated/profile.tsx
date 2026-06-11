import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  queryOptions,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listPlants } from "@/lib/functions/plants.functions";
import {
  getMe,
  listUsers,
  updateMyProfile,
  setMyAvailability,
  deleteMyAccount,
} from "@/lib/functions/users.functions";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { supabase } from "@/integrations/supabase/client";
import { nextAssignee, computeStatus } from "@/lib/plants";

const DISCORD_ID = /^\d{17,20}$/;

const meQO = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
const plantsQO = queryOptions({ queryKey: ["plants"], queryFn: () => listPlants() });
const usersQO = queryOptions({ queryKey: ["users"], queryFn: () => listUsers() });

export const Route = createFileRoute("/_authenticated/profile")({
  // Auth server functions need the browser session token — must not prefetch on SSR.
  ssr: false,
  head: () => ({ meta: [{ title: "Your profile — Sprout Squad" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me } = useSuspenseQuery(meQO);
  const { data: plants } = useSuspenseQuery(plantsQO);
  const { data: users } = useSuspenseQuery(usersQO);
  const qc = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  const updateFn = useServerFn(updateMyProfile);
  const availFn = useServerFn(setMyAvailability);
  const deleteFn = useServerFn(deleteMyAccount);

  const [displayName, setDisplayName] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (me) {
      setDisplayName(me.discord_display_name ?? me.name ?? "");
      setDiscordId(me.discord_user_id ?? "");
      setAvailable(me.is_available);
    }
  }, [me]);

  const saveM = useMutation({
    mutationFn: (data: { discord_display_name: string; discord_user_id: string }) =>
      updateFn({ data }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const availM = useMutation({
    mutationFn: (is_available: boolean) => availFn({ data: { is_available } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: () => deleteFn(),
    onSuccess: async () => {
      await supabase.auth.signOut();
      toast.success("Account removed");
      navigate({ to: "/login" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!me) {
    return (
      <div>
        <Header />
        <main className="container mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground">Setting up your profile…</p>
        </main>
      </div>
    );
  }

  const assignedPlants = plants.filter((p) => p.assigned_user_id === me.id);
  const nextUpPlants = plants.filter((p) => {
    const status = computeStatus(p);
    if (status !== "overdue" && status !== "due_today" && status !== "due_soon") return false;
    return nextAssignee(p.assigned_user_id, users) === me.id;
  });

  const onSave = () => {
    if (!displayName.trim()) {
      toast.error("Display name required");
      return;
    }
    if (discordId && !DISCORD_ID.test(discordId)) {
      toast.error("Discord ID must be 17–20 digits");
      return;
    }
    saveM.mutate({
      discord_display_name: displayName.trim(),
      discord_user_id: discordId,
    });
  };

  const onAvailToggle = (v: boolean) => {
    setAvailable(v);
    availM.mutate(v);
  };

  const handleLogout = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <span
            className="grid place-items-center size-16 rounded-full text-2xl font-bold text-white shrink-0"
            style={{ backgroundColor: me.avatar_color }}
          >
            {(me.discord_display_name?.[0] ?? me.name[0] ?? "?").toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">{me.name}</h1>
            <p className="text-sm text-muted-foreground">Rotation position #{me.rotation_order}</p>
          </div>
        </div>

        {nextUpPlants.length > 0 && (
          <div className="rounded-2xl border border-[var(--leaf)]/40 bg-[var(--mint)]/30 p-4">
            <p className="text-sm font-bold text-[var(--leaf)]">Up next 🌿</p>
            <p className="text-sm mt-1">
              You're next for:{" "}
              <span className="font-semibold">{nextUpPlants.map((p) => p.name).join(", ")}</span>
            </p>
          </div>
        )}

        {assignedPlants.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-sm font-bold">Your current plants</p>
            <ul className="text-sm mt-2 space-y-1">
              {assignedPlants.map((p) => (
                <li key={p.id}>• {p.name}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <h2 className="font-bold">Edit profile</h2>
          <div>
            <Label htmlFor="ep-display">Discord display name</Label>
            <Input
              id="ep-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              className="min-h-12"
            />
          </div>
          <div>
            <Label htmlFor="ep-id">Discord user ID</Label>
            <Input
              id="ep-id"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value.trim())}
              placeholder="123456789012345678"
              maxLength={20}
              inputMode="numeric"
              className="font-mono min-h-12"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: 17–20 digit numerical ID for bot @mentions.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Available for rotation</p>
              <p className="text-xs text-muted-foreground">
                Turn off to skip your turn temporarily.
              </p>
            </div>
            <Switch checked={available} onCheckedChange={onAvailToggle} />
          </div>
          <Button
            onClick={onSave}
            disabled={saveM.isPending}
            className="rounded-full min-h-12 w-full"
          >
            {saveM.isPending ? "Saving…" : "Save changes"}
          </Button>
        </section>

        <section className="space-y-3">
          <Button variant="outline" onClick={handleLogout} className="rounded-full min-h-12 w-full">
            Log out
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="rounded-full min-h-12 w-full text-[var(--clay)] hover:text-[var(--clay)] hover:bg-[var(--clay)]/10"
              >
                Leave the rotation
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave the rotation?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your plant assignments will be handed off to the next person. You can sign up
                  again any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => delM.mutate()}
                  className="bg-[var(--clay)] hover:bg-[var(--clay)]/90 text-white"
                >
                  Remove me
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </main>
    </div>
  );
}
