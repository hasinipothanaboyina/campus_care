-- 1. Add is_approved and last_login columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 2. Auto-approve Admins and CMCs (only students need approval)
UPDATE public.profiles SET is_approved = TRUE WHERE role IN ('ADMIN', 'CMC', 'admin', 'cmc');

-- 3. You can optionally create the master admin account here.
-- Note: Supabase handles auth in the `auth.users` table, which is encrypted.
-- We recommend manually signing up with "principal.srgec@gmail.com" on the registration page,
-- and then running this query to make them the permanent admin:
-- UPDATE public.profiles SET role = 'ADMIN', is_approved = TRUE WHERE email = 'principal.srgec@gmail.com';
