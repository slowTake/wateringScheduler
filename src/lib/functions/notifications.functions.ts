import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callerProfileId } from "./shared";

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const myId = await callerProfileId(context.userId);
    if (!myId) return [];
    const { data: rows, error } = await supabaseAdmin
      .from("plant_notifications")
      .select("*")
      .eq("user_id", myId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const myId = await callerProfileId(context.userId);
    if (!myId) return { ok: true };
    await supabaseAdmin
      .from("plant_notifications")
      .update({ read: true })
      .eq("user_id", myId)
      .eq("read", false);
    return { ok: true };
  });
