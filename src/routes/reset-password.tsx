import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { getAuthHashError } from "@/lib/auth-redirect";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Choose new password — Sprout Squad" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hashError, setHashError] = useState<string | null>(null);
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const urlError = getAuthHashError();
    if (urlError) {
      setHashError(urlError);
      setChecking(false);
      setReady(false);
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    const finishCheck = (hasSession: boolean) => {
      if (!cancelled) {
        setReady(hasSession);
        setChecking(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finishCheck(true);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        finishCheck(true);
      }
    });

    const timeout = window.setTimeout(() => finishCheck(false), 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated — you're signed in.");
    await router.invalidate();
    navigate({ to: "/" });
  };

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-grid place-items-center size-12 rounded-full bg-[var(--leaf)] text-primary-foreground">
            <Leaf className="size-6" />
          </span>
          <h1 className="text-2xl font-extrabold">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">
            {checking
              ? "Verifying your reset link…"
              : ready
                ? "Pick something you'll remember."
                : (hashError ?? "This reset link is invalid or has expired.")}
          </p>
        </div>

        {checking ? (
          <p className="text-center text-sm text-muted-foreground">One moment…</p>
        ) : ready ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rp-password">New password</Label>
              <Input
                id="rp-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-12"
              />
            </div>
            <div>
              <Label htmlFor="rp-confirm">Confirm password</Label>
              <Input
                id="rp-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="min-h-12"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full min-h-12">
              {busy ? "Saving…" : "Update password"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <Button asChild className="w-full rounded-full min-h-12">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-[var(--leaf)] hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
