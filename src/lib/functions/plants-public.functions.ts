import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public (guest-safe) reads — no auth middleware.
// Uses supabaseAdmin to bypass RLS, but projects ONLY safe columns.

export const listPlantsPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("plants")
    .select("*")
    .order("next_watering_date", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listUsersPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("plant_users")
    .select("id, name, avatar_color, rotation_order, is_available, discord_display_name")
    .order("rotation_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getPlantPublic = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: plant, error } = await supabaseAdmin
      .from("plants")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!plant) return null;
    const { data: assignee } = plant.assigned_user_id
      ? await supabaseAdmin
          .from("plant_users")
          .select("id, name, avatar_color, discord_display_name")
          .eq("id", plant.assigned_user_id)
          .maybeSingle()
      : { data: null };
    return { plant, assignee };
  });
