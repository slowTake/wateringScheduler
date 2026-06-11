
ALTER TABLE public.plant_users
  ADD COLUMN IF NOT EXISTS discord_display_name text;

-- Backfill display name from existing name so the UI has a value
UPDATE public.plant_users
  SET discord_display_name = name
  WHERE discord_display_name IS NULL;

-- Email is no longer collected at signup; allow null for new rows
ALTER TABLE public.plant_users
  ALTER COLUMN email DROP NOT NULL;
