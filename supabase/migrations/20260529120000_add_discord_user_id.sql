alter table public.plant_users
  add column if not exists discord_user_id text;

comment on column public.plant_users.discord_user_id is
  'Discord snowflake for @mentions in plant-watering bot alerts';
