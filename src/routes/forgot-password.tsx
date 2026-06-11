import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authRedirectPath } from "@/lib/auth-redirect";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";

const schema = z.object({
  email: z.string().email(),
});

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Reset password — Sprout Squad" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setBusy(true);
    const redirectTo = authRedirectPath("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-grid place-items-center size-12 rounded-full bg-[var(--leaf)] text-primary-foreground">
            <Leaf className="size-6" />
          </span>
          <h1 className="text-2xl font-extrabold">Forgot password?</h1>
          <p className="text-sm text-muted-foreground">
            {sent
              ? "Check your inbox for a reset link."
              : "Enter your email and we'll send a link to choose a new password."}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{email}</span>,
              you should receive an email shortly. The link expires after a while.
            </p>
            <Button asChild variant="outline" className="w-full rounded-full min-h-12">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fp-email">Email</Label>
              <Input
                id="fp-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-12"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full min-h-12">
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        {!sent && (
          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="font-semibold text-[var(--leaf)] hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
