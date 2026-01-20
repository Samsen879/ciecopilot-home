-- Ensure user_profiles has columns required by auth_system indexes
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT;
