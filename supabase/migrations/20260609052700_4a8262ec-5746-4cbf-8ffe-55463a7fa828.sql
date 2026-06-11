
-- 1. Add auth_user_id to plant_users
ALTER TABLE public.plant_users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS plant_users_auth_user_id_idx ON public.plant_users(auth_user_id);

-- 2. Drop all open RLS policies
DROP POLICY IF EXISTS "open read users" ON public.plant_users;
DROP POLICY IF EXISTS "open write users" ON public.plant_users;
DROP POLICY IF EXISTS "open read plants" ON public.plants;
DROP POLICY IF EXISTS "open write plants" ON public.plants;
DROP POLICY IF EXISTS "open read events" ON public.watering_events;
DROP POLICY IF EXISTS "open write events" ON public.watering_events;
DROP POLICY IF EXISTS "open read notifications" ON public.plant_notifications;
DROP POLICY IF EXISTS "open write notifications" ON public.plant_notifications;

-- Helper: caller's plant_users.id
CREATE OR REPLACE FUNCTION public.current_plant_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.plant_users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- 3. Grants
REVOKE ALL ON public.plant_users FROM anon;
REVOKE ALL ON public.plants FROM anon;
REVOKE ALL ON public.watering_events FROM anon;
REVOKE ALL ON public.plant_notifications FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watering_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_notifications TO authenticated;
GRANT ALL ON public.plant_users TO service_role;
GRANT ALL ON public.plants TO service_role;
GRANT ALL ON public.watering_events TO service_role;
GRANT ALL ON public.plant_notifications TO service_role;

-- 4. Policies: plant_users
CREATE POLICY "members read all users" ON public.plant_users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "users insert own profile" ON public.plant_users
  FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "users update own profile" ON public.plant_users
  FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "users delete own profile" ON public.plant_users
  FOR DELETE TO authenticated USING (auth_user_id = auth.uid());

-- Policies: plants (shared campus)
CREATE POLICY "members read plants" ON public.plants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "members insert plants" ON public.plants
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "members update plants" ON public.plants
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "members delete plants" ON public.plants
  FOR DELETE TO authenticated USING (true);

-- Policies: watering_events
CREATE POLICY "members read events" ON public.watering_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "members insert own events" ON public.watering_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = public.current_plant_user_id());

-- Policies: plant_notifications
CREATE POLICY "users read own notifications" ON public.plant_notifications
  FOR SELECT TO authenticated USING (user_id = public.current_plant_user_id());
CREATE POLICY "users update own notifications" ON public.plant_notifications
  FOR UPDATE TO authenticated
  USING (user_id = public.current_plant_user_id())
  WITH CHECK (user_id = public.current_plant_user_id());
CREATE POLICY "users delete own notifications" ON public.plant_notifications
  FOR DELETE TO authenticated USING (user_id = public.current_plant_user_id());

-- 5. Auto-create plant_users profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_order int;
  palette text[] := ARRAY['#3F7D58', '#D97757', '#A8D5A2', '#F4B860', '#7AA7C7', '#C58BB1'];
  display_name text;
  full_name text;
BEGIN
  SELECT COALESCE(MAX(rotation_order), 0) + 1 INTO next_order FROM public.plant_users;

  full_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'discord_display_name',
    full_name
  );

  INSERT INTO public.plant_users (auth_user_id, name, discord_display_name, email, rotation_order, avatar_color)
  VALUES (NEW.id, full_name, display_name, NEW.email, next_order, palette[1 + (next_order % array_length(palette, 1))]);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Storage: plant-images bucket — public read, authenticated write
DROP POLICY IF EXISTS "public read plant-images" ON storage.objects;
DROP POLICY IF EXISTS "anyone upload plant-images" ON storage.objects;
DROP POLICY IF EXISTS "anyone update plant-images" ON storage.objects;
DROP POLICY IF EXISTS "anyone delete plant-images" ON storage.objects;
DROP POLICY IF EXISTS "auth upload plant-images" ON storage.objects;
DROP POLICY IF EXISTS "auth update plant-images" ON storage.objects;
DROP POLICY IF EXISTS "auth delete plant-images" ON storage.objects;

CREATE POLICY "public read plant-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'plant-images');
CREATE POLICY "auth upload plant-images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'plant-images');
CREATE POLICY "auth update plant-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'plant-images') WITH CHECK (bucket_id = 'plant-images');
CREATE POLICY "auth delete plant-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'plant-images');
