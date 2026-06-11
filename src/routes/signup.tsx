import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { getAppOrigin } from "@/lib/auth-redirect";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
  name: z.string().trim().min(1, "Name required").max(60),
  discord_display_name: z.string().trim().min(1, "Discord display name required").max(60),
});

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Join the rotation — Sprout Squad" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [discord, setDiscord] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, name, discord_display_name: discord });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: getAppOrigin() || window.location.origin,
        data: {
          name: parsed.data.name,
          discord_display_name: parsed.data.discord_display_name,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`You're in the rotation, ${parsed.data.name} 🌱`);
    await router.invalidate();
    navigate({ to: "/" });
  };

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-grid place-items-center size-12 rounded-full bg-[var(--leaf)] text-primary-foreground">
            <Leaf className="size-6" />
          </span>
          <h1 className="text-2xl font-extrabold">Join the rotation</h1>
          <p className="text-sm text-muted-foreground">
            Get added to the watering schedule.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="su-name">Name</Label>
            <Input
              id="su-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Plant parent name"
              maxLength={60}
              className="min-h-12"
            />
          </div>
          <div>
            <Label htmlFor="su-discord-name">Discord display name</Label>
            <Input
              id="su-discord-name"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
              placeholder="login | Firstname"
              maxLength={60}
              className="min-h-12"
            />
          </div>
          <div>
            <Label htmlFor="su-email">Email</Label>
            <Input
              id="su-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-12"
            />
          </div>
          <div>
            <Label htmlFor="su-password">Password</Label>
            <Input
              id="su-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-12"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-full min-h-12">
            {busy ? "Joining…" : "I'm in 🌿"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[var(--leaf)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
