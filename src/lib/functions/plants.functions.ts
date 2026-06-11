import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendPlantWateringWebhook } from "@/lib/discord-webhook";
import { nextAssignee } from "@/lib/plants";
import { callerProfileId, DAY_MS } from "./shared";

async function escalateOverdueInternal() {
  const cutoff = new Date(Date.now() - DAY_MS).toISOString();
  const { data: stale } = await supabaseAdmin
    .from("plants")
    .select("id, name, assigned_user_id, next_watering_date, overdue_since")
    .lt("next_watering_date", cutoff)
    .is("overdue_since", null);

  if (!stale || stale.length === 0) return;

  const { data: users } = await supabaseAdmin
    .from("plant_users")
    .select("id, rotation_order, name, discord_user_id, is_available")
    .order("rotation_order");

  const userList = users ?? [];
  const now = new Date().toISOString();

  for (const p of stale) {
    const next = nextAssignee(p.assigned_user_id, userList);
    if (!next) continue;
    const nextUser = userList.find((u) => u.id === next);
    await supabaseAdmin
      .from("plants")
      .update({ assigned_user_id: next, overdue_since: now })
      .eq("id", p.id);
    await supabaseAdmin.from("watering_events").insert({
      plant_id: p.id,
      user_id: next,
      action: "reassigned",
      note: `Auto-reassigned: overdue >24h. Now ${nextUser?.name ?? "next"}'s turn.`,
    });
    await supabaseAdmin.from("plant_notifications").insert([
      {
        user_id: next,
        plant_id: p.id,
        type: "reassigned",
        message: `${p.name} was reassigned to you — it's overdue.`,
      },
      ...(p.assigned_user_id
        ? [
            {
              user_id: p.assigned_user_id,
              plant_id: p.id,
              type: "overdue" as const,
              message: `${p.name} went overdue and was passed to the next person.`,
            },
          ]
        : []),
    ]);

    if (nextUser) {
      const { data: fullPlant } = await supabaseAdmin
        .from("plants")
        .select("name, notes, next_watering_date")
        .eq("id", p.id)
        .single();
      await sendPlantWateringWebhook({
        plant_name: fullPlant?.name ?? p.name,
        location: fullPlant?.notes ?? undefined,
        message: `${fullPlant?.name ?? p.name} is overdue — time to water!`,
        due_at: fullPlant?.next_watering_date ?? p.next_watering_date,
      });
    }
  }
}

export const listPlants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    await escalateOverdueInternal();
    const { data, error } = await supabaseAdmin
      .from("plants")
      .select("*")
      .order("next_watering_date", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getPlant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: plant, error } = await supabaseAdmin
      .from("plants")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { data: events } = await supabaseAdmin
      .from("watering_events")
      .select("*")
      .eq("plant_id", data.id)
      .order("created_at", { ascending: false })
      .limit(15);

    return { plant, events: events ?? [] };
  });

const createPlantSchema = z.object({
  name: z.string().trim().min(1).max(80),
  image_url: z.string().trim().url().max(500),
  watering_interval_days: z.number().int().min(1).max(15),
  assigned_user_id: z.string().uuid().nullable(),
});

export const createPlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createPlantSchema.parse(d))
  .handler(async ({ data, context }) => {
    const myId = await callerProfileId(context.userId);
    const next = new Date(Date.now() + data.watering_interval_days * DAY_MS).toISOString();
    const { data: plant, error } = await supabaseAdmin
      .from("plants")
      .insert({
        name: data.name,
        image_url: data.image_url,
        watering_interval_days: data.watering_interval_days,
        next_watering_date: next,
        assigned_user_id: data.assigned_user_id,
        moisture_status: "ok",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("watering_events").insert({
      plant_id: plant.id,
      user_id: myId,
      action: "created",
      note: "Plant added to rotation",
    });
    return plant;
  });

const updatePlantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80).optional(),
  image_url: z.string().trim().url().max(500).optional(),
  watering_interval_days: z.number().int().min(1).max(15).optional(),
  location: z.string().trim().max(120).nullable().optional(),
});

export const updatePlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updatePlantSchema.parse(d))
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    const update: Record<string, unknown> = { ...patch };

    if (typeof patch.watering_interval_days === "number") {
      const { data: current } = await supabaseAdmin
        .from("plants")
        .select("last_watered_date")
        .eq("id", id)
        .single();
      const base = current?.last_watered_date ? new Date(current.last_watered_date) : new Date();
      update.next_watering_date = new Date(
        base.getTime() + patch.watering_interval_days * DAY_MS,
      ).toISOString();
    }

    const { error } = await supabaseAdmin
      .from("plants")
      .update(update as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("plants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const waterSchema = z.object({
  plant_id: z.string().uuid(),
  interval_days: z.number().int().min(1).max(15),
});

export const waterPlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => waterSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actorId = await callerProfileId(context.userId);
    const { data: users } = await supabaseAdmin
      .from("plant_users")
      .select("id, rotation_order, is_available")
      .order("rotation_order");

    const next = nextAssignee(actorId, users ?? []);
    const now = new Date();
    const nextWater = new Date(now.getTime() + data.interval_days * DAY_MS).toISOString();

    const { data: plant, error } = await supabaseAdmin
      .from("plants")
      .update({
        last_watered_date: now.toISOString(),
        last_watered_by_user_id: actorId,
        next_watering_date: nextWater,
        watering_interval_days: data.interval_days,
        assigned_user_id: next,
        moisture_status: "ok",
        overdue_since: null,
      })
      .eq("id", data.plant_id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("watering_events").insert({
      plant_id: data.plant_id,
      user_id: actorId,
      action: "watered",
      note: `Watered. Next in ${data.interval_days} day${data.interval_days === 1 ? "" : "s"}.`,
    });

    if (next) {
      await supabaseAdmin.from("plant_notifications").insert({
        user_id: next,
        plant_id: data.plant_id,
        type: "your_turn",
        message: `It will be your turn to water ${plant.name} in ${data.interval_days} day${data.interval_days === 1 ? "" : "s"}.`,
      });

      await sendPlantWateringWebhook({
        plant_name: plant.name,
        location: plant.notes ?? undefined,
        message: `You're on deck for ${plant.name} in ${data.interval_days} day${data.interval_days === 1 ? "" : "s"}.`,
        due_at: nextWater,
      });
    }
    return plant;
  });

const pushBackSchema = z.object({
  plant_id: z.string().uuid(),
  push_days: z.number().int().min(1).max(7),
  note: z.string().trim().max(200).optional(),
});

export const pushBackPlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pushBackSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actorId = await callerProfileId(context.userId);
    const { data: current } = await supabaseAdmin
      .from("plants")
      .select("next_watering_date, name, assigned_user_id")
      .eq("id", data.plant_id)
      .single();
    if (!current) throw new Error("Plant not found");

    const base = new Date(current.next_watering_date);
    const now = new Date();
    const start = base.getTime() > now.getTime() ? base : now;
    const newNext = new Date(start.getTime() + data.push_days * DAY_MS).toISOString();

    const { error } = await supabaseAdmin
      .from("plants")
      .update({
        next_watering_date: newNext,
        moisture_status: "moist",
        overdue_since: null,
      })
      .eq("id", data.plant_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("watering_events").insert({
      plant_id: data.plant_id,
      user_id: actorId,
      action: "pushed_back",
      note: data.note
        ? `Still moist (+${data.push_days}d): ${data.note}`
        : `Still moist — pushed back ${data.push_days} day${data.push_days === 1 ? "" : "s"}.`,
    });
    return { ok: true };
  });
