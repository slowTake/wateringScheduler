import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { nextAssignee } from "@/lib/plants";
import { callerProfileId, discordIdRegex, ensurePlantUserProfile } from "./shared";

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("plant_users")
      .select("*")
      .order("rotation_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return (await ensurePlantUserProfile(context.userId)) ?? null;
  });

const updateProfileSchema = z.object({
  discord_display_name: z.string().trim().min(1).max(60).optional(),
  discord_user_id: z
    .string()
    .trim()
    .regex(discordIdRegex, "Discord user ID must be 17–20 digits")
    .optional()
    .or(z.literal("")),
  is_available: z.boolean().optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.discord_display_name !== undefined)
      patch.discord_display_name = data.discord_display_name;
    if (data.discord_user_id !== undefined) patch.discord_user_id = data.discord_user_id || null;
    if (data.is_available !== undefined) patch.is_available = data.is_available;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("plant_users")
      .update(patch as never)
      .eq("auth_user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ is_available: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("plant_users")
      .update({ is_available: data.is_available })
      .eq("auth_user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const myId = await callerProfileId(context.userId);
    if (!myId) return { ok: true };

    const { data: others } = await supabaseAdmin
      .from("plant_users")
      .select("id, rotation_order, is_available")
      .neq("id", myId)
      .order("rotation_order");
    const fallback = nextAssignee(null, others ?? []);

    await supabaseAdmin
      .from("plants")
      .update({ assigned_user_id: fallback })
      .eq("assigned_user_id", myId);
    await supabaseAdmin
      .from("plants")
      .update({ last_watered_by_user_id: null })
      .eq("last_watered_by_user_id", myId);
    await supabaseAdmin.from("plant_notifications").delete().eq("user_id", myId);
    await supabaseAdmin.from("plant_users").delete().eq("id", myId);
    // Note: auth.users row remains; user can sign back up with same email later.
    return { ok: true };
  });
