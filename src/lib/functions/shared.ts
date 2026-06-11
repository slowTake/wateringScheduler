import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const discordIdRegex = /^\d{17,20}$/;
export const PROFILE_COLORS = ["#3F7D58", "#D97757", "#A8D5A2", "#F4B860", "#7AA7C7", "#C58BB1"];

/** Creates plant_users row if signup predated the DB trigger or trigger was skipped. */
export async function ensurePlantUserProfile(authUserId: string) {
  const { data: existing } = await supabaseAdmin
    .from("plant_users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (existing) return existing;

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.getUserById(authUserId);
  if (authError || !authData.user) return null;

  const user = authData.user;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(meta.name ?? meta.full_name ?? user.email?.split("@")[0] ?? "Member");
  const discordDisplay = String(meta.discord_display_name ?? name);

  const { data: maxRow } = await supabaseAdmin
    .from("plant_users")
    .select("rotation_order")
    .order("rotation_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.rotation_order ?? 0) + 1;

  const { data: created, error } = await supabaseAdmin
    .from("plant_users")
    .insert({
      auth_user_id: authUserId,
      name,
      discord_display_name: discordDisplay,
      email: user.email,
      rotation_order: nextOrder,
      avatar_color: PROFILE_COLORS[nextOrder % PROFILE_COLORS.length],
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function callerProfileId(authUid: string): Promise<string | null> {
  const profile = await ensurePlantUserProfile(authUid);
  return profile?.id ?? null;
}
