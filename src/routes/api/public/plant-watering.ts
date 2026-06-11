import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPlantWateringWebhook } from "@/lib/discord-webhook";

const payloadSchema = z.object({
  plant_name: z.string().trim().min(1).max(200),
  location: z.string().trim().max(200).optional(),
  message: z.string().trim().max(1000).optional(),
});

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const Route = createFileRoute("/api/public/plant-watering")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PLANT_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Server not configured", { status: 500 });
        }

        const provided = request.headers.get("x-secret");
        if (!provided || !safeEqual(provided, secret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = payloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid payload", details: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const { plant_name, location, message } = parsed.data;

        // Find the plant (case-insensitive) so we can notify whoever's turn it is.
        const { data: plant } = await supabaseAdmin
          .from("plants")
          .select("id, name, assigned_user_id, next_watering_date, notes")
          .ilike("name", plant_name)
          .maybeSingle();

        let assignee: { id: string; name: string; discord_user_id: string | null } | null = null;

        if (plant?.assigned_user_id) {
          const { data: user } = await supabaseAdmin
            .from("plant_users")
            .select("id, name, discord_user_id")
            .eq("id", plant.assigned_user_id)
            .maybeSingle();
          assignee = user ?? null;
        }

        // In-app notification
        if (plant && assignee) {
          await supabaseAdmin.from("plant_notifications").insert({
            user_id: assignee.id,
            plant_id: plant.id,
            type: "your_turn",
            message: message ?? `${plant.name} needs watering.`,
          });
        }

        // Discord bot webhook
        await sendPlantWateringWebhook({
          plant_name: plant?.name ?? plant_name,
          location: location ?? plant?.notes ?? undefined,
          message: message ?? `${plant?.name ?? plant_name} needs watering.`,
          due_at: plant?.next_watering_date,
        });

        return Response.json({
          ok: true,
          plant_matched: Boolean(plant),
          notified_user: assignee?.name ?? null,
        });
      },
    },
  },
});
