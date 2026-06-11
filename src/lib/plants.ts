export type PlantStatus = "overdue" | "due_today" | "due_soon" | "upcoming" | "moist";

export interface PlantLike {
  next_watering_date: string;
  moisture_status: "dry" | "ok" | "moist";
  overdue_since: string | null;
}

export interface UserLike {
  id: string;
  rotation_order: number;
  is_available?: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

export function daysUntil(plant: PlantLike, now: Date = new Date()): number {
  const next = new Date(plant.next_watering_date).getTime();
  return Math.round((next - now.getTime()) / DAY);
}

export function hoursUntil(plant: PlantLike, now: Date = new Date()): number {
  const next = new Date(plant.next_watering_date).getTime();
  return Math.round((next - now.getTime()) / (60 * 60 * 1000));
}

export function computeStatus(plant: PlantLike, now: Date = new Date()): PlantStatus {
  if (plant.moisture_status === "moist") return "moist";
  const next = new Date(plant.next_watering_date).getTime();
  const diffMs = next - now.getTime();
  if (diffMs < -2 * 60 * 60 * 1000) return "overdue"; // >2h past due
  const days = Math.ceil(diffMs / DAY);
  if (days <= 0) return "due_today";
  if (days <= 2) return "due_soon";
  return "upcoming";
}

export function statusLabel(s: PlantStatus): string {
  return {
    overdue: "Overdue",
    due_today: "Due today",
    due_soon: "Due soon",
    upcoming: "Upcoming",
    moist: "Moist — pushed back",
  }[s];
}

export function statusToneClasses(s: PlantStatus): string {
  return {
    overdue: "bg-[var(--clay)]/15 text-[var(--clay)] border-[var(--clay)]/30",
    due_today: "bg-[var(--sand)]/30 text-amber-800 border-[var(--sand)]/50",
    due_soon: "bg-[var(--mint)]/40 text-[var(--leaf)] border-[var(--mint)]/60",
    upcoming: "bg-muted text-muted-foreground border-border",
    moist: "bg-[var(--sky)]/30 text-sky-900 border-[var(--sky)]/50",
  }[s];
}

export function countdownLabel(plant: PlantLike, now: Date = new Date()): string {
  const status = computeStatus(plant, now);
  if (status === "moist") return "Pushed back";
  const days = daysUntil(plant, now);
  if (status === "overdue") {
    const overdueDays = Math.max(1, -days);
    return `${overdueDays}d overdue`;
  }
  if (status === "due_today") {
    const hrs = hoursUntil(plant, now);
    if (hrs <= 0) return "Now";
    return `in ${hrs}h`;
  }
  return `in ${days}d`;
}

export function nextAssignee(currentUserId: string | null, users: UserLike[]): string | null {
  if (users.length === 0) return null;
  const sorted = [...users].sort((a, b) => a.rotation_order - b.rotation_order);
  const available = sorted.filter((u) => u.is_available !== false);
  const pool = available.length > 0 ? available : sorted;
  if (!currentUserId) return pool[0].id;
  const idx = pool.findIndex((u) => u.id === currentUserId);
  if (idx === -1) return pool[0].id;
  return pool[(idx + 1) % pool.length].id;
}
