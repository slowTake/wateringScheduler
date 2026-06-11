
-- enums
create type public.moisture_status as enum ('dry','ok','moist');
create type public.watering_action as enum ('watered','pushed_back','reassigned','created');
create type public.notification_type as enum ('your_turn','overdue','reassigned');

-- users (campus members) — separate from auth.users since this app has no login
create table public.plant_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  rotation_order integer not null,
  avatar_color text not null default '#A8D5A2',
  created_at timestamptz not null default now()
);

create table public.plants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  watering_interval_days integer not null default 7,
  next_watering_date timestamptz not null default now(),
  last_watered_date timestamptz,
  assigned_user_id uuid references public.plant_users(id) on delete set null,
  last_watered_by_user_id uuid references public.plant_users(id) on delete set null,
  moisture_status public.moisture_status not null default 'ok',
  notes text,
  overdue_since timestamptz,
  created_at timestamptz not null default now()
);

create table public.watering_events (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid references public.plant_users(id) on delete set null,
  action public.watering_action not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.plant_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.plant_users(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete cascade,
  type public.notification_type not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index plants_assigned_idx on public.plants(assigned_user_id);
create index watering_events_plant_idx on public.watering_events(plant_id, created_at desc);
create index plant_notifications_user_idx on public.plant_notifications(user_id, created_at desc);

-- RLS: shared campus app, open access (no auth in v1)
alter table public.plant_users enable row level security;
alter table public.plants enable row level security;
alter table public.watering_events enable row level security;
alter table public.plant_notifications enable row level security;

create policy "open read users" on public.plant_users for select using (true);
create policy "open write users" on public.plant_users for all using (true) with check (true);

create policy "open read plants" on public.plants for select using (true);
create policy "open write plants" on public.plants for all using (true) with check (true);

create policy "open read events" on public.watering_events for select using (true);
create policy "open write events" on public.watering_events for all using (true) with check (true);

create policy "open read notifications" on public.plant_notifications for select using (true);
create policy "open write notifications" on public.plant_notifications for all using (true) with check (true);
