import { computeStatus, countdownLabel, statusLabel, statusToneClasses } from "@/lib/plants";
import type { Database } from "@/integrations/supabase/types";
import { Link } from "@tanstack/react-router";
import { Droplet } from "lucide-react";

type Plant = Database["public"]["Tables"]["plants"]["Row"];
type UserLite = {
  id: string;
  name: string;
  avatar_color: string;
};

interface Props {
  plant: Plant;
  users: UserLite[];
}

export function PlantCard({ plant, users }: Props) {
  const status = computeStatus(plant);
  const assignee = users.find((u) => u.id === plant.assigned_user_id);
  const tone = statusToneClasses(status);

  return (
    <Link
      to="/plant/$plantId"
      params={{ plantId: plant.id }}
      className="group block overflow-hidden rounded-3xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={plant.image_url}
          alt={plant.name}
          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-md shadow-sm ${tone}`}
        >
          {statusLabel(status)}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg leading-tight">{plant.name}</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sky)]/30 text-sky-900 px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
            <Droplet className="size-3" />
            {countdownLabel(plant)}
          </span>
        </div>
        {assignee ? (
          <div className="flex items-center gap-2">
            <span
              className="grid place-items-center size-7 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: assignee.avatar_color }}
            >
              {assignee.name[0]}
            </span>
            <span className="text-sm text-foreground">
              <span className="font-medium text-foreground">{assignee.name}</span>'s turn
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unassigned</p>
        )}
      </div>
    </Link>
  );
}
