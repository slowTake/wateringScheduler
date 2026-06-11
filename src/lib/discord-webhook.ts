export type PlantWateringWebhookPayload = {
  plant_name: string;
  location?: string;
  message?: string;
  due_at?: string;
};

/** POST to the configured Discord bot webhook when env is configured; no-op otherwise. */
export async function sendPlantWateringWebhook(
  payload: PlantWateringWebhookPayload,
): Promise<void> {
  const url = process.env.DISCORD_BOT_WEBHOOK_URL;
  const secret = process.env.PLANT_WEBHOOK_SECRET;
  if (!url || !secret) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret": secret,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[discord-webhook] plant-watering returned ${res.status}`);
    }
  } catch (err) {
    console.error("[discord-webhook] plant-watering request failed", err);
  }
}
